import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    const body = await request.json()
    const { fullName, dob, phone, email, notes } = body

    if (!fullName || !dob) {
      return NextResponse.json({ error: 'MISSING_FIELDS', message: 'Nome completo e data de nascimento são obrigatórios.' }, { status: 400 })
    }

    // Load user clinic
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { clinic_id: true },
    })

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil clínico não encontrado.' }, { status: 404 })
    }

    const patient = await prisma.patient.create({
      data: {
        clinic_id: profile.clinic_id,
        full_name: fullName,
        dob: new Date(dob),
        phone,
        email,
        notes,
      },
    })

    return NextResponse.json({ success: true, patient })
  } catch (error: any) {
    console.error('Patient creation error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Falha ao cadastrar paciente.' },
      { status: 500 }
    )
  }
}
