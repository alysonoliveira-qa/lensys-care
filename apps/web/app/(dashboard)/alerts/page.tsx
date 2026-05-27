import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAlertClinicForUser, getAlertsForClinic } from '@/lib/alerts/alert-data'
import { ALERT_STATUS_FILTER_OPTIONS, type AlertStatus } from '@/lib/alerts/alert-status-config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AlertActionsList from '@/components/alerts/AlertActionsList'
import type { AlertData } from '@/components/alerts/AlertActionsList'
import { Bell, Filter } from 'lucide-react'

interface AlertsPageProps {
  searchParams?: {
    status?: string
  }
}

export const revalidate = 0

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub

  if (error || !userId) {
    redirect('/login')
  }

  const profile = await getAlertClinicForUser(userId)

  if (!profile) {
    redirect('/login')
  }

  const clinicId = profile.clinic_id

  // Support filtering by AlertStatus (PENDING, SENT, DISMISSED)
  const activeStatus = (searchParams?.status || 'PENDING') as AlertStatus

  const alerts = await getAlertsForClinic(clinicId, activeStatus)

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-500" />
            <span>Fila de Recalls & Lembretes</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe e controle os alertas automáticos e manuais de retorno de exames.
          </p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-2">
          <Filter className="h-3.5 w-3.5" />
          Filtrar Status:
        </span>
        {ALERT_STATUS_FILTER_OPTIONS.map((statusOpt) => {
          const isActive = activeStatus === statusOpt.value
          return (
            <Link key={statusOpt.value} href={`/alerts?status=${statusOpt.value}`} passHref>
              <Button
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={`h-8 text-xs font-semibold rounded-xl ${
                  isActive
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {statusOpt.label}
              </Button>
            </Link>
          )
        })}
      </div>

      {/* Alerts Table with Action Component */}
      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
        <CardContent className="p-0">
          <AlertActionsList alerts={alerts as AlertData[]} activeStatus={activeStatus} />
        </CardContent>
      </Card>
    </div>
  )
}
