// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/stripe-sync.ts
// Persistência do estado vindo do Stripe. Todo write do webhook passa por aqui.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'
import { getPlanByPriceId } from './products'
import {
  mapStripeStatus,
  readPeriodEnd,
  readSubscriptionPriceId,
  toDate,
  type StripeSubscriptionLike,
} from './stripe-normalizers'

const PLAN_FALLBACK = 'ESSENTIAL'

/** `true` quando o erro do Prisma é "registro não encontrado" (P2025). */
export function isRecordNotFound(error: unknown): boolean {
  return hasPrismaCode(error, 'P2025')
}

/** `true` quando o erro do Prisma é violação de unicidade (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return hasPrismaCode(error, 'P2002')
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}

export async function findClinicIdByStripeCustomerId(customerId: string): Promise<string | null> {
  const customer = await prisma.stripeCustomer.findUnique({
    where: { stripe_customer_id: customerId },
    select: { clinic_id: true },
  })

  return customer?.clinic_id ?? null
}

export async function findClinicIdByStripeSubscriptionId(
  subscriptionId: string
): Promise<string | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { stripe_subscription_id: subscriptionId },
    select: { clinic_id: true },
  })

  return subscription?.clinic_id ?? null
}

/**
 * Grava o estado da assinatura do Stripe na clínica.
 *
 * Quando o price não é reconhecido, o plano **não** é alterado numa assinatura
 * que já existe — rebaixar silenciosamente para ESSENTIAL foi exatamente o que
 * fez uma clínica pagar Conecta e receber Essential.
 */
export async function syncSubscriptionFromStripe(
  clinicId: string,
  subscription: StripeSubscriptionLike
): Promise<void> {
  const priceId = readSubscriptionPriceId(subscription)
  const plan = getPlanByPriceId(priceId)

  if (!plan) {
    console.error(
      `[stripe] price desconhecido "${priceId}" na subscription ${subscription.id} (clínica ${clinicId}). ` +
        'Confira STRIPE_ESSENCIAL_MONTHLY_PRICE_ID / STRIPE_CONECTA_MONTHLY_PRICE_ID — ' +
        'o plano NÃO será alterado.'
    )
  }

  const common = {
    status: mapStripeStatus(subscription.status),
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    current_period_end: readPeriodEnd(subscription),
    trial_ends_at: toDate(subscription.trial_end),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    payment_provider: 'stripe',
  }

  await prisma.subscription.upsert({
    where: { clinic_id: clinicId },
    update: plan ? { ...common, plan } : common,
    create: { ...common, clinic_id: clinicId, plan: plan ?? PLAN_FALLBACK },
  })
}

/** Cancela a assinatura da clínica e devolve o acesso ao plano base. */
export async function downgradeSubscription(clinicId: string): Promise<void> {
  await prisma.subscription.update({
    where: { clinic_id: clinicId },
    data: {
      plan: PLAN_FALLBACK,
      status: 'CANCELED',
      stripe_subscription_id: null,
      stripe_price_id: null,
      current_period_end: null,
      trial_ends_at: null,
      cancel_at_period_end: false,
    },
  })
}

export interface RecordPaymentInput {
  clinicId: string
  stripeInvoiceId: string | null
  stripePaymentIntent: string | null
  amountCents: number
  currency: string
  status: 'SUCCEEDED' | 'FAILED'
  description: string
  paidAt: Date | null
}

/**
 * Registra um pagamento de forma idempotente.
 *
 * A reentrega de webhook é normal no Stripe, então a invoice é a chave: o mesmo
 * evento reprocessado atualiza a linha existente em vez de duplicá-la.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<void> {
  const data = {
    clinic_id: input.clinicId,
    stripe_invoice_id: input.stripeInvoiceId,
    stripe_payment_intent: input.stripePaymentIntent,
    amount_cents: input.amountCents,
    currency: input.currency,
    status: input.status,
    description: input.description,
    paid_at: input.paidAt,
  }

  if (!input.stripeInvoiceId) {
    await prisma.payment.create({ data })
    return
  }

  try {
    await prisma.payment.upsert({
      where: { stripe_invoice_id: input.stripeInvoiceId },
      update: {
        status: data.status,
        amount_cents: data.amount_cents,
        currency: data.currency,
        description: data.description,
        paid_at: data.paid_at,
        stripe_payment_intent: data.stripe_payment_intent,
      },
      create: data,
    })
  } catch (error) {
    // Corrida entre duas entregas do mesmo evento: a outra já gravou. Nada a fazer.
    if (isUniqueViolation(error)) {
      console.warn(`[stripe] pagamento da invoice ${input.stripeInvoiceId} já registrado; ignorando duplicata.`)
      return
    }
    throw error
  }
}
