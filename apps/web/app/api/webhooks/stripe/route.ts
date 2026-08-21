import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { constructWebhookEvent } from '@/lib/stripe/webhooks'
import { prisma } from '@/lib/db'
import {
  readId,
  readInvoiceSubscriptionId,
  type StripeInvoiceLike,
  type StripeSubscriptionLike,
} from '@/lib/stripe/stripe-normalizers'
import {
  downgradeSubscription,
  findClinicIdByStripeCustomerId,
  findClinicIdByStripeSubscriptionId,
  isRecordNotFound,
  recordPayment,
  syncSubscriptionFromStripe,
} from '@/lib/stripe/stripe-sync'

// Um evento que não temos como aplicar (clínica desconhecida, assinatura já
// removida) é respondido com 200 de propósito: devolver 500 faz o Stripe
// reentregar o mesmo evento indefinidamente sem que nada mude. O 500 fica
// reservado para falha real, onde reentregar de fato ajuda.

export async function POST(request: Request) {
  let payload = ''

  try {
    payload = await request.text()
  } catch {
    return NextResponse.json(
      { error: 'READ_BODY_FAILED', message: 'Falha ao ler corpo da requisição.' },
      { status: 400 }
    )
  }

  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'MISSING_SIGNATURE', message: 'Assinatura Stripe ausente.' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = await constructWebhookEvent(payload, signature)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha na verificação da assinatura.'
    console.error('[stripe] verificação de assinatura falhou:', message)
    return NextResponse.json({ error: 'VERIFICATION_FAILED', message }, { status: 400 })
  }

  console.log(`[stripe] evento recebido: ${event.type} (${event.id})`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as unknown as StripeSubscriptionLike)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as unknown as StripeSubscriptionLike)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as unknown as StripeInvoiceLike)
        break

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as unknown as StripeInvoiceLike)
        break

      default:
        console.log(`[stripe] evento ignorado: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error(`[stripe] erro processando ${event.type} (${event.id}):`, error)
    return NextResponse.json(
      {
        error: 'PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Falha ao processar webhook.',
      },
      { status: 500 }
    )
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const subscriptionId = readId(session.subscription)

  if (!subscriptionId) {
    console.log(`[stripe] checkout ${session.id} sem assinatura; nada a sincronizar.`)
    return
  }

  const customerId = readId(session.customer)
  const clinicId = session.metadata?.clinicId ?? (await resolveClinicIdFromCustomer(customerId))

  if (!clinicId) {
    // Este é o ponto onde a assinatura deixava de ser gravada em silêncio.
    console.error(
      `[stripe] checkout ${session.id} concluído sem clínica identificável ` +
        `(metadata.clinicId ausente e customer ${customerId} não mapeado). ` +
        'A assinatura NÃO foi vinculada — verificar manualmente.'
    )
    return
  }

  const subscription = await retrieveSubscription(subscriptionId)
  await syncSubscriptionFromStripe(clinicId, subscription)

  console.log(`[stripe] assinatura ${subscriptionId} vinculada à clínica ${clinicId}.`)
}

async function handleSubscriptionUpdated(subscription: StripeSubscriptionLike): Promise<void> {
  const clinicId = await resolveClinicIdFromSubscription(subscription)

  if (!clinicId) {
    console.warn(
      `[stripe] assinatura ${subscription.id} atualizada, mas nenhuma clínica corresponde. Ignorando.`
    )
    return
  }

  await syncSubscriptionFromStripe(clinicId, subscription)
  console.log(`[stripe] assinatura da clínica ${clinicId} atualizada.`)
}

async function handleSubscriptionDeleted(subscription: StripeSubscriptionLike): Promise<void> {
  const clinicId = await resolveClinicIdFromSubscription(subscription)

  if (!clinicId) {
    console.warn(
      `[stripe] assinatura ${subscription.id} removida, mas nenhuma clínica corresponde. Ignorando.`
    )
    return
  }

  try {
    await downgradeSubscription(clinicId)
    console.log(`[stripe] clínica ${clinicId} rebaixada para o plano base.`)
  } catch (error) {
    if (isRecordNotFound(error)) {
      console.warn(`[stripe] clínica ${clinicId} não tem assinatura para rebaixar. Ignorando.`)
      return
    }
    throw error
  }
}

async function handleInvoicePaid(invoice: StripeInvoiceLike): Promise<void> {
  const clinicId = await resolveClinicIdFromCustomer(readId(invoice.customer))

  if (!clinicId) {
    console.warn(`[stripe] invoice ${invoice.id} paga por customer não mapeado. Ignorando.`)
    return
  }

  await recordPayment({
    clinicId,
    stripeInvoiceId: invoice.id ?? null,
    stripePaymentIntent: readId(invoice.payment_intent),
    amountCents: readAmount(invoice, 'amount_paid'),
    currency: readCurrency(invoice),
    status: 'SUCCEEDED',
    description: readDescription(invoice) ?? 'Mensalidade Lensys Care',
    paidAt: new Date(),
  })

  // Reconciliação: se o checkout.session.completed se perdeu, é aqui que a
  // assinatura volta a ficar correta. Sem isso, a clínica paga um plano e
  // continua com outro, sem nenhum sinal de erro.
  const subscriptionId = readInvoiceSubscriptionId(invoice)

  if (subscriptionId) {
    const subscription = await retrieveSubscription(subscriptionId)
    await syncSubscriptionFromStripe(clinicId, subscription)
  }

  console.log(`[stripe] pagamento registrado para a clínica ${clinicId}.`)
}

async function handleInvoiceFailed(invoice: StripeInvoiceLike): Promise<void> {
  const clinicId = await resolveClinicIdFromCustomer(readId(invoice.customer))

  if (!clinicId) {
    console.warn('[stripe] falha de pagamento de customer não mapeado. Ignorando.')
    return
  }

  await recordPayment({
    clinicId,
    stripeInvoiceId: invoice.id ?? null,
    stripePaymentIntent: readId(invoice.payment_intent),
    amountCents: readAmount(invoice, 'amount_due'),
    currency: readCurrency(invoice),
    status: 'FAILED',
    description: readDescription(invoice) ?? 'Falha no pagamento da mensalidade',
    paidAt: null,
  })

  try {
    await prisma.subscription.update({
      where: { clinic_id: clinicId },
      data: { status: 'PAST_DUE' },
    })
  } catch (error) {
    if (!isRecordNotFound(error)) throw error
    console.warn(`[stripe] clínica ${clinicId} sem assinatura para marcar PAST_DUE.`)
  }

  console.log(`[stripe] falha de pagamento registrada para a clínica ${clinicId}.`)
}

// ─── Resolução de clínica ────────────────────────────────────────────────────

async function resolveClinicIdFromCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null

  return findClinicIdByStripeCustomerId(customerId)
}

/** metadata → assinatura já gravada → customer. Do mais confiável ao mais indireto. */
async function resolveClinicIdFromSubscription(
  subscription: StripeSubscriptionLike
): Promise<string | null> {
  const fromMetadata = (subscription as { metadata?: { clinicId?: string } }).metadata?.clinicId

  if (fromMetadata) return fromMetadata

  const fromSubscriptionId = await findClinicIdByStripeSubscriptionId(subscription.id)

  if (fromSubscriptionId) return fromSubscriptionId

  const customerId = readId((subscription as { customer?: string | { id?: string } }).customer)

  return resolveClinicIdFromCustomer(customerId)
}

// ─── Leitura de campos ───────────────────────────────────────────────────────

async function retrieveSubscription(subscriptionId: string): Promise<StripeSubscriptionLike> {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)

  return subscription as unknown as StripeSubscriptionLike
}

function readAmount(invoice: StripeInvoiceLike, field: 'amount_paid' | 'amount_due'): number {
  const value = (invoice as unknown as Record<string, unknown>)[field]

  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readCurrency(invoice: StripeInvoiceLike): string {
  const value = (invoice as unknown as { currency?: unknown }).currency

  return typeof value === 'string' && value ? value : 'brl'
}

function readDescription(invoice: StripeInvoiceLike): string | null {
  const value = (invoice as unknown as { billing_reason?: unknown }).billing_reason

  return typeof value === 'string' && value ? value : null
}
