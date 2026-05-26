import type React from 'react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

type DashboardSummaryCardItem = {
  id: string
  label: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconClassName: string
  noteClassName: string
  noteIcon?: React.ComponentType<{ className?: string }> | null
}

interface DashboardSummaryCardsProps {
  items: DashboardSummaryCardItem[]
}

export default function DashboardSummaryCards({ items }: DashboardSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" data-cy="dashboard-summary-cards">
      {items.map((item) => {
        const Icon = item.icon
        const NoteIcon = item.noteIcon

        return (
          <Card
            key={item.id}
            className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
          >
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {item.label}
                </span>
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {item.value}
                </div>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${item.noteClassName}`}>
                {NoteIcon ? <NoteIcon className="h-3.5 w-3.5" /> : null}
                <span>{item.description}</span>
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
