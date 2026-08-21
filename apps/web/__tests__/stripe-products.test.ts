import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getPlanByPriceId, getPriceIdForPlan } from '../lib/stripe/products'

const ESSENCIAL_ENV = 'STRIPE_ESSENCIAL_MONTHLY_PRICE_ID'
const CONECTA_ENV = 'STRIPE_CONECTA_MONTHLY_PRICE_ID'

let original: Record<string, string | undefined>

beforeEach(() => {
  original = {
    [ESSENCIAL_ENV]: process.env[ESSENCIAL_ENV],
    [CONECTA_ENV]: process.env[CONECTA_ENV],
  }
})

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('getPriceIdForPlan', () => {
  it('devolve o price configurado para cada plano', () => {
    process.env[ESSENCIAL_ENV] = 'price_essencial'
    process.env[CONECTA_ENV] = 'price_conecta'

    expect(getPriceIdForPlan('ESSENTIAL')).toBe('price_essencial')
    expect(getPriceIdForPlan('CONECTA')).toBe('price_conecta')
  })

  it('lança quando a env var do plano não está configurada', () => {
    delete process.env[CONECTA_ENV]

    // Falhar aqui é melhor que seguir e cobrar pelo preço errado.
    expect(() => getPriceIdForPlan('CONECTA')).toThrow(CONECTA_ENV)
  })
})

describe('getPlanByPriceId', () => {
  it('resolve o plano a partir do price', () => {
    process.env[ESSENCIAL_ENV] = 'price_essencial'
    process.env[CONECTA_ENV] = 'price_conecta'

    expect(getPlanByPriceId('price_conecta')).toBe('CONECTA')
    expect(getPlanByPriceId('price_essencial')).toBe('ESSENTIAL')
  })

  it('devolve null para price desconhecido em vez de adivinhar', () => {
    process.env[ESSENCIAL_ENV] = 'price_essencial'
    process.env[CONECTA_ENV] = 'price_conecta'

    expect(getPlanByPriceId('price_de_outra_conta')).toBeNull()
    expect(getPlanByPriceId(null)).toBeNull()
    expect(getPlanByPriceId(undefined)).toBeNull()
  })

  it('não confunde planos quando uma env var está ausente', () => {
    // Regressão do bug real: com um objeto literal, as duas chaves viravam
    // "undefined" e colapsavam numa só — todo checkout de Conecta era gravado
    // como Essential, em silêncio.
    delete process.env[ESSENCIAL_ENV]
    process.env[CONECTA_ENV] = 'price_conecta'

    expect(getPlanByPriceId('price_conecta')).toBe('CONECTA')
    expect(getPlanByPriceId(undefined)).toBeNull()
  })

  it('devolve null quando nenhuma env var está configurada', () => {
    delete process.env[ESSENCIAL_ENV]
    delete process.env[CONECTA_ENV]

    expect(getPlanByPriceId('price_conecta')).toBeNull()
  })
})
