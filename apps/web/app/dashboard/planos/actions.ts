'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe/client'
import { STRIPE_PRICES, TRIAL_PERIOD_DAYS } from '@/lib/stripe/products'

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

  // Verifica se já tem assinatura ativa no Stripe
  const subscription = await prisma.subscription.findUnique({
    where: { clinic_id: profile.clinic_id },
  })

  const hasActiveStripeSubscription =
    subscription?.stripe_subscription_id &&
    (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING')

  // Se já tem assinatura ativa no Stripe, redireciona para o portal
  if (hasActiveStripeSubscription) {
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { clinic_id: profile.clinic_id },
    })
    if (stripeCustomer) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomer.stripe_customer_id,
        return_url: `${appUrl}/subscription`,
      })
      redirect(portalSession.url)
    }
  }

  // Sem assinatura Stripe ativa — inicia checkout
  const priceKey = requestedPlan === 'ESSENTIAL' ? 'essencial_monthly' : 'conecta_monthly'
  const priceId = STRIPE_PRICES[priceKey]

  const clinic = await prisma.clinic.findUnique({ where: { id: profile.clinic_id } })
  if (!clinic) {
    return { status: 'error', message: 'Clínica não encontrada.' }
  }

  // Busca ou cria customer no Stripe
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { clinic_id: profile.clinic_id },
  })

  let stripeCustomerId = stripeCustomer?.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: clinic.email,
      name: clinic.name,
      metadata: { clinicId: clinic.id },
    })
    stripeCustomerId = customer.id
    await prisma.stripeCustomer.create({
      data: { clinic_id: clinic.id, stripe_customer_id: stripeCustomerId },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
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
