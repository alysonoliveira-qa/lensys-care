import { prisma } from '@/lib/db'
import type { AlertStatus } from './alert-status-config'

export function getAlertClinicForUser(userId: string) {
  return prisma.profile.findUnique({
    where: { id: userId },
    select: { clinic_id: true },
  })
}

export function getAlertsForClinic(clinicId: string, status: AlertStatus) {
  return prisma.alert.findMany({
    where: {
      status,
      patient: { clinic_id: clinicId },
    },
    include: { patient: true },
    orderBy: { due_date: 'asc' },
  })
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
