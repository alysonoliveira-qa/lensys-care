import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

type UpdatedProfileRow = {
  full_name: string
  preferred_name: string | null
  role: string
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Usuário não autenticado.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const preferredNameInput = typeof body?.preferredName === 'string' ? body.preferredName.trim() : ''

    if (preferredNameInput.length > 60) {
      return NextResponse.json(
        { error: 'INVALID_PREFERRED_NAME', message: 'O nome de exibição deve ter no máximo 60 caracteres.' },
        { status: 400 }
      )
    }

    const preferredName = preferredNameInput.length > 0 ? preferredNameInput : null

    const updatedProfiles = await prisma.$queryRaw<UpdatedProfileRow[]>`
      UPDATE profiles
      SET preferred_name = ${preferredName}
      WHERE id = ${user.id}::uuid
      RETURNING full_name, preferred_name, role::text AS role
    `

    const updatedProfile = updatedProfiles[0]

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'PROFILE_NOT_FOUND', message: 'Perfil não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso.',
      profile: updatedProfile,
    })
  } catch (error) {
    console.error('Profile update failed:', error)

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Não foi possível atualizar o perfil.' },
      { status: 500 }
    )
  }
}
