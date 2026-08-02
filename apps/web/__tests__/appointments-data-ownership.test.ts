import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appointmentFindMany: vi.fn(),
  appointmentCreate: vi.fn(),
  appointmentUpdateMany: vi.fn(),
  patientFindFirst: vi.fn(),
  referrerFindFirst: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    appointment: {
      findMany: mocks.appointmentFindMany,
      create: mocks.appointmentCreate,
      updateMany: mocks.appointmentUpdateMany,
    },
    patient: {
      findFirst: mocks.patientFindFirst,
    },
    referrer: {
      findFirst: mocks.referrerFindFirst,
    },
  },
}))

import {
  createAppointmentForClinic,
  getAppointmentsByDate,
  setAppointmentStatusForClinic,
} from '../lib/appointments/appointments-data'

describe('appointments data — tenant na borda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.appointmentFindMany.mockResolvedValue([])
    mocks.patientFindFirst.mockResolvedValue({ id: 'patient-clinic-a' })
    mocks.referrerFindFirst.mockResolvedValue({ id: 'referrer-clinic-a' })
    mocks.appointmentCreate.mockResolvedValue({ id: 'appointment-1' })
    mocks.appointmentUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('reads the day scoped by clinic, with times first and the queue after', async () => {
    await getAppointmentsByDate('clinic-a', '2026-08-02')

    const args = mocks.appointmentFindMany.mock.calls[0][0]
    expect(args.where.clinic_id).toBe('clinic-a')
    expect(args.where.appointment_date.toISOString()).toBe('2026-08-02T00:00:00.000Z')
    expect(args.orderBy).toEqual([
      { scheduled_time: { sort: 'asc', nulls: 'last' } },
      { created_at: 'asc' },
    ])
  })

  it('refuses to schedule a patient from another clinic', async () => {
    mocks.patientFindFirst.mockResolvedValue(null)

    const result = await createAppointmentForClinic({
      clinicId: 'clinic-a',
      patientId: 'patient-clinic-b',
      date: '2026-08-02',
      createdBy: 'profile-a',
    })

    expect(result).toMatchObject({ ok: false, error: 'PATIENT_NOT_FOUND', status: 404 })
    expect(mocks.patientFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-clinic-b', clinic_id: 'clinic-a' },
      })
    )
    expect(mocks.appointmentCreate).not.toHaveBeenCalled()
  })

  it('refuses a referrer from another clinic', async () => {
    mocks.referrerFindFirst.mockResolvedValue(null)

    const result = await createAppointmentForClinic({
      clinicId: 'clinic-a',
      patientId: 'patient-clinic-a',
      date: '2026-08-02',
      createdBy: 'profile-a',
      referrerId: 'referrer-clinic-b',
    })

    expect(result).toMatchObject({ ok: false, error: 'REFERRER_NOT_FOUND', status: 404 })
    expect(mocks.referrerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'referrer-clinic-b', clinic_id: 'clinic-a' },
      })
    )
    expect(mocks.appointmentCreate).not.toHaveBeenCalled()
  })

  it('rejects invalid input before touching the database', async () => {
    const result = await createAppointmentForClinic({
      clinicId: 'clinic-a',
      patientId: 'patient-clinic-a',
      date: '2026-08-02',
      time: '99:99',
      createdBy: 'profile-a',
    })

    expect(result).toMatchObject({ ok: false, error: 'INVALID_INPUT', status: 400 })
    expect(mocks.patientFindFirst).not.toHaveBeenCalled()
    expect(mocks.appointmentCreate).not.toHaveBeenCalled()
  })

  it('creates a scheduled appointment with date and time as UTC wall instants', async () => {
    const result = await createAppointmentForClinic({
      clinicId: 'clinic-a',
      patientId: 'patient-clinic-a',
      date: '2026-08-02',
      time: '14:30',
      createdBy: 'profile-a',
      referrerId: 'referrer-clinic-a',
    })

    expect(result).toEqual({ ok: true, appointmentId: 'appointment-1' })

    const data = mocks.appointmentCreate.mock.calls[0][0].data
    expect(data.clinic_id).toBe('clinic-a')
    expect(data.patient_id).toBe('patient-clinic-a')
    expect(data.referrer_id).toBe('referrer-clinic-a')
    expect(data.created_by).toBe('profile-a')
    expect(data.appointment_date.toISOString()).toBe('2026-08-02T00:00:00.000Z')
    expect(data.scheduled_time.toISOString()).toBe('1970-01-01T14:30:00.000Z')
  })

  it('creates a queue appointment (no time, no referrer)', async () => {
    await createAppointmentForClinic({
      clinicId: 'clinic-a',
      patientId: 'patient-clinic-a',
      date: '2026-08-02',
      time: '',
      createdBy: 'profile-a',
      referrerId: '',
    })

    const data = mocks.appointmentCreate.mock.calls[0][0].data
    expect(data.scheduled_time).toBeNull()
    expect(data.referrer_id).toBeNull()
    expect(mocks.referrerFindFirst).not.toHaveBeenCalled()
  })

  it('scopes the status update by clinic', async () => {
    const result = await setAppointmentStatusForClinic({
      clinicId: 'clinic-a',
      appointmentId: 'appointment-1',
      status: 'ATTENDED',
    })

    expect(result).toEqual({ ok: true })
    expect(mocks.appointmentUpdateMany).toHaveBeenCalledWith({
      where: { id: 'appointment-1', clinic_id: 'clinic-a' },
      data: { status: 'ATTENDED' },
    })
  })

  it('reports not found when the appointment belongs to another clinic', async () => {
    mocks.appointmentUpdateMany.mockResolvedValue({ count: 0 })

    const result = await setAppointmentStatusForClinic({
      clinicId: 'clinic-a',
      appointmentId: 'appointment-clinic-b',
      status: 'CANCELED',
    })

    expect(result).toMatchObject({ ok: false, error: 'APPOINTMENT_NOT_FOUND', status: 404 })
  })
})
