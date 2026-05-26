import { prisma } from '@/lib/db'
import {
  buildDashboardAgeDistribution,
  type DashboardAgeGroupCounts,
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
  const [ageGroups] = await prisma.$queryRaw<DashboardAgeGroupCounts[]>`
    SELECT
      COUNT(*) FILTER (WHERE ${currentYear} - EXTRACT(YEAR FROM dob) < 18)::integer AS infant,
      COUNT(*) FILTER (
        WHERE ${currentYear} - EXTRACT(YEAR FROM dob) >= 18
          AND ${currentYear} - EXTRACT(YEAR FROM dob) < 40
      )::integer AS young,
      COUNT(*) FILTER (
        WHERE ${currentYear} - EXTRACT(YEAR FROM dob) >= 40
          AND ${currentYear} - EXTRACT(YEAR FROM dob) < 60
      )::integer AS presbyopia,
      COUNT(*) FILTER (WHERE ${currentYear} - EXTRACT(YEAR FROM dob) >= 60)::integer AS elderly
    FROM patients
    WHERE clinic_id = ${clinicId}::uuid
  `
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
  const recentPatients = await prisma.patient.findMany({
    where: { clinic_id: clinicId },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: {
      id: true,
      full_name: true,
      dob: true,
      phone: true,
      email: true,
    },
  })
  logPerformanceStep(timer, 'prisma.recent_patients', queryStartedAt)
  endPerformanceTimer(timer)

  return <RecentPatientsSection recentPatients={recentPatients as RecentPatient[]} />
}

export async function UpcomingRecallsPanel({ clinicId }: ClinicPanelProps) {
  const timer = startPerformanceTimer('page /dashboard.section.upcoming_recalls')
  const queryStartedAt = startPerformanceStep()
  const recentAlerts = await prisma.alert.findMany({
    where: {
      status: 'PENDING',
      patient: { clinic_id: clinicId },
    },
    orderBy: { due_date: 'asc' },
    take: 5,
    select: {
      id: true,
      patient_id: true,
      due_date: true,
      channel: true,
      patient: {
        select: {
          full_name: true,
        },
      },
    },
  })
  logPerformanceStep(timer, 'prisma.recent_alerts', queryStartedAt)
  endPerformanceTimer(timer)

  return <UpcomingRecallsSection recentAlerts={recentAlerts as RecentAlert[]} />
}
