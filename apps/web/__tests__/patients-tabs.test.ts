import { describe, expect, it } from 'vitest'

import {
  PATIENTS_TABS,
  buildPatientsTabHref,
  parsePatientsTab,
} from '../lib/patients/patients-tabs'

describe('patients tabs', () => {
  it('offers exactly Pacientes and Indicantes, nessa ordem', () => {
    expect(PATIENTS_TABS.map((tab) => tab.id)).toEqual(['pacientes', 'indicantes'])
  })

  it('falls back to the patients list for anything unknown', () => {
    expect(parsePatientsTab(undefined)).toBe('pacientes')
    expect(parsePatientsTab('')).toBe('pacientes')
    expect(parsePatientsTab('outra-coisa')).toBe('pacientes')
    expect(parsePatientsTab('indicantes')).toBe('indicantes')
  })

  it('keeps the default tab on the clean URL', () => {
    expect(buildPatientsTabHref('pacientes')).toBe('/patients')
    expect(buildPatientsTabHref('indicantes')).toBe('/patients?tab=indicantes')
  })
})
