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
    const fullNameInput = typeof body?.fullName === 'string' ? body.fullName.trim() : null
    const preferredNameInput = typeof body?.preferredName === 'string' ? body.preferredName.trim() : ''

    if (fullNameInput !== null && fullNameInput.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_FULL_NAME', message: 'O nome completo é obrigatório.' },
        { status: 400 }
      )
    }

    if (fullNameInput !== null && fullNameInput.length > 120) {
      return NextResponse.json(
        { error: 'INVALID_FULL_NAME', message: 'O nome completo deve ter no máximo 120 caracteres.' },
        { status: 400 }
      )
    }

    if (preferredNameInput.length > 60) {
      return NextResponse.json(
        { error: 'INVALID_PREFERRED_NAME', message: 'O nome de exibição deve ter no máximo 60 caracteres.' },
        { status: 400 }
      )
    }

    const preferredName = preferredNameInput.length > 0 ? preferredNameInput : null

    const existingProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, full_name: true },
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'PROFILE_NOT_FOUND', message: 'Perfil não encontrado.' },
        { status: 404 }
      )
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: user.id },
      data: {
        full_name: fullNameInput ?? existingProfile.full_name,
        preferred_name: preferredName,
      },
      select: {
        full_name: true,
        preferred_name: true,
        role: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso.',
      profile: {
        full_name: updatedProfile.full_name,
        preferred_name: updatedProfile.preferred_name,
        role: updatedProfile.role,
      } as UpdatedProfileRow,
    })
  } catch (error) {
    console.error('Profile update failed:', error)

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Não foi possível atualizar o perfil.' },
      { status: 500 }
    )
  }
}
