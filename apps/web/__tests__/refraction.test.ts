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
  // Referência em julho + nascimento em 1º de janeiro => idade = refYear - birthYear
  // (aniversário sempre já ocorreu, evitando erros de borda).
  const refDate = new Date('2026-07-01')
  const dobForAge = (age: number) => new Date(`${2026 - age}-01-01`)

  // Under 18: Infantil / Adolescente -> ADD 0.00
  it('Infantil / Adolescente (< 18 years)', () => {
    const dob = dobForAge(11)
    expect(getAgeGroup(dob, refDate)).toBe('Infantil / Adolescente')
    expect(getSuggestedAddition(dob, refDate)).toBe(0.0)
  })

  // 18 to 39: Adulto Jovem -> ADD 0.00
  it('Adulto Jovem (18 - 39 years)', () => {
    const dob = dobForAge(30)
    expect(getAgeGroup(dob, refDate)).toBe('Adulto Jovem')
    expect(getSuggestedAddition(dob, refDate)).toBe(0.0)
  })

  // 40 to 44: Presbiopia inicial — progressão +0,25 D a cada 2 anos
  it('Presbiopia Ini. progride 0.75 -> 1.00 -> 1.25 (40 - 44 years)', () => {
    expect(getAgeGroup(dobForAge(40), refDate)).toBe('Adulto (Presbiopia Ini.)')
    expect(getSuggestedAddition(dobForAge(40), refDate)).toBe(0.75)
    expect(getSuggestedAddition(dobForAge(41), refDate)).toBe(0.75)
    expect(getSuggestedAddition(dobForAge(42), refDate)).toBe(1.0)
    expect(getSuggestedAddition(dobForAge(43), refDate)).toBe(1.0)
    expect(getSuggestedAddition(dobForAge(44), refDate)).toBe(1.25)
  })

  // 45 to 54: Presbiopia moderada — mantém cadência de 2 anos até os 50
  it('Presbiopia Mod. progride 1.25 -> 1.50 -> 1.75 -> 2.00 -> 2.25 (45 - 54 years)', () => {
    expect(getAgeGroup(dobForAge(45), refDate)).toBe('Adulto (Presbiopia Mod.)')
    expect(getSuggestedAddition(dobForAge(45), refDate)).toBe(1.25)
    expect(getSuggestedAddition(dobForAge(46), refDate)).toBe(1.5)
    expect(getSuggestedAddition(dobForAge(48), refDate)).toBe(1.75)
    expect(getSuggestedAddition(dobForAge(50), refDate)).toBe(2.0)
    expect(getSuggestedAddition(dobForAge(53), refDate)).toBe(2.25)
    expect(getAgeGroup(dobForAge(54), refDate)).toBe('Adulto (Presbiopia Mod.)')
  })

  // 55 to 59: Presbiopia avançada — progressão desacelera após os 50
  it('Presbiopia Avç. 2.25 -> 2.50 (55 - 59 years)', () => {
    expect(getAgeGroup(dobForAge(55), refDate)).toBe('Adulto (Presbiopia Avç.)')
    expect(getSuggestedAddition(dobForAge(55), refDate)).toBe(2.25)
    expect(getSuggestedAddition(dobForAge(56), refDate)).toBe(2.5)
    expect(getSuggestedAddition(dobForAge(59), refDate)).toBe(2.5)
  })

  // 60+: Idoso — plateau clínico até +3.50 D
  it('Idoso progride 2.75 -> 3.00 -> 3.25 -> 3.50 (60+ years)', () => {
    expect(getAgeGroup(dobForAge(60), refDate)).toBe('Idoso')
    expect(getSuggestedAddition(dobForAge(60), refDate)).toBe(2.75)
    expect(getSuggestedAddition(dobForAge(65), refDate)).toBe(3.0)
    expect(getSuggestedAddition(dobForAge(71), refDate)).toBe(3.25)
    expect(getSuggestedAddition(dobForAge(80), refDate)).toBe(3.5)
  })

  // Regressão: todos os passos de 0,25 D entre +0.75 e +3.50 são alcançáveis
  it('cobre toda a escala de +0.75 a +3.50 em passos de 0.25 D', () => {
    const reachable = new Set<number>()
    for (let age = 40; age <= 90; age++) {
      reachable.add(getSuggestedAddition(dobForAge(age), refDate))
    }
    for (const value of [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5]) {
      expect(reachable.has(value)).toBe(true)
    }
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
