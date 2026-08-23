import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBillingPortalUrl } from '@/lib/stripe/billing-portal'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { clinic: { include: { stripe_customer: true } } },
    })

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil não encontrado.' }, { status: 404 })
    }

    const stripeCustomerId = profile.clinic.stripe_customer?.stripe_customer_id

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'NO_CUSTOMER', message: 'Você ainda não possui uma assinatura Stripe ativa.' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = await createBillingPortalUrl(stripeCustomerId, appUrl)

    return NextResponse.json({ url })
  } catch (error: unknown) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: 'STRIPE_ERROR', message: 'Falha ao abrir portal financeiro.' },
      { status: 500 }
    )
  }
}
