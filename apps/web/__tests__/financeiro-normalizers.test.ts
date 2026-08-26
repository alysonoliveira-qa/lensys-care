import { describe, expect, it } from 'vitest'

import {
  MAX_AMOUNT_CENTS,
  formatCents,
  formatCurrency,
  parseAmountToCents,
  summarizeEntries,
  validateFinancialEntryInput,
} from '@/lib/financeiro/financeiro-normalizers'

describe('parseAmountToCents', () => {
  it.each([
    ['150', 15000],
    ['150,00', 15000],
    ['150,5', 15050],
    ['150,50', 15050],
    ['0,99', 99],
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1.234', 123400],
    ['12.345,678', null], // três casas depois da vírgula não é centavo
    ['1234.56', 123456],
    ['R$ 150,00', 15000],
    ['  150  ', 15000],
  ])('lê %s como %s', (entrada, esperado) => {
    expect(parseAmountToCents(entrada)).toBe(esperado)
  })

  // A armadilha que motivou o parser próprio: `Number('1.234')` é 1.234, então
  // mil duzentos e trinta e quatro reais viraria um real e vinte e três centavos.
  it('trata ponto com três casas como milhar, não como decimal', () => {
    expect(parseAmountToCents('1.234')).toBe(123400)
    expect(parseAmountToCents('12.000')).toBe(1200000)
  })

  it('aceita ponto com uma ou duas casas como decimal', () => {
    expect(parseAmountToCents('1.5')).toBe(150)
    expect(parseAmountToCents('1.50')).toBe(150)
  })

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['-50'],
    ['0'],
    ['0,00'],
    ['1,234'],
    ['1.2.3'],
    ['1,2,3'],
    ['1.234,56.78'],
    ['12.34.567'],
    ['R$'],
  ])('recusa %s', (entrada) => {
    expect(parseAmountToCents(entrada)).toBeNull()
  })

  it('recusa valor acima do teto', () => {
    expect(parseAmountToCents('1000000,01')).toBeNull()
    expect(parseAmountToCents('1000000')).toBe(MAX_AMOUNT_CENTS)
  })

  it('faz a volta completa com formatCents', () => {
    for (const valor of ['0,01', '9,99', '150,00', '1.234,56', '99.999,99']) {
      expect(formatCents(parseAmountToCents(valor) as number)).toBe(valor)
    }
  })
})

describe('formatCents', () => {
  it.each([
    [0, '0,00'],
    [1, '0,01'],
    [99, '0,99'],
    [100, '1,00'],
    [15000, '150,00'],
    [123456, '1.234,56'],
    [100000000, '1.000.000,00'],
    [-5000, '-50,00'],
  ])('formata %i como %s', (cents, esperado) => {
    expect(formatCents(cents)).toBe(esperado)
  })

  it('prefixa com R$ em formatCurrency', () => {
    expect(formatCurrency(123456)).toBe('R$ 1.234,56')
  })
})

describe('summarizeEntries', () => {
  it('soma entradas e saídas separadamente', () => {
    const resumo = summarizeEntries([
      { type: 'INCOME', amount_cents: 15000 },
      { type: 'INCOME', amount_cents: 5000 },
      { type: 'EXPENSE', amount_cents: 3000 },
    ])

    expect(resumo).toEqual({
      incomeCents: 20000,
      expenseCents: 3000,
      balanceCents: 17000,
      entryCount: 3,
    })
  })

  it('devolve zeros para período sem lançamento', () => {
    expect(summarizeEntries([])).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      entryCount: 0,
    })
  })

  // Dia de pagar indicante sem atendimento fecha no vermelho, e esconder isso
  // seria mentir no único número que a clínica olha.
  it('deixa o saldo negativo aparecer', () => {
    const resumo = summarizeEntries([{ type: 'EXPENSE', amount_cents: 3000 }])

    expect(resumo.balanceCents).toBe(-3000)
  })
})

describe('validateFinancialEntryInput', () => {
  const valido = {
    type: 'INCOME',
    amount: '150,00',
    description: 'Consulta particular',
    paymentMethod: 'PIX',
    entryDate: '2026-08-26',
  }

  it('normaliza uma entrada válida', () => {
    const resultado = validateFinancialEntryInput(valido)

    expect(resultado).toEqual({
      ok: true,
      value: {
        type: 'INCOME',
        amountCents: 15000,
        description: 'Consulta particular',
        paymentMethod: 'PIX',
        entryDate: '2026-08-26',
        patientId: null,
        referrerId: null,
      },
    })
  })

  it('colapsa espaço na descrição', () => {
    const resultado = validateFinancialEntryInput({
      ...valido,
      description: '  Venda   de    armação  ',
    })

    expect(resultado).toMatchObject({ ok: true, value: { description: 'Venda de armação' } })
  })

  it('trata id vazio como ausente', () => {
    const resultado = validateFinancialEntryInput({ ...valido, patientId: '', referrerId: '   ' })

    expect(resultado).toMatchObject({ ok: true, value: { patientId: null, referrerId: null } })
  })

  it.each([
    ['type', { type: 'TRANSFER' }],
    ['amount', { amount: 'abc' }],
    ['description', { description: '   ' }],
    ['paymentMethod', { paymentMethod: 'BITCOIN' }],
    ['entryDate', { entryDate: '26/08/2026' }],
  ])('acusa erro no campo %s', (campo, patch) => {
    const resultado = validateFinancialEntryInput({ ...valido, ...patch })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.errors).toHaveProperty(campo)
    }
  })

  it('recusa descrição longa demais', () => {
    const resultado = validateFinancialEntryInput({ ...valido, description: 'x'.repeat(201) })

    expect(resultado.ok).toBe(false)
  })

  it('junta todos os erros em vez de parar no primeiro', () => {
    const resultado = validateFinancialEntryInput({
      type: 'NADA',
      amount: '',
      description: '',
      paymentMethod: 'NADA',
      entryDate: '',
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(Object.keys(resultado.errors).sort()).toEqual([
        'amount',
        'description',
        'entryDate',
        'paymentMethod',
        'type',
      ])
    }
  })
})
