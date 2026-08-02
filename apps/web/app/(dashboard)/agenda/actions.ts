'use server'

import { revalidatePath } from 'next/cache'

import {
  createAppointmentForClinic,
  setAppointmentStatusForClinic,
} from '@/lib/appointments/appointments-data'
import {
  normalizeAppointmentTime,
  type AppointmentInputErrors,
} from '@/lib/appointments/appointments-normalizers'
import { getAuthenticatedProfile } from '@/lib/auth/authenticated-profile'
import {
  searchPatientsForClinic,
  type PatientSearchResult,
} from '@/lib/patients/patient-search'

/**
 * Diferente dos exames, a RECEPTIONIST PODE criar e mudar status de consultas — a
 * agenda é a ferramenta principal dela. A segurança vem da validação de tenant na
 * borda (`clinic_id` do perfil autenticado), não de guard de papel.
 */

export interface AppointmentActionState {
  status: 'idle' | 'success' | 'error'
  message: string
  fieldErrors?: AppointmentInputErrors
}

// Nada além de funções async pode ser exportado de um arquivo 'use server' — o estado
// inicial do formulário fica no componente que chama `useFormState`.
const SESSION_EXPIRED: AppointmentActionState = {
  status: 'error',
  message: 'Sua sessão expirou. Entre novamente.',
}

function field(formData: FormData, name: string) {
  return formData.get(name)?.toString() ?? ''
}

/** Busca do diálogo de nova consulta — restrita à clínica da sessão. */
export async function searchPatients(term: string): Promise<PatientSearchResult[]> {
  const profile = await getAuthenticatedProfile()

  if (!profile) return []

  return searchPatientsForClinic(profile.clinic_id, term)
}

export async function createAppointment(
  _previousState: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  const patientId = field(formData, 'patient_id')
  const date = field(formData, 'appointment_date')
  const time = field(formData, 'scheduled_time')
  const referrerId = field(formData, 'referrer_id')

  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED

  const result = await createAppointmentForClinic({
    clinicId: profile.clinic_id,
    patientId,
    date,
    time,
    createdBy: profile.id,
    referrerId,
  })

  if (!result.ok) {
    return {
      status: 'error',
      message: result.message,
      ...(result.error === 'INVALID_INPUT' ? { fieldErrors: result.errors } : {}),
    }
  }

  revalidatePath('/agenda')

  const scheduledTime = normalizeAppointmentTime(time)

  return {
    status: 'success',
    message: scheduledTime
      ? `Consulta agendada para ${scheduledTime}.`
      : 'Paciente adicionado à fila do dia.',
  }
}

export async function setAppointmentStatus(
  _previousState: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  const appointmentId = field(formData, 'appointment_id')
  const status = field(formData, 'status')

  if (!appointmentId) {
    return { status: 'error', message: 'Consulta não identificada.' }
  }

  // Só as transições da agenda: voltar para SCHEDULED não é uma ação do MVP.
  if (status !== 'ATTENDED' && status !== 'CANCELED') {
    return { status: 'error', message: 'Ação inválida para esta consulta.' }
  }

  const profile = await getAuthenticatedProfile()

  if (!profile) return SESSION_EXPIRED

  const result = await setAppointmentStatusForClinic({
    clinicId: profile.clinic_id,
    appointmentId,
    status,
  })

  if (!result.ok) {
    return { status: 'error', message: result.message }
  }

  revalidatePath('/agenda')
  // Comparecer com indicante muda o contador de pendentes na aba Indicantes.
  revalidatePath('/patients')

  return {
    status: 'success',
    message:
      status === 'ATTENDED' ? 'Consulta marcada como comparecida.' : 'Consulta cancelada.',
  }
}
