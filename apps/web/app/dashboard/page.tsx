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
  Users,
  ClipboardList,
  Clock,
  CheckCircle,
  Plus,
  TrendingUp,
  UserCheck
} from 'lucide-react'

type DashboardMetrics = {
  totalPatients: number
  totalExams: number
  pendingAlerts: number
  sentAlerts: number
}

export const revalidate = 0

export default async function DashboardPage() {
  const timer = startPerformanceTimer('page /dashboard')
  const supabase = createClient()
  const authStartedAt = startPerformanceStep()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

  if (error || !userId) {
    endPerformanceTimer(timer, 'redirect_login')
    redirect('/login')
  }

  const profileStartedAt = startPerformanceStep()
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      full_name: true,
      clinic: {
        select: {
          id: true,
          name: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
        },
      },
    },
  })
  logPerformanceStep(timer, 'prisma.profile_and_clinic', profileStartedAt)

  if (!profile) {
    endPerformanceTimer(timer, 'redirect_login_no_profile')
    redirect('/login')
  }

  const clinic = profile.clinic
  const isConecta = clinic.subscription?.plan === 'CONECTA' && clinic.subscription?.status !== 'CANCELED'

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

  endPerformanceTimer(timer, 'initial_content_ready')
  return (
    <div className="space-y-8 select-none">
      <LoginDestinationPerformance />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Olá, <span className="text-indigo-600 dark:text-indigo-400">{profile.full_name}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Aqui está o resumo clínico e operacional da <span className="font-semibold text-slate-700 dark:text-slate-300">{clinic.name}</span> hoje.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/patients/new">
            <Button className="bg-indigo-600 hover:bg-indigo-500 font-semibold gap-2 shadow-lg shadow-indigo-500/10">
              <Plus className="h-4.5 w-4.5" />
              Novo Paciente
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-cy="dashboard-summary-cards">
        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Pacientes</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{totalPatients}</div>
            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="h-3 w-3" />
              <span>Base ativa e atualizada</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consultas Realizadas</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ClipboardList className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{totalExams}</div>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Prontuários refrativos cadastrados</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas Pendentes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{pendingAlerts}</div>
            <p className="text-xs text-amber-500 font-semibold mt-1">Exames expirando em breve</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas Enviados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{sentAlerts}</div>
            <p className="text-xs text-emerald-500 font-semibold mt-1">Lembretes de recall disparados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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

          <Card className="bg-indigo-600 text-white overflow-hidden relative shadow-lg shadow-indigo-500/10">
            <div className="absolute right-[-20%] bottom-[-20%] w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Status da Conta B2B</span>
              <CardTitle className="text-xl font-bold flex items-center gap-1.5">
                <UserCheck className="h-5 w-5" />
                <span>Modalidade Clínica</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <p className="text-xs opacity-90 leading-relaxed">
                {isConecta
                  ? 'Sua clínica está com todas as automações de alertas via WhatsApp, SMS e Recall em Massa ativas.'
                  : 'Sua clínica está no plano Essencial. Assine o plano Conecta para desbloquear automações via WhatsApp e SMS.'}
              </p>
              {!isConecta && (
                <Link href="/planos" passHref>
                  <Button className="w-full h-9 bg-white text-indigo-700 hover:bg-slate-50 text-xs font-bold transition-all duration-200">
                    Ativar Plano Conecta
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
