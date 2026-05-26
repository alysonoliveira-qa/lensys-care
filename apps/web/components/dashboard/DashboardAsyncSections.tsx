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
}

interface DashboardPanelFallbackProps {
  title: string
  description: string
}

export function DashboardPanelFallback({
  title,
  description,
}: DashboardPanelFallbackProps) {
  return <DashboardPanelFallbackView title={title} description={description} />
}

export async function AgeDistributionPanel({
  clinicId,
  totalPatients,
}: AgeDistributionPanelProps) {
  const timer = startPerformanceTimer('page /dashboard.section.age_distribution')
  const currentYear = new Date().getFullYear()
  const queryStartedAt = startPerformanceStep()
  const ageGroups = await getDashboardAgeDistribution(clinicId, currentYear)
  logPerformanceStep(timer, 'prisma.age_group_counts', queryStartedAt)

  const { groups, maxGroupValue } = buildDashboardAgeDistribution(ageGroups)
  endPerformanceTimer(timer)

  return (
    <AgeDistributionSection
      groups={groups}
      maxGroupValue={maxGroupValue}
      totalPatients={totalPatients}
    />
  )
}

export async function RecentPatientsPanel({ clinicId }: ClinicPanelProps) {
  const timer = startPerformanceTimer('page /dashboard.section.recent_patients')
  const queryStartedAt = startPerformanceStep()
  const recentPatients = await getRecentPatientsForDashboard(clinicId)
  logPerformanceStep(timer, 'prisma.recent_patients', queryStartedAt)
  endPerformanceTimer(timer)

  return <RecentPatientsSection recentPatients={recentPatients as RecentPatient[]} />
}

export async function UpcomingRecallsPanel({ clinicId }: ClinicPanelProps) {
  const timer = startPerformanceTimer('page /dashboard.section.upcoming_recalls')
  const queryStartedAt = startPerformanceStep()
  const recentAlerts = await getUpcomingRecallsForDashboard(clinicId)
  logPerformanceStep(timer, 'prisma.recent_alerts', queryStartedAt)
  endPerformanceTimer(timer)

  return <UpcomingRecallsSection recentAlerts={recentAlerts as RecentAlert[]} />
}
