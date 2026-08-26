import { describe, expect, it } from 'vitest'

import {
  firstDayOfMonth,
  periodFromPreset,
  resolvePeriod,
} from '@/lib/financeiro/financeiro-period'

const HOJE = '2026-08-26'

describe('periodFromPreset', () => {
  it('hoje é o mesmo dia nas duas pontas', () => {
    expect(periodFromPreset('hoje', HOJE)).toMatchObject({ from: HOJE, to: HOJE })
  })

  // Seis dias atrás mais hoje = sete dias. -7 daria oito.
  it('7dias inclui hoje e volta seis', () => {
    expect(periodFromPreset('7dias', HOJE)).toMatchObject({ from: '2026-08-20', to: HOJE })
  })

  it('mes começa no dia 1', () => {
    expect(periodFromPreset('mes', HOJE)).toMatchObject({ from: '2026-08-01', to: HOJE })
  })

  it('atravessa a virada de mês', () => {
    expect(periodFromPreset('7dias', '2026-09-02')).toMatchObject({ from: '2026-08-27' })
  })
})

describe('firstDayOfMonth', () => {
  it.each([
    ['2026-08-26', '2026-08-01'],
    ['2026-01-31', '2026-01-01'],
    ['2026-12-01', '2026-12-01'],
  ])('%s → %s', (entrada, esperado) => {
    expect(firstDayOfMonth(entrada)).toBe(esperado)
  })
})

describe('resolvePeriod', () => {
  it('sem querystring, mostra hoje', () => {
    expect(resolvePeriod(undefined, HOJE)).toMatchObject({ from: HOJE, to: HOJE, preset: 'hoje' })
  })

  it('datas explícitas ganham do preset', () => {
    const periodo = resolvePeriod(
      { preset: 'mes', from: '2026-08-01', to: '2026-08-15' },
      HOJE
    )

    expect(periodo).toMatchObject({ from: '2026-08-01', to: '2026-08-15', preset: null })
  })

  // Invertido é engano de digitação, não pedido de intervalo vazio.
  it('endireita intervalo invertido em vez de devolver vazio', () => {
    const periodo = resolvePeriod({ from: '2026-08-20', to: '2026-08-10' }, HOJE)

    expect(periodo).toMatchObject({ from: '2026-08-10', to: '2026-08-20' })
  })

  it.each([
    [{ preset: 'ontem' }],
    [{ from: '26/08/2026', to: '2026-08-26' }],
    [{ from: '2026-08-26' }], // só uma ponta não define intervalo
    [{ from: '2026-13-45', to: '2026-08-26' }],
  ])('cai em hoje quando a querystring é inválida: %o', (query) => {
    expect(resolvePeriod(query, HOJE)).toMatchObject({ from: HOJE, to: HOJE, preset: 'hoje' })
  })

  it('aceita preset válido', () => {
    expect(resolvePeriod({ preset: '7dias' }, HOJE)).toMatchObject({ preset: '7dias' })
  })

  it('rotula intervalo de um dia só como dia selecionado', () => {
    const periodo = resolvePeriod({ from: '2026-08-10', to: '2026-08-10' }, HOJE)

    expect(periodo.label).toBe('Dia selecionado')
  })
})
