import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'

const Plan = {
  ESSENTIAL: 'ESSENTIAL',
} as const

const SubscriptionStatus = {
  TRIALING: 'TRIALING',
} as const

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, clinicName, ownerName, phone } = body

    if (!email || !password || !clinicName || !ownerName) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Preencha todos os campos obrigatórios.' },
        { status: 400 }
      )
    }

    // 1. Generate unique clinic slug from clinicName
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

    // 2. Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 3. Create auth user in Supabase (automatically confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: ownerName },
    })

    if (authError || !authData.user) {
      console.error('Supabase Auth error during registration:', authError)
      return NextResponse.json(
        { error: 'AUTH_CREATION_FAILED', message: authError?.message || 'Falha ao criar credenciais.' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // 4. Create Clinic, Profile and Subscription in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: clinicName,
          slug,
          email,
          phone,
        },
      })

      const profile = await tx.profile.create({
        data: {
          id: userId,
          clinic_id: clinic.id,
          full_name: ownerName,
          role: 'OWNER',
        },
      })

      const subscription = await tx.subscription.create({
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
        id: userId,
        email: authData.user.email,
      },
      clinic: {
        id: result.clinic.id,
        name: result.clinic.name,
        slug: result.clinic.slug,
      },
    })
  } catch (error: unknown) {
    console.error('Registration transaction failed:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Ocorreu um erro interno ao processar seu cadastro.' },
      { status: 500 }
    )
  }
}
