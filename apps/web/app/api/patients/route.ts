import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { isFutureDateOnly, parseDateOnly } from '@/lib/patients/patient-dob'
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
    const { data, error } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub
    logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

    if (error || !userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    const bodyStartedAt = startPerformanceStep()
    const body = await request.json()
    logPerformanceStep(timer, 'request.json', bodyStartedAt)
    const { fullName, dob, phone, email, notes } = body

    if (!fullName || !dob) {
      return NextResponse.json({ error: 'MISSING_FIELDS', message: 'Nome completo e data de nascimento são obrigatórios.' }, { status: 400 })
    }

    const birthDate = parseDateOnly(dob)

    if (!birthDate) {
      return NextResponse.json({ error: 'INVALID_DOB', message: 'Data de nascimento inválida.' }, { status: 400 })
    }

    if (isFutureDateOnly(birthDate)) {
      return NextResponse.json({ error: 'FUTURE_DOB', message: FUTURE_DOB_MESSAGE }, { status: 400 })
    }

    const profileStartedAt = startPerformanceStep()
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
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
      { error: 'SERVER_ERROR', message: 'Falha ao cadastrar paciente.' },
      { status: 500 }
    )
  } finally {
    endPerformanceTimer(timer)
  }
}

export async function PATCH(request: Request) {
  const timer = startPerformanceTimer('api PATCH /api/patients')
  try {
    const supabase = createClient()
    const authStartedAt = startPerformanceStep()
    const { data, error } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub
    logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

    if (error || !userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faca login para continuar.' }, { status: 401 })
    }

    const bodyStartedAt = startPerformanceStep()
    const body = await request.json()
    logPerformanceStep(timer, 'request.json', bodyStartedAt)
    const { patientId, fullName, dob, phone, email, notes } = body

    if (!patientId || !fullName || !dob) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Paciente, nome completo e data de nascimento sao obrigatorios.' },
        { status: 400 }
      )
    }

    const birthDate = parseDateOnly(dob)

    if (!birthDate) {
      return NextResponse.json({ error: 'INVALID_DOB', message: 'Data de nascimento invalida.' }, { status: 400 })
    }

    if (isFutureDateOnly(birthDate)) {
      return NextResponse.json({ error: 'FUTURE_DOB', message: FUTURE_DOB_MESSAGE }, { status: 400 })
    }

    const profileStartedAt = startPerformanceStep()
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { clinic_id: true },
    })
    logPerformanceStep(timer, 'prisma.profile_clinic', profileStartedAt)

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil clinico nao encontrado.' }, { status: 404 })
    }

    const patientStartedAt = startPerformanceStep()
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        clinic_id: profile.clinic_id,
      },
      select: {
        id: true,
      },
    })

    if (!existingPatient) {
      logPerformanceStep(timer, 'prisma.patient_update', patientStartedAt)
      return NextResponse.json(
        { error: 'PATIENT_NOT_FOUND', message: 'Paciente nao encontrado ou sem permissao para editar.' },
        { status: 404 }
      )
    }

    const patient = await prisma.patient.update({
      where: {
        id: existingPatient.id,
      },
      data: {
        full_name: fullName,
        dob: birthDate,
        phone,
        email,
        notes,
      },
      select: {
        id: true,
      },
    })
    logPerformanceStep(timer, 'prisma.patient_update', patientStartedAt)

    return NextResponse.json({ success: true, patient })
  } catch (error: unknown) {
    console.error('Patient update error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Falha ao atualizar paciente.' },
      { status: 500 }
    )
  } finally {
    endPerformanceTimer(timer)
  }
}
