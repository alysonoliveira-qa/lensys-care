import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clinicFindUnique: vi.fn(),
  clinicUpdateMany: vi.fn(),
  patientFindFirst: vi.fn(),
  entryCreate: vi.fn(),
  entryCount: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    clinic: { findUnique: mocks.clinicFindUnique, updateMany: mocks.clinicUpdateMany },
    patient: { findFirst: mocks.patientFindFirst },
    financialEntry: { create: mocks.entryCreate, count: mocks.entryCount },
  },
}))

import {
  countPatientIncomeOnDate,
  getConsultationPriceCents,
  registerConsultationPayment,
  setConsultationPriceCents,
} from '../lib/financeiro/financeiro-data'

const BASE = {
  clinicId: 'clinic-a',
  patientId: 'patient-1',
  createdBy: 'profile-1',
  paymentMethod: 'PIX' as const,
  entryDate: '2026-08-27',
  confirmed: false,
}

describe('preço da consulta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.clinicFindUnique.mockResolvedValue({ consultation_price_cents: 15000 })
    mocks.clinicUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('lê o preço configurado', async () => {
    await expect(getConsultationPriceCents('clinic-a')).resolves.toBe(15000)
    expect(mocks.clinicFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'clinic-a' } })
    )
  })

  // `null` e zero são estados diferentes: `null` pede configuração, e é isso que
  // impede a tela de lançar consulta de R$ 0,00 achando que tem preço.
  it('devolve null quando nunca foi configurado', async () => {
    mocks.clinicFindUnique.mockResolvedValue({ consultation_price_cents: null })

    await expect(getConsultationPriceCents('clinic-a')).resolves.toBeNull()
  })

  it('devolve null para clínica inexistente', async () => {
    mocks.clinicFindUnique.mockResolvedValue(null)

    await expect(getConsultationPriceCents('clinic-x')).resolves.toBeNull()
  })

  it('grava o preço com clinic_id no where', async () => {
    await setConsultationPriceCents('clinic-a', 20000)

    expect(mocks.clinicUpdateMany).toHaveBeenCalledWith({
      where: { id: 'clinic-a' },
      data: { consultation_price_cents: 20000 },
    })
  })

  it('avisa quando a clínica não existe', async () => {
    mocks.clinicUpdateMany.mockResolvedValue({ count: 0 })

    await expect(setConsultationPriceCents('clinic-x', 20000)).resolves.toEqual({
      ok: false,
      reason: 'CLINIC_NOT_FOUND',
    })
  })
})

describe('countPatientIncomeOnDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.entryCount.mockResolvedValue(0)
  })

  it('conta só entradas daquele paciente, naquele dia, naquela clínica', async () => {
    await countPatientIncomeOnDate('clinic-a', 'patient-1', '2026-08-27')

    expect(mocks.entryCount).toHaveBeenCalledWith({
      where: {
        clinic_id: 'clinic-a',
        patient_id: 'patient-1',
        type: 'INCOME',
        entry_date: new Date('2026-08-27T00:00:00.000Z'),
      },
    })
  })
})

describe('registerConsultationPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.clinicFindUnique.mockResolvedValue({ consultation_price_cents: 15000 })
    mocks.patientFindFirst.mockResolvedValue({ id: 'patient-1', full_name: 'Maria Silva' })
    mocks.entryCount.mockResolvedValue(0)
    mocks.entryCreate.mockResolvedValue({ id: 'entry-1' })
  })

  it('lança a consulta com o preço da clínica', async () => {
    const result = await registerConsultationPayment(BASE)

    expect(result).toEqual({ ok: true, id: 'entry-1', amountCents: 15000 })

    const data = mocks.entryCreate.mock.calls[0][0].data
    expect(data).toMatchObject({
      clinic_id: 'clinic-a',
      type: 'INCOME',
      amount_cents: 15000,
      payment_method: 'PIX',
      patient_id: 'patient-1',
      created_by: 'profile-1',
    })
    expect(data.description).toBe('Consulta — Maria Silva')
  })

  // A FK do banco aceitaria paciente de outro tenant; a validação é explícita.
  it('recusa paciente de outra clínica', async () => {
    mocks.patientFindFirst.mockResolvedValue(null)

    const result = await registerConsultationPayment(BASE)

    expect(result).toEqual({ ok: false, reason: 'PATIENT_NOT_IN_CLINIC' })
    expect(mocks.entryCreate).not.toHaveBeenCalled()
  })

  it('recusa quando o preço não foi definido', async () => {
    mocks.clinicFindUnique.mockResolvedValue({ consultation_price_cents: null })

    const result = await registerConsultationPayment(BASE)

    expect(result).toEqual({ ok: false, reason: 'PRICE_NOT_SET' })
    expect(mocks.entryCreate).not.toHaveBeenCalled()
  })

  it('avisa em vez de lançar quando já houve cobrança hoje', async () => {
    mocks.entryCount.mockResolvedValue(2)

    const result = await registerConsultationPayment(BASE)

    expect(result).toEqual({ ok: false, reason: 'ALREADY_CHARGED_TODAY', existingCount: 2 })
    expect(mocks.entryCreate).not.toHaveBeenCalled()
  })

  // Avisar, não bloquear: paciente que paga consulta e óculos no mesmo dia é
  // caso real, e travar seria consertar o clique duplo quebrando o legítimo.
  it('lança mesmo assim quando a pessoa confirma', async () => {
    mocks.entryCount.mockResolvedValue(2)

    const result = await registerConsultationPayment({ ...BASE, confirmed: true })

    expect(result).toMatchObject({ ok: true })
    expect(mocks.entryCreate).toHaveBeenCalled()
  })

  it('nem consulta duplicata quando já veio confirmado', async () => {
    await registerConsultationPayment({ ...BASE, confirmed: true })

    expect(mocks.entryCount).not.toHaveBeenCalled()
  })

  it('grava a data como hora de parede, sem deslocar', async () => {
    await registerConsultationPayment(BASE)

    const data = mocks.entryCreate.mock.calls[0][0].data
    expect(data.entry_date).toEqual(new Date('2026-08-27T00:00:00.000Z'))
    expect(data.entry_date.getUTCDate()).toBe(27)
  })
})
