// ─────────────────────────────────────────────────────────────────────────────
// lib/features.ts
// Feature flag system for plan-based access control.
// Determines which features are available to a clinic based on its subscription.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type Feature = 'whatsapp' | 'sms' | 'bulk_send'

// Features gated to the CONECTA plan
const CONECTA_FEATURES: Feature[] = ['whatsapp', 'sms', 'bulk_send']

export interface FeatureCheckResult {
  available: boolean
  plan: string
  status: string
  upgradeUrl: string
}

// Per-request cache (Map lives for the duration of one server request)
// Avoids N+1 DB queries when hasFeature() is called multiple times in one route
const featureCache = new Map<string, FeatureCheckResult>()

/**
 * Clears the per-request feature cache.
 * Call this at the start of long-running processes (e.g., webhooks) if needed.
 */
export function clearFeatureCache(): void {
  featureCache.clear()
}

/**
 * Checks whether a clinic has access to a specific feature based on its plan.
 *
 * - ESSENTIAL plan: only email alerts available
 * - CONECTA plan: all features including WhatsApp, SMS, bulk send
 * - Missing subscription row: defaults to ESSENTIAL (no gated features)
 *
 * @param clinicId - The clinic UUID to check
 * @param feature  - The feature key to check
 * @returns Promise<boolean> — true if the feature is available
 */
export async function hasFeature(clinicId: string, feature: Feature): Promise<boolean> {
  const result = await getFeatureResult(clinicId)
  return result.available && CONECTA_FEATURES.includes(feature)
    ? result.plan === 'CONECTA' && (result.status === 'ACTIVE' || result.status === 'TRIALING')
    : !CONECTA_FEATURES.includes(feature)
}

/**
 * Returns the full feature availability result for a clinic.
 * Results are cached for the duration of the current request.
 */
export async function getFeatureResult(clinicId: string): Promise<FeatureCheckResult> {
  const cached = featureCache.get(clinicId)
  if (cached) return cached

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('clinic_id', clinicId)
    .single()

  const result: FeatureCheckResult = {
    available: true,
    plan: subscription?.plan ?? 'ESSENTIAL',
    status: subscription?.status ?? 'ACTIVE',
    upgradeUrl: '/dashboard/planos',
  }

  featureCache.set(clinicId, result)
  return result
}

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
        upgrade_url: '/dashboard/planos',
        message: `Este recurso está disponível apenas no plano Conecta.`,
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
  if (!CONECTA_FEATURES.includes(feature)) return true

  return (
    subscription.plan === 'CONECTA' &&
    (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING')
  )
}
