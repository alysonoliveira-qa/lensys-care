import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { requireFeature } from '@/lib/features'
import { sendSMS } from '@/lib/messaging'
import { MAX_MESSAGE_LENGTH, resolvePatientRecipient } from '@/lib/messaging/recipient'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    // Load profile to identify clinic
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { clinic_id: true },
    })

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil não encontrado.' }, { status: 404 })
    }

    const clinicId = profile.clinic_id

    // Plan Gating: require the 'sms' feature (will throw a typed Response if ESSENTIAL)
    try {
      await requireFeature(clinicId, 'sms')
    } catch (responseError: unknown) {
      if (responseError instanceof Response) {
        return responseError
      }
      throw responseError
    }

    const body = await request.json()
    const { patientId, message } = body

    if (!patientId || !message) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Paciente e mensagem são obrigatórios.' },
        { status: 400 }
      )
    }

    if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'MESSAGE_TOO_LONG', message: `A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.` },
        { status: 400 }
      )
    }

    // O número vem do cadastro do paciente, escopado pela clínica da sessão —
    // nunca do corpo da requisição. Ver lib/messaging/recipient.ts.
    const recipient = await resolvePatientRecipient(clinicId, patientId)

    if (!recipient) {
      return NextResponse.json(
        { error: 'RECIPIENT_NOT_FOUND', message: 'Paciente não encontrado ou sem telefone cadastrado.' },
        { status: 404 }
      )
    }

    // Send the SMS message
    await sendSMS(recipient.phone, message)

    return NextResponse.json({ success: true, message: 'Mensagem de SMS disparada com sucesso.' })
  } catch (error: unknown) {
    console.error('Manual SMS message send failed:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Falha ao disparar SMS.' },
      { status: 500 }
    )
  }
}
