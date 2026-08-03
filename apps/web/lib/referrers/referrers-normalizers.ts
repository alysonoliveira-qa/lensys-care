import type { AppointmentStatus } from '@/lib/appointments/appointments-config'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 120
const PIX_KEY_MAX_LENGTH = 140
const WHATSAPP_MIN_DIGITS = 10
const WHATSAPP_MAX_DIGITS = 13

export interface ReferrerInput {
  name: string
  pixKey?: string | null
  whatsapp?: string | null
}

export interface ReferrerInputErrors {
  name?: string
  pixKey?: string
  whatsapp?: string
}

export type ReferrerInputResult =
  | { ok: true; value: { name: string; pixKey: string | null; whatsapp: string | null } }
  | { ok: false; errors: ReferrerInputErrors }

function countDigits(value: string) {
  return (value.match(/\d/g) ?? []).length
}

/**
 * Só o nome é obrigatório. PIX e WhatsApp são guardados como digitados (igual ao
 * telefone do paciente) — a validação é leve, só para barrar entrada claramente errada.
 */
export function validateReferrerInput(input: ReferrerInput): ReferrerInputResult {
  const errors: ReferrerInputErrors = {}

  const name = input.name?.trim() ?? ''
  if (name.length < NAME_MIN_LENGTH) {
    errors.name = 'Informe o nome do indicante.'
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`
  }

  const rawPixKey = (input.pixKey ?? '').trim()
  if (rawPixKey.length > PIX_KEY_MAX_LENGTH) {
    errors.pixKey = `A chave PIX deve ter no máximo ${PIX_KEY_MAX_LENGTH} caracteres.`
  }

  const rawWhatsapp = (input.whatsapp ?? '').trim()
  if (rawWhatsapp !== '') {
    const digits = countDigits(rawWhatsapp)
    if (digits < WHATSAPP_MIN_DIGITS || digits > WHATSAPP_MAX_DIGITS) {
      errors.whatsapp = 'WhatsApp inválido. Informe DDD + número (ex.: 11 99999-9999).'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      name,
      pixKey: rawPixKey === '' ? null : rawPixKey,
      whatsapp: rawWhatsapp === '' ? null : rawWhatsapp,
    },
  }
}

export interface ReferralCandidate {
  status: AppointmentStatus
  referrer_id: string | null
  referral_paid_at: Date | null
}

/**
 * Regra da gratificação: a clínica deve ao indicante por consulta que **compareceu**
 * e ainda não foi paga. Agendada ou cancelada não conta.
 * O mesmo critério vive no `where` do Prisma em `referrers-data.ts`.
 */
export function isPendingReferral(appointment: ReferralCandidate): boolean {
  return (
    appointment.status === 'ATTENDED' &&
    appointment.referrer_id !== null &&
    appointment.referral_paid_at === null
  )
}

export function countPendingReferrals(appointments: ReferralCandidate[]): number {
  return appointments.filter(isPendingReferral).length
}
