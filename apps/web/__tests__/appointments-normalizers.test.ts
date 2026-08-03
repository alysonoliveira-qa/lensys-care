import { describe, expect, it } from 'vitest'

import {
  appointmentDateToUtc,
  appointmentTimeToUtc,
  formatAppointmentDate,
  formatAppointmentTime,
  queuePositions,
  shiftAppointmentDate,
  todayAppointmentDate,
  validateAppointmentInput,
} from '../lib/appointments/appointments-normalizers'

describe('validateAppointmentInput', () => {
  it('accepts patient + date without time (entra na fila do dia)', () => {
    const result = validateAppointmentInput({
      patientId: 'patient-1',
      date: '2026-08-02',
    })

    expect(result).toEqual({
      ok: true,
      value: { patientId: 'patient-1', date: '2026-08-02', time: null },
    })
  })

  it('accepts an optional time and normalizes it to HH:mm', () => {
    expect(
      validateAppointmentInput({ patientId: 'p', date: '2026-08-02', time: '09:05:00' })
    ).toEqual({ ok: true, value: { patientId: 'p', date: '2026-08-02', time: '09:05' } })

    expect(
      validateAppointmentInput({ patientId: 'p', date: '2026-08-02', time: ' 14:30 ' })
    ).toEqual({ ok: true, value: { patientId: 'p', date: '2026-08-02', time: '14:30' } })
  })

  it('treats an empty time as fila do dia, not as an error', () => {
    expect(
      validateAppointmentInput({ patientId: 'p', date: '2026-08-02', time: '   ' })
    ).toEqual({ ok: true, value: { patientId: 'p', date: '2026-08-02', time: null } })
  })

  it('requires the patient', () => {
    const result = validateAppointmentInput({ patientId: '  ', date: '2026-08-02' })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.errors.patientId).toBeTruthy()
  })

  it('requires a date in YYYY-MM-DD', () => {
    expect(validateAppointmentInput({ patientId: 'p', date: '' }).ok).toBe(false)
    expect(validateAppointmentInput({ patientId: 'p', date: '02/08/2026' }).ok).toBe(false)
  })

  it('rejects a date that does not exist in the calendar', () => {
    const result = validateAppointmentInput({ patientId: 'p', date: '2026-02-30' })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.errors.date).toBeTruthy()
  })

  it('rejects a malformed time when one is informed', () => {
    for (const time of ['25:00', '14:3', '14h30', '-1:00']) {
      const result = validateAppointmentInput({ patientId: 'p', date: '2026-08-02', time })
      expect(result.ok, time).toBe(false)
      expect(result.ok === false && result.errors.time, time).toBeTruthy()
    }
  })
})

describe('date/time conversion (sem armadilha de fuso)', () => {
  it('converts a date string to UTC midnight', () => {
    expect(appointmentDateToUtc('2026-08-02').toISOString()).toBe('2026-08-02T00:00:00.000Z')
  })

  it('converts a time string to the 1970-01-01 UTC instant Prisma uses for @db.Time', () => {
    expect(appointmentTimeToUtc('14:30')?.toISOString()).toBe('1970-01-01T14:30:00.000Z')
    expect(appointmentTimeToUtc(null)).toBeNull()
  })

  it('formats back with UTC getters, so the day never shifts', () => {
    expect(formatAppointmentDate(new Date('2026-08-02T00:00:00.000Z'))).toBe('2026-08-02')
    expect(formatAppointmentTime(new Date('1970-01-01T08:00:00.000Z'))).toBe('08:00')
    expect(formatAppointmentTime(null)).toBeNull()
  })
})

describe('shiftAppointmentDate', () => {
  it('navigates to the previous and next day', () => {
    expect(shiftAppointmentDate('2026-08-02', -1)).toBe('2026-08-01')
    expect(shiftAppointmentDate('2026-08-02', 1)).toBe('2026-08-03')
  })

  it('crosses month and year boundaries', () => {
    expect(shiftAppointmentDate('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftAppointmentDate('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('todayAppointmentDate', () => {
  it('uses the clinic time zone, not the server UTC day', () => {
    // 02:00Z de 03/08 ainda é 23:00 de 02/08 em America/Sao_Paulo
    expect(todayAppointmentDate(new Date('2026-08-03T02:00:00.000Z'))).toBe('2026-08-02')
    expect(todayAppointmentDate(new Date('2026-08-02T12:00:00.000Z'))).toBe('2026-08-02')
  })
})

describe('queuePositions', () => {
  const base = {
    scheduled_time: null,
    status: 'SCHEDULED' as const,
  }

  it('numbers only the appointments without a time, by creation order', () => {
    const positions = queuePositions([
      { ...base, id: 'segundo', created_at: new Date('2026-08-02T10:05:00Z') },
      {
        id: 'com-hora',
        scheduled_time: new Date('1970-01-01T14:30:00Z'),
        created_at: new Date('2026-08-02T09:00:00Z'),
        status: 'SCHEDULED',
      },
      { ...base, id: 'primeiro', created_at: new Date('2026-08-02T10:00:00Z') },
    ])

    expect(positions.get('primeiro')).toBe(1)
    expect(positions.get('segundo')).toBe(2)
    expect(positions.has('com-hora')).toBe(false)
  })

  it('leaves canceled appointments out of the numbering', () => {
    const positions = queuePositions([
      { ...base, id: 'a', created_at: new Date('2026-08-02T10:00:00Z') },
      {
        ...base,
        id: 'cancelada',
        created_at: new Date('2026-08-02T10:01:00Z'),
        status: 'CANCELED',
      },
      { ...base, id: 'b', created_at: new Date('2026-08-02T10:02:00Z') },
    ])

    expect(positions.get('a')).toBe(1)
    expect(positions.has('cancelada')).toBe(false)
    expect(positions.get('b')).toBe(2)
  })

  it('keeps attended appointments in the numbering', () => {
    const positions = queuePositions([
      { ...base, id: 'a', created_at: new Date('2026-08-02T10:00:00Z'), status: 'ATTENDED' },
      { ...base, id: 'b', created_at: new Date('2026-08-02T10:02:00Z') },
    ])

    expect(positions.get('a')).toBe(1)
    expect(positions.get('b')).toBe(2)
  })
})
