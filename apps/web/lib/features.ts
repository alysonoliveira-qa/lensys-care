import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { hasPlanFeatureAccess, type PlanFeature } from '@/lib/plans/plan-feature-config'

export type Feature = PlanFeature

export interface FeatureCheckResult {
  available: boolean
  plan: string
  status: string
  upgradeUrl: string
}

/**
 * Checks whether a clinic has access to a specific feature based on its plan.
 *
 * - ESSENTIAL plan: no gated feature — o alerta existe, mas o envio é manual
 * - CONECTA plan: recall automático, WhatsApp e SMS
 * - PROFESSIONAL plan: o do Conecta mais envio em massa
 * - Missing subscription row: defaults to ESSENTIAL (no gated features)
 *
 * @param clinicId - The clinic UUID to check
 * @param feature  - The feature key to check
 * @returns Promise<boolean> — true if the feature is available
 */
export async function hasFeature(clinicId: string, feature: Feature): Promise<boolean> {
  const result = await getFeatureResult(clinicId)
  return result.available && hasPlanFeatureAccess(result.plan, result.status, feature)
}

/**
 * Returns the full feature availability result for a clinic.
 *
 * A memoização é o `cache()` do React, que dura **uma requisição**. Antes era um
 * `Map` em escopo de módulo dizendo ser "per-request": em serverless a instância
 * é reaproveitada entre requisições, então o `Map` sobrevivia e a clínica que
 * acabara de trocar de plano continuava vendo o plano antigo enquanto aquela
 * instância estivesse quente — e não havia invalidação, porque `clearFeatureCache`
 * nunca era chamada em lugar nenhum.
 */
export const getFeatureResult = cache(async (clinicId: string): Promise<FeatureCheckResult> => {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('clinic_id', clinicId)
    .single()

  return {
    available: true,
    plan: subscription?.plan ?? 'ESSENTIAL',
    status: subscription?.status ?? 'ACTIVE',
    upgradeUrl: '/subscription',
  }
})

/**
 * Server-side feature check that throws a structured 403 error response
 * if the clinic doesn't have access to the requested feature.
 * Use in API route handlers.
 *
 * @example
 * await requireFeature(clinicId, 'whatsapp') // throws Response if not on Conecta
 */
export async function requireFeature(clinicId: string, feature: Feature): Promise<void> {
  const available = await hasFeature(clinicId, feature)
  if (!available) {
    throw new Response(
      JSON.stringify({
        error: 'FEATURE_NOT_AVAILABLE',
        feature,
        upgrade_url: '/subscription',
        message: 'Este recurso está disponível apenas no plano Conecta.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Checks feature access using the Supabase service role (bypasses RLS).
 * Use only in webhook handlers and server-to-server contexts.
 */
export async function hasFeatureAsService(clinicId: string, feature: Feature): Promise<boolean> {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('clinic_id', clinicId)
    .single()

  if (!subscription) return false

  return hasPlanFeatureAccess(subscription.plan, subscription.status, feature)
}
