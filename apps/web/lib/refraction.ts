// ─────────────────────────────────────────────────────────────────────────────
// lib/refraction.ts
// Pure business logic for presbyopia addition and age group classification.
// No React imports — safe to use in both server and client contexts.
// ─────────────────────────────────────────────────────────────────────────────

export type AgeGroup =
  | 'Infantil / Adolescente'
  | 'Adulto Jovem'
  | 'Adulto (Presbiopia Ini.)'
  | 'Adulto (Presbiopia Mod.)'
  | 'Adulto (Presbiopia Avç.)'
  | 'Idoso'

export interface AgeGroupInfo {
  label: AgeGroup
  minAge: number
  maxAge: number
  suggestedAddition: number
}

// Lookup table exactly as specified in the business rules
export const AGE_GROUP_TABLE: AgeGroupInfo[] = [
  { label: 'Infantil / Adolescente',      minAge: 0,  maxAge: 17,  suggestedAddition: 0.0  },
  { label: 'Adulto Jovem',                minAge: 18, maxAge: 39,  suggestedAddition: 0.0  },
  { label: 'Adulto (Presbiopia Ini.)',     minAge: 40, maxAge: 44,  suggestedAddition: 0.75 },
  { label: 'Adulto (Presbiopia Mod.)',     minAge: 45, maxAge: 49,  suggestedAddition: 1.25 },
  { label: 'Adulto (Presbiopia Mod.)',     minAge: 50, maxAge: 54,  suggestedAddition: 1.75 },
  { label: 'Adulto (Presbiopia Avç.)',     minAge: 55, maxAge: 59,  suggestedAddition: 2.25 },
  { label: 'Idoso',                        minAge: 60, maxAge: 999, suggestedAddition: 2.75 },
]

/**
 * Calculates the exact age in full years at a given reference date.
 * Uses birthday-aware calculation to avoid off-by-one errors around birthdays.
 */
export function calculateAge(dob: Date, referenceDate: Date = new Date()): number {
  const birthYear  = dob.getFullYear()
  const birthMonth = dob.getMonth()
  const birthDay   = dob.getDate()

  const refYear  = referenceDate.getFullYear()
  const refMonth = referenceDate.getMonth()
  const refDay   = referenceDate.getDate()

  let age = refYear - birthYear

  // If the birthday hasn't occurred yet this year, subtract 1
  if (
    refMonth < birthMonth ||
    (refMonth === birthMonth && refDay < birthDay)
  ) {
    age -= 1
  }

  return age
}

/**
 * Returns the AgeGroupInfo for a patient given their date of birth.
 * The age group is computed at runtime — never stored in the database.
 */
export function getAgeGroupInfo(dob: Date, referenceDate: Date = new Date()): AgeGroupInfo {
  const age = calculateAge(dob, referenceDate)

  const group = AGE_GROUP_TABLE.find(
    (g) => age >= g.minAge && age <= g.maxAge
  )

  // Should never happen given the table covers 0–999, but keeps TypeScript happy
  if (!group) {
    return AGE_GROUP_TABLE[AGE_GROUP_TABLE.length - 1]
  }

  return group
}

/**
 * Returns only the age group label string.
 */
export function getAgeGroup(dob: Date, referenceDate: Date = new Date()): AgeGroup {
  return getAgeGroupInfo(dob, referenceDate).label
}

/**
 * Returns the suggested presbyopia addition value for a patient.
 * Returns 0 for patients under 40 (no presbyopia).
 */
export function getSuggestedAddition(dob: Date, referenceDate: Date = new Date()): number {
  return getAgeGroupInfo(dob, referenceDate).suggestedAddition
}

// ─── Refraction validation constants ─────────────────────────────────────────

export const REFRACTION_LIMITS = {
  sph: { min: -20, max: 20, step: 0.25 },
  cyl: { min: -10, max:  0, step: 0.25 },
  axis: { min: 0, max: 180, step: 1    },
  addition: { min: 0, max: 4, step: 0.25 },
  pd: { min: 45, max: 80, step: 0.5 },
} as const

/**
 * Validates that a spherical value is within the allowed range.
 */
export function validateSph(value: number): boolean {
  return value >= REFRACTION_LIMITS.sph.min && value <= REFRACTION_LIMITS.sph.max
}

/**
 * Validates that a cylindrical value is within the allowed range.
 */
export function validateCyl(value: number): boolean {
  return value >= REFRACTION_LIMITS.cyl.min && value <= REFRACTION_LIMITS.cyl.max
}

/**
 * Validates that an axis value is within 0–180.
 */
export function validateAxis(value: number): boolean {
  return Number.isInteger(value) &&
    value >= REFRACTION_LIMITS.axis.min &&
    value <= REFRACTION_LIMITS.axis.max
}
