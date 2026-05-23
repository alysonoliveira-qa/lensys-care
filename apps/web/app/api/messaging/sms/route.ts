import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { requireFeature } from '@/lib/features'
import { sendSMS } from '@/lib/messaging'

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
    const { to, message } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'MISSING_FIELDS', message: 'Destinatário e mensagem são obrigatórios.' }, { status: 400 })
    }

    // Send the SMS message
    await sendSMS(to, message)

    return NextResponse.json({ success: true, message: 'Mensagem de SMS disparada com sucesso.' })
  } catch (error: unknown) {
    console.error('Manual SMS message send failed:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Falha ao disparar SMS.' },
      { status: 500 }
    )
  }
}
