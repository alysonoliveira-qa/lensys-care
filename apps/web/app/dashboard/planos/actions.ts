'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe/client'
import { getPriceIdForPlan, TRIAL_PERIOD_DAYS } from '@/lib/stripe/products'

export type AvailablePlan = 'ESSENTIAL' | 'CONECTA'

export interface PlanActionState {
  status: 'idle' | 'success' | 'error'
  message: string
  plan?: AvailablePlan
}

export async function activatePlan(
  _previousState: PlanActionState,
  formData: FormData
): Promise<PlanActionState> {
  const requestedPlan = formData.get('plan')

  if (requestedPlan !== 'ESSENTIAL' && requestedPlan !== 'CONECTA') {
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
    redirect(await createPortalUrl(stripeCustomer.stripe_customer_id, appUrl))
  }

  // Rede de segurança contra cobrança dupla: o banco pode não ter a assinatura
  // registrada (webhook perdido). Antes de abrir um checkout novo, pergunta ao
  // Stripe se esse customer já tem assinatura viva.
  if (stripeCustomer) {
    const existingSubscriptionId = await findLiveSubscriptionId(stripeCustomer.stripe_customer_id)

    if (existingSubscriptionId) {
      console.warn(
        `[stripe] clínica ${clinic.id} já tem a assinatura ${existingSubscriptionId} no Stripe ` +
          'sem registro local. Enviando ao portal em vez de abrir novo checkout.'
      )
      redirect(await createPortalUrl(stripeCustomer.stripe_customer_id, appUrl))
    }
  }

  const priceId = getPriceIdForPlan(requestedPlan)

  let stripeCustomerId = stripeCustomer?.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await getStripe().customers.create({
      email: clinic.email,
      name: clinic.name,
      metadata: { clinicId: clinic.id },
    })
    stripeCustomerId = customer.id
    await prisma.stripeCustomer.create({
      data: { clinic_id: clinic.id, stripe_customer_id: stripeCustomerId },
    })
  }

  const session = await getStripe().checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: {
      trial_period_days: TRIAL_PERIOD_DAYS,
      metadata: { clinicId: clinic.id },
    },
    success_url: `${appUrl}/subscription?success=true`,
    cancel_url: `${appUrl}/subscription?canceled=true`,
    metadata: { clinicId: clinic.id },
  })

  redirect(session.url!)
}

// Helpers internos. Num arquivo 'use server' só as exportações precisam ser
// funções async — estas ficam privadas ao módulo de propósito.

async function createPortalUrl(customerId: string, appUrl: string): Promise<string> {
  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/subscription`,
  })

  return portalSession.url
}

/**
 * Assinatura ainda viva do customer no Stripe, se houver.
 * `incomplete` e `canceled` não contam: a primeira é checkout abandonado, a
 * segunda já acabou — nenhuma das duas impede uma assinatura nova.
 */
async function findLiveSubscriptionId(customerId: string): Promise<string | null> {
  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 20,
  })

  const live = subscriptions.data.find(
    (item) => item.status === 'active' || item.status === 'trialing' || item.status === 'past_due'
  )

  return live?.id ?? null
}
