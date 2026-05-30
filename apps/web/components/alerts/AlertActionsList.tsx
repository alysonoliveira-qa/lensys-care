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
        throw new Error(data.message || 'Erro ao realizar ação.')
      }

      setSuccessAlert(alertId)
      setTimeout(() => setSuccessAlert(null), 3000)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao realizar ação. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="select-none">
      {alerts.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
          <Bell className="h-12 w-12 text-slate-300 dark:text-slate-700 animate-pulse" />
          <span>Nenhum lembrete encontrado nesta categoria.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/40">
                <th className="py-3 px-6">Paciente</th>
                <th className="py-3 px-6">Data Vencimento</th>
                <th className="py-3 px-6">Canal</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Ações</th>
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
