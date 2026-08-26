'use server'

import { revalidatePath } from 'next/cache'

import { getAuthenticatedProfile } from '@/lib/auth/authenticated-profile'
import { hasFeature } from '@/lib/features'
import {
  createEntry as createEntryForClinic,
  deleteEntry as deleteEntryForClinic,
} from '@/lib/financeiro/financeiro-data'
import {
  validateFinancialEntryInput,
  type FinancialEntryInputErrors,
} from '@/lib/financeiro/financeiro-normalizers'

export interface FinanceiroActionState {
  status: 'idle' | 'success' | 'error'
  message: string
  fieldErrors?: FinancialEntryInputErrors
}

const SESSION_EXPIRED: FinanceiroActionState = {
  status: 'error',
  message: 'Sua sessão expirou. Entre novamente.',
}

const PLAN_REQUIRED: FinanceiroActionState = {
  status: 'error',
  message: 'O módulo Financeiro está disponível no plano Professional.',
}

function field(formData: FormData, name: string) {
  return formData.get(name)?.toString() ?? ''
}

export async function createFinancialEntry(
  _previousState: FinanceiroActionState,
  formData: FormData
): Promise<FinanceiroActionState> {
  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED

  // O gate é revalidado aqui, e não só na página: server action é endpoint, e
  // esconder o link da sidebar não impede ninguém de postar neste formulário.
  if (!(await hasFeature(profile.clinic_id, 'financeiro'))) return PLAN_REQUIRED

  const parsed = validateFinancialEntryInput({
    type: field(formData, 'type'),
    amount: field(formData, 'amount'),
    description: field(formData, 'description'),
    paymentMethod: field(formData, 'payment_method'),
    entryDate: field(formData, 'entry_date'),
    patientId: field(formData, 'patient_id'),
    referrerId: field(formData, 'referrer_id'),
  })

  if (!parsed.ok) {
    return {
      status: 'error',
      message: 'Confira os campos destacados.',
      fieldErrors: parsed.errors,
    }
  }

  // `clinic_id` e `created_by` vêm da sessão, nunca do formulário.
  const result = await createEntryForClinic({
    ...parsed.value,
    clinicId: profile.clinic_id,
    createdBy: profile.id,
  })

  if (!result.ok) {
    return {
      status: 'error',
      message:
        result.reason === 'PATIENT_NOT_IN_CLINIC'
          ? 'Paciente não encontrado nesta clínica.'
          : 'Indicante não encontrado nesta clínica.',
    }
  }

  revalidatePath('/financeiro')

  return { status: 'success', message: 'Lançamento registrado.' }
}

export async function deleteFinancialEntry(
  _previousState: FinanceiroActionState,
  formData: FormData
): Promise<FinanceiroActionState> {
  const entryId = field(formData, 'entry_id')

  if (!entryId) {
    return { status: 'error', message: 'Lançamento não identificado.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED

  if (!(await hasFeature(profile.clinic_id, 'financeiro'))) return PLAN_REQUIRED

  const result = await deleteEntryForClinic(profile.clinic_id, entryId)

  if (!result.ok) {
    return { status: 'error', message: 'Lançamento não encontrado.' }
  }

  revalidatePath('/financeiro')

  return { status: 'success', message: 'Lançamento excluído.' }
}
