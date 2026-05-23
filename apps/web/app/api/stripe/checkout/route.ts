import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/db'
import { STRIPE_PRICES } from '@/lib/stripe/products'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    const body = await request.json()
    const { priceKey } = body // 'conecta_monthly' | 'conecta_annual'

    if (!priceKey || !STRIPE_PRICES[priceKey as keyof typeof STRIPE_PRICES]) {
      return NextResponse.json({ error: 'INVALID_PRICE', message: 'Preço selecionado é inválido.' }, { status: 400 })
    }

    const priceId = STRIPE_PRICES[priceKey as keyof typeof STRIPE_PRICES]

    // Fetch user profile and clinic
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { clinic: true },
    })

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil não encontrado.' }, { status: 404 })
    }

    const clinic = profile.clinic

    // Find or create Stripe customer
    let stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { clinic_id: clinic.id },
    })

    let stripeCustomerId = stripeCustomer?.stripe_customer_id

    if (!stripeCustomerId) {
      // Create customer in Stripe
      const customer = await stripe.customers.create({
        email: clinic.email,
        name: clinic.name,
        metadata: {
          clinicId: clinic.id,
        },
      })

      stripeCustomerId = customer.id

      // Save Stripe customer record
      await prisma.stripeCustomer.create({
        data: {
          clinic_id: clinic.id,
          stripe_customer_id: stripeCustomerId,
        },
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          clinicId: clinic.id,
        },
      },
      success_url: `${appUrl}/planos?success=true`,
      cancel_url: `${appUrl}/planos?canceled=true`,
      metadata: {
        clinicId: clinic.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'STRIPE_ERROR', message: error.message || 'Falha ao iniciar checkout.' },
      { status: 500 }
    )
  }
}
