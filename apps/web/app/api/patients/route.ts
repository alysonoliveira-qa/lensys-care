import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

const FUTURE_DOB_MESSAGE = 'A data de nascimento não pode ser futura.'

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

    const birthDate = new Date(dob)
    const today = new Date()
    birthDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    if (Number.isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: 'INVALID_DOB', message: 'Data de nascimento inválida.' }, { status: 400 })
    }

    if (birthDate > today) {
      return NextResponse.json({ error: 'FUTURE_DOB', message: FUTURE_DOB_MESSAGE }, { status: 400 })
    }

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
        dob: birthDate,
        phone,
        email,
        notes,
      },
    })

    return NextResponse.json({ success: true, patient })
  } catch (error: unknown) {
    console.error('Patient creation error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Falha ao cadastrar paciente.' },
      { status: 500 }
    )
  }
}
