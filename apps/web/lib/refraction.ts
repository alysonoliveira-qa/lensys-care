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

// Lookup table de adição por presbiopia com granularidade fina (passos de 2 anos).
//
// A classificação clínica (label) segue as faixas do guia de prescrição do
// optogrid.com / StatPearls (NIH/NCBI):
//   40–44 Presbiopia leve · 45–54 leve a moderada · 55–59 moderada a avançada · 60+ avançada
//
// A adição sugerida progride ~+0,25 D a cada 2 anos entre 40 e 50, desacelerando
// para ~+0,25 D a cada 5–8 anos após os 50 (StatPearls), cobrindo toda a escala
// clínica de +0,75 a +3,50 D. O valor é apenas um ponto de partida orientativo —
// a determinação final é individualizada (ARP/ARN, distância de leitura, grau base).
export const AGE_GROUP_TABLE: AgeGroupInfo[] = [
  { label: 'Infantil / Adolescente',    minAge: 0,  maxAge: 17,  suggestedAddition: 0.0  },
  { label: 'Adulto Jovem',              minAge: 18, maxAge: 39,  suggestedAddition: 0.0  },

  // Presbiopia inicial (leve) — progressão +0,25 D a cada 2 anos
  { label: 'Adulto (Presbiopia Ini.)',  minAge: 40, maxAge: 41,  suggestedAddition: 0.75 },
  { label: 'Adulto (Presbiopia Ini.)',  minAge: 42, maxAge: 43,  suggestedAddition: 1.0  },
  { label: 'Adulto (Presbiopia Ini.)',  minAge: 44, maxAge: 44,  suggestedAddition: 1.25 },

  // Presbiopia moderada — mantém a cadência de 2 anos até os 50
  { label: 'Adulto (Presbiopia Mod.)',  minAge: 45, maxAge: 45,  suggestedAddition: 1.25 },
  { label: 'Adulto (Presbiopia Mod.)',  minAge: 46, maxAge: 47,  suggestedAddition: 1.5  },
  { label: 'Adulto (Presbiopia Mod.)',  minAge: 48, maxAge: 49,  suggestedAddition: 1.75 },
  { label: 'Adulto (Presbiopia Mod.)',  minAge: 50, maxAge: 52,  suggestedAddition: 2.0  },
  { label: 'Adulto (Presbiopia Mod.)',  minAge: 53, maxAge: 54,  suggestedAddition: 2.25 },

  // Presbiopia avançada — progressão desacelera após os 50
  { label: 'Adulto (Presbiopia Avç.)',  minAge: 55, maxAge: 55,  suggestedAddition: 2.25 },
  { label: 'Adulto (Presbiopia Avç.)',  minAge: 56, maxAge: 59,  suggestedAddition: 2.5  },

  // Idoso — plateau clínico até +3,50 D
  { label: 'Idoso',                     minAge: 60, maxAge: 64,  suggestedAddition: 2.75 },
  { label: 'Idoso',                     minAge: 65, maxAge: 70,  suggestedAddition: 3.0  },
  { label: 'Idoso',                     minAge: 71, maxAge: 76,  suggestedAddition: 3.25 },
  { label: 'Idoso',                     minAge: 77, maxAge: 999, suggestedAddition: 3.5  },
]

/**
 * Calculates the exact age in full years at a given reference date.
 * Uses birthday-aware calculation to avoid off-by-one errors around birthdays.
 *
 * **Os dois lados são lidos com getters diferentes de propósito.**
 *
 * `dob` vem de uma coluna `DATE` do Postgres, que é data de calendário — "12 de
 * abril", sem hora e sem fuso. O Prisma a entrega como instante em meia-noite
 * UTC, então só `getUTC*` devolve o dia que a pessoa digitou. Com getters
 * locais, todo fuso negativo lê o dia anterior: no Brasil, `1981-12-02` virava
 * dia 1. Isso acontecia de verdade — no servidor da Vercel não, porque ele roda
 * em UTC, mas `PatientExamHistory` e `useAgeGroup` são componentes de cliente e
 * rodam no navegador do usuário, em UTC-3. A mesma pessoa tinha uma idade na
 * página de detalhe e outra no histórico de exames.
 *
 * `referenceDate` é o oposto: representa "agora", um instante real, e o "hoje"
 * que importa é o de quem está olhando a tela. Aí getter local é o certo.
 *
 * A idade alimenta `getSuggestedAddition`, que sugere adição para presbiopia —
 * é dado clínico, não enfeite.
 */
export function calculateAge(dob: Date, referenceDate: Date = new Date()): number {
  const birthYear  = dob.getUTCFullYear()
  const birthMonth = dob.getUTCMonth()
  const birthDay   = dob.getUTCDate()

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
