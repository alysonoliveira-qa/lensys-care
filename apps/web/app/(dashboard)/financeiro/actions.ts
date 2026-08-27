'use server'

import { revalidatePath } from 'next/cache'

import { todayAppointmentDate } from '@/lib/appointments/appointments-normalizers'
import { getAuthenticatedProfile } from '@/lib/auth/authenticated-profile'
import { hasFeature } from '@/lib/features'
import { isPaymentMethod } from '@/lib/financeiro/financeiro-config'
import {
  createEntry as createEntryForClinic,
  deleteEntry as deleteEntryForClinic,
  registerConsultationPayment as registerConsultationForClinic,
  setConsultationPriceCents as setConsultationPriceForClinic,
} from '@/lib/financeiro/financeiro-data'
import {
  formatCurrency,
  parseAmountToCents,
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

export async function updateConsultationPrice(
  _previousState: FinanceiroActionState,
  formData: FormData
): Promise<FinanceiroActionState> {
  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED
  if (!(await hasFeature(profile.clinic_id, 'financeiro'))) return PLAN_REQUIRED

  // Só OWNER define preço: é configuração de negócio, não operação de balcão.
  if (profile.role !== 'OWNER') {
    return { status: 'error', message: 'Somente o proprietário pode definir o preço da consulta.' }
  }

  const priceCents = parseAmountToCents(field(formData, 'price'))

  if (priceCents === null) {
    return {
      status: 'error',
      message: 'Informe um valor válido, maior que zero.',
      fieldErrors: { amount: 'Valor inválido.' },
    }
  }

  const result = await setConsultationPriceForClinic(profile.clinic_id, priceCents)

  if (!result.ok) {
    return { status: 'error', message: 'Clínica não encontrada.' }
  }

  revalidatePath('/financeiro')
  revalidatePath('/patients')

  return { status: 'success', message: `Preço da consulta definido: ${formatCurrency(priceCents)}.` }
}

export interface ChargeActionState {
  status: 'idle' | 'success' | 'error' | 'needs_confirmation'
  message: string
}

/**
 * Registra o pagamento da consulta de um paciente.
 *
 * O valor **não vem do formulário** — vem da configuração da clínica. Aceitar
 * valor do cliente deixaria qualquer usuário lançar o número que quisesse no
 * caixa, e o botão existe justamente para ninguém digitar valor.
 */
export async function chargeConsultation(
  _previousState: ChargeActionState,
  formData: FormData
): Promise<ChargeActionState> {
  const patientId = field(formData, 'patient_id')
  const paymentMethod = field(formData, 'payment_method')

  if (!patientId) {
    return { status: 'error', message: 'Paciente não identificado.' }
  }

  if (!isPaymentMethod(paymentMethod)) {
    return { status: 'error', message: 'Forma de pagamento inválida.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) return { status: 'error', message: SESSION_EXPIRED.message }

  if (!(await hasFeature(profile.clinic_id, 'financeiro'))) {
    return { status: 'error', message: PLAN_REQUIRED.message }
  }

  const result = await registerConsultationForClinic({
    clinicId: profile.clinic_id,
    patientId,
    createdBy: profile.id,
    paymentMethod,
    entryDate: todayAppointmentDate(),
    confirmed: field(formData, 'confirmed') === 'true',
  })

  if (!result.ok) {
    if (result.reason === 'ALREADY_CHARGED_TODAY') {
      const quantos =
        result.existingCount === 1
          ? 'Já existe 1 lançamento'
          : `Já existem ${result.existingCount} lançamentos`

      return {
        status: 'needs_confirmation',
        message: `${quantos} para este paciente hoje. Registrar mesmo assim?`,
      }
    }

    return {
      status: 'error',
      message:
        result.reason === 'PRICE_NOT_SET'
          ? 'Defina o preço da consulta na aba Financeiro antes de cobrar.'
          : 'Paciente não encontrado nesta clínica.',
    }
  }

  revalidatePath('/financeiro')
  revalidatePath('/patients')
  revalidatePath(`/patients/${patientId}`)

  return {
    status: 'success',
    message: `${formatCurrency(result.amountCents)} registrado no caixa.`,
  }
}
