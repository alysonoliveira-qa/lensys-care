import { describe, it, expect } from 'vitest'
import {
  calculateAge,
  getAgeGroup,
  getSuggestedAddition,
  validateSph,
  validateCyl,
  validateAxis
} from '../lib/refraction'

describe('calculateAge', () => {
  it('correctly calculates age when birthday has already occurred this year', () => {
    const dob = new Date('1990-01-15')
    const ref = new Date('2026-05-22')
    expect(calculateAge(dob, ref)).toBe(36)
  })

  it('correctly calculates age when birthday has not occurred yet this year', () => {
    const dob = new Date('1990-08-20')
    const ref = new Date('2026-05-22')
    expect(calculateAge(dob, ref)).toBe(35)
  })

  it('handles leap year birthdays properly', () => {
    const dob = new Date('2000-02-29')
    const ref = new Date('2026-02-28')
    expect(calculateAge(dob, ref)).toBe(25)
  })
})

describe('getAgeGroup & getSuggestedAddition (Lookup Table Rules)', () => {
  const refDate = new Date('2026-05-22')

  // Under 18: Infantil / Adolescente -> ADD 0.00
  it('Infantil / Adolescente (< 18 years)', () => {
    const dob = new Date('2015-05-22') // exactly 11 years old
    expect(getAgeGroup(dob, refDate)).toBe('Infantil / Adolescente')
    expect(getSuggestedAddition(dob, refDate)).toBe(0.0)
  })

  // 18 to 39: Adulto Jovem -> ADD 0.00
  it('Adulto Jovem (18 - 39 years)', () => {
    const dob = new Date('1996-05-22') // exactly 30 years old
    expect(getAgeGroup(dob, refDate)).toBe('Adulto Jovem')
    expect(getSuggestedAddition(dob, refDate)).toBe(0.0)
  })

  // 40 to 44: Adulto (Presbiopia Ini.) -> ADD +0.75
  it('Adulto (Presbiopia Ini.) (40 - 44 years)', () => {
    const dobBoundaryMin = new Date('1986-05-22') // exactly 40 years old
    expect(getAgeGroup(dobBoundaryMin, refDate)).toBe('Adulto (Presbiopia Ini.)')
    expect(getSuggestedAddition(dobBoundaryMin, refDate)).toBe(0.75)

    const dobBoundaryMax = new Date('1982-05-23') // exactly 44 years old
    expect(getAgeGroup(dobBoundaryMax, refDate)).toBe('Adulto (Presbiopia Ini.)')
    expect(getSuggestedAddition(dobBoundaryMax, refDate)).toBe(0.75)
  })

  // 45 to 49: Adulto (Presbiopia Mod.) -> ADD +1.25
  it('Adulto (Presbiopia Mod. 1) (45 - 49 years)', () => {
    const dob = new Date('1981-05-22') // exactly 45 years old
    expect(getAgeGroup(dob, refDate)).toBe('Adulto (Presbiopia Mod.)')
    expect(getSuggestedAddition(dob, refDate)).toBe(1.25)
  })

  // 50 to 54: Adulto (Presbiopia Mod.) -> ADD +1.75
  it('Adulto (Presbiopia Mod. 2) (50 - 54 years)', () => {
    const dob = new Date('1976-05-22') // exactly 50 years old
    expect(getAgeGroup(dob, refDate)).toBe('Adulto (Presbiopia Mod.)')
    expect(getSuggestedAddition(dob, refDate)).toBe(1.75)
  })

  // 55 to 59: Adulto (Presbiopia Avç.) -> ADD +2.25
  it('Adulto (Presbiopia Avç.) (55 - 59 years)', () => {
    const dob = new Date('1971-05-22') // exactly 55 years old
    expect(getAgeGroup(dob, refDate)).toBe('Adulto (Presbiopia Avç.)')
    expect(getSuggestedAddition(dob, refDate)).toBe(2.25)
  })

  // 60+: Idoso -> ADD +2.75
  it('Idoso (60+ years)', () => {
    const dob = new Date('1966-05-22') // exactly 60 years old
    expect(getAgeGroup(dob, refDate)).toBe('Idoso')
    expect(getSuggestedAddition(dob, refDate)).toBe(2.75)
  })
})

describe('Refraction boundary limit validations', () => {
  it('validates Spherical inputs properly', () => {
    expect(validateSph(-20)).toBe(true)
    expect(validateSph(0)).toBe(true)
    expect(validateSph(20)).toBe(true)
    expect(validateSph(-20.1)).toBe(false)
    expect(validateSph(20.5)).toBe(false)
  })

  it('validates Cylindrical inputs properly', () => {
    expect(validateCyl(-10)).toBe(true)
    expect(validateCyl(-3.50)).toBe(true)
    expect(validateCyl(0)).toBe(true)
    expect(validateCyl(0.25)).toBe(false)
    expect(validateCyl(-10.25)).toBe(false)
  })

  it('validates Axis inputs properly', () => {
    expect(validateAxis(0)).toBe(true)
    expect(validateAxis(90)).toBe(true)
    expect(validateAxis(180)).toBe(true)
    expect(validateAxis(-1)).toBe(false)
    expect(validateAxis(181)).toBe(false)
    expect(validateAxis(45.5)).toBe(false)
  })
})
