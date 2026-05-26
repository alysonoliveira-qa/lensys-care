import Link from 'next/link'
import { BellRing, CalendarClock } from 'lucide-react'

import { ALERT_STATUS_CONFIG } from '@/lib/alerts/alert-status-config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import DashboardPanelHeading from './DashboardPanelHeading'

type RecentAlert = {
  id: string
  patient_id: string
  due_date: Date | string
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  patient: {
    full_name: string
  }
}

interface UpcomingRecallsSectionProps {
  recentAlerts: RecentAlert[]
}

export default function UpcomingRecallsSection({
  recentAlerts,
}: UpcomingRecallsSectionProps) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <DashboardPanelHeading
        icon={CalendarClock}
        title="PrÃ³ximos Recalls"
        description="Lembretes de exames com validade de 1 ano expirando em breve."
        action={
          <Link
            href="/alerts"
            className="hidden text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 sm:inline-flex"
          >
            Gerenciar
          </Link>
        }
      />
      <CardContent className="space-y-3">
        {recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-950/30">
            <BellRing className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhum alerta pendente no momento.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Quando houver recalls para acompanhar, eles aparecerÃ£o aqui.</p>
            </div>
          </div>
        ) : (
          recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {alert.patient.full_name}
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Vence em: {new Date(alert.due_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Badge variant="warning" className="text-[10px]">
                  {ALERT_STATUS_CONFIG.PENDING.label}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {alert.channel}
                </Badge>
                <Link href={`/patients/${alert.patient_id}`} className="w-full max-w-[140px]" prefetch={false}>
                  <Button size="sm" className="h-8 w-full rounded-lg bg-indigo-600 text-[11px] font-bold hover:bg-indigo-500">
                    Disparar Manual
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
