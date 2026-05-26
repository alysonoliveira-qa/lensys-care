import type React from 'react'

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardPanelHeadingProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}

export default function DashboardPanelHeading({
  icon: Icon,
  title,
  description,
  action,
}: DashboardPanelHeadingProps) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</CardTitle>
          <CardDescription className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </CardDescription>
        </div>
      </div>
      {action}
    </CardHeader>
  )
}
