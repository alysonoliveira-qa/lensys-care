import { describe, expect, it } from 'vitest'

import { resolveCheckoutTrial } from '../lib/stripe/checkout-trial'

const AGORA = new Date('2026-10-14T12:00:00Z')
const DIA = 24 * 60 * 60 * 1000

function testeLocal(fim: Date | null) {
  return { status: 'TRIALING', trial_ends_at: fim, stripe_subscription_id: null }
}

describe('resolveCheckoutTrial', () => {
  it('sem assinatura nenhuma, concede o teste inteiro', () => {
    expect(resolveCheckoutTrial(null, AGORA)).toEqual({ kind: 'full', trialPeriodDays: 7 })
  })

  it('teste local vencido cobra no ato', () => {
    expect(resolveCheckoutTrial(testeLocal(new Date(AGORA.getTime() - 30 * DIA)), AGORA)).toEqual({
      kind: 'none',
    })
  })

  it('teste local em andamento passa a mesma data de fim ao Stripe', () => {
    const fim = new Date(AGORA.getTime() + 5 * DIA)

    expect(resolveCheckoutTrial(testeLocal(fim), AGORA)).toEqual({
      kind: 'until',
      trialEnd: Math.floor(fim.getTime() / 1000),
    })
  })

  it('menos de 48h de teste restante cobra no ato (o Stripe recusaria a data)', () => {
    const fim = new Date(AGORA.getTime() + 47 * 60 * 60 * 1000)

    expect(resolveCheckoutTrial(testeLocal(fim), AGORA)).toEqual({ kind: 'none' })
  })

  it('teste local sem data não ganha teste novo', () => {
    expect(resolveCheckoutTrial(testeLocal(null), AGORA)).toEqual({ kind: 'none' })
  })

  it('assinatura que já passou pelo Stripe não ganha outro teste', () => {
    expect(
      resolveCheckoutTrial(
        { status: 'CANCELED', trial_ends_at: null, stripe_subscription_id: null },
        AGORA
      )
    ).toEqual({ kind: 'none' })
  })
})
