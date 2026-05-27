import { describe, expect, it } from 'vitest'

import {
  formatClinicalExamDate,
  mapPatientDetailSummary,
} from '../lib/patients/patient-detail-mappers'

describe('patient detail mappers', () => {
  it('maps age and clinical age group for the patient summary', () => {
    expect(mapPatientDetailSummary(
      { dob: new Date(1980, 4, 20) },
      new Date(2026, 4, 26)
    )).toEqual({
      age: 46,
      ageGroupLabel: 'Adulto (Presbiopia Mod.)',
    })
  })

  it('formats a clinical exam date without shifting its calendar day', () => {
    expect(formatClinicalExamDate('2026-05-24')).toBe('24/05/2026')
    expect(formatClinicalExamDate('2026-05-24T00:00:00.000Z')).toBe('24/05/2026')
  })
})
