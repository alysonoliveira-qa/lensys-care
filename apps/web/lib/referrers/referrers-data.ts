import { prisma } from '@/lib/db'

import {
  validateReferrerInput,
  type ReferrerInputErrors,
} from './referrers-normalizers'
import type { ReferrerRecord, ReferrerWithPendingRecord } from './referrers-mappers'

/**
 * Prisma direto NÃO é RLS garantido: toda função recebe `clinicId` e o aplica no
 * `where`, tanto na leitura quanto na escrita.
 */
const REFERRER_SELECT = {
  id: true,
  name: true,
  pix_key: true,
  whatsapp: true,
  active: true,
} as const

/** Mesmo critério de `isPendingReferral`, na linguagem do Prisma. */
function pendingReferralsWhere(clinicId: string, referrerId?: string) {
  return {
    clinic_id: clinicId,
    ...(referrerId ? { referrer_id: referrerId } : {}),
    status: 'ATTENDED' as const,
    referral_paid_at: null,
  }
}

export function listReferrers(
  clinicId: string,
  options: { activeOnly?: boolean } = {}
): Promise<ReferrerRecord[]> {
  return prisma.referrer.findMany({
    where: {
      clinic_id: clinicId,
      ...(options.activeOnly ? { active: true } : {}),
    },
    orderBy: { name: 'asc' },
    select: REFERRER_SELECT,
  })
}

export function listReferrersWithPendingCount(
  clinicId: string
): Promise<ReferrerWithPendingRecord[]> {
  return prisma.referrer.findMany({
    where: { clinic_id: clinicId },
    orderBy: { name: 'asc' },
    select: {
      ...REFERRER_SELECT,
      _count: {
        select: {
          appointments: { where: pendingReferralsWhere(clinicId) },
        },
      },
    },
  })
}

type InvalidReferrerResult = {
  ok: false
  error: 'INVALID_INPUT'
  message: string
  status: 400
  errors: ReferrerInputErrors
}

type ReferrerNotFoundResult = {
  ok: false
  error: 'REFERRER_NOT_FOUND'
  message: string
  status: 404
}

const REFERRER_NOT_FOUND: ReferrerNotFoundResult = {
  ok: false,
  error: 'REFERRER_NOT_FOUND',
  message: 'Indicante não encontrado ou sem permissão para alterar.',
  status: 404,
}

function invalidReferrer(errors: ReferrerInputErrors): InvalidReferrerResult {
  return {
    ok: false,
    error: 'INVALID_INPUT',
    message: errors.name ?? errors.pixKey ?? errors.whatsapp ?? 'Dados do indicante inválidos.',
    status: 400,
    errors,
  }
}

export interface CreateReferrerInput {
  clinicId: string
  name: string
  pixKey?: string | null
  whatsapp?: string | null
}

export type CreateReferrerResult = { ok: true; referrerId: string } | InvalidReferrerResult

export async function createReferrer({
  clinicId,
  name,
  pixKey,
  whatsapp,
}: CreateReferrerInput): Promise<CreateReferrerResult> {
  const validation = validateReferrerInput({ name, pixKey, whatsapp })

  if (!validation.ok) {
    return invalidReferrer(validation.errors)
  }

  const referrer = await prisma.referrer.create({
    data: {
      clinic_id: clinicId,
      name: validation.value.name,
      pix_key: validation.value.pixKey,
      whatsapp: validation.value.whatsapp,
    },
    select: { id: true },
  })

  return { ok: true, referrerId: referrer.id }
}

export interface UpdateReferrerInput extends CreateReferrerInput {
  referrerId: string
}

export type UpdateReferrerResult =
  | { ok: true }
  | InvalidReferrerResult
  | ReferrerNotFoundResult

export async function updateReferrer({
  clinicId,
  referrerId,
  name,
  pixKey,
  whatsapp,
}: UpdateReferrerInput): Promise<UpdateReferrerResult> {
  const validation = validateReferrerInput({ name, pixKey, whatsapp })

  if (!validation.ok) {
    return invalidReferrer(validation.errors)
  }

  const updated = await prisma.referrer.updateMany({
    where: { id: referrerId, clinic_id: clinicId },
    data: {
      name: validation.value.name,
      pix_key: validation.value.pixKey,
      whatsapp: validation.value.whatsapp,
    },
  })

  if (updated.count === 0) {
    return REFERRER_NOT_FOUND
  }

  return { ok: true }
}

export interface SetReferrerActiveInput {
  clinicId: string
  referrerId: string
  active: boolean
}

export type SetReferrerActiveResult = { ok: true } | ReferrerNotFoundResult

/** Sem exclusão dura: desativar preserva o histórico das consultas já ligadas. */
export async function setReferrerActive({
  clinicId,
  referrerId,
  active,
}: SetReferrerActiveInput): Promise<SetReferrerActiveResult> {
  const updated = await prisma.referrer.updateMany({
    where: { id: referrerId, clinic_id: clinicId },
    data: { active },
  })

  if (updated.count === 0) {
    return REFERRER_NOT_FOUND
  }

  return { ok: true }
}

export interface MarkReferralsPaidInput {
  clinicId: string
  referrerId: string
}

export type MarkReferralsPaidResult =
  | { ok: true; paidCount: number; pendingCount: number; paidAt: Date }
  | ReferrerNotFoundResult

/**
 * Carimba todas as indicações pendentes do indicante ("no fim do dia pago tudo").
 * Roda em transação e reconta ao final: se uma consulta virar "Compareceu" no meio do
 * pagamento, ela aparece em `pendingCount` em vez de sumir sem ser paga.
 */
export function markReferralsPaid({
  clinicId,
  referrerId,
}: MarkReferralsPaidInput): Promise<MarkReferralsPaidResult> {
  return prisma.$transaction(async (tx) => {
    const referrer = await tx.referrer.findFirst({
      where: { id: referrerId, clinic_id: clinicId },
      select: { id: true },
    })

    if (!referrer) {
      return REFERRER_NOT_FOUND
    }

    const where = pendingReferralsWhere(clinicId, referrerId)
    const paidAt = new Date()

    const updated = await tx.appointment.updateMany({
      where,
      data: { referral_paid_at: paidAt },
    })

    const pendingCount = await tx.appointment.count({ where })

    return { ok: true as const, paidCount: updated.count, pendingCount, paidAt }
  })
}
