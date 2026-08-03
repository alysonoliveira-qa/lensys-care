import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'
import { prisma } from '@/lib/db'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import {
  buildPatientsListQuery,
  getPatientOrderBy,
  parsePatientSort,
} from '@/lib/patients/patient-list-sorting'
import { parsePatientsTab } from '@/lib/patients/patients-tabs'
import { listReferrersWithPendingCount } from '@/lib/referrers/referrers-data'
import { mapReferrersToRows } from '@/lib/referrers/referrers-mappers'
import PatientsListFilters from '@/components/patients/PatientsListFilters'
import PatientsTabs from '@/components/patients/PatientsTabs'
import ReferrersTab from '@/components/referrers/ReferrersTab'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Plus,
  Calendar,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  FileText,
  Building2,
  Sparkles,
} from 'lucide-react'

interface PatientsPageProps {
  searchParams?: {
    search?: string
    page?: string
    sort?: string
    tab?: string
  }
}

type PatientsWhereClause = {
  clinic_id: string
  OR?: Array<{
    full_name?: {
      contains: string
      mode: 'insensitive'
    }
    email?: {
      contains: string
      mode: 'insensitive'
    }
  }>
}

type PatientListItem = {
  id: string
  full_name: string
  dob: Date | string
  phone: string | null
  email: string | null
  exams: Array<{
    exam_date: Date | string
  }>
}

export const revalidate = 0

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const timer = startPerformanceTimer('page /patients')
  const authStartedAt = startPerformanceStep()
  const shellData = await getAuthenticatedShellData()
  logPerformanceStep(timer, 'auth.shell_context', authStartedAt)

  if (!shellData) {
    endPerformanceTimer(timer, 'redirect_login')
    redirect('/login')
  }

  const clinicId = shellData.profile.clinic_id
  const activeTab = parsePatientsTab(searchParams?.tab)
  const search = searchParams?.search || ''
  const page = Number(searchParams?.page) || 1
  const sort = parsePatientSort(searchParams?.sort)
  const limit = 10
  const skip = (page - 1) * limit

  const whereClause: PatientsWhereClause = {
    clinic_id: clinicId,
  }

  if (search) {
    whereClause.OR = [
      { full_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const patientQueriesStartedAt = startPerformanceStep()
  const [patients, totalCount] = await Promise.all([
    prisma.patient.findMany({
      where: whereClause,
      orderBy: getPatientOrderBy(sort),
      skip,
      take: limit,
      select: {
        id: true,
        full_name: true,
        dob: true,
        phone: true,
        email: true,
        exams: {
          orderBy: { exam_date: 'desc' },
          take: 1,
          select: { exam_date: true },
        },
      },
    }),
    prisma.patient.count({
      where: whereClause,
    }),
  ])
  logPerformanceStep(timer, 'prisma.list_and_count_parallel', patientQueriesStartedAt)

  const totalPages = Math.ceil(totalCount / limit)

  // Indicantes só são buscados quando a aba está aberta.
  const referrerRows =
    activeTab === 'indicantes'
      ? mapReferrersToRows(await listReferrersWithPendingCount(clinicId))
      : []

  endPerformanceTimer(timer)

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
              Central de pacientes
            </div>

            <div className="space-y-2">
              <h2 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                <Users className="h-7 w-7 text-indigo-500" />
                <span>Pacientes Cadastrados</span>
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Gerencie prontuários refrativos, encontre fichas rapidamente e acompanhe o
                histórico clínico da {shellData.profile.clinic_name}.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <Building2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>{shellData.profile.clinic_name}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{totalCount} paciente(s) no total</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[240px]">
            <Link href="/patients/new">
              <Button
                className="h-11 w-full gap-2 rounded-xl bg-indigo-600 font-semibold shadow-lg shadow-indigo-500/15 hover:bg-indigo-500"
                data-cy="new-patient-button"
              >
                <Plus className="h-4.5 w-4.5" />
                Cadastrar Paciente
              </Button>
            </Link>
            <div className="rounded-2xl border border-white/80 bg-white/70 p-3 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Resumo da lista</p>
              <p className="mt-1 leading-5">
                {search
                  ? 'Exibindo resultados filtrados para a busca atual com a ordenação selecionada.'
                  : 'Use busca, ordenação e paginação para localizar fichas rapidamente.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PatientsTabs activeTab={activeTab} />

      {activeTab === 'indicantes' ? (
        <ReferrersTab rows={referrerRows} />
      ) : (
        <>
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <CardContent className="p-5">
          <PatientsListFilters initialSearch={search} initialSort={sort} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <CardContent className="p-5">
          {patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950/30">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Nenhum paciente cadastrado ou correspondente à busca.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Novos cadastros e resultados encontrados aparecerão aqui automaticamente.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800"
              data-cy="patients-list"
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:bg-slate-950/50">
                    <th className="px-6 py-3">Nome Completo</th>
                    <th className="px-6 py-3">Data de nascimento</th>
                    <th className="px-6 py-3">Contato</th>
                    <th className="px-6 py-3">Último exame</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {patients.map((p: PatientListItem) => {
                    const lastExam = p.exams[0]

                    return (
                      <tr
                        key={p.id}
                        className="text-slate-600 transition-colors hover:bg-slate-50/80 dark:text-slate-300 dark:hover:bg-slate-950/30"
                        data-cy="patient-card"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                          {p.full_name}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(p.dob).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          {p.phone ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                              <Phone className="h-3 w-3" />
                              {p.phone}
                            </span>
                          ) : null}
                          {p.email ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                              <Mail className="h-3 w-3" />
                              {p.email}
                            </span>
                          ) : null}
                          {!p.phone && !p.email ? (
                            <span className="text-xs font-medium text-slate-400">-</span>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          {lastExam ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <FileText className="h-3.5 w-3.5 text-indigo-400" />
                              {new Date(lastExam.exam_date).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold italic text-slate-400">
                              Sem registros
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/patients/${p.id}`} data-cy="patient-record-link">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg border-slate-200 text-[11px] font-bold dark:border-slate-800"
                            >
                              Ver Ficha
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-semibold text-slate-400">
            Página {page} de {totalPages} ({totalCount} pacientes no total)
          </span>
          <div className="flex gap-2">
            <Link href={buildPatientsListQuery({ search, sort, page: page - 1 })} passHref>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-slate-200 font-bold dark:border-slate-800"
                disabled={page <= 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
            </Link>
            <Link href={buildPatientsListQuery({ search, sort, page: page + 1 })} passHref>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-slate-200 font-bold dark:border-slate-800"
                disabled={page >= totalPages}
              >
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
        </>
      )}
    </div>
  )
}
