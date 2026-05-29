import { describe, expect, it } from 'vitest'

import {
  buildPatientsListQuery,
  getPatientOrderBy,
  parsePatientSort,
} from '../lib/patients/patient-list-sorting'

describe('patient list sorting helpers', () => {
  it('defaults to recent sort when the query param is missing or invalid', () => {
    expect(parsePatientSort()).toBe('recent')
    expect(parsePatientSort('invalid')).toBe('recent')
  })

  it('maps sort options to the expected Prisma orderBy clauses', () => {
    expect(getPatientOrderBy('recent')).toEqual({ created_at: 'desc' })
    expect(getPatientOrderBy('name')).toEqual({ full_name: 'asc' })
    expect(getPatientOrderBy('birthdate')).toEqual({ dob: 'asc' })
  })

  it('builds list links preserving search and sort while omitting default params', () => {
    expect(buildPatientsListQuery({
      search: ' Ana ',
      sort: 'name',
      page: 3,
    })).toBe('/patients?search=Ana&sort=name&page=3')

    expect(buildPatientsListQuery({
      search: '',
      sort: 'recent',
      page: 1,
    })).toBe('/patients')
  })
})
