import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'

// ─── POST /api/invites/accept ─────────────────────────────────────────────────
// Chamado pela página /convite/[token] após o usuário preencher
// nome + senha (novo usuário) ou apenas confirmar (usuário existente).
//
// Fluxo:
//   1. Valida token → busca invite PENDING não expirado
//   2. Se o usuário já tem conta no Supabase Auth com aquele email → usa o id existente
//      Se não → cria usuário no Supabase Auth (admin)
//   3. Cria Profile vinculado à clínica com o role do convite
//   4. Marca invite como ACCEPTED
//   5. Retorna dados para o frontend redirecionar ao login/dashboard

export async function POST(request: Request) {
  let createdAuthUserId: string | null = null
  let supabaseAdmin: ReturnType<typeof createAdminClient> | null = null

  try {
    const { token, fullName, password } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'MISSING_TOKEN', message: 'Token de convite não informado.' },
        { status: 400 }
      )
    }

    // 1. Valida o token
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { clinic: { select: { id: true, name: true, slug: true } } },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Convite não encontrado.' },
        { status: 404 }
      )
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'INVITE_ALREADY_USED', message: 'Este convite já foi utilizado ou foi revogado.' },
        { status: 409 }
      )
    }

    if (invite.expires_at < new Date()) {
      await prisma.invite.update({ where: { token }, data: { status: 'EXPIRED' } })
      return NextResponse.json(
        {
          error: 'INVITE_EXPIRED',
          message: 'Este convite expirou. Solicite um novo ao proprietário da clínica.',
        },
        { status: 410 }
      )
    }

    // 2. Inicializa Supabase Admin
    supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verifica se já existe usuário com este email no Supabase Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === invite.email.toLowerCase()
    )

    let userId: string

    if (existingAuthUser) {
      // Usuário já tem conta → apenas vincula à clínica
      userId = existingAuthUser.id

      const existingProfile = await prisma.profile.findUnique({ where: { id: userId } })
      if (existingProfile) {
        return NextResponse.json(
          { error: 'ALREADY_MEMBER', message: 'Este usuário já é membro de uma clínica.' },
          { status: 409 }
        )
      }
    } else {
      // Novo usuário → precisa de nome e senha
      if (!fullName || !password) {
        return NextResponse.json(
          {
            error: 'MISSING_FIELDS',
            message: 'Informe seu nome completo e uma senha para criar sua conta.',
          },
          { status: 400 }
        )
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: 'AUTH_CREATION_FAILED', message: authError?.message ?? 'Falha ao criar conta.' },
          { status: 400 }
        )
      }

      userId = authData.user.id
      createdAuthUserId = userId
    }

    // 3. Cria Profile + marca invite ACCEPTED em transação
    await prisma.$transaction(async (tx) => {
      await tx.profile.create({
        data: {
          id: userId,
          clinic_id: invite.clinic_id,
          full_name: fullName ?? existingAuthUser?.user_metadata?.full_name ?? invite.email,
          role: invite.role,
        },
      })

      await tx.invite.update({
        where: { token },
        data: { status: 'ACCEPTED', accepted_at: new Date() },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Convite aceito com sucesso.',
      clinic: { name: invite.clinic.name, slug: invite.clinic.slug },
    })
  } catch (error: unknown) {
    console.error('Falha ao aceitar convite:', error)

    // Rollback do usuário Auth criado se a transação falhou
    if (createdAuthUserId && supabaseAdmin) {
      await supabaseAdmin.auth.admin
        .deleteUser(createdAuthUserId)
        .catch((e) => console.error('Rollback Auth falhou:', e))
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Ocorreu um erro ao processar o convite.' },
      { status: 500 }
    )
  }
}
