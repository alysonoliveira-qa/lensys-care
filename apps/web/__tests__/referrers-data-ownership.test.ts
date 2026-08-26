import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  referrerFindMany: vi.fn(),
  referrerFindFirst: vi.fn(),
  referrerCreate: vi.fn(),
  referrerUpdateMany: vi.fn(),
  appointmentUpdateMany: vi.fn(),
  appointmentCount: vi.fn(),
  financialEntryCreate: vi.fn(),
}))

const tx = {
  referrer: { findFirst: mocks.referrerFindFirst },
  appointment: {
    updateMany: mocks.appointmentUpdateMany,
    count: mocks.appointmentCount,
  },
  financialEntry: { create: mocks.financialEntryCreate },
}

vi.mock('@/lib/db', () => ({
  prisma: {
    referrer: {
      findMany: mocks.referrerFindMany,
      findFirst: mocks.referrerFindFirst,
      create: mocks.referrerCreate,
      updateMany: mocks.referrerUpdateMany,
    },
    appointment: {
      updateMany: mocks.appointmentUpdateMany,
      count: mocks.appointmentCount,
    },
    $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
  },
}))

import {
  createReferrer,
  listReferrers,
  listReferrersWithPendingCount,
  markReferralsPaid,
  setReferrerActive,
  updateReferrer,
} from '../lib/referrers/referrers-data'

describe('referrers data — tenant na borda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.referrerFindMany.mockResolvedValue([])
    mocks.referrerFindFirst.mockResolvedValue({ id: 'referrer-clinic-a' })
    mocks.referrerCreate.mockResolvedValue({ id: 'referrer-1' })
    mocks.referrerUpdateMany.mockResolvedValue({ count: 1 })
    mocks.appointmentUpdateMany.mockResolvedValue({ count: 3 })
    mocks.appointmentCount.mockResolvedValue(0)
    mocks.financialEntryCreate.mockResolvedValue({ id: 'entry-1' })
  })

  it('lists referrers scoped by clinic, ordered by name', async () => {
    await listReferrers('clinic-a')

    const args = mocks.referrerFindMany.mock.calls[0][0]
    expect(args.where).toEqual({ clinic_id: 'clinic-a' })
    expect(args.orderBy).toEqual({ name: 'asc' })
  })

  it('filters inactive referrers out of the dropdown', async () => {
    await listReferrers('clinic-a', { activeOnly: true })

    expect(mocks.referrerFindMany.mock.calls[0][0].where).toEqual({
      clinic_id: 'clinic-a',
      active: true,
    })
  })

  it('counts only attended, linked and unpaid appointments as pending', async () => {
    await listReferrersWithPendingCount('clinic-a')

    const args = mocks.referrerFindMany.mock.calls[0][0]
    expect(args.where).toEqual({ clinic_id: 'clinic-a' })
    expect(args.select._count.select.appointments.where).toEqual({
      clinic_id: 'clinic-a',
      status: 'ATTENDED',
      referral_paid_at: null,
    })
  })

  it('creates a referrer inside the caller clinic', async () => {
    const result = await createReferrer({
      clinicId: 'clinic-a',
      name: '  Ótica Central  ',
      pixKey: '',
      whatsapp: '11999999999',
    })

    expect(result).toEqual({ ok: true, referrerId: 'referrer-1' })
    expect(mocks.referrerCreate.mock.calls[0][0].data).toEqual({
      clinic_id: 'clinic-a',
      name: 'Ótica Central',
      pix_key: null,
      whatsapp: '11999999999',
    })
  })

  it('rejects an invalid referrer before touching the database', async () => {
    const result = await createReferrer({ clinicId: 'clinic-a', name: ' ' })

    expect(result).toMatchObject({ ok: false, error: 'INVALID_INPUT', status: 400 })
    expect(mocks.referrerCreate).not.toHaveBeenCalled()
  })

  it('scopes update and deactivation by clinic', async () => {
    await updateReferrer({
      clinicId: 'clinic-a',
      referrerId: 'referrer-1',
      name: 'Novo Nome',
      pixKey: 'chave@pix.com',
    })

    expect(mocks.referrerUpdateMany.mock.calls[0][0]).toEqual({
      where: { id: 'referrer-1', clinic_id: 'clinic-a' },
      data: { name: 'Novo Nome', pix_key: 'chave@pix.com', whatsapp: null },
    })

    await setReferrerActive({ clinicId: 'clinic-a', referrerId: 'referrer-1', active: false })

    expect(mocks.referrerUpdateMany.mock.calls[1][0]).toEqual({
      where: { id: 'referrer-1', clinic_id: 'clinic-a' },
      data: { active: false },
    })
  })

  it('reports not found when updating a referrer from another clinic', async () => {
    mocks.referrerUpdateMany.mockResolvedValue({ count: 0 })

    await expect(
      updateReferrer({ clinicId: 'clinic-a', referrerId: 'referrer-clinic-b', name: 'Hack' })
    ).resolves.toMatchObject({ ok: false, error: 'REFERRER_NOT_FOUND', status: 404 })

    await expect(
      setReferrerActive({
        clinicId: 'clinic-a',
        referrerId: 'referrer-clinic-b',
        active: false,
      })
    ).resolves.toMatchObject({ ok: false, error: 'REFERRER_NOT_FOUND', status: 404 })
  })
})

describe('markReferralsPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.referrerFindFirst.mockResolvedValue({ id: 'referrer-clinic-a', name: 'Ótica Vizinha' })
    mocks.appointmentUpdateMany.mockResolvedValue({ count: 3 })
    mocks.appointmentCount.mockResolvedValue(0)
    mocks.financialEntryCreate.mockResolvedValue({ id: 'entry-1' })
  })

  it('stamps every pending referral of the referrer and rechecks the counter', async () => {
    const result = await markReferralsPaid({
      clinicId: 'clinic-a',
      referrerId: 'referrer-clinic-a',
      paidBy: 'profile-1',
    })

    expect(result).toMatchObject({ ok: true, paidCount: 3, pendingCount: 0 })

    const updateArgs = mocks.appointmentUpdateMany.mock.calls[0][0]
    expect(updateArgs.where).toEqual({
      clinic_id: 'clinic-a',
      referrer_id: 'referrer-clinic-a',
      status: 'ATTENDED',
      referral_paid_at: null,
    })
    expect(updateArgs.data.referral_paid_at).toBeInstanceOf(Date)

    // recontagem dentro da transação, mesmo filtro
    expect(mocks.appointmentCount.mock.calls[0][0].where).toEqual(updateArgs.where)
  })

  // O pagamento do indicante virou saida de caixa: as duas coisas acontecem na
  // mesma transacao, ou nenhuma acontece.
  it('lanca a gratificacao como saida no caixa, na mesma transacao', async () => {
    await markReferralsPaid({
      clinicId: 'clinic-a',
      referrerId: 'referrer-clinic-a',
      paidBy: 'profile-1',
      feeCents: 1000,
    })

    const args = mocks.financialEntryCreate.mock.calls[0][0]

    expect(args.data).toMatchObject({
      clinic_id: 'clinic-a',
      type: 'EXPENSE',
      amount_cents: 3000, // 3 indicacoes x R$ 10,00
      referrer_id: 'referrer-clinic-a',
      created_by: 'profile-1',
      payment_method: 'PIX',
    })
    expect(args.data.description).toContain('Ótica Vizinha')
    expect(args.data.description).toContain('3 indicações')
  })

  it('usa a gratificacao padrao quando nenhuma e informada', async () => {
    const result = await markReferralsPaid({
      clinicId: 'clinic-a',
      referrerId: 'referrer-clinic-a',
      paidBy: 'profile-1',
    })

    expect(result).toMatchObject({ ok: true, totalCents: 3000 })
  })

  // Linha de R$ 0,00 sujaria o fechamento do dia sem representar dinheiro nenhum.
  it('nao lanca nada no caixa quando nao havia indicacao pendente', async () => {
    mocks.appointmentUpdateMany.mockResolvedValue({ count: 0 })

    const result = await markReferralsPaid({
      clinicId: 'clinic-a',
      referrerId: 'referrer-clinic-a',
      paidBy: 'profile-1',
    })

    expect(result).toMatchObject({ ok: true, paidCount: 0, totalCents: 0 })
    expect(mocks.financialEntryCreate).not.toHaveBeenCalled()
  })

  it('reports what is still pending when a consultation is attended mid-payment', async () => {
    mocks.appointmentCount.mockResolvedValue(1)

    const result = await markReferralsPaid({
      clinicId: 'clinic-a',
      referrerId: 'referrer-clinic-a',
      paidBy: 'profile-1',
    })

    expect(result).toMatchObject({ ok: true, paidCount: 3, pendingCount: 1 })
  })

  it('refuses a referrer from another clinic and pays nothing', async () => {
    mocks.referrerFindFirst.mockResolvedValue(null)

    const result = await markReferralsPaid({
      clinicId: 'clinic-a',
      referrerId: 'referrer-clinic-b',
      paidBy: 'profile-1',
    })

    expect(result).toMatchObject({ ok: false, error: 'REFERRER_NOT_FOUND', status: 404 })
    expect(mocks.financialEntryCreate).not.toHaveBeenCalled()
    expect(mocks.referrerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'referrer-clinic-b', clinic_id: 'clinic-a' },
      })
    )
    expect(mocks.appointmentUpdateMany).not.toHaveBeenCalled()
  })
})
