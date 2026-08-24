// ─────────────────────────────────────────────────────────────────────────────
// lib/alerts.ts
// Alert business logic: creation, cancellation, and dispatch (email + messaging).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { renderExamReminderEmail } from '@/lib/email/templates/exam-reminder'
import { sendWhatsApp, sendSMS } from '@/lib/messaging'
import { hasFeatureAsService } from '@/lib/features'
import { toSingleRelation, type AlertPatientRelation } from '@/lib/alerts/alert-relations'

// Service-role client — bypasses RLS for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Alert Creation ───────────────────────────────────────────────────────────

/**
 * Creates an Alert record for a newly saved exam.
 * due_date = exam_date + 365 days (1-year renewal reminder).
 * Cancels any previous PENDING alerts for the same patient first.
 */
export async function createAlertForExam(params: {
  examId: string
  examDate: Date
  patientId: string
  channel?: 'EMAIL' | 'WHATSAPP' | 'SMS'
  supabase: SupabaseClient
}): Promise<void> {
  const { examId, examDate, patientId, channel = 'EMAIL', supabase } = params

  // Cancel old pending alerts (also handled by DB trigger, belt-and-suspenders)
  await cancelPreviousAlerts(supabase, patientId, examId)

  const dueDate = new Date(examDate)
  dueDate.setDate(dueDate.getDate() + 365)

  const { error } = await supabase.from('alerts').insert({
    patient_id: patientId,
    exam_id: examId,
    due_date: dueDate.toISOString().split('T')[0],
    status: 'PENDING',
    channel,
  })

  if (error) {
    throw new Error(`Failed to create alert: ${error.message}`)
  }
}

/**
 * Dismisses all PENDING alerts for a patient except a specific exam's alert.
 * Called when a new exam is recorded for the same patient.
 */
export async function cancelPreviousAlerts(
  supabase: SupabaseClient,
  patientId: string,
  excludeExamId?: string
): Promise<void> {
  let query = supabase
    .from('alerts')
    .update({ status: 'DISMISSED' })
    .eq('patient_id', patientId)
    .eq('status', 'PENDING')

  if (excludeExamId) {
    query = query.neq('exam_id', excludeExamId)
  }

  const { error } = await query
  if (error) {
    console.error('Failed to cancel previous alerts:', error.message)
  }
}

// ─── Alert Dispatch ───────────────────────────────────────────────────────────

interface AlertWithRelations {
  id: string
  patient_id: string
  exam_id: string
  due_date: string
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  patients: AlertPatientRelation
}

interface AlertWithRelationRows {
  id: string
  patient_id: string
  exam_id: string
  due_date: string
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  // O embed vem como objeto, não array — ver `toSingleRelation`. O tipo aceita
  // as duas formas porque a resposta do PostgREST não é garantia de contrato.
  patients: AlertPatientRelation | AlertPatientRelation[] | null
}

/**
 * Sends an email reminder for an alert via Resend.
 */
export async function sendAlertEmail(alert: AlertWithRelations): Promise<void> {
  const { patients: patient } = alert

  if (!patient.email) {
    console.warn(`Alert ${alert.id}: patient has no email, skipping.`)
    return
  }

  const html = await renderExamReminderEmail({
    patientName: patient.full_name,
    dueDate: new Date(alert.due_date),
  })

  await sendEmail({
    to: patient.email,
    subject: 'Lembrete: sua consulta de renovação de óculos está chegando!',
    html,
  })
}

/**
 * Sends a WhatsApp reminder for an alert (CONECTA plan only).
 */
export async function sendAlertWhatsApp(alert: AlertWithRelations): Promise<void> {
  const { patients: patient } = alert

  const hasAccess = await hasFeatureAsService(patient.clinic_id, 'whatsapp')
  if (!hasAccess) {
    console.warn(`Alert ${alert.id}: clinic not on CONECTA plan, skipping WhatsApp.`)
    return
  }

  if (!patient.phone) {
    console.warn(`Alert ${alert.id}: patient has no phone, skipping WhatsApp.`)
    return
  }

  const message = `Olá, ${patient.full_name}! 👁️ Sua consulta de renovação de óculos está se aproximando. Agende já seu exame com nossa equipe!`
  await sendWhatsApp(patient.phone, message)
}

/**
 * Sends an SMS reminder for an alert (CONECTA plan only).
 */
export async function sendAlertSMS(alert: AlertWithRelations): Promise<void> {
  const { patients: patient } = alert

  const hasAccess = await hasFeatureAsService(patient.clinic_id, 'sms')
  if (!hasAccess) {
    console.warn(`Alert ${alert.id}: clinic not on CONECTA plan, skipping SMS.`)
    return
  }

  if (!patient.phone) {
    console.warn(`Alert ${alert.id}: patient has no phone, skipping SMS.`)
    return
  }

  const message = `Lensys Care: Olá ${patient.full_name}, sua renovação de óculos está chegando. Agende sua consulta!`
  await sendSMS(patient.phone, message)
}

interface DispatchResult {
  sent: number
  failed: number
  skipped: number
  failures: Array<{ alertId: string; reason: string }>
}

/**
 * Quantos dias para trás o disparo recupera. Com data exata, um dia em que o
 * cron não roda (deploy, falha, atraso da janela do plano Hobby) perde aquela
 * safra de alertas para sempre. Com a janela, o dia seguinte recolhe o que
 * ficou; sem ela virar "mande tudo que já venceu", que despejaria um ano de
 * histórico de uma vez na primeira execução.
 */
const CATCHUP_DAYS = 3

/**
 * Teto por execução. Coincide de propósito com o limite diário do plano
 * gratuito do Resend: passar disso não entrega e-mail, só queima cota. O que
 * sobra continua PENDING e entra na execução seguinte.
 */
const MAX_ALERTS_PER_RUN = 100

/**
 * Dispatches alerts due within the next N days.
 * Called by the Vercel cron job via /api/alerts/send.
 *
 * @param daysAhead - Number of days ahead to look for due alerts (default: 7)
 */
export async function dispatchDueAlerts(daysAhead = 7): Promise<DispatchResult> {
  const supabase = getServiceClient()

  const toDateStr = (date: Date) => date.toISOString().split('T')[0]

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + daysAhead)

  const windowStart = new Date(targetDate)
  windowStart.setDate(windowStart.getDate() - CATCHUP_DAYS)

  const { data: alerts, error } = await supabase
    .from('alerts')
    .select(`
      id,
      patient_id,
      exam_id,
      due_date,
      channel,
      patients (
        full_name,
        email,
        phone,
        clinic_id
      )
    `)
    .eq('status', 'PENDING')
    .gte('due_date', toDateStr(windowStart))
    .lte('due_date', toDateStr(targetDate))
    .order('due_date', { ascending: true })
    .limit(MAX_ALERTS_PER_RUN)

  if (error) throw new Error(`Failed to fetch alerts: ${error.message}`)
  if (!alerts || alerts.length === 0) return { sent: 0, failed: 0, skipped: 0, failures: [] }

  let sent = 0
  let failed = 0
  let skipped = 0

  // O motivo de cada falha volta na resposta da rota, não só no console: o plano
  // Hobby da Vercel não retém saída de console, e um cron que só diz "falhou 1"
  // obriga a redeployar com log extra para descobrir o que aconteceu. Quem chama
  // a rota já provou ter o CRON_SECRET, então não há a quem vazar.
  const failures: Array<{ alertId: string; reason: string }> = []

  // Um lote costuma repetir a mesma clínica várias vezes, e cada consulta de
  // plano abre um cliente Supabase novo. Memoiza pelo tempo da execução.
  const autoAlertsByClinic = new Map<string, boolean>()
  const clinicHasAutoAlerts = async (clinicId: string) => {
    const cached = autoAlertsByClinic.get(clinicId)
    if (cached !== undefined) return cached

    const allowed = await hasFeatureAsService(clinicId, 'auto_alerts')
    autoAlertsByClinic.set(clinicId, allowed)
    return allowed
  }

  for (const alertRow of alerts as unknown as AlertWithRelationRows[]) {
    try {
      const patient = toSingleRelation(alertRow.patients)
      if (!patient) {
        failed++
        failures.push({ alertId: alertRow.id, reason: 'Alerta sem paciente vinculado.' })
        continue
      }

      const alert: AlertWithRelations = {
        ...alertRow,
        patients: patient,
      }

      // O disparo sozinho é o que o Conecta compra. No Essencial o alerta
      // continua PENDING de propósito: ele segue na lista para a clínica enviar
      // na mão, que é o fluxo do plano. Marcar SENT aqui apagaria o recall do
      // cliente que não assinou o automático.
      if (!(await clinicHasAutoAlerts(patient.clinic_id))) {
        skipped++
        continue
      }

      if (alert.channel === 'EMAIL') {
        await sendAlertEmail(alert)
      } else if (alert.channel === 'WHATSAPP') {
        await sendAlertWhatsApp(alert)
      } else if (alert.channel === 'SMS') {
        await sendAlertSMS(alert)
      }

      // Mark as SENT
      await supabase
        .from('alerts')
        .update({ status: 'SENT', sent_at: new Date().toISOString() })
        .eq('id', alert.id)

      sent++
    } catch (err) {
      console.error(`Failed to send alert ${alertRow.id}:`, err)
      failed++
      failures.push({
        alertId: alertRow.id,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { sent, failed, skipped, failures }
}
