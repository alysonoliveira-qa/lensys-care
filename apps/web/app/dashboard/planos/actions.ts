'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe/client'
import { getPriceIdForPlan, STRIPE_PLAN_IDS, type StripePlanId } from '@/lib/stripe/products'
import { STRIPE_APP_METADATA } from '@/lib/stripe/stripe-app-metadata'
import { createBillingPortalUrl } from '@/lib/stripe/billing-portal'
import { resolveCheckoutTrial } from '@/lib/stripe/checkout-trial'
import { syncSubscriptionFromStripe } from '@/lib/stripe/stripe-sync'
import type { StripeSubscriptionLike } from '@/lib/stripe/stripe-normalizers'

// Alias em vez de uma segunda lista de planos: manter as duas em sincronia à mão
// é exatamente o tipo de duplicação que deixa um plano novo fora do checkout.
export type AvailablePlan = StripePlanId

// Arquivo 'use server': só as exportações precisam ser async — helpers locais não.
function isAvailablePlan(value: unknown): value is AvailablePlan {
  return typeof value === 'string' && STRIPE_PLAN_IDS.includes(value as AvailablePlan)
}

/**
 * Não existe estado de sucesso aqui, e isso é proposital.
 *
 * `activatePlan` tem três saídas: devolver erro, ou redirecionar para o portal
 * de cobrança, ou redirecionar para o Checkout. Ativação de plano se conclui no
 * Stripe, nunca dentro do app — quem paga sai daqui. Como `redirect()` lança,
 * nada depois dele roda, e um `status: 'success'` seria um estado que a própria
 * action não consegue produzir.
 */
export interface PlanActionState {
  status: 'idle' | 'error'
  message: string
}

export async function activatePlan(
  _previousState: PlanActionState,
  formData: FormData
): Promise<PlanActionState> {
  const requestedPlan = formData.get('plan')

  if (!isAvailablePlan(requestedPlan)) {
    return { status: 'error', message: 'Plano selecionado inválido.' }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'error', message: 'Sua sessão expirou. Entre novamente para alterar o plano.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('clinic_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.clinic_id) {
    return { status: 'error', message: 'Não foi possível identificar a clínica vinculada à sua conta.' }
  }

  if (profile.role !== 'OWNER') {
    return { status: 'error', message: 'Somente o proprietário da clínica pode alterar o plano.' }
  }

  const [subscription, stripeCustomer, clinic] = await Promise.all([
    prisma.subscription.findUnique({ where: { clinic_id: profile.clinic_id } }),
    prisma.stripeCustomer.findUnique({ where: { clinic_id: profile.clinic_id } }),
    prisma.clinic.findUnique({ where: { id: profile.clinic_id } }),
  ])

  if (!clinic) {
    return { status: 'error', message: 'Clínica não encontrada.' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Assinatura ativa já registrada: vai para o portal, não para um checkout novo.
  const hasActiveStripeSubscription =
    Boolean(subscription?.stripe_subscription_id) &&
    (subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING')

  if (hasActiveStripeSubscription && stripeCustomer) {
    redirect(await createBillingPortalUrl(stripeCustomer.stripe_customer_id, appUrl))
  }

  // Rede de segurança contra cobrança dupla: o banco pode não ter a assinatura
  // registrada (webhook perdido). Antes de abrir um checkout novo, pergunta ao
  // Stripe se esse customer já tem assinatura viva.
  if (stripeCustomer) {
    const existing = await findLiveSubscription(stripeCustomer.stripe_customer_id)

    if (existing) {
      console.warn(
        `[stripe] clínica ${clinic.id} já tem a assinatura ${existing.id} no Stripe ` +
          'sem registro local. Sincronizando e enviando ao portal em vez de abrir novo checkout.'
      )

      // Grava o que o webhook deveria ter gravado. Sem isso a faixa de teste
      // vencido continua no ar para quem já cadastrou o cartão, e o próximo
      // clique cai aqui de novo, sem que nada mude.
      try {
        await syncSubscriptionFromStripe(clinic.id, existing)
      } catch (error) {
        console.error(`[stripe] falha ao sincronizar a assinatura ${existing.id}:`, error)
      }

      redirect(await createBillingPortalUrl(stripeCustomer.stripe_customer_id, appUrl))
    }
  }

  const priceId = getPriceIdForPlan(requestedPlan)

  let stripeCustomerId = stripeCustomer?.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await getStripe().customers.create({
      email: clinic.email,
      name: clinic.name,
      metadata: { ...STRIPE_APP_METADATA, clinicId: clinic.id },
    })
    stripeCustomerId = customer.id
    await prisma.stripeCustomer.create({
      data: { clinic_id: clinic.id, stripe_customer_id: stripeCustomerId },
    })
  }

  const trial = resolveCheckoutTrial(subscription)

  const session = await getStripe().checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: {
      ...(trial.kind === 'full' ? { trial_period_days: trial.trialPeriodDays } : {}),
      ...(trial.kind === 'until' ? { trial_end: trial.trialEnd } : {}),
      // Carimbar aqui tambem faz a invoice da assinatura carregar o app em
      // `parent.subscription_details.metadata`, que e por onde o webhook
      // reconhece os eventos de fatura.
      metadata: { ...STRIPE_APP_METADATA, clinicId: clinic.id },
    },
    success_url: `${appUrl}/subscription?success=true`,
    cancel_url: `${appUrl}/subscription?canceled=true`,
    metadata: { ...STRIPE_APP_METADATA, clinicId: clinic.id },
  })

  redirect(session.url!)
}

// Helpers internos. Num arquivo 'use server' só as exportações precisam ser
// funções async — estas ficam privadas ao módulo de propósito.

/**
 * Assinatura ainda viva do customer no Stripe, se houver.
 * `incomplete` e `canceled` não contam: a primeira é checkout abandonado, a
 * segunda já acabou — nenhuma das duas impede uma assinatura nova.
 */
async function findLiveSubscription(customerId: string): Promise<StripeSubscriptionLike | null> {
  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 20,
  })

  const live = subscriptions.data.find(
    (item) => item.status === 'active' || item.status === 'trialing' || item.status === 'past_due'
  )

  return (live as unknown as StripeSubscriptionLike | undefined) ?? null
}
