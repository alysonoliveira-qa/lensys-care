import { prisma } from '@/lib/db'
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

type AgeGroupCounts = {
  infant: number
  young: number
  presbyopia: number
  elderly: number
}

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
  const [ageGroups] = await prisma.$queryRaw<AgeGroupCounts[]>`
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

  const maxGroupValue = Math.max(...Object.values(ageGroups), 1)
  const groups = [
    {
      label: 'Infantil / Adolescente (< 18 anos)',
      value: ageGroups.infant,
      colorClassName: 'bg-sky-500',
      accentClassName: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Adulto Jovem (18 - 39 anos)',
      value: ageGroups.young,
      colorClassName: 'bg-emerald-500',
      accentClassName: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Adulto Presbita (40 - 59 anos)',
      value: ageGroups.presbyopia,
      colorClassName: 'bg-indigo-500',
      accentClassName: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Idoso (60+ anos)',
      value: ageGroups.elderly,
      colorClassName: 'bg-violet-500',
      accentClassName: 'text-violet-600 dark:text-violet-400',
    },
  ]
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
