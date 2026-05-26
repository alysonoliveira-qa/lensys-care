import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import {
  AgeDistributionPanel,
  DashboardPanelFallback,
  RecentPatientsPanel,
  UpcomingRecallsPanel,
} from '@/components/dashboard/DashboardAsyncSections'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import DashboardPlanStatusCard from '@/components/dashboard/DashboardPlanStatusCard'
import DashboardSummaryCards from '@/components/dashboard/DashboardSummaryCards'
import LoginDestinationPerformance from '@/components/performance/LoginDestinationPerformance'
import { prisma } from '@/lib/db'
import {
  buildDashboardSummaryCards,
  resolveDashboardPlanStatus,
  type DashboardMetrics,
} from '@/lib/dashboard/dashboard-mappers'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import { getDisplayName } from '@/lib/profile'
import { createClient } from '@/lib/supabase/server'

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
  const { isConecta, planLabel } = resolveDashboardPlanStatus(profile)

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
  const summaryCards = buildDashboardSummaryCards({
    totalPatients,
    totalExams,
    pendingAlerts,
    sentAlerts,
  })

  endPerformanceTimer(timer, 'initial_content_ready')

  return (
    <div className="space-y-8 select-none">
      <LoginDestinationPerformance />

      <DashboardHeader
        clinicName={clinic.name}
        displayName={displayName}
        pendingAlerts={pendingAlerts}
        planLabel={planLabel}
      />

      <DashboardSummaryCards items={summaryCards} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense
            fallback={
              <DashboardPanelFallback
                title="Distribuicao de Pacientes por Faixa Etaria"
                description="Carregando analise demografica..."
              />
            }
          >
            <AgeDistributionPanel clinicId={clinic.id} totalPatients={totalPatients} />
          </Suspense>

          <Suspense
            fallback={
              <DashboardPanelFallback
                title="Pacientes Recem-Cadastrados"
                description="Carregando ultimos registros..."
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
                title="Proximos Recalls"
                description="Carregando lembretes pendentes..."
              />
            }
          >
            <UpcomingRecallsPanel clinicId={clinic.id} />
          </Suspense>

          <DashboardPlanStatusCard isConecta={isConecta} planLabel={planLabel} />
        </div>
      </div>
    </div>
  )
}
