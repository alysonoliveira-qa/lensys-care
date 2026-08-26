import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  entryFindMany: vi.fn(),
  entryCreate: vi.fn(),
  entryDeleteMany: vi.fn(),
  patientFindFirst: vi.fn(),
  referrerFindFirst: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    financialEntry: {
      findMany: mocks.entryFindMany,
      create: mocks.entryCreate,
      deleteMany: mocks.entryDeleteMany,
    },
    patient: { findFirst: mocks.patientFindFirst },
    referrer: { findFirst: mocks.referrerFindFirst },
  },
}))

import {
  createEntry,
  deleteEntry,
  listEntriesForPeriod,
  summarizePeriod,
} from '../lib/financeiro/financeiro-data'

const BASE_ENTRY = {
  type: 'INCOME' as const,
  amountCents: 15000,
  description: 'Consulta particular',
  paymentMethod: 'PIX' as const,
  entryDate: '2026-08-26',
  patientId: null,
  referrerId: null,
  clinicId: 'clinic-a',
  createdBy: 'profile-1',
}

describe('financeiro data — tenant na borda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.entryFindMany.mockResolvedValue([])
    mocks.entryCreate.mockResolvedValue({ id: 'entry-1' })
    mocks.entryDeleteMany.mockResolvedValue({ count: 1 })
    mocks.patientFindFirst.mockResolvedValue({ id: 'patient-1' })
    mocks.referrerFindFirst.mockResolvedValue({ id: 'referrer-1' })
  })

  it('lista sempre com clinic_id no where', async () => {
    await listEntriesForPeriod({ clinicId: 'clinic-a', from: '2026-08-01', to: '2026-08-26' })

    const args = mocks.entryFindMany.mock.calls[0][0]
    expect(args.where.clinic_id).toBe('clinic-a')
  })

  // `lte` e não `lt`: um `lt` no mesmo dia devolveria vazio, e quem filtra
  // "hoje até hoje" veria caixa zerado num dia com movimento.
  it('fecha o intervalo nas duas pontas', async () => {
    await listEntriesForPeriod({ clinicId: 'clinic-a', from: '2026-08-26', to: '2026-08-26' })

    const where = mocks.entryFindMany.mock.calls[0][0].where
    expect(where.entry_date.gte).toEqual(new Date('2026-08-26T00:00:00.000Z'))
    expect(where.entry_date.lte).toEqual(new Date('2026-08-26T00:00:00.000Z'))
  })

  it('resume o período com o mesmo escopo de clínica', async () => {
    mocks.entryFindMany.mockResolvedValue([
      { type: 'INCOME', amount_cents: 15000 },
      { type: 'EXPENSE', amount_cents: 3000 },
    ])

    const resumo = await summarizePeriod({
      clinicId: 'clinic-a',
      from: '2026-08-01',
      to: '2026-08-26',
    })

    expect(mocks.entryFindMany.mock.calls[0][0].where.clinic_id).toBe('clinic-a')
    expect(resumo).toMatchObject({ incomeCents: 15000, expenseCents: 3000, balanceCents: 12000 })
  })

  it('grava clinic_id e created_by vindos do chamador, não do payload', async () => {
    await createEntry(BASE_ENTRY)

    const data = mocks.entryCreate.mock.calls[0][0].data
    expect(data.clinic_id).toBe('clinic-a')
    expect(data.created_by).toBe('profile-1')
    expect(data.amount_cents).toBe(15000)
  })

  // A FK do banco só exige que a linha exista — ela aceitaria de bom grado um
  // paciente de outro tenant. A validação tem que ser explícita aqui.
  it('recusa paciente de outra clínica antes de criar', async () => {
    mocks.patientFindFirst.mockResolvedValue(null)

    const result = await createEntry({ ...BASE_ENTRY, patientId: 'patient-de-outra' })

    expect(result).toEqual({ ok: false, reason: 'PATIENT_NOT_IN_CLINIC' })
    expect(mocks.entryCreate).not.toHaveBeenCalled()
    expect(mocks.patientFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-de-outra', clinic_id: 'clinic-a' },
      })
    )
  })

  it('recusa indicante de outra clínica antes de criar', async () => {
    mocks.referrerFindFirst.mockResolvedValue(null)

    const result = await createEntry({ ...BASE_ENTRY, referrerId: 'referrer-de-outra' })

    expect(result).toEqual({ ok: false, reason: 'REFERRER_NOT_IN_CLINIC' })
    expect(mocks.entryCreate).not.toHaveBeenCalled()
  })

  it('não consulta vínculo quando nenhum foi informado', async () => {
    await createEntry(BASE_ENTRY)

    expect(mocks.patientFindFirst).not.toHaveBeenCalled()
    expect(mocks.referrerFindFirst).not.toHaveBeenCalled()
  })

  // deleteMany com clinic_id no where: id de outro tenant não apaga nada, em vez
  // de apagar e só depois falhar a conferência.
  it('apaga com clinic_id no where', async () => {
    await deleteEntry('clinic-a', 'entry-1')

    expect(mocks.entryDeleteMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', clinic_id: 'clinic-a' },
    })
  })

  it('devolve NOT_FOUND quando o lançamento é de outra clínica', async () => {
    mocks.entryDeleteMany.mockResolvedValue({ count: 0 })

    const result = await deleteEntry('clinic-a', 'entry-de-outra')

    expect(result).toEqual({ ok: false, reason: 'NOT_FOUND' })
  })
})
