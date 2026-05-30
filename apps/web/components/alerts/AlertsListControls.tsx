'use client'

import { useRouter } from 'next/navigation'
import type { ChangeEvent } from 'react'
import { ChevronDown } from 'lucide-react'

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

  const selectClassName =
    'h-11 w-full appearance-none rounded-xl border border-slate-200/80 bg-white px-4 pr-10 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-700'

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1 md:w-64">
        <label htmlFor="alerts-status-filter" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Status
        </label>
        <div className="relative">
          <select
            id="alerts-status-filter"
            value={initialStatus}
            onChange={handleStatusChange}
            className={selectClassName}
            data-cy="alerts-status-filter"
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendentes</option>
            <option value="SENT">Enviados</option>
            <option value="DISMISSED">Cancelados / Dispensados</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="flex flex-col gap-1 md:w-64">
        <label htmlFor="alerts-sort" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ordenar por
        </label>
        <div className="relative">
          <select
            id="alerts-sort"
            value={initialSort}
            onChange={handleSortChange}
            className={selectClassName}
            data-cy="alerts-sort-select"
          >
            <option value="due_asc">Vencimento mais próximo</option>
            <option value="due_desc">Vencimento mais distante</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    </div>
  )
}
