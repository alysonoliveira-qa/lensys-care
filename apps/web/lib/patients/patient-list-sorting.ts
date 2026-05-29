import type { Prisma } from '@prisma/client'

export const PATIENT_SORT_OPTIONS = ['recent', 'name', 'birthdate'] as const

export type PatientSortOption = (typeof PATIENT_SORT_OPTIONS)[number]

export function parsePatientSort(sort?: string): PatientSortOption {
  if (sort === 'recent' || sort === 'name' || sort === 'birthdate') {
    return sort
  }

  return 'recent'
}

export function getPatientOrderBy(sort: PatientSortOption): Prisma.PatientOrderByWithRelationInput {
  switch (sort) {
    case 'name':
      return { full_name: 'asc' }
    case 'birthdate':
      return { dob: 'asc' }
    case 'recent':
    default:
      return { created_at: 'desc' }
  }
}

export function buildPatientsListQuery(params: {
  search?: string
  sort?: PatientSortOption
  page?: number
}): string {
  const searchParams = new URLSearchParams()
  const trimmedSearch = params.search?.trim()
  const sort = params.sort ?? 'recent'

  if (trimmedSearch) {
    searchParams.set('search', trimmedSearch)
  }

  if (sort !== 'recent') {
    searchParams.set('sort', sort)
  }

  if (params.page && params.page > 1) {
    searchParams.set('page', String(params.page))
  }

  const query = searchParams.toString()

  return query ? `/patients?${query}` : '/patients'
}
