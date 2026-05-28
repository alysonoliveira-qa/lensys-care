import { prisma } from '@/lib/db'
import type { AlertStatus } from './alert-status-config'

export const ALERTS_INITIAL_LIMIT = 50

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
    orderBy: { due_date: 'asc' },
    take: ALERTS_INITIAL_LIMIT,
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
