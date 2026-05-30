import { Bell } from 'lucide-react'

import { ALERT_STATUS_CONFIG } from '@/lib/alerts/alert-status-config'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type PatientAlert = {
  id: string
  status: 'PENDING' | 'SENT' | 'DISMISSED'
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  due_date: Date | string
  sent_at: Date | string | null
}

interface PatientRecallsCardProps {
  alerts: PatientAlert[]
}

export default function PatientRecallsCard({ alerts }: PatientRecallsCardProps) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4.5 w-4.5 text-indigo-500" />
          <CardTitle className="text-base font-bold">Lembretes e recalls do paciente</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
            Nenhum lembrete gerado ainda. Lembretes são criados automaticamente ao salvar um exame.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const statusConfig = ALERT_STATUS_CONFIG[alert.status]
              const isSent = alert.status === 'SENT'

              return (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/20"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Lembrete de Consulta Anual ({alert.channel})
                      </span>
                      <Badge variant={statusConfig.badgeVariant} className="px-1.5 py-0 text-[9px]">
                        {statusConfig.compactLabel ?? statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Vencimento do exame: {new Date(alert.due_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {isSent && alert.sent_at ? (
                    <div className="text-[11px] font-semibold text-slate-500">
                      Disparado em: {new Date(alert.sent_at).toLocaleDateString('pt-BR')}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
