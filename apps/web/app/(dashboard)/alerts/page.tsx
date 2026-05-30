import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'
import { getAlertsForClinic } from '@/lib/alerts/alert-data'
import {
  buildAlertsListQuery,
  parseAlertSort,
  parseAlertStatusFilter,
} from '@/lib/alerts/alerts-list-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AlertsListControls from '@/components/alerts/AlertsListControls'
import AlertActionsList from '@/components/alerts/AlertActionsList'
import type { AlertData } from '@/components/alerts/AlertActionsList'
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react'

interface AlertsPageProps {
  searchParams?: {
    status?: string
    sort?: string
    page?: string
  }
}

export const revalidate = 0

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const shellData = await getAuthenticatedShellData()

  if (!shellData) {
    redirect('/login')
  }

  const clinicId = shellData.profile.clinic_id
  const status = parseAlertStatusFilter(searchParams?.status)
  const sort = parseAlertSort(searchParams?.sort)
  const page = Number(searchParams?.page) || 1

  const { alerts, totalCount, totalPages } = await getAlertsForClinic({
    clinicId,
    status,
    sort,
    page,
  })

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

      <AlertsListControls initialStatus={status} initialSort={sort} />

      {/* Alerts Table with Action Component */}
      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
        <CardContent className="p-0">
          <AlertActionsList alerts={alerts as AlertData[]} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-semibold text-slate-400">
            PÃ¡gina {page} de {totalPages} ({totalCount} alertas no total)
          </span>
          <div className="flex gap-2">
            <Link href={buildAlertsListQuery({ status, sort, page: page - 1 })} passHref>
              <Button
                size="sm"
                variant="outline"
                className="h-8 font-bold"
                disabled={page <= 1}
                data-cy="alerts-pagination-previous"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
            </Link>
            <Link href={buildAlertsListQuery({ status, sort, page: page + 1 })} passHref>
              <Button
                size="sm"
                variant="outline"
                className="h-8 font-bold"
                disabled={page >= totalPages}
                data-cy="alerts-pagination-next"
              >
                PrÃ³ximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
