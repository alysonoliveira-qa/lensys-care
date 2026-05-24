import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'

const FUTURE_DOB_MESSAGE = 'A data de nascimento não pode ser futura.'

export async function POST(request: Request) {
  const timer = startPerformanceTimer('api POST /api/patients')
  try {
    const supabase = createClient()
    const authStartedAt = startPerformanceStep()
    const { data: { user } } = await supabase.auth.getUser()
    logPerformanceStep(timer, 'auth.getUser', authStartedAt)

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    const bodyStartedAt = startPerformanceStep()
    const body = await request.json()
    logPerformanceStep(timer, 'request.json', bodyStartedAt)
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

    const profileStartedAt = startPerformanceStep()
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { clinic_id: true },
    })
    logPerformanceStep(timer, 'prisma.profile_clinic', profileStartedAt)

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil clínico não encontrado.' }, { status: 404 })
    }

    const patientStartedAt = startPerformanceStep()
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
    logPerformanceStep(timer, 'prisma.patient_create', patientStartedAt)

    return NextResponse.json({ success: true, patient })
  } catch (error: unknown) {
    console.error('Patient creation error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Falha ao cadastrar paciente.' },
      { status: 500 }
    )
  } finally {
    endPerformanceTimer(timer)
  }
}
