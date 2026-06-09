import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { createAlertForExam } from '@/lib/alerts'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'

export async function POST(request: Request) {
  const timer = startPerformanceTimer('api POST /api/exams')
  try {
    const supabase = createClient()
    const authStartedAt = startPerformanceStep()
    const { data, error } = await supabase.auth.getClaims()
    const userId = data?.claims.sub
    logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

    if (error || !userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    const bodyStartedAt = startPerformanceStep()
    const body = await request.json()
    logPerformanceStep(timer, 'request.json', bodyStartedAt)
    const {
      patientId,
      examDate,
      odSph,
      odCyl,
      odAxis,
      odVa,
      oeSph,
      oeCyl,
      oeAxis,
      oeVa,
      addition,
      pd,
      prescriptionNotes
    } = body

    if (!patientId || !examDate) {
      return NextResponse.json({ error: 'MISSING_FIELDS', message: 'Paciente e data do exame são obrigatórios.' }, { status: 400 })
    }

    // Load examiner profile
    const examinerStartedAt = startPerformanceStep()
    const examiner = await prisma.profile.findUnique({
      where: { id: userId },
    })
    logPerformanceStep(timer, 'prisma.examiner_profile', examinerStartedAt)

    if (!examiner) {
      return NextResponse.json({ error: 'EXAMINER_NOT_FOUND', message: 'Perfil do examinador não encontrado.' }, { status: 404 })
    }

    if (examiner.role === 'RECEPTIONIST') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Você não tem permissão para realizar esta ação.' },
        { status: 403 }
      )
    }

    const patientStartedAt = startPerformanceStep()
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        clinic_id: examiner.clinic_id,
      },
      select: { id: true },
    })
    logPerformanceStep(timer, 'prisma.patient_ownership', patientStartedAt)

    if (!patient) {
      return NextResponse.json(
        { error: 'PATIENT_NOT_FOUND', message: 'Paciente não encontrado.' },
        { status: 404 }
      )
    }

    const examStartedAt = startPerformanceStep()
    const exam = await prisma.exam.create({
      data: {
        patient_id: patient.id,
        performed_by: examiner.id,
        exam_date: new Date(examDate),
        od_sph: odSph !== undefined && odSph !== '' ? Number(odSph) : null,
        od_cyl: odCyl !== undefined && odCyl !== '' ? Number(odCyl) : null,
        od_axis: odAxis !== undefined && odAxis !== '' ? Number(odAxis) : null,
        od_va: odVa || null,
        oe_sph: oeSph !== undefined && oeSph !== '' ? Number(oeSph) : null,
        oe_cyl: oeCyl !== undefined && oeCyl !== '' ? Number(oeCyl) : null,
        oe_axis: oeAxis !== undefined && oeAxis !== '' ? Number(oeAxis) : null,
        oe_va: oeVa || null,
        addition: addition !== undefined && addition !== '' ? Number(addition) : null,
        pd: pd !== undefined && pd !== '' ? Number(pd) : null,
        prescription_notes: prescriptionNotes || null,
      },
    })
    logPerformanceStep(timer, 'prisma.exam_create', examStartedAt)

    // Create the automatically scheduled alert for 365 days after the exam
    // Default to EMAIL channel. (Clinic can choose to dismiss or manually trigger SMS/WhatsApp if CONECTA)
    const alertStartedAt = startPerformanceStep()
    await createAlertForExam({
      examId: exam.id,
      examDate: new Date(examDate),
      patientId: patient.id,
      channel: 'EMAIL',
      supabase,
    })
    logPerformanceStep(timer, 'supabase.alert_create', alertStartedAt)

    return NextResponse.json({ success: true, exam })
  } catch (error: unknown) {
    console.error('Exam creation error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Falha ao lançar exame refrativo.' },
      { status: 500 }
    )
  } finally {
    endPerformanceTimer(timer)
  }
}
