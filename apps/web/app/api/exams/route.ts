import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { createAlertForExam } from '@/lib/alerts'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    const body = await request.json()
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
    const examiner = await prisma.profile.findUnique({
      where: { id: user.id },
    })

    if (!examiner) {
      return NextResponse.json({ error: 'EXAMINER_NOT_FOUND', message: 'Perfil do examinador não encontrado.' }, { status: 404 })
    }

    const exam = await prisma.exam.create({
      data: {
        patient_id: patientId,
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

    // Create the automatically scheduled alert for 365 days after the exam
    // Default to EMAIL channel. (Clinic can choose to dismiss or manually trigger SMS/WhatsApp if CONECTA)
    await createAlertForExam({
      examId: exam.id,
      examDate: new Date(examDate),
      patientId,
      channel: 'EMAIL',
    })

    return NextResponse.json({ success: true, exam })
  } catch (error: any) {
    console.error('Exam creation error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Falha ao lançar exame refrativo.' },
      { status: 500 }
    )
  }
}
