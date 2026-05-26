import { describe, expect, it } from 'vitest'

import { buildPatientPayload } from '../lib/patients/patient-form-mapper'

describe('buildPatientPayload', () => {
  it('preserves required patient fields and keeps optional filled values unchanged', () => {
    expect(buildPatientPayload({
      patientId: 'patient-1',
      fullName: 'Joao da Silva',
      dob: '1985-04-12',
      phone: '(11) 99999-9999',
      email: 'joao@email.com',
      notes: 'Paciente com historico familiar.',
    })).toEqual({
      patientId: 'patient-1',
      fullName: 'Joao da Silva',
      dob: '1985-04-12',
      phone: '(11) 99999-9999',
      email: 'joao@email.com',
      notes: 'Paciente com historico familiar.',
    })
  })

  it('keeps the existing API contract for empty optional fields', () => {
    expect(buildPatientPayload({
      patientId: undefined,
      fullName: 'Maria Oliveira',
      dob: '1992-10-30',
      phone: '',
      email: '',
      notes: '',
    })).toEqual({
      patientId: undefined,
      fullName: 'Maria Oliveira',
      dob: '1992-10-30',
      phone: null,
      email: null,
      notes: null,
    })
  })
})
