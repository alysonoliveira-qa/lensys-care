import { prisma } from '@/lib/db'

export interface PatientSearchResult {
  id: string
  full_name: string
  phone: string | null
}

export const PATIENT_SEARCH_MIN_LENGTH = 2
const PATIENT_SEARCH_LIMIT = 8

/**
 * Busca ILIKE por nome/e-mail, sempre restrita à clínica do usuário.
 * Os índices GIN/pg_trgm da migration 008 é que sustentam o `contains` insensitive.
 */
export async function searchPatientsForClinic(
  clinicId: string,
  term: string
): Promise<PatientSearchResult[]> {
  const search = term.trim()

  if (search.length < PATIENT_SEARCH_MIN_LENGTH) return []

  return prisma.patient.findMany({
    where: {
      clinic_id: clinicId,
      OR: [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    },
    orderBy: { full_name: 'asc' },
    take: PATIENT_SEARCH_LIMIT,
    select: { id: true, full_name: true, phone: true },
  })
}
