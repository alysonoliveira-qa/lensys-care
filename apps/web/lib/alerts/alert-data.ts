import { prisma } from '@/lib/db'
import {
  ALERTS_PAGE_SIZE,
  getAlertOrderBy,
  type AlertSortOption,
  type AlertStatusFilter,
} from './alerts-list-query'

export function getAlertClinicForUser(userId: string) {
  return prisma.profile.findUnique({
    where: { id: userId },
    select: { clinic_id: true },
  })
}

export async function getAlertsForClinic(params: {
  clinicId: string
  status: AlertStatusFilter
  sort: AlertSortOption
  page: number
}) {
  const where = {
    ...(params.status !== 'ALL' ? { status: params.status } : {}),
    patient: { clinic_id: params.clinicId },
  }

  const skip = (params.page - 1) * ALERTS_PAGE_SIZE

  const [alerts, totalCount] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: getAlertOrderBy(params.sort),
      skip,
      take: ALERTS_PAGE_SIZE,
      select: {
        id: true,
        patient_id: true,
        exam_id: true,
        due_date: true,
        status: true,
        channel: true,
        sent_at: true,
        patient: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            email: true,
          },
        },
      },
    }),
    prisma.alert.count({
      where,
    }),
  ])

  return {
    alerts,
    totalCount,
    totalPages: Math.ceil(totalCount / ALERTS_PAGE_SIZE),
    pageSize: ALERTS_PAGE_SIZE,
  }
}

export function getAlertByIdForClinic(alertId: string, clinicId: string) {
  return prisma.alert.findFirst({
    where: {
      id: alertId,
      patient: { clinic_id: clinicId },
    },
    select: { id: true },
  })
}
