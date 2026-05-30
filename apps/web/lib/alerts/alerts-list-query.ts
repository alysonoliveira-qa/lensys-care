import type { Prisma } from '@prisma/client'

import type { AlertStatus } from './alert-status-config'

export const ALERTS_PAGE_SIZE = 20
export const ALERT_SORT_OPTIONS = ['due_asc', 'due_desc'] as const

export type AlertStatusFilter = AlertStatus | 'ALL'
export type AlertSortOption = (typeof ALERT_SORT_OPTIONS)[number]

export function parseAlertStatusFilter(status?: string): AlertStatusFilter {
  if (status === 'PENDING' || status === 'SENT' || status === 'DISMISSED' || status === 'ALL') {
    return status
  }

  return 'ALL'
}

export function parseAlertSort(sort?: string): AlertSortOption {
  if (sort === 'due_asc' || sort === 'due_desc') {
    return sort
  }

  return 'due_asc'
}

export function getAlertOrderBy(sort: AlertSortOption): Prisma.AlertOrderByWithRelationInput {
  switch (sort) {
    case 'due_desc':
      return { due_date: 'desc' }
    case 'due_asc':
    default:
      return { due_date: 'asc' }
  }
}

export function buildAlertsListQuery(params: {
  status?: AlertStatusFilter
  sort?: AlertSortOption
  page?: number
}): string {
  const searchParams = new URLSearchParams()
  const status = params.status ?? 'ALL'
  const sort = params.sort ?? 'due_asc'

  if (status !== 'ALL') {
    searchParams.set('status', status)
  }

  if (sort !== 'due_asc') {
    searchParams.set('sort', sort)
  }

  if (params.page && params.page > 1) {
    searchParams.set('page', String(params.page))
  }

  const query = searchParams.toString()

  return query ? `/alerts?${query}` : '/alerts'
}
