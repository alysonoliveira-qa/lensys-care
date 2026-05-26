import { PieChart } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import DashboardPanelHeading from './DashboardPanelHeading'

type AgeDistributionGroup = {
  label: string
  value: number
  colorClassName: string
  accentClassName: string
}

interface AgeDistributionSectionProps {
  groups: AgeDistributionGroup[]
  maxGroupValue: number
  totalPatients: number
}

export default function AgeDistributionSection({
  groups,
  maxGroupValue,
  totalPatients,
}: AgeDistributionSectionProps) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <DashboardPanelHeading
        icon={PieChart}
        title="DistribuiÃ§Ã£o de Pacientes por Faixa EtÃ¡ria"
        description="AnÃ¡lise demogrÃ¡fica para adequaÃ§Ã£o de serviÃ§os e presbiopia."
        action={
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {totalPatients} paciente(s)
          </Badge>
        }
      />
      <CardContent className="space-y-4" data-cy="alerts-list">
        {groups.map((group) => {
          const percentage = totalPatients > 0 ? (group.value / totalPatients) * 100 : 0

          return (
            <div
              key={group.label}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30"
            >
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">{group.label}</span>
                <span className={group.accentClassName}>
                  {group.value} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${group.colorClassName} transition-all duration-500`}
                  style={{ width: `${(group.value / maxGroupValue) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
