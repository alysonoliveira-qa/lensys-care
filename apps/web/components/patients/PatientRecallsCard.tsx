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
    <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">Lembretes & Recalls do Paciente</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold italic">Nenhum lembrete gerado ainda. Lembretes sao criados automaticamente ao salvar um exame.</div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const statusConfig = ALERT_STATUS_CONFIG[alert.status]
              const isSent = alert.status === 'SENT'

              return (
                <div
                  key={alert.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Lembrete de Consulta Anual ({alert.channel})
                      </span>
                      <Badge
                        variant={statusConfig.badgeVariant}
                        className="text-[9px] py-0 px-1.5"
                      >
                        {statusConfig.compactLabel ?? statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Vencimento do Exame: {new Date(alert.due_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {isSent && alert.sent_at && (
                    <div className="text-slate-500 font-semibold text-[10px]">
                      Disparado em: {new Date(alert.sent_at).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
