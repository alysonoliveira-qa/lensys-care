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
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'

export const revalidate = 0

export default async function DashboardPage() {
  const timer = startPerformanceTimer('page /dashboard')
  const authStartedAt = startPerformanceStep()
  const shellData = await getAuthenticatedShellData()
  logPerformanceStep(timer, 'auth.shell_context', authStartedAt)

  if (!shellData) {
    endPerformanceTimer(timer, 'redirect_login')
    redirect('/login')
  }

  const clinic = {
    id: shellData.profile.clinic_id,
    name: shellData.profile.clinic_name,
  }
  const displayName = getDisplayName({
    preferredName: shellData.profile.preferred_name,
    fullName: shellData.profile.full_name,
    email: shellData.userEmail,
  })
  const { hasPremiumPlan, planLabel } = resolveDashboardPlanStatus({
    subscription_plan: shellData.subscription?.plan ?? null,
    subscription_status: shellData.subscription?.status ?? null,
  })

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
                title="Distribuição de Pacientes por Faixa Etária"
                description="Carregando análise demográfica..."
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
                title="Pacientes Recém-Cadastrados"
                description="Carregando últimos registros..."
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
                title="Próximos Recalls"
                description="Carregando lembretes pendentes..."
              />
            }
          >
            <UpcomingRecallsPanel
              clinicId={clinic.id}
              preloadedData={secondaryData.upcomingRecalls}
            />
          </Suspense>

          <DashboardPlanStatusCard hasPremiumPlan={hasPremiumPlan} planLabel={planLabel} />
        </div>
      </div>
    </div>
  )
}
