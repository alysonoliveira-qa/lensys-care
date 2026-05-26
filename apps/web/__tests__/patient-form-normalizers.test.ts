import { describe, expect, it } from 'vitest'

import {
  emptyStringToNull,
  normalizePatientDob,
  normalizePatientEmail,
  normalizePatientName,
  normalizePatientNotes,
  normalizePatientPhone,
} from '../lib/patients/patient-form-normalizers'

describe('patient form normalizers', () => {
  it('converts only empty optional text to null', () => {
    expect(emptyStringToNull('')).toBeNull()
    expect(emptyStringToNull('joao@email.com')).toBe('joao@email.com')
  })

  it('preserves the current name behavior without trimming spaces', () => {
    expect(normalizePatientName('  Joao da Silva  ')).toBe('  Joao da Silva  ')
  })

  it('preserves the current phone behavior', () => {
    expect(normalizePatientPhone('')).toBeNull()
    expect(normalizePatientPhone('(11) 99999-9999')).toBe('(11) 99999-9999')
  })

  it('preserves the current email behavior', () => {
    expect(normalizePatientEmail('')).toBeNull()
    expect(normalizePatientEmail(' joao@email.com ')).toBe(' joao@email.com ')
  })

  it('preserves the current date of birth behavior', () => {
    expect(normalizePatientDob('1985-04-12')).toBe('1985-04-12')
  })

  it('preserves notes exactly when they are filled', () => {
    expect(normalizePatientNotes('')).toBeNull()
    expect(normalizePatientNotes('  Historico familiar relevante.  ')).toBe('  Historico familiar relevante.  ')
  })
})
