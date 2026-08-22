// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/billing-portal.ts
// Criação da sessão do portal de cobrança do Stripe.
//
// Existe como módulo próprio porque dois pontos abrem o portal — a server action
// dos planos e a rota /api/stripe/portal — e eles divergiram: um voltava para o
// painel, o outro para a página pública de planos. Com a configuração e a URL de
// retorno em um lugar só, os dois entram na mesma tela.
// ─────────────────────────────────────────────────────────────────────────────

import { getStripe } from './client'

/** Rota do painel para onde o cliente volta ao sair do portal. */
export const BILLING_PORTAL_RETURN_PATH = '/subscription'

/**
 * URL do portal de cobrança para o customer.
 *
 * `STRIPE_PORTAL_CONFIGURATION_ID` é opcional de propósito: quando ausente, o
 * Stripe usa a configuração padrão da conta. Isso importa porque a conta é
 * compartilhada com outro produto — sem essa variável, o cliente do Lensys vê o
 * cabeçalho e a URL de retorno do outro produto. Em produção ela deve apontar
 * para a configuração do Lensys.
 */
export async function createBillingPortalUrl(
  customerId: string,
  appUrl: string
): Promise<string> {
  const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}${BILLING_PORTAL_RETURN_PATH}`,
    ...(configuration ? { configuration } : {}),
  })

  return session.url
}
