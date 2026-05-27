import { describe, expect, it } from 'vitest'

import { mapPatientDetailSummary } from '../lib/patients/patient-detail-mappers'

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
})
