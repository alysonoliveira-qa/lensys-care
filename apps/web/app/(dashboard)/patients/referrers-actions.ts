'use server'

import { revalidatePath } from 'next/cache'

import { getAuthenticatedProfile } from '@/lib/auth/authenticated-profile'
import {
  createReferrer as createReferrerForClinic,
  markReferralsPaid as markReferralsPaidForClinic,
  setReferrerActive as setReferrerActiveForClinic,
  updateReferrer as updateReferrerForClinic,
} from '@/lib/referrers/referrers-data'
import type { ReferrerInputErrors } from '@/lib/referrers/referrers-normalizers'

/** Os três papéis podem gerir indicantes — a RECEPTIONIST é quem paga no fim do dia. */

export interface ReferrerActionState {
  status: 'idle' | 'success' | 'error'
  message: string
  fieldErrors?: ReferrerInputErrors
}

const SESSION_EXPIRED: ReferrerActionState = {
  status: 'error',
  message: 'Sua sessão expirou. Entre novamente.',
}

function field(formData: FormData, name: string) {
  return formData.get(name)?.toString() ?? ''
}

function referralsPaidMessage(paidCount: number, pendingCount: number) {
  if (paidCount === 0) {
    return 'Não havia indicações pendentes para este indicante.'
  }

  const paid =
    paidCount === 1 ? '1 indicação marcada como paga.' : `${paidCount} indicações marcadas como pagas.`

  if (pendingCount === 0) return paid

  // Uma consulta virou "Compareceu" durante o pagamento: o contador não zera de propósito.
  return `${paid} Restaram ${pendingCount} pendente(s) registradas durante o pagamento.`
}

export async function createReferrer(
  _previousState: ReferrerActionState,
  formData: FormData
): Promise<ReferrerActionState> {
  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED

  const result = await createReferrerForClinic({
    clinicId: profile.clinic_id,
    name: field(formData, 'name'),
    pixKey: field(formData, 'pix_key'),
    whatsapp: field(formData, 'whatsapp'),
  })

  if (!result.ok) {
    return { status: 'error', message: result.message, fieldErrors: result.errors }
  }

  revalidatePath('/patients')

  return { status: 'success', message: 'Indicante cadastrado.' }
}

export async function updateReferrer(
  _previousState: ReferrerActionState,
  formData: FormData
): Promise<ReferrerActionState> {
  const referrerId = field(formData, 'referrer_id')

  if (!referrerId) {
    return { status: 'error', message: 'Indicante não identificado.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED

  const result = await updateReferrerForClinic({
    clinicId: profile.clinic_id,
    referrerId,
    name: field(formData, 'name'),
    pixKey: field(formData, 'pix_key'),
    whatsapp: field(formData, 'whatsapp'),
  })

  if (!result.ok) {
    return {
      status: 'error',
      message: result.message,
      ...(result.error === 'INVALID_INPUT' ? { fieldErrors: result.errors } : {}),
    }
  }

  revalidatePath('/patients')

  return { status: 'success', message: 'Indicante atualizado.' }
}

export async function setReferrerActive(
  _previousState: ReferrerActionState,
  formData: FormData
): Promise<ReferrerActionState> {
  const referrerId = field(formData, 'referrer_id')
  const active = field(formData, 'active')

  if (!referrerId) {
    return { status: 'error', message: 'Indicante não identificado.' }
  }

  if (active !== 'true' && active !== 'false') {
    return { status: 'error', message: 'Ação inválida para este indicante.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED

  const result = await setReferrerActiveForClinic({
    clinicId: profile.clinic_id,
    referrerId,
    active: active === 'true',
  })

  if (!result.ok) {
    return { status: 'error', message: result.message }
  }

  revalidatePath('/patients')

  return {
    status: 'success',
    message: active === 'true' ? 'Indicante reativado.' : 'Indicante desativado.',
  }
}

export async function markReferralsPaid(
  _previousState: ReferrerActionState,
  formData: FormData
): Promise<ReferrerActionState> {
  const referrerId = field(formData, 'referrer_id')

  if (!referrerId) {
    return { status: 'error', message: 'Indicante não identificado.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED

  const result = await markReferralsPaidForClinic({
    clinicId: profile.clinic_id,
    referrerId,
  })

  if (!result.ok) {
    return { status: 'error', message: result.message }
  }

  revalidatePath('/patients')

  return {
    status: 'success',
    message: referralsPaidMessage(result.paidCount, result.pendingCount),
  }
}
