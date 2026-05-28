import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  patientDeleteMany: vi.fn(),
  patientFindFirst: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    patient: {
      deleteMany: mocks.patientDeleteMany,
      findFirst: mocks.patientFindFirst,
    },
  },
}))

import { deletePatientForClinic, PATIENT_HAS_EXAMS_MESSAGE } from '../lib/patients/delete-patient'

describe('deletePatientForClinic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.patientDeleteMany.mockResolvedValue({ count: 1 })
  })

  it('allows deleting a patient without exams from the authenticated clinic', async () => {
    mocks.patientFindFirst.mockResolvedValue({
      id: 'patient-clinic-a',
      _count: { exams: 0 },
    })

    await expect(
      deletePatientForClinic({
        patientId: 'patient-clinic-a',
        clinicId: 'clinic-a',
      })
    ).resolves.toEqual({ ok: true })

    expect(mocks.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'patient-clinic-a',
        clinic_id: 'clinic-a',
      },
      select: {
        id: true,
        _count: {
          select: {
            exams: true,
          },
        },
      },
    })
    expect(mocks.patientDeleteMany).toHaveBeenCalledWith({
      where: {
        id: 'patient-clinic-a',
        clinic_id: 'clinic-a',
        exams: {
          none: {},
        },
      },
    })
  })

  it('blocks deletion when the patient has exams', async () => {
    mocks.patientFindFirst.mockResolvedValue({
      id: 'patient-clinic-a',
      _count: { exams: 2 },
    })

    await expect(
      deletePatientForClinic({
        patientId: 'patient-clinic-a',
        clinicId: 'clinic-a',
      })
    ).resolves.toEqual({
      ok: false,
      error: 'PATIENT_HAS_EXAMS',
      message: PATIENT_HAS_EXAMS_MESSAGE,
      status: 409,
    })

    expect(mocks.patientDeleteMany).not.toHaveBeenCalled()
  })

  it('blocks deletion when the patient belongs to another clinic', async () => {
    mocks.patientFindFirst.mockResolvedValue(null)

    await expect(
      deletePatientForClinic({
        patientId: 'patient-clinic-b',
        clinicId: 'clinic-a',
      })
    ).resolves.toEqual({
      ok: false,
      error: 'PATIENT_NOT_FOUND',
      message: 'Paciente não encontrado ou sem permissão para excluir.',
      status: 404,
    })

    expect(mocks.patientDeleteMany).not.toHaveBeenCalled()
  })
})
