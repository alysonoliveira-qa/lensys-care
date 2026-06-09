import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { createClient as createServerClient } from '@/lib/supabase/server'

const Plan = {
  ESSENTIAL: 'ESSENTIAL',
} as const

const SubscriptionStatus = {
  TRIALING: 'TRIALING',
} as const

type RegisterTransactionClient = {
  clinic: {
    create: (args: {
      data: {
        name: string
        slug: string
        email: string
        phone?: string
      }
    }) => Promise<{
      id: string
      name: string
      slug: string
    }>
  }
  profile: {
    create: (args: {
      data: {
        id: string
        clinic_id: string
        full_name: string
        role: 'OWNER'
      }
    }) => Promise<{
      id: string
      clinic_id: string
      full_name: string
      role: 'OWNER'
    }>
  }
  subscription: {
    create: (args: {
      data: {
        clinic_id: string
        plan: typeof Plan[keyof typeof Plan]
        status: typeof SubscriptionStatus[keyof typeof SubscriptionStatus]
        trial_ends_at: Date
      }
    }) => Promise<{
      id: string
      clinic_id: string
    }>
  }
}

export async function POST(request: Request) {
  let createdAuthUserId: string | null = null
  let supabaseAdmin: ReturnType<typeof createAdminClient> | null = null

  try {
    const body = await request.json()
    const { email, password, clinicName, ownerName, preferredName, phone } = body

    if (!email || !password || !clinicName || !ownerName) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Preencha todos os campos obrigatórios.' },
        { status: 400 }
      )
    }

    // 1. Reuse an authenticated, unprovisioned user to recover incomplete registrations.
    const supabase = createServerClient()
    const { data: { user: signedInUser } } = await supabase.auth.getUser()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPreferredName =
      typeof preferredName === 'string' && preferredName.trim().length > 0
        ? preferredName.trim()
        : null

    if (signedInUser?.email && signedInUser.email.toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { error: 'SIGNED_IN_AS_ANOTHER_USER', message: 'Saia da conta atual antes de cadastrar outro e-mail.' },
        { status: 409 }
      )
    }

    // 2. Generate unique clinic slug from clinicName
    let slug = clinicName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with hyphen
      .replace(/(^-|-$)+/g, '') // remove trailing hyphens

    // Ensure uniqueness of slug
    const existingClinic = await prisma.clinic.findUnique({ where: { slug } })
    if (existingClinic) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
    }

    // 3. Initialize Supabase Admin client
    supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    let userId = signedInUser?.id

    if (!userId) {
      // 4. Create a confirmed Auth user when this is a new registration.
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: ownerName,
          preferred_name: normalizedPreferredName,
        },
      })

      if (authError || !authData.user) {
        console.error('Supabase Auth error during registration:', authError)
        return NextResponse.json(
          {
            error: 'AUTH_CREATION_FAILED',
            message: authError?.message || 'Falha ao criar credenciais. Se você já possui conta, faça login para concluir o cadastro.',
          },
          { status: 400 }
        )
      }

      userId = authData.user.id
      createdAuthUserId = userId
    } else {
      const existingProfile = await prisma.profile.findUnique({ where: { id: userId } })

      if (existingProfile) {
        return NextResponse.json(
          { error: 'PROFILE_ALREADY_EXISTS', message: 'Esta conta já possui uma clínica cadastrada.' },
          { status: 409 }
        )
      }
    }

    const userIdToProvision = userId

    // 5. Create Clinic, Profile and Subscription in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const txClient = tx as unknown as RegisterTransactionClient

      const clinic = await txClient.clinic.create({
        data: {
          name: clinicName,
          slug,
          email,
          phone,
        },
      })

      const profile = await txClient.profile.create({
        data: {
          id: userIdToProvision,
          clinic_id: clinic.id,
          full_name: ownerName,
          role: 'OWNER',
        },
      })

      await tx.$executeRaw`
        UPDATE profiles
        SET preferred_name = ${normalizedPreferredName}
        WHERE id = ${profile.id}::uuid
      `

      // Record the clinic owner now that the OWNER profile exists.
      await tx.$executeRaw`
        UPDATE clinics
        SET owner_id = ${profile.id}::uuid
        WHERE id = ${clinic.id}::uuid
      `

      const subscription = await txClient.subscription.create({
        data: {
          clinic_id: clinic.id,
          plan: Plan.ESSENTIAL,
          status: SubscriptionStatus.TRIALING,
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day trial for Conecta, but starts Essential by default
        },
      })

      return { clinic, profile, subscription }
    })

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso.',
      user: {
        id: userIdToProvision,
        email: normalizedEmail,
      },
      clinic: {
        id: result.clinic.id,
        name: result.clinic.name,
        slug: result.clinic.slug,
      },
    })
  } catch (error: unknown) {
    console.error('Registration transaction failed:', error)

    if (createdAuthUserId && supabaseAdmin) {
      const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
      if (rollbackError) {
        console.error('Failed to roll back Auth user after registration error:', rollbackError)
      }
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Ocorreu um erro interno ao processar seu cadastro.' },
      { status: 500 }
    )
  }
}
