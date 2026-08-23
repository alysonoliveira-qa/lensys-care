import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.getClaims()

    if (authError || !data?.claims.sub) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faca login para continuar.' }, { status: 401 })
    }

    const userId = data.claims.sub

    const editorProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true, clinic_id: true },
    })

    if (!editorProfile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil não encontrado.' }, { status: 404 })
    }

    if (editorProfile.role === 'RECEPTIONIST') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Você não tem permissão para realizar esta ação.' },
        { status: 403 }
      )
    }

    // Defesa em profundidade: valida ownership do tenant explicitamente antes de mutar,
    // além da RLS. Prisma bypassa RLS, então a checagem explícita é a garantia primária.
    const ownedExam = await prisma.exam.findFirst({
      where: { id: params.id, patient: { clinic_id: editorProfile.clinic_id } },
      select: { id: true, performed_by: true },
    })

    if (!ownedExam) {
      return NextResponse.json(
        { error: 'EXAM_NOT_FOUND', message: 'Exame nao encontrado ou sem permissao para editar.' },
        { status: 404 }
      )
    }

    // OPTOMETRIST só edita exame que ele mesmo realizou — mesma regra do DELETE.
    // É prontuário clínico: a refração registrada responde por quem a mediu, e
    // deixar outro profissional reescrevê-la apaga essa autoria sem deixar rastro.
    if (editorProfile.role === 'OPTOMETRIST' && ownedExam.performed_by !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Você só pode editar exames realizados por você.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
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
      prescriptionNotes,
    } = body

    if (!examDate) {
      return NextResponse.json({ error: 'MISSING_FIELDS', message: 'Data do exame e obrigatoria.' }, { status: 400 })
    }

    const { data: updatedExam, error } = await supabase
      .from('exams')
      .update({
        exam_date: examDate,
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
      })
      .eq('id', params.id)
      .select('id')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!updatedExam) {
      return NextResponse.json(
        { error: 'EXAM_NOT_FOUND', message: 'Exame nao encontrado ou sem permissao para editar.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, exam: updatedExam })
  } catch (error: unknown) {
    console.error('Exam update error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Falha ao editar exame.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.getClaims()

    if (authError || !data?.claims.sub) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faca login para continuar.' }, { status: 401 })
    }

    const userId = data.claims.sub

    const removerProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true, clinic_id: true },
    })

    if (!removerProfile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil não encontrado.' }, { status: 404 })
    }

    if (removerProfile.role === 'RECEPTIONIST') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Você não tem permissão para realizar esta ação.' },
        { status: 403 }
      )
    }

    // Defesa em profundidade: valida ownership do tenant explicitamente antes de excluir,
    // além da RLS. Prisma bypassa RLS, então a checagem explícita é a garantia primária.
    const ownedExam = await prisma.exam.findFirst({
      where: { id: params.id, patient: { clinic_id: removerProfile.clinic_id } },
      select: { id: true, performed_by: true },
    })

    if (!ownedExam) {
      return NextResponse.json(
        { error: 'EXAM_NOT_FOUND', message: 'Exame nao encontrado ou sem permissao para excluir.' },
        { status: 404 }
      )
    }

    // OPTOMETRIST só pode excluir exames realizados por ele mesmo.
    if (removerProfile.role === 'OPTOMETRIST' && ownedExam.performed_by !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Você só pode excluir exames realizados por você.' },
        { status: 403 }
      )
    }

    const { data: deletedExam, error } = await supabase
      .from('exams')
      .delete()
      .eq('id', params.id)
      .select('id')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!deletedExam) {
      return NextResponse.json(
        { error: 'EXAM_NOT_FOUND', message: 'Exame nao encontrado ou sem permissao para excluir.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Exam deletion error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Falha ao excluir exame.' },
      { status: 500 }
    )
  }
}
