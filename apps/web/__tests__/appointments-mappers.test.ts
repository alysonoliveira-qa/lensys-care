import { describe, expect, it } from 'vitest'

import {
  mapAppointmentsToRows,
  sortAppointmentsForDay,
  type AppointmentRecord,
} from '../lib/appointments/appointments-mappers'

function record(overrides: Partial<AppointmentRecord> & { id: string }): AppointmentRecord {
  return {
    patient_id: 'patient-1',
    scheduled_time: null,
    created_at: new Date('2026-08-02T10:00:00Z'),
    status: 'SCHEDULED',
    referrer_id: null,
    patient: { id: 'patient-1', full_name: 'Maria Souza' },
    referrer: null,
    ...overrides,
  }
}

describe('sortAppointmentsForDay', () => {
  it('puts scheduled times first (by time) and the queue after (by creation order)', () => {
    const sorted = sortAppointmentsForDay([
      record({ id: 'fila-2', created_at: new Date('2026-08-02T10:05:00Z') }),
      record({ id: 'hora-16', scheduled_time: new Date('1970-01-01T16:00:00Z') }),
      record({ id: 'fila-1', created_at: new Date('2026-08-02T09:00:00Z') }),
      record({ id: 'hora-08', scheduled_time: new Date('1970-01-01T08:30:00Z') }),
    ])

    expect(sorted.map((item) => item.id)).toEqual(['hora-08', 'hora-16', 'fila-1', 'fila-2'])
  })
})

describe('mapAppointmentsToRows', () => {
  it('labels a scheduled time as HH:mm and the queue as #N', () => {
    const rows = mapAppointmentsToRows([
      record({ id: 'hora', scheduled_time: new Date('1970-01-01T14:30:00Z') }),
      record({ id: 'fila-1', created_at: new Date('2026-08-02T09:00:00Z') }),
      record({ id: 'fila-2', created_at: new Date('2026-08-02T09:30:00Z') }),
    ])

    expect(rows.map((row) => [row.id, row.slotLabel])).toEqual([
      ['hora', '14:30'],
      ['fila-1', '#1'],
      ['fila-2', '#2'],
    ])
    expect(rows[0].timeLabel).toBe('14:30')
    expect(rows[0].queuePosition).toBeNull()
    expect(rows[1].timeLabel).toBeNull()
    expect(rows[1].queuePosition).toBe(1)
  })

  it('carries the patient and the referrer names', () => {
    const [withReferrer, withoutReferrer] = mapAppointmentsToRows([
      record({
        id: 'a',
        scheduled_time: new Date('1970-01-01T08:00:00Z'),
        patient: { id: 'p-9', full_name: 'João Lima' },
        referrer_id: 'ref-1',
        referrer: { id: 'ref-1', name: 'Ótica Central' },
      }),
      record({ id: 'b', scheduled_time: new Date('1970-01-01T09:00:00Z') }),
    ])

    expect(withReferrer.patientId).toBe('p-9')
    expect(withReferrer.patientName).toBe('João Lima')
    expect(withReferrer.referrerId).toBe('ref-1')
    expect(withReferrer.referrerName).toBe('Ótica Central')
    expect(withoutReferrer.referrerName).toBeNull()
  })

  it('keeps a canceled appointment visible but out of the queue numbering', () => {
    const rows = mapAppointmentsToRows([
      record({ id: 'fila-1', created_at: new Date('2026-08-02T09:00:00Z') }),
      record({
        id: 'cancelada',
        created_at: new Date('2026-08-02T09:15:00Z'),
        status: 'CANCELED',
      }),
      record({ id: 'fila-2', created_at: new Date('2026-08-02T09:30:00Z') }),
    ])

    expect(rows.map((row) => [row.id, row.slotLabel])).toEqual([
      ['fila-1', '#1'],
      ['cancelada', '—'],
      ['fila-2', '#2'],
    ])

    const canceled = rows[1]
    expect(canceled.isCanceled).toBe(true)
    expect(canceled.statusLabel).toBe('Cancelado')
    expect(canceled.actions).toEqual([])
  })

  it('exposes the actions allowed by the status', () => {
    const [scheduled, attended] = mapAppointmentsToRows([
      record({ id: 'a', scheduled_time: new Date('1970-01-01T08:00:00Z') }),
      record({
        id: 'b',
        scheduled_time: new Date('1970-01-01T09:00:00Z'),
        status: 'ATTENDED',
      }),
    ])

    expect(scheduled.actions.map((action) => action.nextStatus)).toEqual([
      'ATTENDED',
      'CANCELED',
    ])
    expect(scheduled.isTerminal).toBe(false)
    expect(attended.actions).toEqual([])
    expect(attended.statusLabel).toBe('Compareceu')
    expect(attended.isTerminal).toBe(true)
  })
})
