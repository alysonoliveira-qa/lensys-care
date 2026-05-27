import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAlertForExam: vi.fn(),
  getClaims: vi.fn(),
  examCreate: vi.fn(),
  patientFindFirst: vi.fn(),
  profileFindUnique: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getClaims: mocks.getClaims,
    },
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    exam: {
      create: mocks.examCreate,
    },
    patient: {
      findFirst: mocks.patientFindFirst,
    },
    profile: {
      findUnique: mocks.profileFindUnique,
    },
  },
}))

vi.mock('@/lib/alerts', () => ({
  createAlertForExam: mocks.createAlertForExam,
}))

vi.mock('@/lib/performance', () => ({
  endPerformanceTimer: vi.fn(),
  logPerformanceStep: vi.fn(),
  startPerformanceStep: vi.fn(() => 0),
  startPerformanceTimer: vi.fn(() => ({ id: 'test', label: 'test', startedAt: 0 })),
}))

import { POST } from '../app/api/exams/route'

describe('POST /api/exams ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-clinic-a' } },
      error: null,
    })
    mocks.profileFindUnique.mockResolvedValue({
      id: 'user-clinic-a',
      clinic_id: 'clinic-a',
    })
    mocks.patientFindFirst.mockResolvedValue(null)
  })

  it('blocks exam creation when the patient does not belong to the authenticated clinic', async () => {
    const response = await POST(new Request('http://localhost/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'patient-clinic-b',
        examDate: '2026-05-27',
      }),
    }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'PATIENT_NOT_FOUND',
      message: 'Paciente não encontrado.',
    })
    expect(mocks.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'patient-clinic-b',
        clinic_id: 'clinic-a',
      },
      select: { id: true },
    })
    expect(mocks.examCreate).not.toHaveBeenCalled()
    expect(mocks.createAlertForExam).not.toHaveBeenCalled()
  })
})
