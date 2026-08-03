import { describe, expect, it } from 'vitest'

import {
  REFERRER_NONE_OPTION,
  mapReferrerToRow,
  mapReferrersToOptions,
  mapReferrersToRows,
  type ReferrerWithPendingRecord,
} from '../lib/referrers/referrers-mappers'

function record(
  overrides: Partial<ReferrerWithPendingRecord> & { id: string }
): ReferrerWithPendingRecord {
  return {
    name: 'Ótica Central',
    pix_key: null,
    whatsapp: null,
    active: true,
    _count: { appointments: 0 },
    ...overrides,
  }
}

describe('mapReferrerToRow', () => {
  it('exposes the pending counter and the payment affordances', () => {
    const row = mapReferrerToRow(
      record({
        id: 'r1',
        name: 'Ótica Central',
        pix_key: 'otica@email.com',
        whatsapp: '(11) 99999-9999',
        _count: { appointments: 3 },
      })
    )

    expect(row).toMatchObject({
      id: 'r1',
      name: 'Ótica Central',
      pixKey: 'otica@email.com',
      whatsapp: '(11) 99999-9999',
      active: true,
      pendingCount: 3,
      hasPendingReferrals: true,
      hasPixKey: true,
      pendingLabel: '3 indicações pendentes',
    })
  })

  it('hides the payment flow when there is nothing pending', () => {
    const row = mapReferrerToRow(record({ id: 'r2', _count: { appointments: 0 } }))

    expect(row.hasPendingReferrals).toBe(false)
    expect(row.pendingLabel).toBe('Nenhuma indicação pendente')
  })

  it('uses the singular for a single pending referral', () => {
    expect(mapReferrerToRow(record({ id: 'r3', _count: { appointments: 1 } })).pendingLabel).toBe(
      '1 indicação pendente'
    )
  })

  it('flags a referrer without a PIX key (still payable, just nothing to show)', () => {
    const row = mapReferrerToRow(record({ id: 'r4', _count: { appointments: 2 } }))

    expect(row.hasPixKey).toBe(false)
    expect(row.pixKey).toBeNull()
    expect(row.hasPendingReferrals).toBe(true)
  })
})

describe('mapReferrersToRows', () => {
  it('sorts by name honoring PT-BR accents', () => {
    const rows = mapReferrersToRows([
      record({ id: 'c', name: 'Zuleica' }),
      record({ id: 'a', name: 'Ângela' }),
      record({ id: 'b', name: 'Bruno' }),
    ])

    expect(rows.map((row) => row.name)).toEqual(['Ângela', 'Bruno', 'Zuleica'])
  })
})

describe('mapReferrersToOptions', () => {
  it('puts "sem indicante" first and lists the referrers by name', () => {
    const options = mapReferrersToOptions([
      record({ id: 'b', name: 'Bruno' }),
      record({ id: 'a', name: 'Ana' }),
    ])

    expect(options[0]).toEqual(REFERRER_NONE_OPTION)
    expect(options.slice(1)).toEqual([
      { value: 'a', label: 'Ana' },
      { value: 'b', label: 'Bruno' },
    ])
  })
})
