import { describe, expect, it } from 'vitest'

import {
  DIAS_PARA_AVISAR_FIM_DO_TESTE,
  resolveTrialStatus,
  type AssinaturaParaTeste,
} from '@/lib/plans/trial-status'

const AGORA = new Date('2026-08-26T12:00:00.000Z')

function emDias(dias: number): Date {
  return new Date(AGORA.getTime() + dias * 24 * 60 * 60 * 1000)
}

function assinatura(patch: Partial<AssinaturaParaTeste> = {}): AssinaturaParaTeste {
  return {
    status: 'TRIALING',
    trial_ends_at: emDias(30),
    stripe_subscription_id: null,
    ...patch,
  }
}

describe('resolveTrialStatus', () => {
  it('não avisa quando não existe assinatura', () => {
    expect(resolveTrialStatus(null, AGORA)).toEqual({
      estado: 'sem-teste',
      diasRestantes: null,
      diasVencido: null,
      avisar: false,
    })
  })

  it.each(['ACTIVE', 'CANCELED', 'PAST_DUE'])('não avisa com status %s', (status) => {
    const resultado = resolveTrialStatus(assinatura({ status }), AGORA)

    expect(resultado.estado).toBe('sem-teste')
    expect(resultado.avisar).toBe(false)
  })

  // A distinção que motivou o módulo: teste com assinatura no Stripe tem cartão
  // e converte sozinho. Avisar ali seria pedir para assinar a quem já assinou.
  it('cala quando o teste é do Stripe, mesmo com a data vencida', () => {
    const resultado = resolveTrialStatus(
      assinatura({ trial_ends_at: emDias(-90), stripe_subscription_id: 'sub_123' }),
      AGORA
    )

    expect(resultado.estado).toBe('gerenciado-pelo-stripe')
    expect(resultado.avisar).toBe(false)
  })

  it('não acusa vencimento sem data de fim', () => {
    const resultado = resolveTrialStatus(assinatura({ trial_ends_at: null }), AGORA)

    expect(resultado.estado).toBe('sem-data')
    expect(resultado.avisar).toBe(false)
  })

  it('fica calado no começo do teste', () => {
    const resultado = resolveTrialStatus(assinatura({ trial_ends_at: emDias(7) }), AGORA)

    expect(resultado.estado).toBe('em-andamento')
    expect(resultado.diasRestantes).toBe(7)
    expect(resultado.avisar).toBe(false)
  })

  it(`avisa a partir de ${DIAS_PARA_AVISAR_FIM_DO_TESTE} dias restantes`, () => {
    const resultado = resolveTrialStatus(
      assinatura({ trial_ends_at: emDias(DIAS_PARA_AVISAR_FIM_DO_TESTE) }),
      AGORA
    )

    expect(resultado.estado).toBe('em-andamento')
    expect(resultado.avisar).toBe(true)
  })

  // Sobra de minutos ainda é um dia de teste de pé: `ceil`, não `floor`.
  it('arredonda para cima o último dia', () => {
    const resultado = resolveTrialStatus(
      assinatura({ trial_ends_at: new Date(AGORA.getTime() + 60 * 1000) }),
      AGORA
    )

    expect(resultado.estado).toBe('em-andamento')
    expect(resultado.diasRestantes).toBe(1)
  })

  it('trata a data exata do fim como vencida', () => {
    const resultado = resolveTrialStatus(assinatura({ trial_ends_at: AGORA }), AGORA)

    expect(resultado.estado).toBe('vencido')
    expect(resultado.diasVencido).toBe(0)
  })

  // O caso real da Mais Visão: cadastrada em 27/05, teste até 03/06, sem Stripe.
  it('reconhece o teste local vencido há muito tempo', () => {
    const resultado = resolveTrialStatus(
      {
        status: 'TRIALING',
        trial_ends_at: new Date('2026-06-03T00:00:00.000Z'),
        stripe_subscription_id: null,
      },
      AGORA
    )

    expect(resultado.estado).toBe('vencido')
    expect(resultado.diasVencido).toBe(84)
    expect(resultado.avisar).toBe(true)
  })

  it('aceita data em string, como vem de JSON', () => {
    const resultado = resolveTrialStatus(
      assinatura({ trial_ends_at: '2026-06-03T00:00:00.000Z' }),
      AGORA
    )

    expect(resultado.estado).toBe('vencido')
    expect(resultado.diasVencido).toBe(84)
  })

  it('não quebra com data inválida', () => {
    const resultado = resolveTrialStatus(assinatura({ trial_ends_at: 'não é data' }), AGORA)

    expect(resultado.estado).toBe('sem-data')
    expect(resultado.avisar).toBe(false)
  })
})
