import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendAlertEmail,
  sendAlertWhatsApp,
  sendAlertSMS
} from '@/lib/alerts'

type AlertAction = 'dismiss' | 'resend'

interface AlertRecord {
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

interface AlertQueryRecord {
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
  }[]
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id
    const body = await request.json() as { action?: AlertAction }
    const { action } = body // 'dismiss' | 'resend'

    if (!alertId || !action) {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: 'ID do alerta e ação são obrigatórios.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (action === 'dismiss') {
      // 1. Dismiss alert
      const { data, error } = await supabase
        .from('alerts')
        .update({ status: 'DISMISSED' })
        .eq('id', alertId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return NextResponse.json({ success: true, alert: data })
    } else if (action === 'resend') {
      // 2. Query alert with patient relations using service role (matches type shape)
      const { data: alert, error: queryError } = await supabase
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
        .eq('id', alertId)
        .single()

      if (queryError || !alert) {
        return NextResponse.json({ error: 'ALERT_NOT_FOUND', message: 'Alerta não encontrado.' }, { status: 404 })
      }

      // 3. Dispatch based on channel
      const alertQuery = alert as unknown as AlertQueryRecord
      const patient = alertQuery.patients[0]

      if (!patient) {
        return NextResponse.json({ error: 'PATIENT_NOT_FOUND', message: 'Paciente do alerta não encontrado.' }, { status: 404 })
      }

      const alertTyped: AlertRecord = {
        ...alertQuery,
        patients: patient,
      }

      if (alertTyped.channel === 'EMAIL') {
        await sendAlertEmail(alertTyped)
      } else if (alertTyped.channel === 'WHATSAPP') {
        await sendAlertWhatsApp(alertTyped)
      } else if (alertTyped.channel === 'SMS') {
        await sendAlertSMS(alertTyped)
      } else {
        return NextResponse.json({ error: 'UNSUPPORTED_CHANNEL', message: 'Canal de envio não suportado.' }, { status: 400 })
      }

      // Mark as SENT
      await supabase
        .from('alerts')
        .update({ status: 'SENT', sent_at: new Date().toISOString() })
        .eq('id', alertId)

      return NextResponse.json({ success: true, message: 'Alerta redisparado com sucesso.' })
    }

    return NextResponse.json({ error: 'INVALID_ACTION', message: 'Ação não suportada.' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Alert action error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Falha ao processar ação do alerta.' },
      { status: 500 }
    )
  }
}
