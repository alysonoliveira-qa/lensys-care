import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedProfile: vi.fn(),
  createReferrer: vi.fn(),
  updateReferrer: vi.fn(),
  setReferrerActive: vi.fn(),
  markReferralsPaid: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock('@/lib/auth/authenticated-profile', () => ({
  getAuthenticatedProfile: mocks.getAuthenticatedProfile,
}))

vi.mock('@/lib/referrers/referrers-data', () => ({
  createReferrer: mocks.createReferrer,
  updateReferrer: mocks.updateReferrer,
  setReferrerActive: mocks.setReferrerActive,
  markReferralsPaid: mocks.markReferralsPaid,
}))

import {
  createReferrer,
  markReferralsPaid,
  setReferrerActive,
} from '../app/(dashboard)/patients/referrers-actions'

const IDLE = { status: 'idle' as const, message: '' }

function formData(entries: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value)
  }
  return data
}

describe('referrers actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedProfile.mockResolvedValue({
      id: 'profile-a',
      clinic_id: 'clinic-a',
      role: 'RECEPTIONIST',
    })
    mocks.createReferrer.mockResolvedValue({ ok: true, referrerId: 'referrer-1' })
    mocks.setReferrerActive.mockResolvedValue({ ok: true })
    mocks.markReferralsPaid.mockResolvedValue({
      ok: true,
      paidCount: 2,
      pendingCount: 0,
      paidAt: new Date('2026-08-02T18:00:00Z'),
    })
  })

  it('refuses every action without a session', async () => {
    mocks.getAuthenticatedProfile.mockResolvedValue(null)

    expect((await createReferrer(IDLE, formData({ name: 'Ana' }))).status).toBe('error')
    expect(
      (await markReferralsPaid(IDLE, formData({ referrer_id: 'r1' }))).status
    ).toBe('error')

    expect(mocks.createReferrer).not.toHaveBeenCalled()
    expect(mocks.markReferralsPaid).not.toHaveBeenCalled()
  })

  it('creates the referrer inside the session clinic, ignoring the form', async () => {
    const result = await createReferrer(
      IDLE,
      formData({ name: 'Ótica Central', pix_key: 'otica@pix.com', clinic_id: 'clinic-b' })
    )

    expect(result).toEqual({ status: 'success', message: 'Indicante cadastrado.' })
    expect(mocks.createReferrer).toHaveBeenCalledWith({
      clinicId: 'clinic-a',
      name: 'Ótica Central',
      pixKey: 'otica@pix.com',
      whatsapp: '',
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/patients')
  })

  it('returns the field errors of an invalid referrer', async () => {
    mocks.createReferrer.mockResolvedValue({
      ok: false,
      error: 'INVALID_INPUT',
      message: 'Informe o nome do indicante.',
      status: 400,
      errors: { name: 'Informe o nome do indicante.' },
    })

    const result = await createReferrer(IDLE, formData({ name: '' }))

    expect(result).toMatchObject({
      status: 'error',
      fieldErrors: { name: 'Informe o nome do indicante.' },
    })
  })

  it('rejects a deactivation without an explicit boolean', async () => {
    const result = await setReferrerActive(
      IDLE,
      formData({ referrer_id: 'r1', active: 'maybe' })
    )

    expect(result.status).toBe('error')
    expect(mocks.setReferrerActive).not.toHaveBeenCalled()
  })

  it('pays the pending referrals of the session clinic', async () => {
    const result = await markReferralsPaid(
      IDLE,
      formData({ referrer_id: 'r1', clinic_id: 'clinic-b' })
    )

    expect(result).toEqual({
      status: 'success',
      message: '2 indicações marcadas como pagas.',
    })
    expect(mocks.markReferralsPaid).toHaveBeenCalledWith({
      clinicId: 'clinic-a',
      referrerId: 'r1',
      // Quem paga vem da sessao: o lancamento de caixa precisa de autor.
      paidBy: 'profile-a',
    })
  })

  it('warns when new referrals appeared during the payment', async () => {
    mocks.markReferralsPaid.mockResolvedValue({
      ok: true,
      paidCount: 2,
      pendingCount: 1,
      paidAt: new Date(),
    })

    const result = await markReferralsPaid(IDLE, formData({ referrer_id: 'r1' }))

    expect(result.message).toContain('2 indicações marcadas como pagas.')
    expect(result.message).toContain('1 pendente')
  })

  it('says plainly when there was nothing to pay', async () => {
    mocks.markReferralsPaid.mockResolvedValue({
      ok: true,
      paidCount: 0,
      pendingCount: 0,
      paidAt: new Date(),
    })

    const result = await markReferralsPaid(IDLE, formData({ referrer_id: 'r1' }))

    expect(result.message).toBe('Não havia indicações pendentes para este indicante.')
  })
})
