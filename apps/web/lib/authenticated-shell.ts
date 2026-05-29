import { cache } from 'react'

import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export type AuthenticatedShellData = {
  userId: string
  userEmail: string | null
  profile: {
    full_name: string
    preferred_name: string | null
    role: string
    clinic_id: string
    clinic_name: string
  }
  subscription: {
    plan: string
    status: string
  } | null
}

type ShellDataRow = {
  full_name: string
  preferred_name: string | null
  role: string
  clinic_id: string
  clinic_name: string
  subscription_plan: string | null
  subscription_status: string | null
}

export const getAuthenticatedShellData = cache(async (): Promise<AuthenticatedShellData | null> => {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  const userEmail = typeof data?.claims.email === 'string' ? data.claims.email : null

  if (error || !userId) {
    return null
  }

  const [row] = await prisma.$queryRaw<ShellDataRow[]>`
    SELECT
      p.full_name,
      p.preferred_name,
      p.role::text AS role,
      p.clinic_id,
      c.name AS clinic_name,
      s.plan::text AS subscription_plan,
      s.status::text AS subscription_status
    FROM profiles p
    INNER JOIN clinics c ON c.id = p.clinic_id
    LEFT JOIN subscriptions s ON s.clinic_id = p.clinic_id
    WHERE p.id = ${userId}::uuid
    LIMIT 1
  `

  if (!row) {
    return null
  }

  return {
    userId,
    userEmail,
    profile: {
      full_name: row.full_name,
      preferred_name: row.preferred_name,
      role: row.role,
      clinic_id: row.clinic_id,
      clinic_name: row.clinic_name,
    },
    subscription: row.subscription_plan && row.subscription_status
      ? {
          plan: row.subscription_plan,
          status: row.subscription_status,
        }
      : null,
  }
})

export const getPendingAlertsCountForClinic = cache(async (clinicId: string): Promise<number> => {
  const result = await prisma.alert.count({
    where: {
      status: 'PENDING',
      patient: { clinic_id: clinicId },
    },
  })

  return result
})
