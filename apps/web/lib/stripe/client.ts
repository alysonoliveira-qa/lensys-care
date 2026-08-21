// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/client.ts
// Stripe Node SDK singleton (instanciação preguiçosa).
//
// A instanciação é lazy e falha alto: chave ausente vira erro explícito na
// primeira chamada, nunca um cliente silenciosamente inválido apontando para
// uma chave placeholder. Ser lazy mantém `next build` funcionando em ambientes
// de build que não carregam segredos.
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from 'stripe'

export const STRIPE_API_VERSION = '2026-04-22.dahlia' as const

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached

  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY não está definida. Configure-a no ambiente antes de usar o Stripe.'
    )
  }

  cached = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  })

  return cached
}
