import { PieChart } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

import DashboardPanelHeading from './DashboardPanelHeading'

interface DashboardPanelFallbackProps {
  title: string
  description: string
}

export default function DashboardPanelFallback({
  title,
  description,
}: DashboardPanelFallbackProps) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <DashboardPanelHeading icon={PieChart} title={title} description={description} />
      <CardContent>
        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </CardContent>
    </Card>
  )
}
