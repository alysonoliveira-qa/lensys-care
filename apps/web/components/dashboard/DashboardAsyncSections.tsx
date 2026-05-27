import {
  getDashboardAgeDistribution,
  getRecentPatientsForDashboard,
  getUpcomingRecallsForDashboard,
} from '@/lib/dashboard/dashboard-data'
import {
  buildDashboardAgeDistribution,
} from '@/lib/dashboard/dashboard-mappers'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'

import AgeDistributionSection from '@/components/dashboard/AgeDistributionSection'
import DashboardPanelFallbackView from '@/components/dashboard/DashboardPanelFallback'
import RecentPatientsSection from '@/components/dashboard/RecentPatientsSection'
import UpcomingRecallsSection from '@/components/dashboard/UpcomingRecallsSection'

type RecentPatient = {
  id: string
  full_name: string
  dob: Date | string
  phone: string | null
  email: string | null
}

type RecentAlert = {
  id: string
  patient_id: string
  due_date: Date | string
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  patient: {
    full_name: string
  }
}

interface ClinicPanelProps {
  clinicId: string
}

interface AgeDistributionPanelProps extends ClinicPanelProps {
  totalPatients: number
  preloadedData?: ReturnType<typeof preloadDashboardSecondaryData>['ageDistribution']
}

interface RecentPatientsPanelProps extends ClinicPanelProps {
  preloadedData?: ReturnType<typeof preloadDashboardSecondaryData>['recentPatients']
}

interface UpcomingRecallsPanelProps extends ClinicPanelProps {
  preloadedData?: ReturnType<typeof preloadDashboardSecondaryData>['upcomingRecalls']
}

interface DashboardPanelFallbackProps {
  title: string
  description: string
}

type PreloadedPanelResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown }

export function DashboardPanelFallback({
  title,
  description,
}: DashboardPanelFallbackProps) {
  return <DashboardPanelFallbackView title={title} description={description} />
}

function preloadPanelData<T>(
  label: string,
  step: string,
  load: () => Promise<T>
) {
  const timer = startPerformanceTimer(label)
  const queryStartedAt = startPerformanceStep()
  const data: Promise<PreloadedPanelResult<T>> = load().then(
    (value): PreloadedPanelResult<T> => {
      logPerformanceStep(timer, step, queryStartedAt)
      return { status: 'fulfilled', value }
    },
    (reason: unknown): PreloadedPanelResult<T> => ({ status: 'rejected', reason })
  )

  return { timer, data }
}

async function readPreloadedPanelData<T>(
  pendingData: ReturnType<typeof preloadPanelData<T>>
) {
  const result = await pendingData.data

  if (result.status === 'rejected') {
    throw result.reason
  }

  return result.value
}

export function preloadDashboardSecondaryData(clinicId: string) {
  const currentYear = new Date().getFullYear()

  return {
    ageDistribution: preloadPanelData(
      'page /dashboard.section.age_distribution',
      'prisma.age_group_counts',
      () => getDashboardAgeDistribution(clinicId, currentYear)
    ),
    recentPatients: preloadPanelData(
      'page /dashboard.section.recent_patients',
      'prisma.recent_patients',
      () => getRecentPatientsForDashboard(clinicId)
    ),
    upcomingRecalls: preloadPanelData(
      'page /dashboard.section.upcoming_recalls',
      'prisma.recent_alerts',
      () => getUpcomingRecallsForDashboard(clinicId)
    ),
  }
}

export async function AgeDistributionPanel({
  clinicId,
  totalPatients,
  preloadedData,
}: AgeDistributionPanelProps) {
  const pendingData = preloadedData ?? preloadPanelData(
    'page /dashboard.section.age_distribution',
    'prisma.age_group_counts',
    () => getDashboardAgeDistribution(clinicId, new Date().getFullYear())
  )
  const ageGroups = await readPreloadedPanelData(pendingData)

  const { groups, maxGroupValue } = buildDashboardAgeDistribution(ageGroups)
  endPerformanceTimer(pendingData.timer)

  return (
    <AgeDistributionSection
      groups={groups}
      maxGroupValue={maxGroupValue}
      totalPatients={totalPatients}
    />
  )
}

export async function RecentPatientsPanel({
  clinicId,
  preloadedData,
}: RecentPatientsPanelProps) {
  const pendingData = preloadedData ?? preloadPanelData(
    'page /dashboard.section.recent_patients',
    'prisma.recent_patients',
    () => getRecentPatientsForDashboard(clinicId)
  )
  const recentPatients = await readPreloadedPanelData(pendingData)
  endPerformanceTimer(pendingData.timer)

  return <RecentPatientsSection recentPatients={recentPatients as RecentPatient[]} />
}

export async function UpcomingRecallsPanel({
  clinicId,
  preloadedData,
}: UpcomingRecallsPanelProps) {
  const pendingData = preloadedData ?? preloadPanelData(
    'page /dashboard.section.upcoming_recalls',
    'prisma.recent_alerts',
    () => getUpcomingRecallsForDashboard(clinicId)
  )
  const recentAlerts = await readPreloadedPanelData(pendingData)
  endPerformanceTimer(pendingData.timer)

  return <UpcomingRecallsSection recentAlerts={recentAlerts as RecentAlert[]} />
}
