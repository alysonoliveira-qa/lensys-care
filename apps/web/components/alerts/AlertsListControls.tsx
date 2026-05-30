'use client'

import { useRouter } from 'next/navigation'
import type { ChangeEvent } from 'react'

import {
  buildAlertsListQuery,
  type AlertSortOption,
  type AlertStatusFilter,
} from '@/lib/alerts/alerts-list-query'

interface AlertsListControlsProps {
  initialStatus: AlertStatusFilter
  initialSort: AlertSortOption
}

export default function AlertsListControls({
  initialStatus,
  initialSort,
}: AlertsListControlsProps) {
  const router = useRouter()

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    router.push(buildAlertsListQuery({
      status: event.target.value as AlertStatusFilter,
      sort: initialSort,
      page: 1,
    }))
  }

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    router.push(buildAlertsListQuery({
      status: initialStatus,
      sort: event.target.value as AlertSortOption,
      page: 1,
    }))
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1 md:w-64">
        <label htmlFor="alerts-status-filter" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Status
        </label>
        <select
          id="alerts-status-filter"
          value={initialStatus}
          onChange={handleStatusChange}
          className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200"
          data-cy="alerts-status-filter"
        >
          <option value="ALL">Todos</option>
          <option value="PENDING">Pendentes</option>
          <option value="SENT">Enviados</option>
          <option value="DISMISSED">Cancelados / Dispensados</option>
        </select>
      </div>

      <div className="flex flex-col gap-1 md:w-64">
        <label htmlFor="alerts-sort" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ordenar por
        </label>
        <select
          id="alerts-sort"
          value={initialSort}
          onChange={handleSortChange}
          className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200"
        >
          <option value="due_asc">Vencimento mais prÃ³ximo</option>
          <option value="due_desc">Vencimento mais distante</option>
        </select>
      </div>
    </div>
  )
}
