import { prisma } from '@/lib/db'

import type {
  DashboardAgeGroupCounts,
  DashboardMetrics,
} from './dashboard-mappers'

export async function getDashboardMetrics(clinicId: string) {
  const [metrics] = await prisma.$queryRaw<DashboardMetrics[]>`
    SELECT
      (SELECT COUNT(*)::integer FROM patients WHERE clinic_id = ${clinicId}::uuid) AS "totalPatients",
      (
        SELECT COUNT(*)::integer
        FROM exams
        INNER JOIN patients ON patients.id = exams.patient_id
        WHERE patients.clinic_id = ${clinicId}::uuid
      ) AS "totalExams",
      alert_counts."pendingAlerts",
      alert_counts."sentAlerts"
    FROM (
      SELECT
        COUNT(*) FILTER (WHERE alerts.status = 'PENDING')::integer AS "pendingAlerts",
        COUNT(*) FILTER (WHERE alerts.status = 'SENT')::integer AS "sentAlerts"
      FROM alerts
      INNER JOIN patients ON patients.id = alerts.patient_id
      WHERE patients.clinic_id = ${clinicId}::uuid
        AND alerts.status IN ('PENDING', 'SENT')
    ) AS alert_counts
  `

  return metrics
}

export async function getDashboardAgeDistribution(clinicId: string, currentYear: number) {
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

  return ageGroups
}

export function getRecentPatientsForDashboard(clinicId: string) {
  return prisma.patient.findMany({
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
}

export function getUpcomingRecallsForDashboard(clinicId: string) {
  return prisma.alert.findMany({
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
}
