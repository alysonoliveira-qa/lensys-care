// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe/stripe-app-metadata.ts
// Carimbo que identifica os objetos deste app dentro de uma conta Stripe
// compartilhada com outros produtos.
//
// A conta da ALNA CORE hospeda mais de um produto (Lensys, Optoox, e outros a
// caminho). Uma conta Stripe tem UM fluxo de eventos: todo endpoint recebe os
// eventos de todos os produtos. Sem um carimbo, cada webhook precisa deduzir a
// quem o evento pertence — e erra para o lado do barulho, logando erro sobre
// coisas que nunca foram dele.
// ─────────────────────────────────────────────────────────────────────────────

export const STRIPE_APP_NAMESPACE = 'lensys'

/** Chave usada no `metadata` de todo objeto Stripe criado por este app. */
export const STRIPE_APP_METADATA_KEY = 'app'

/** Metadata a mesclar em toda criação de objeto no Stripe. */
export const STRIPE_APP_METADATA: Readonly<Record<string, string>> = {
  [STRIPE_APP_METADATA_KEY]: STRIPE_APP_NAMESPACE,
}

/**
 * - `this-app`: carimbado como nosso.
 * - `other-app`: carimbado como de outro produto — pode ser descartado.
 * - `unmarked`: sem carimbo.
 *
 * `unmarked` existe porque objetos criados antes deste carimbo não têm a chave,
 * e descartá-los seria pior que o barulho que estamos resolvendo: assinatura
 * antiga pararia de sincronizar sem nenhum sinal. Só `other-app` é descartado.
 */
export type AppOwnership = 'this-app' | 'other-app' | 'unmarked'

export function classifyAppTag(tag: string | null | undefined): AppOwnership {
  if (typeof tag !== 'string' || tag.length === 0) return 'unmarked'

  return tag === STRIPE_APP_NAMESPACE ? 'this-app' : 'other-app'
}
