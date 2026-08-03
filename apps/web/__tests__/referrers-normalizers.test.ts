import { describe, expect, it } from 'vitest'

import {
  countPendingReferrals,
  isPendingReferral,
  validateReferrerInput,
} from '../lib/referrers/referrers-normalizers'

describe('validateReferrerInput', () => {
  it('requires only the name and trims it', () => {
    expect(validateReferrerInput({ name: '  Ótica Central  ' })).toEqual({
      ok: true,
      value: { name: 'Ótica Central', pixKey: null, whatsapp: null },
    })
  })

  it('rejects an empty or too short name', () => {
    for (const name of ['', '   ', 'A']) {
      const result = validateReferrerInput({ name })
      expect(result.ok, name).toBe(false)
      expect(result.ok === false && result.errors.name, name).toBeTruthy()
    }
  })

  it('keeps optional PIX key and WhatsApp as typed, turning empty into null', () => {
    expect(
      validateReferrerInput({
        name: 'João Indicador',
        pixKey: '  joao@email.com ',
        whatsapp: ' (11) 99999-9999 ',
      })
    ).toEqual({
      ok: true,
      value: {
        name: 'João Indicador',
        pixKey: 'joao@email.com',
        whatsapp: '(11) 99999-9999',
      },
    })

    expect(validateReferrerInput({ name: 'João', pixKey: '  ', whatsapp: '' })).toEqual({
      ok: true,
      value: { name: 'João', pixKey: null, whatsapp: null },
    })
  })

  it('rejects a WhatsApp without a plausible number of digits', () => {
    for (const whatsapp of ['99999', '(11) 9999', '119999999999999999']) {
      const result = validateReferrerInput({ name: 'João', whatsapp })
      expect(result.ok, whatsapp).toBe(false)
      expect(result.ok === false && result.errors.whatsapp, whatsapp).toBeTruthy()
    }
  })

  it('accepts a WhatsApp with or without country code', () => {
    expect(validateReferrerInput({ name: 'João', whatsapp: '11999999999' }).ok).toBe(true)
    expect(validateReferrerInput({ name: 'João', whatsapp: '+55 11 99999-9999' }).ok).toBe(true)
    expect(validateReferrerInput({ name: 'João', whatsapp: '1133334444' }).ok).toBe(true)
  })

  it('rejects an absurdly long PIX key', () => {
    const result = validateReferrerInput({ name: 'João', pixKey: 'x'.repeat(200) })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.errors.pixKey).toBeTruthy()
  })
})

describe('isPendingReferral', () => {
  const attendedWithReferrer = {
    status: 'ATTENDED' as const,
    referrer_id: 'referrer-1',
    referral_paid_at: null,
  }

  it('counts an attended appointment linked to a referrer and not yet paid', () => {
    expect(isPendingReferral(attendedWithReferrer)).toBe(true)
  })

  it('ignores appointments that are only scheduled or canceled', () => {
    expect(isPendingReferral({ ...attendedWithReferrer, status: 'SCHEDULED' })).toBe(false)
    expect(isPendingReferral({ ...attendedWithReferrer, status: 'CANCELED' })).toBe(false)
  })

  it('ignores appointments without a referrer', () => {
    expect(isPendingReferral({ ...attendedWithReferrer, referrer_id: null })).toBe(false)
  })

  it('ignores referrals already paid', () => {
    expect(
      isPendingReferral({
        ...attendedWithReferrer,
        referral_paid_at: new Date('2026-08-02T18:00:00Z'),
      })
    ).toBe(false)
  })
})

describe('countPendingReferrals', () => {
  it('counts only the pending ones', () => {
    expect(
      countPendingReferrals([
        { status: 'ATTENDED', referrer_id: 'r1', referral_paid_at: null },
        { status: 'ATTENDED', referrer_id: 'r1', referral_paid_at: new Date() },
        { status: 'SCHEDULED', referrer_id: 'r1', referral_paid_at: null },
        { status: 'ATTENDED', referrer_id: null, referral_paid_at: null },
        { status: 'ATTENDED', referrer_id: 'r2', referral_paid_at: null },
      ])
    ).toBe(2)
  })

  it('returns zero for an empty list', () => {
    expect(countPendingReferrals([])).toBe(0)
  })
})
