// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/stripe-normalizers.ts
// Funções puras que leem os payloads do Stripe. Sem side effects.
//
// Motivo de existirem: os payloads do Stripe mudaram de formato entre versões
// da API. `current_period_end` migrou de Subscription para SubscriptionItem, e
// a subscription de uma Invoice passou a viver em `parent.subscription_details`.
// Ler os dois formatos aqui, num só lugar testável, evita que uma diferença de
// versão derrube o webhook silenciosamente.
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionStatusValue = 'ACTIVE' | 'TRIALING' | 'CANCELED' | 'PAST_DUE'

export interface StripeSubscriptionLike {
  id: string
  status?: string | null
  cancel_at_period_end?: boolean | null
  trial_end?: number | null
  current_period_end?: number | null
  items?: {
    data?: Array<{
      current_period_end?: number | null
      price?: { id?: string | null } | null
    } | null> | null
  } | null
}

export interface StripeInvoiceLike {
  id?: string | null
  customer?: string | { id?: string | null } | null
  payment_intent?: string | { id?: string | null } | null
  subscription?: string | { id?: string | null } | null
  parent?: {
    subscription_details?: {
      subscription?: string | { id?: string | null } | null
    } | null
  } | null
  lines?: {
    data?: Array<{ price?: { id?: string | null } | null } | null> | null
  } | null
}

/** Converte segundos-unix do Stripe em Date. Devolve null para valor ausente ou inválido. */
export function toDate(unixSeconds: number | null | undefined): Date | null {
  if (typeof unixSeconds !== 'number' || !Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return null
  }

  const date = new Date(unixSeconds * 1000)

  return Number.isNaN(date.getTime()) ? null : date
}

/** Aceita tanto `"cus_123"` quanto `{ id: "cus_123" }` — o Stripe usa os dois conforme o expand. */
export function readId(value: string | { id?: string | null } | null | undefined): string | null {
  if (typeof value === 'string') return value || null
  if (value && typeof value === 'object' && typeof value.id === 'string') return value.id || null
  return null
}

/** Fim do período atual, lendo do item (API nova) e caindo para a subscription (API antiga). */
export function readPeriodEnd(subscription: StripeSubscriptionLike): Date | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end

  return toDate(fromItem) ?? toDate(subscription.current_period_end)
}

/** Price ID do primeiro item da assinatura. */
export function readSubscriptionPriceId(subscription: StripeSubscriptionLike): string | null {
  const priceId = subscription.items?.data?.[0]?.price?.id

  return typeof priceId === 'string' && priceId ? priceId : null
}

/** Subscription vinculada a uma invoice, nos dois formatos de payload. */
export function readInvoiceSubscriptionId(invoice: StripeInvoiceLike): string | null {
  return readId(invoice.subscription) ?? readId(invoice.parent?.subscription_details?.subscription)
}

/** Price ID cobrado numa invoice (primeira linha). */
export function readInvoicePriceId(invoice: StripeInvoiceLike): string | null {
  const priceId = invoice.lines?.data?.[0]?.price?.id

  return typeof priceId === 'string' && priceId ? priceId : null
}

/** Traduz o status do Stripe para o enum interno. */
export function mapStripeStatus(stripeStatus: string | null | undefined): SubscriptionStatusValue {
  switch (stripeStatus) {
    case 'active':
      return 'ACTIVE'
    case 'trialing':
      return 'TRIALING'
    case 'canceled':
      return 'CANCELED'
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'PAST_DUE'
    default:
      return 'PAST_DUE'
  }
}
