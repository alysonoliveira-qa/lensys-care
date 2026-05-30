'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

import AlertActionRow from '@/components/alerts/AlertActionRow'

export interface AlertData {
  id: string
  patient_id: string
  exam_id: string
  due_date: Date | string
  status: 'PENDING' | 'SENT' | 'DISMISSED'
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  sent_at?: Date | string | null
  patient: {
    id: string
    full_name: string
    phone: string | null
    email: string | null
  }
}

interface AlertActionsListProps {
  alerts: AlertData[]
}

export default function AlertActionsList({ alerts }: AlertActionsListProps) {
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successAlert, setSuccessAlert] = useState<string | null>(null)

  const handleAction = async (alertId: string, action: 'dismiss' | 'resend') => {
    setActionLoading(alertId)
    setSuccessAlert(null)

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao realizar a ação.')
      }

      setSuccessAlert(alertId)
      setTimeout(() => setSuccessAlert(null), 3000)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao realizar a ação. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="select-none" data-cy="alerts-list">
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950/30">
          <Bell className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Nenhum lembrete encontrado nesta categoria.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Os alertas aparecem aqui conforme a fila e os filtros selecionados.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:bg-slate-950/50">
                <th className="px-6 py-3">Paciente</th>
                <th className="px-6 py-3">Renovação</th>
                <th className="px-6 py-3">Canal</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.map((alert) => {
                const isLoading = actionLoading === alert.id
                const isSuccess = successAlert === alert.id

                return (
                  <AlertActionRow
                    key={alert.id}
                    alert={alert}
                    isLoading={isLoading}
                    isSuccess={isSuccess}
                    onDismiss={() => handleAction(alert.id, 'dismiss')}
                    onResend={() => handleAction(alert.id, 'resend')}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
