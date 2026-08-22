import { describe, expect, it } from 'vitest'

import {
  mapStripeStatus,
  readId,
  readInvoicePriceId,
  readInvoiceSubscriptionId,
  readPeriodEnd,
  readSubscriptionPriceId,
  toDate,
} from '../lib/stripe/stripe-normalizers'

describe('toDate', () => {
  it('converte segundos-unix em Date', () => {
    expect(toDate(1_760_000_000)?.toISOString()).toBe('2025-10-09T08:53:20.000Z')
  })

  it('devolve null para valores ausentes ou inválidos', () => {
    // O campo sumir do payload é o caso que derrubava o webhook: `new Date(undefined * 1000)`
    // vira Invalid Date e o Prisma lança na hora de gravar.
    expect(toDate(undefined)).toBeNull()
    expect(toDate(null)).toBeNull()
    expect(toDate(0)).toBeNull()
    expect(toDate(Number.NaN)).toBeNull()
  })
})

describe('readId', () => {
  it('aceita os dois formatos que o Stripe usa conforme o expand', () => {
    expect(readId('cus_123')).toBe('cus_123')
    expect(readId({ id: 'cus_123' })).toBe('cus_123')
  })

  it('devolve null para ausente ou vazio', () => {
    expect(readId(null)).toBeNull()
    expect(readId(undefined)).toBeNull()
    expect(readId('')).toBeNull()
    expect(readId({})).toBeNull()
  })
})

describe('readPeriodEnd', () => {
  it('lê do item da assinatura (formato novo da API)', () => {
    const periodEnd = readPeriodEnd({
      id: 'sub_1',
      items: { data: [{ current_period_end: 1_760_000_000 }] },
    })

    expect(periodEnd?.toISOString()).toBe('2025-10-09T08:53:20.000Z')
  })

  it('cai para o campo da assinatura (formato antigo da API)', () => {
    const periodEnd = readPeriodEnd({
      id: 'sub_1',
      current_period_end: 1_760_000_000,
      items: { data: [{}] },
    })

    expect(periodEnd?.toISOString()).toBe('2025-10-09T08:53:20.000Z')
  })

  it('prefere o item quando os dois formatos vêm juntos', () => {
    const periodEnd = readPeriodEnd({
      id: 'sub_1',
      current_period_end: 1_000_000_000,
      items: { data: [{ current_period_end: 1_760_000_000 }] },
    })

    expect(periodEnd?.toISOString()).toBe('2025-10-09T08:53:20.000Z')
  })

  it('devolve null quando nenhum dos dois existe', () => {
    expect(readPeriodEnd({ id: 'sub_1' })).toBeNull()
    expect(readPeriodEnd({ id: 'sub_1', items: { data: [] } })).toBeNull()
  })
})

describe('readSubscriptionPriceId', () => {
  it('lê o price do primeiro item', () => {
    expect(
      readSubscriptionPriceId({ id: 'sub_1', items: { data: [{ price: { id: 'price_abc' } }] } })
    ).toBe('price_abc')
  })

  it('devolve null quando o item ou o price não vêm', () => {
    expect(readSubscriptionPriceId({ id: 'sub_1' })).toBeNull()
    expect(readSubscriptionPriceId({ id: 'sub_1', items: { data: [{ price: null }] } })).toBeNull()
  })
})

describe('readInvoiceSubscriptionId', () => {
  it('lê do campo direto (formato antigo)', () => {
    expect(readInvoiceSubscriptionId({ subscription: 'sub_1' })).toBe('sub_1')
  })

  it('lê de parent.subscription_details (formato novo)', () => {
    expect(
      readInvoiceSubscriptionId({
        parent: { subscription_details: { subscription: 'sub_2' } },
      })
    ).toBe('sub_2')
  })

  it('devolve null quando a invoice não tem assinatura', () => {
    expect(readInvoiceSubscriptionId({})).toBeNull()
    expect(readInvoiceSubscriptionId({ parent: { subscription_details: {} } })).toBeNull()
  })
})

describe('readInvoicePriceId', () => {
  it('lê o price da primeira linha', () => {
    expect(readInvoicePriceId({ lines: { data: [{ price: { id: 'price_x' } }] } })).toBe('price_x')
  })

  it('devolve null sem linhas', () => {
    expect(readInvoicePriceId({})).toBeNull()
  })
})

describe('mapStripeStatus', () => {
  it('mapeia os status ativos', () => {
    expect(mapStripeStatus('active')).toBe('ACTIVE')
    expect(mapStripeStatus('trialing')).toBe('TRIALING')
  })

  it('mapeia cancelamento', () => {
    expect(mapStripeStatus('canceled')).toBe('CANCELED')
  })

  it('trata toda variação de inadimplência como PAST_DUE', () => {
    expect(mapStripeStatus('past_due')).toBe('PAST_DUE')
    expect(mapStripeStatus('unpaid')).toBe('PAST_DUE')
    expect(mapStripeStatus('incomplete')).toBe('PAST_DUE')
    expect(mapStripeStatus('incomplete_expired')).toBe('PAST_DUE')
  })

  it('não deixa status desconhecido virar acesso liberado', () => {
    expect(mapStripeStatus('algo_novo_do_stripe')).toBe('PAST_DUE')
    expect(mapStripeStatus(undefined)).toBe('PAST_DUE')
    expect(mapStripeStatus(null)).toBe('PAST_DUE')
  })
})
