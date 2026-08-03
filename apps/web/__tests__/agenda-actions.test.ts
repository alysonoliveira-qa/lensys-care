import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedProfile: vi.fn(),
  createAppointmentForClinic: vi.fn(),
  setAppointmentStatusForClinic: vi.fn(),
  searchPatientsForClinic: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock('@/lib/auth/authenticated-profile', () => ({
  getAuthenticatedProfile: mocks.getAuthenticatedProfile,
}))

vi.mock('@/lib/appointments/appointments-data', () => ({
  createAppointmentForClinic: mocks.createAppointmentForClinic,
  setAppointmentStatusForClinic: mocks.setAppointmentStatusForClinic,
}))

vi.mock('@/lib/patients/patient-search', () => ({
  PATIENT_SEARCH_MIN_LENGTH: 2,
  searchPatientsForClinic: mocks.searchPatientsForClinic,
}))

import {
  createAppointment,
  searchPatients,
  setAppointmentStatus,
} from '../app/(dashboard)/agenda/actions'

const IDLE = { status: 'idle' as const, message: '' }

function formData(entries: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value)
  }
  return data
}

describe('createAppointment action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedProfile.mockResolvedValue({
      id: 'profile-a',
      clinic_id: 'clinic-a',
      role: 'RECEPTIONIST',
    })
    mocks.createAppointmentForClinic.mockResolvedValue({ ok: true, appointmentId: 'appt-1' })
  })

  it('refuses without a session and never reaches the data layer', async () => {
    mocks.getAuthenticatedProfile.mockResolvedValue(null)

    const result = await createAppointment(
      IDLE,
      formData({ patient_id: 'p1', appointment_date: '2026-08-02' })
    )

    expect(result.status).toBe('error')
    expect(mocks.createAppointmentForClinic).not.toHaveBeenCalled()
  })

  it('takes the clinic from the session, never from the form', async () => {
    await createAppointment(
      IDLE,
      formData({
        patient_id: 'p1',
        appointment_date: '2026-08-02',
        // campos hostis: não podem vazar para a camada de dados
        clinic_id: 'clinic-b',
        created_by: 'profile-b',
      })
    )

    expect(mocks.createAppointmentForClinic).toHaveBeenCalledWith(
      expect.objectContaining({ clinicId: 'clinic-a', createdBy: 'profile-a' })
    )
  })

  it('lets a RECEPTIONIST schedule (diferente dos exames)', async () => {
    const result = await createAppointment(
      IDLE,
      formData({ patient_id: 'p1', appointment_date: '2026-08-02', scheduled_time: '14:30' })
    )

    expect(result).toEqual({ status: 'success', message: 'Consulta agendada para 14:30.' })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/agenda')
  })

  it('announces the day queue when no time is given', async () => {
    const result = await createAppointment(
      IDLE,
      formData({ patient_id: 'p1', appointment_date: '2026-08-02', scheduled_time: '' })
    )

    expect(result).toEqual({
      status: 'success',
      message: 'Paciente adicionado à fila do dia.',
    })
  })

  it('surfaces field errors from the domain validation', async () => {
    mocks.createAppointmentForClinic.mockResolvedValue({
      ok: false,
      error: 'INVALID_INPUT',
      message: 'Hora inválida.',
      status: 400,
      errors: { time: 'Hora inválida.' },
    })

    const result = await createAppointment(
      IDLE,
      formData({ patient_id: 'p1', appointment_date: '2026-08-02', scheduled_time: '99:99' })
    )

    expect(result).toEqual({
      status: 'error',
      message: 'Hora inválida.',
      fieldErrors: { time: 'Hora inválida.' },
    })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('reports a patient from another clinic without field errors', async () => {
    mocks.createAppointmentForClinic.mockResolvedValue({
      ok: false,
      error: 'PATIENT_NOT_FOUND',
      message: 'Paciente não encontrado ou sem permissão para agendar.',
      status: 404,
    })

    const result = await createAppointment(
      IDLE,
      formData({ patient_id: 'patient-clinic-b', appointment_date: '2026-08-02' })
    )

    expect(result.status).toBe('error')
    expect(result.fieldErrors).toBeUndefined()
  })
})

describe('searchPatients action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedProfile.mockResolvedValue({
      id: 'profile-a',
      clinic_id: 'clinic-a',
      role: 'RECEPTIONIST',
    })
    mocks.searchPatientsForClinic.mockResolvedValue([{ id: 'p1', full_name: 'Ana', phone: null }])
  })

  it('searches only inside the session clinic', async () => {
    const result = await searchPatients('ana')

    expect(result).toHaveLength(1)
    expect(mocks.searchPatientsForClinic).toHaveBeenCalledWith('clinic-a', 'ana')
  })

  it('returns nothing without a session', async () => {
    mocks.getAuthenticatedProfile.mockResolvedValue(null)

    expect(await searchPatients('ana')).toEqual([])
    expect(mocks.searchPatientsForClinic).not.toHaveBeenCalled()
  })
})

describe('setAppointmentStatus action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedProfile.mockResolvedValue({
      id: 'profile-a',
      clinic_id: 'clinic-a',
      role: 'RECEPTIONIST',
    })
    mocks.setAppointmentStatusForClinic.mockResolvedValue({ ok: true })
  })

  it('accepts only the two agenda transitions', async () => {
    for (const status of ['SCHEDULED', 'DELETED', '']) {
      const result = await setAppointmentStatus(
        IDLE,
        formData({ appointment_id: 'appt-1', status })
      )

      expect(result.status, status).toBe('error')
    }

    expect(mocks.setAppointmentStatusForClinic).not.toHaveBeenCalled()
  })

  it('marks attendance scoped by the session clinic and refreshes both pages', async () => {
    const result = await setAppointmentStatus(
      IDLE,
      formData({ appointment_id: 'appt-1', status: 'ATTENDED', clinic_id: 'clinic-b' })
    )

    expect(result).toEqual({ status: 'success', message: 'Consulta marcada como comparecida.' })
    expect(mocks.setAppointmentStatusForClinic).toHaveBeenCalledWith({
      clinicId: 'clinic-a',
      appointmentId: 'appt-1',
      status: 'ATTENDED',
    })
    // o contador de indicações pendentes vive em /patients
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/agenda')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/patients')
  })

  it('propagates a not found from another clinic', async () => {
    mocks.setAppointmentStatusForClinic.mockResolvedValue({
      ok: false,
      error: 'APPOINTMENT_NOT_FOUND',
      message: 'Consulta não encontrada ou sem permissão para alterar.',
      status: 404,
    })

    const result = await setAppointmentStatus(
      IDLE,
      formData({ appointment_id: 'appt-clinic-b', status: 'CANCELED' })
    )

    expect(result.status).toBe('error')
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
