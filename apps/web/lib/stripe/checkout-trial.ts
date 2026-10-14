// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/checkout-trial.ts
// Quanto de teste o Checkout ainda deve conceder.
// ─────────────────────────────────────────────────────────────────────────────

import { TRIAL_PERIOD_DAYS } from './products'

/**
 * O Stripe recusa `trial_end` a menos de 48h no futuro. Abaixo disso, o resto
 * do teste vira cobrança imediata em vez de erro no checkout.
 */
export const STRIPE_MIN_TRIAL_END_MS = 48 * 60 * 60 * 1000

export interface AssinaturaParaCheckout {
  status: string | null
  trial_ends_at: Date | string | null
  stripe_subscription_id: string | null
}

export type CheckoutTrial =
  | { kind: 'full'; trialPeriodDays: number }
  | { kind: 'until'; trialEnd: number }
  | { kind: 'none' }

/**
 * Os 7 dias grátis contam do cadastro, não do checkout.
 *
 * Antes, todo checkout ganhava `trial_period_days: 7` novos. A clínica que já
 * tinha usado o teste local inteiro cadastrava o cartão e o Stripe não cobrava
 * nada por mais uma semana — para quem acabou de clicar em "ativar", parecia
 * que o pagamento simplesmente não tinha acontecido.
 *
 * - Sem linha de assinatura: nunca teve teste, ganha o período inteiro.
 * - Teste local em andamento: o Stripe herda a data de fim que já existe.
 * - Qualquer outro caso (teste vencido, assinatura que já passou pelo Stripe):
 *   sem teste, cobra no ato.
 */
export function resolveCheckoutTrial(
  assinatura: AssinaturaParaCheckout | null,
  agora: Date = new Date()
): CheckoutTrial {
  if (!assinatura) {
    return { kind: 'full', trialPeriodDays: TRIAL_PERIOD_DAYS }
  }

  if (assinatura.status !== 'TRIALING' || assinatura.stripe_subscription_id) {
    return { kind: 'none' }
  }

  const fim = assinatura.trial_ends_at === null ? null : new Date(assinatura.trial_ends_at)

  if (!fim || Number.isNaN(fim.getTime())) {
    return { kind: 'none' }
  }

  if (fim.getTime() - agora.getTime() < STRIPE_MIN_TRIAL_END_MS) {
    return { kind: 'none' }
  }

  return { kind: 'until', trialEnd: Math.floor(fim.getTime() / 1000) }
}
