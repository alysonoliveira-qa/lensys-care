import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { constructWebhookEvent } from '@/lib/stripe/webhooks'
import { prisma } from '@/lib/db'
import type Stripe from 'stripe'

const Plan = {
  ESSENTIAL: 'ESSENTIAL',
  CONECTA: 'CONECTA',
} as const

const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  TRIALING: 'TRIALING',
  CANCELED: 'CANCELED',
  PAST_DUE: 'PAST_DUE',
} as const

const PaymentStatus = {
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const

function mapStripeStatus(stripeStatus: string): typeof SubscriptionStatus[keyof typeof SubscriptionStatus] {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'trialing':
      return SubscriptionStatus.TRIALING
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return SubscriptionStatus.PAST_DUE
    case 'canceled':
      return SubscriptionStatus.CANCELED
    default:
      return SubscriptionStatus.PAST_DUE
  }
}

export async function POST(request: Request) {
  let payload = ''
  try {
    payload = await request.text()
  } catch {
    return NextResponse.json({ error: 'READ_BODY_FAILED', message: 'Falha ao ler corpo da requisição.' }, { status: 400 })
  }

  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'MISSING_SIGNATURE', message: 'Assinatura Stripe ausente.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = await constructWebhookEvent(payload, sig)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha na verificação da assinatura.'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'VERIFICATION_FAILED', message }, { status: 400 })
  }

  console.log(`Stripe Webhook Received event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession
        const clinicId = session.metadata?.clinicId

        if (!clinicId) {
          console.error('No clinicId found in session metadata', session.id)
          break
        }

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const trialEnds = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null

          await prisma.subscription.upsert({
            where: { clinic_id: clinicId },
            update: {
              plan: Plan.CONECTA,
              status: mapStripeStatus(subscription.status),
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0].price.id,
              current_period_end: new Date(subscription.current_period_end * 1000),
              trial_ends_at: trialEnds,
              payment_provider: 'stripe',
            },
            create: {
              clinic_id: clinicId,
              plan: Plan.CONECTA,
              status: mapStripeStatus(subscription.status),
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0].price.id,
              current_period_end: new Date(subscription.current_period_end * 1000),
              trial_ends_at: trialEnds,
              payment_provider: 'stripe',
            },
          })
          console.log(`Subscription activated for clinic: ${clinicId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const clinicId = subscription.metadata?.clinicId

        const updateData = {
          status: mapStripeStatus(subscription.status),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
          stripe_price_id: subscription.items.data[0].price.id,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        }

        if (clinicId) {
          await prisma.subscription.update({
            where: { clinic_id: clinicId },
            data: updateData,
          })
          console.log(`Subscription updated for clinic: ${clinicId} via metadata`)
        } else {
          await prisma.subscription.update({
            where: { stripe_subscription_id: subscription.id },
            data: updateData,
          })
          console.log(`Subscription updated for stripe ID: ${subscription.id} via lookup`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const clinicId = subscription.metadata?.clinicId

        const downgradeData = {
          plan: Plan.ESSENTIAL,
          status: SubscriptionStatus.CANCELED,
          stripe_subscription_id: null,
          stripe_price_id: null,
          current_period_end: null,
          trial_ends_at: null,
        }

        if (clinicId) {
          await prisma.subscription.update({
            where: { clinic_id: clinicId },
            data: downgradeData,
          })
          console.log(`Subscription deleted/downgraded for clinic: ${clinicId}`)
        } else {
          await prisma.subscription.update({
            where: { stripe_subscription_id: subscription.id },
            data: downgradeData,
          })
          console.log(`Subscription deleted/downgraded for stripe ID: ${subscription.id}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        if (!invoice.customer) break

        const customer = await prisma.stripeCustomer.findUnique({
          where: { stripe_customer_id: invoice.customer as string },
        })

        if (!customer) {
          console.warn(`Stripe customer mapping not found for customer: ${invoice.customer}`)
          break
        }

        await prisma.payment.create({
          data: {
            clinic_id: customer.clinic_id,
            stripe_payment_intent: invoice.payment_intent as string,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: PaymentStatus.SUCCEEDED,
            description: invoice.billing_reason || 'Mensalidade Plano Conecta',
            paid_at: new Date(),
          },
        })
        console.log(`Payment logged as SUCCEEDED for clinic: ${customer.clinic_id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        if (!invoice.customer) break

        const customer = await prisma.stripeCustomer.findUnique({
          where: { stripe_customer_id: invoice.customer as string },
        })

        if (!customer) {
          console.warn(`Stripe customer mapping not found for customer: ${invoice.customer}`)
          break
        }

        await prisma.payment.create({
          data: {
            clinic_id: customer.clinic_id,
            stripe_payment_intent: invoice.payment_intent as string,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_due,
            currency: invoice.currency,
            status: PaymentStatus.FAILED,
            description: invoice.billing_reason || 'Falha no pagamento da mensalidade',
          },
        })

        await prisma.subscription.update({
          where: { clinic_id: customer.clinic_id },
          data: { status: SubscriptionStatus.PAST_DUE },
        })

        console.log(`Payment logged as FAILED for clinic: ${customer.clinic_id}`)
        break
      }

      default:
        console.log(`Webhook event ignored: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error(`Error processing webhook event ${event.type}:`, error)
    return NextResponse.json({
      error: 'PROCESSING_FAILED',
      message: error instanceof Error ? error.message : 'Falha ao processar webhook.',
    }, { status: 500 })
  }
}
