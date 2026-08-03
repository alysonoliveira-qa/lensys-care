import { prisma } from '@/lib/db'

import type { AppointmentStatus } from './appointments-config'
import type { AppointmentRecord } from './appointments-mappers'
import {
  appointmentDateToUtc,
  appointmentTimeToUtc,
  validateAppointmentInput,
  type AppointmentInputErrors,
} from './appointments-normalizers'

/**
 * Prisma direto NÃO é RLS garantido: toda função aqui recebe `clinicId` e o aplica
 * explicitamente no `where` (leitura) ou confere o dono antes de escrever.
 */
const APPOINTMENT_SELECT = {
  id: true,
  patient_id: true,
  scheduled_time: true,
  created_at: true,
  status: true,
  referrer_id: true,
  patient: { select: { id: true, full_name: true } },
  referrer: { select: { id: true, name: true } },
} as const

export function getAppointmentsByDate(
  clinicId: string,
  date: string
): Promise<AppointmentRecord[]> {
  return prisma.appointment.findMany({
    where: {
      clinic_id: clinicId,
      appointment_date: appointmentDateToUtc(date),
    },
    orderBy: [{ scheduled_time: { sort: 'asc', nulls: 'last' } }, { created_at: 'asc' }],
    select: APPOINTMENT_SELECT,
  })
}

export interface CreateAppointmentInput {
  clinicId: string
  patientId: string
  date: string
  time?: string | null
  createdBy: string
  referrerId?: string | null
}

export type CreateAppointmentResult =
  | { ok: true; appointmentId: string }
  | {
      ok: false
      error: 'INVALID_INPUT'
      message: string
      status: 400
      errors: AppointmentInputErrors
    }
  | {
      ok: false
      error: 'PATIENT_NOT_FOUND' | 'REFERRER_NOT_FOUND'
      message: string
      status: 404
    }

export async function createAppointmentForClinic({
  clinicId,
  patientId,
  date,
  time,
  createdBy,
  referrerId,
}: CreateAppointmentInput): Promise<CreateAppointmentResult> {
  const validation = validateAppointmentInput({ patientId, date, time })

  if (!validation.ok) {
    return {
      ok: false,
      error: 'INVALID_INPUT',
      message:
        validation.errors.patientId ??
        validation.errors.date ??
        validation.errors.time ??
        'Dados da consulta inválidos.',
      status: 400,
      errors: validation.errors,
    }
  }

  const patient = await prisma.patient.findFirst({
    where: { id: validation.value.patientId, clinic_id: clinicId },
    select: { id: true },
  })

  if (!patient) {
    return {
      ok: false,
      error: 'PATIENT_NOT_FOUND',
      message: 'Paciente não encontrado ou sem permissão para agendar.',
      status: 404,
    }
  }

  const normalizedReferrerId = referrerId?.trim() || null

  if (normalizedReferrerId) {
    const referrer = await prisma.referrer.findFirst({
      where: { id: normalizedReferrerId, clinic_id: clinicId },
      select: { id: true },
    })

    if (!referrer) {
      return {
        ok: false,
        error: 'REFERRER_NOT_FOUND',
        message: 'Indicante não encontrado ou sem permissão para uso.',
        status: 404,
      }
    }
  }

  const appointment = await prisma.appointment.create({
    data: {
      clinic_id: clinicId,
      patient_id: validation.value.patientId,
      referrer_id: normalizedReferrerId,
      appointment_date: appointmentDateToUtc(validation.value.date),
      scheduled_time: appointmentTimeToUtc(validation.value.time),
      created_by: createdBy,
    },
    select: { id: true },
  })

  return { ok: true, appointmentId: appointment.id }
}

export interface SetAppointmentStatusInput {
  clinicId: string
  appointmentId: string
  status: AppointmentStatus
}

export type SetAppointmentStatusResult =
  | { ok: true }
  | {
      ok: false
      error: 'APPOINTMENT_NOT_FOUND'
      message: string
      status: 404
    }

export async function setAppointmentStatusForClinic({
  clinicId,
  appointmentId,
  status,
}: SetAppointmentStatusInput): Promise<SetAppointmentStatusResult> {
  // updateMany com clinic_id no where torna o escopo de tenant atômico com a escrita.
  const updated = await prisma.appointment.updateMany({
    where: { id: appointmentId, clinic_id: clinicId },
    data: { status },
  })

  if (updated.count === 0) {
    return {
      ok: false,
      error: 'APPOINTMENT_NOT_FOUND',
      message: 'Consulta não encontrada ou sem permissão para alterar.',
      status: 404,
    }
  }

  return { ok: true }
}
