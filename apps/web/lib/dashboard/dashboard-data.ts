import { prisma } from '@/lib/db'

import type {
  DashboardAgeGroupCounts,
  DashboardMetrics,
} from './dashboard-mappers'

export type DashboardProfileRow = {
  full_name: string
  preferred_name: string | null
  clinic_id: string
  clinic_name: string
  subscription_plan: string | null
  subscription_status: string | null
}

export async function getDashboardProfile(userId: string) {
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

  return profile
}

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
      (
        SELECT COUNT(*)::integer
        FROM alerts
        INNER JOIN patients ON patients.id = alerts.patient_id
        WHERE patients.clinic_id = ${clinicId}::uuid
          AND alerts.status = 'PENDING'
      ) AS "pendingAlerts",
      (
        SELECT COUNT(*)::integer
        FROM alerts
        INNER JOIN patients ON patients.id = alerts.patient_id
        WHERE patients.clinic_id = ${clinicId}::uuid
          AND alerts.status = 'SENT'
      ) AS "sentAlerts"
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
