import { describe, expect, it } from 'vitest'

import {
  APPOINTMENT_STATUS_CONFIG,
  APPOINTMENT_STATUS_VALUES,
  REFERRAL_FEE_CENTS,
  getAppointmentActions,
  isAppointmentStatus,
} from '../lib/appointments/appointments-config'

describe('APPOINTMENT_STATUS_CONFIG', () => {
  it('labels every status in PT-BR', () => {
    expect(APPOINTMENT_STATUS_CONFIG.SCHEDULED.label).toBe('Agendado')
    expect(APPOINTMENT_STATUS_CONFIG.ATTENDED.label).toBe('Compareceu')
    expect(APPOINTMENT_STATUS_CONFIG.CANCELED.label).toBe('Cancelado')
  })

  it('covers exactly the three MVP statuses', () => {
    expect(APPOINTMENT_STATUS_VALUES).toEqual(['SCHEDULED', 'ATTENDED', 'CANCELED'])
    expect(Object.keys(APPOINTMENT_STATUS_CONFIG).sort()).toEqual(
      [...APPOINTMENT_STATUS_VALUES].sort()
    )
  })
})

describe('getAppointmentActions', () => {
  it('offers Compareceu and Cancelar while the appointment is scheduled', () => {
    expect(getAppointmentActions('SCHEDULED').map((action) => action.nextStatus)).toEqual([
      'ATTENDED',
      'CANCELED',
    ])
  })

  it('treats attended and canceled as terminal, without actions', () => {
    expect(getAppointmentActions('ATTENDED')).toEqual([])
    expect(getAppointmentActions('CANCELED')).toEqual([])
    expect(APPOINTMENT_STATUS_CONFIG.ATTENDED.isTerminal).toBe(true)
    expect(APPOINTMENT_STATUS_CONFIG.CANCELED.isTerminal).toBe(true)
    expect(APPOINTMENT_STATUS_CONFIG.SCHEDULED.isTerminal).toBe(false)
  })
})

describe('isAppointmentStatus', () => {
  it('accepts only the known statuses', () => {
    expect(isAppointmentStatus('ATTENDED')).toBe(true)
    expect(isAppointmentStatus('attended')).toBe(false)
    expect(isAppointmentStatus('NO_SHOW')).toBe(false)
    expect(isAppointmentStatus('')).toBe(false)
  })
})

describe('REFERRAL_FEE_CENTS', () => {
  it('keeps the R$10 referral fee reserved for the future financial module', () => {
    expect(REFERRAL_FEE_CENTS).toBe(1000)
  })
})
