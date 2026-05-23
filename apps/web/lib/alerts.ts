// ─────────────────────────────────────────────────────────────────────────────
// lib/alerts.ts
// Alert business logic: creation, cancellation, and dispatch (email + messaging).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { renderExamReminderEmail } from '@/lib/email/templates/exam-reminder'
import { sendWhatsApp, sendSMS } from '@/lib/messaging'
import { hasFeatureAsService } from '@/lib/features'

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
  patients: {
    full_name: string
    email: string | null
    phone: string | null
    clinic_id: string
  }
}

interface AlertWithRelationRows {
  id: string
  patient_id: string
  exam_id: string
  due_date: string
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  patients: Array<{
    full_name: string
    email: string | null
    phone: string | null
    clinic_id: string
  }>
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

  const message = `OptoTech: Olá ${patient.full_name}, sua renovação de óculos está chegando. Agende sua consulta!`
  await sendSMS(patient.phone, message)
}

/**
 * Dispatches alerts due within the next N days.
 * Called by the pg_cron job via /api/alerts/send.
 *
 * @param daysAhead - Number of days ahead to look for due alerts (default: 7)
 */
export async function dispatchDueAlerts(daysAhead = 7): Promise<{ sent: number; failed: number }> {
  const supabase = getServiceClient()

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + daysAhead)
  const targetDateStr = targetDate.toISOString().split('T')[0]

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
    .eq('due_date', targetDateStr)

  if (error) throw new Error(`Failed to fetch alerts: ${error.message}`)
  if (!alerts || alerts.length === 0) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0

  for (const alertRow of alerts as unknown as AlertWithRelationRows[]) {
    try {
      const patient = alertRow.patients[0]
      if (!patient) {
        failed++
        continue
      }

      const alert: AlertWithRelations = {
        ...alertRow,
        patients: patient,
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
    }
  }

  return { sent, failed }
}
