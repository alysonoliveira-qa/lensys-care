import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, Building2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

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
    <div className="space-y-8 select-none">
      <section className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-indigo-50/90 p-6 shadow-sm shadow-violet-100/50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-indigo-100/60 to-transparent dark:from-indigo-950/20 lg:block" />
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
        <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm dark:border-violet-900/60 dark:bg-slate-900/80 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Central de alertas
            </div>

            <div className="space-y-2">
              <h2 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                <Bell className="h-7 w-7 text-indigo-500" />
                <span>Fila de Recalls & Lembretes</span>
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Acompanhe e controle os alertas automáticos e manuais de retorno de exames com o
                mesmo fluxo operacional do restante do produto.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <Building2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>{shellData.profile.clinic_name}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <Bell className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{totalCount} alerta(s) no total</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 lg:max-w-xs">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Resumo da fila</p>
            <p className="mt-1.5 leading-5">
              Use filtros, ordenação e paginação para acompanhar renovação, envio e dispensas com
              menor ruído visual.
            </p>
          </div>
        </div>
      </section>

      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <CardContent className="p-5">
          <AlertsListControls initialStatus={status} initialSort={sort} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <CardContent className="p-5">
          <AlertActionsList alerts={alerts as AlertData[]} />
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-semibold text-slate-400">
            Página {page} de {totalPages} ({totalCount} alertas no total)
          </span>
          <div className="flex gap-2">
            <Link href={buildAlertsListQuery({ status, sort, page: page - 1 })} passHref>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-slate-200 font-bold dark:border-slate-800"
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
                className="h-8 rounded-lg border-slate-200 font-bold dark:border-slate-800"
                disabled={page >= totalPages}
                data-cy="alerts-pagination-next"
              >
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
