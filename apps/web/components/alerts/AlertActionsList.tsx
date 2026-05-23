'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Calendar, Eye, Mail, Phone, RefreshCw, Trash2, Loader2, CheckCircle2 } from 'lucide-react'

export interface AlertData {
  id: string
  patient_id: string
  exam_id: string
  due_date: string
  status: 'PENDING' | 'SENT' | 'DISMISSED'
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  sent_at?: string | null
  patient: {
    id: string
    full_name: string
    phone: string | null
    email: string | null
  }
}

interface AlertActionsListProps {
  alerts: AlertData[]
  activeStatus: 'PENDING' | 'SENT' | 'DISMISSED'
}

export default function AlertActionsList({ alerts, activeStatus }: AlertActionsListProps) {
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null) // Stores alertId currently running action
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

      // Refresh page to sync server state
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ação. Tente novamente.')
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
                  <tr key={alert.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors">
                    {/* Patient detail */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{alert.patient.full_name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-semibold">
                        {alert.patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {alert.patient.phone}
                          </span>
                        )}
                        {alert.patient.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {alert.patient.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Due date */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(alert.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>

                    {/* Dispatch channel */}
                    <td className="py-4 px-6">
                      <Badge variant="secondary" className="text-[9px] uppercase py-0.5 px-2">
                        {alert.channel}
                      </Badge>
                    </td>

                    {/* Status with helper labels */}
                    <td className="py-4 px-6">
                      <Badge
                        variant={
                          alert.status === 'PENDING'
                            ? 'warning'
                            : alert.status === 'SENT'
                            ? 'success'
                            : 'secondary'
                        }
                        className="text-[9px] font-bold py-0.5 px-2"
                      >
                        {alert.status === 'PENDING'
                          ? 'Pendente'
                          : alert.status === 'SENT'
                          ? 'Enviado'
                          : 'Dispensado'}
                      </Badge>
                      {alert.sent_at && (
                        <span className="text-[9px] text-slate-400 block mt-1">
                          Enviado em: {new Date(alert.sent_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </td>

                    {/* Real-time actions */}
                    <td className="py-4 px-6 text-right space-x-1.5">
                      <Link href={`/patients/${alert.patient_id}`} passHref>
                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-slate-200 dark:border-slate-800" title="Ver ficha">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>

                      {activeStatus === 'PENDING' && (
                        <>
                          {/* Dismiss Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold border-slate-200 dark:border-slate-800 hover:text-red-500 hover:border-red-500/20"
                            onClick={() => handleAction(alert.id, 'dismiss')}
                            disabled={isLoading}
                            title="Dispensar alerta"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {/* Trigger Resend/Recall */}
                          <Button
                            size="sm"
                            className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1 inline-flex"
                            onClick={() => handleAction(alert.id, 'resend')}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Disparando...</span>
                              </>
                            ) : isSuccess ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Disparado!</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span>Recall Manual</span>
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
