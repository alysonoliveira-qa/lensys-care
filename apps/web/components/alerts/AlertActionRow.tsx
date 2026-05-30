'use client'

import { Calendar, Mail, Phone } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ALERT_STATUS_CONFIG } from '@/lib/alerts/alert-status-config'

import AlertActionButtons from './AlertActionButtons'
import type { AlertData } from './AlertActionsList'

interface AlertActionRowProps {
  alert: AlertData
  isLoading: boolean
  isSuccess: boolean
  onDismiss: () => void
  onResend: () => void
}

export default function AlertActionRow({
  alert,
  isLoading,
  isSuccess,
  onDismiss,
  onResend,
}: AlertActionRowProps) {
  const statusConfig = ALERT_STATUS_CONFIG[alert.status]

  return (
    <tr className="text-slate-600 transition-colors hover:bg-slate-50/80 dark:text-slate-300 dark:hover:bg-slate-950/30">
      <td className="px-6 py-4">
        <div className="font-bold text-slate-800 dark:text-slate-100">{alert.patient.full_name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400">
          {alert.patient.phone ? (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {alert.patient.phone}
            </span>
          ) : null}
          {alert.patient.email ? (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {alert.patient.email}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {new Date(alert.due_date).toLocaleDateString('pt-BR')}
        </span>
      </td>
      <td className="px-6 py-4">
        <Badge variant="secondary" className="px-2 py-0.5 text-[9px] uppercase">
          {alert.channel}
        </Badge>
      </td>
      <td className="px-6 py-4">
        <Badge variant={statusConfig.badgeVariant} className="px-2 py-0.5 text-[9px] font-bold">
          {statusConfig.label}
        </Badge>
        {alert.sent_at ? (
          <span className="mt-1 block text-[10px] text-slate-400">
            Enviado em: {new Date(alert.sent_at).toLocaleDateString('pt-BR')}
          </span>
        ) : null}
      </td>
      <td className="px-6 py-4 text-right">
        <AlertActionButtons
          alertStatus={alert.status}
          isLoading={isLoading}
          isSuccess={isSuccess}
          patientId={alert.patient_id}
          onDismiss={onDismiss}
          onResend={onResend}
        />
      </td>
    </tr>
  )
}
