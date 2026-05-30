import { describe, expect, it } from 'vitest'

import {
  buildAlertsListQuery,
  getAlertOrderBy,
  parseAlertSort,
  parseAlertStatusFilter,
} from '../lib/alerts/alerts-list-query'

describe('alerts list query helpers', () => {
  it('defaults to ALL status and due_asc sort for missing or invalid params', () => {
    expect(parseAlertStatusFilter()).toBe('ALL')
    expect(parseAlertStatusFilter('invalid')).toBe('ALL')
    expect(parseAlertSort()).toBe('due_asc')
    expect(parseAlertSort('invalid')).toBe('due_asc')
  })

  it('maps sort options to Prisma orderBy clauses', () => {
    expect(getAlertOrderBy('due_asc')).toEqual({ due_date: 'asc' })
    expect(getAlertOrderBy('due_desc')).toEqual({ due_date: 'desc' })
  })

  it('builds alerts list links preserving explicit filters and omitting defaults', () => {
    expect(buildAlertsListQuery({
      status: 'SENT',
      sort: 'due_desc',
      page: 3,
    })).toBe('/alerts?status=SENT&sort=due_desc&page=3')

    expect(buildAlertsListQuery({
      status: 'ALL',
      sort: 'due_asc',
      page: 1,
    })).toBe('/alerts')
  })
})
