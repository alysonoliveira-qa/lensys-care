import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import {
  AgeDistributionPanel,
  DashboardPanelFallback,
  preloadDashboardSecondaryData,
  RecentPatientsPanel,
  UpcomingRecallsPanel,
} from '@/components/dashboard/DashboardAsyncSections'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import DashboardPlanStatusCard from '@/components/dashboard/DashboardPlanStatusCard'
import DashboardSummaryCards from '@/components/dashboard/DashboardSummaryCards'
import LoginDestinationPerformance from '@/components/performance/LoginDestinationPerformance'
import {
  getDashboardMetrics,
  getDashboardProfile,
} from '@/lib/dashboard/dashboard-data'
import {
  buildDashboardSummaryCards,
  resolveDashboardPlanStatus,
} from '@/lib/dashboard/dashboard-mappers'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'
import { getDisplayName } from '@/lib/profile'
import { createClient } from '@/lib/supabase/server'

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
  const profile = await getDashboardProfile(userId)
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
  const metricsPromise = getDashboardMetrics(clinic.id)
  const secondaryData = preloadDashboardSecondaryData(clinic.id)
  const metrics = await metricsPromise
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
            <AgeDistributionPanel
              clinicId={clinic.id}
              totalPatients={totalPatients}
              preloadedData={secondaryData.ageDistribution}
            />
          </Suspense>

          <Suspense
            fallback={
              <DashboardPanelFallback
                title="Pacientes Recem-Cadastrados"
                description="Carregando ultimos registros..."
              />
            }
          >
            <RecentPatientsPanel
              clinicId={clinic.id}
              preloadedData={secondaryData.recentPatients}
            />
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
            <UpcomingRecallsPanel
              clinicId={clinic.id}
              preloadedData={secondaryData.upcomingRecalls}
            />
          </Suspense>

          <DashboardPlanStatusCard isConecta={isConecta} planLabel={planLabel} />
        </div>
      </div>
    </div>
  )
}
