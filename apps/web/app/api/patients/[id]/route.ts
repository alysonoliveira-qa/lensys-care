import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { deletePatientForClinic } from '@/lib/patients/delete-patient'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.getClaims()

    if (authError || !data?.claims.sub) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faça login para continuar.' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: data.claims.sub },
      select: { clinic_id: true },
    })

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', message: 'Perfil clínico não encontrado.' }, { status: 404 })
    }

    const result = await deletePatientForClinic({
      patientId: params.id,
      clinicId: profile.clinic_id,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, message: result.message }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Patient deletion error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Falha ao excluir paciente.' },
      { status: 500 }
    )
  }
}
