import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import { DASHBOARD_CARD_CONFIG } from '@/lib/dashboard/dashboard-card-config'
import { getDisplayName } from '@/lib/profile'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LoginDestinationPerformance from '@/components/performance/LoginDestinationPerformance'
import {
  AgeDistributionPanel,
  DashboardPanelFallback,
  RecentPatientsPanel,
  UpcomingRecallsPanel,
} from '@/components/dashboard/DashboardAsyncSections'
import {
  Plus,
  UserCheck,
  Sparkles,
  Building2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

type DashboardMetrics = {
  totalPatients: number
  totalExams: number
  pendingAlerts: number
  sentAlerts: number
}

type DashboardProfileRow = {
  full_name: string
  preferred_name: string | null
  clinic_id: string
  clinic_name: string
  subscription_plan: string | null
  subscription_status: string | null
}

export const revalidate = 0

export default async function DashboardPage() {
  const timer = startPerformanceTimer('page /dashboard')
  const supabase = createClient()
  const authStartedAt = startPerformanceStep()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  const userEmail = typeof data?.claims.email === 'string' ? data.claims.email : null
  logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

  if (error || !userId) {
    endPerformanceTimer(timer, 'redirect_login')
    redirect('/login')
  }

  const profileStartedAt = startPerformanceStep()
  const [profile] = await prisma.$queryRaw<DashboardProfileRow[]>`
    SELECT
      p.full_name,
      p.preferred_name,
      c.id AS clinic_id,
      c.name AS clinic_name,
      s.plan::text AS subscription_plan,
      s.status::text AS subscription_status
    FROM profiles p
    INNER JOIN clinics c ON c.id = p.clinic_id
    LEFT JOIN subscriptions s ON s.clinic_id = c.id
    WHERE p.id = ${userId}::uuid
    LIMIT 1
  `
  logPerformanceStep(timer, 'prisma.profile_and_clinic', profileStartedAt)

  if (!profile) {
    endPerformanceTimer(timer, 'redirect_login_no_profile')
    redirect('/login')
  }

  const clinic = {
    id: profile.clinic_id,
    name: profile.clinic_name,
  }
  const displayName = getDisplayName({
    preferredName: profile.preferred_name,
    fullName: profile.full_name,
    email: userEmail,
  })
  const isConecta = profile.subscription_plan === 'CONECTA' && profile.subscription_status !== 'CANCELED'

  const dashboardQueriesStartedAt = startPerformanceStep()
  const [metrics] = await prisma.$queryRaw<DashboardMetrics[]>`
    SELECT
      (SELECT COUNT(*)::integer FROM patients WHERE clinic_id = ${clinic.id}::uuid) AS "totalPatients",
      (
        SELECT COUNT(*)::integer
        FROM exams
        INNER JOIN patients ON patients.id = exams.patient_id
        WHERE patients.clinic_id = ${clinic.id}::uuid
      ) AS "totalExams",
      (
        SELECT COUNT(*)::integer
        FROM alerts
        INNER JOIN patients ON patients.id = alerts.patient_id
        WHERE patients.clinic_id = ${clinic.id}::uuid
          AND alerts.status = 'PENDING'
      ) AS "pendingAlerts",
      (
        SELECT COUNT(*)::integer
        FROM alerts
        INNER JOIN patients ON patients.id = alerts.patient_id
        WHERE patients.clinic_id = ${clinic.id}::uuid
          AND alerts.status = 'SENT'
      ) AS "sentAlerts"
  `
  logPerformanceStep(timer, 'prisma.dashboard_queries_parallel', dashboardQueriesStartedAt)

  const { totalPatients, totalExams, pendingAlerts, sentAlerts } = metrics
  const planLabel = isConecta ? 'Plano Conecta ativo' : 'Plano Essencial'
  const summaryMetricValues = {
    totalPatients,
    totalExams,
    pendingAlerts,
    sentAlerts,
  } as const
  const summaryCards = DASHBOARD_CARD_CONFIG.map((item) => ({
    ...item,
    value: summaryMetricValues[item.id],
  }))

  endPerformanceTimer(timer, 'initial_content_ready')

  return (
    <div className="space-y-8 select-none">
      <LoginDestinationPerformance />

      <section className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-indigo-50/90 p-6 shadow-sm shadow-violet-100/50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-indigo-100/60 to-transparent dark:from-indigo-950/20 lg:block" />
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
        <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm dark:border-violet-900/60 dark:bg-slate-900/80 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Painel clínico
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Olá,</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                {displayName}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Aqui está o resumo clínico e operacional da{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">{clinic.name}</span> hoje.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <Building2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>{clinic.name}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-700 dark:text-indigo-400" />
                <span>{planLabel}</span>
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
                Novo Paciente
              </Button>
            </Link>
            <div className="rounded-2xl border border-white/80 bg-white/70 p-3 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Resumo do dia</p>
              <p className="mt-1 leading-5">
                {pendingAlerts > 0
                  ? `${pendingAlerts} alerta(s) pendente(s) para acompanhar hoje.`
                  : 'Nenhum alerta pendente para acompanhar no momento.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" data-cy="dashboard-summary-cards">
        {summaryCards.map((item) => {
          const Icon = item.icon
          const NoteIcon = item.noteIcon

          return (
            <Card
              key={item.id}
              className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
            >
              <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {item.label}
                  </span>
                  <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {item.value}
                  </div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className={`flex items-center gap-1.5 text-xs font-semibold ${item.noteClassName}`}>
                  {NoteIcon ? <NoteIcon className="h-3.5 w-3.5" /> : null}
                  <span>{item.description}</span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense
            fallback={
              <DashboardPanelFallback
                title="Distribuição de Pacientes por Faixa Etária"
                description="Carregando análise demográfica..."
              />
            }
          >
            <AgeDistributionPanel clinicId={clinic.id} totalPatients={totalPatients} />
          </Suspense>

          <Suspense
            fallback={
              <DashboardPanelFallback
                title="Pacientes Recém-Cadastrados"
                description="Carregando últimos registros..."
              />
            }
          >
            <RecentPatientsPanel clinicId={clinic.id} />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense
            fallback={
              <DashboardPanelFallback
                title="Próximos Recalls"
                description="Carregando lembretes pendentes..."
              />
            }
          >
            <UpcomingRecallsPanel clinicId={clinic.id} />
          </Suspense>

          <Card className="relative overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />
            <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl dark:bg-violet-950/30" />
            <CardHeader className="pb-3">
              <div className="mb-3 inline-flex w-fit items-center rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                Status da Conta
              </div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                <UserCheck className="h-5 w-5" />
                <span>Modalidade Clínica</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                {planLabel}
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {isConecta
                  ? 'Sua clínica está com todas as automações de alertas via WhatsApp, SMS e Recall em Massa ativas.'
                  : 'Sua clínica está no plano Essencial. Assine o plano Conecta para desbloquear automações via WhatsApp e SMS.'}
              </p>
              {!isConecta && (
                <Link href="/dashboard/planos" passHref>
                  <Button className="h-10 w-full gap-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/15 transition-all duration-200 hover:bg-indigo-500">
                    Ativar Plano Conecta
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
