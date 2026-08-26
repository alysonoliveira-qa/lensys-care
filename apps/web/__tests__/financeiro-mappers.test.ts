import { describe, expect, it } from 'vitest'

import {
  mapEntriesToRows,
  mapEntryToRow,
  toBrazilianDate,
  type FinancialEntryRecord,
} from '@/lib/financeiro/financeiro-mappers'

function record(patch: Partial<FinancialEntryRecord> = {}): FinancialEntryRecord {
  return {
    id: 'entry-1',
    type: 'INCOME',
    amount_cents: 15000,
    description: 'Consulta particular',
    payment_method: 'PIX',
    entry_date: new Date('2026-08-26T00:00:00.000Z'),
    created_at: new Date('2026-08-26T14:00:00.000Z'),
    patient: null,
    referrer: null,
    ...patch,
  }
}

describe('mapEntryToRow', () => {
  it('monta a linha de entrada com sinal e rótulo', () => {
    const row = mapEntryToRow(record())

    expect(row).toMatchObject({
      typeLabel: 'Entrada',
      amountLabel: '+ R$ 150,00',
      paymentMethodLabel: 'PIX',
      entryDate: '2026-08-26',
      entryDateLabel: '26/08/2026',
    })
  })

  it('usa o sinal de menos na saída', () => {
    const row = mapEntryToRow(record({ type: 'EXPENSE', amount_cents: 3000 }))

    expect(row.typeLabel).toBe('Saída')
    expect(row.amountLabel).toBe('− R$ 30,00')
  })

  // A mesma armadilha da agenda: DATE volta como instante UTC. Formatado com
  // getters locais em UTC-3, 26/08 vira 25/08 e o fechamento do dia sai errado.
  it('não desloca o dia em fuso negativo', () => {
    const row = mapEntryToRow(record({ entry_date: new Date('2026-08-26T00:00:00.000Z') }))

    expect(row.entryDate).toBe('2026-08-26')
    expect(row.entryDateLabel).toBe('26/08/2026')
  })

  it('liga ao paciente quando existe, com href próprio', () => {
    const row = mapEntryToRow(
      record({ patient: { id: 'patient-1', full_name: 'Maria Silva' } })
    )

    expect(row.linkedName).toBe('Maria Silva')
    expect(row.linkedHref).toBe('/patients/patient-1')
  })

  // Indicante não tem página própria: aparece o nome, sem link morto.
  it('mostra o indicante sem href', () => {
    const row = mapEntryToRow(
      record({ type: 'EXPENSE', referrer: { id: 'ref-1', name: 'Ótica Vizinha' } })
    )

    expect(row.linkedName).toBe('Ótica Vizinha')
    expect(row.linkedHref).toBeNull()
  })

  it('paciente ganha do indicante quando os dois existem', () => {
    const row = mapEntryToRow(
      record({
        patient: { id: 'patient-1', full_name: 'Maria Silva' },
        referrer: { id: 'ref-1', name: 'Ótica Vizinha' },
      })
    )

    expect(row.linkedName).toBe('Maria Silva')
  })

  it('deixa o vínculo nulo quando não há nenhum', () => {
    const row = mapEntryToRow(record())

    expect(row.linkedName).toBeNull()
    expect(row.linkedHref).toBeNull()
  })
})

describe('mapEntriesToRows', () => {
  it('preserva a ordem recebida do banco', () => {
    const rows = mapEntriesToRows([
      record({ id: 'a' }),
      record({ id: 'b' }),
      record({ id: 'c' }),
    ])

    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])
  })

  it('devolve lista vazia sem quebrar', () => {
    expect(mapEntriesToRows([])).toEqual([])
  })
})

describe('toBrazilianDate', () => {
  it.each([
    ['2026-08-26', '26/08/2026'],
    ['2026-01-01', '01/01/2026'],
    ['2026-12-31', '31/12/2026'],
  ])('%s → %s', (entrada, esperado) => {
    expect(toBrazilianDate(entrada)).toBe(esperado)
  })
})
