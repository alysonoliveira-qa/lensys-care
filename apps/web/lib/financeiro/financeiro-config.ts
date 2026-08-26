// ─────────────────────────────────────────────────────────────────────────────
// lib/financeiro/financeiro-config.ts
// Rótulos e opções do caixa, data-driven.
// ─────────────────────────────────────────────────────────────────────────────

export const FINANCIAL_ENTRY_TYPE_VALUES = ['INCOME', 'EXPENSE'] as const
export type FinancialEntryType = (typeof FINANCIAL_ENTRY_TYPE_VALUES)[number]

export const PAYMENT_METHOD_VALUES = [
  'CASH',
  'PIX',
  'DEBIT',
  'CREDIT',
  'TRANSFER',
  'OTHER',
] as const
export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number]

export interface FinancialEntryTypeConfig {
  label: string
  /** Rótulo do valor na lista, com o sinal que a linha mostra. */
  sign: '+' | '−'
  /** Classe do valor. Verde/vermelho aqui é semântica de caixa, não decoração. */
  amountClassName: string
  badgeClassName: string
}

export const FINANCIAL_ENTRY_TYPE_CONFIG: Record<
  FinancialEntryType,
  FinancialEntryTypeConfig
> = {
  INCOME: {
    label: 'Entrada',
    sign: '+',
    amountClassName: 'text-emerald-600 dark:text-emerald-400',
    badgeClassName:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  EXPENSE: {
    label: 'Saída',
    sign: '−',
    amountClassName: 'text-rose-600 dark:text-rose-400',
    badgeClassName: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferência',
  OTHER: 'Outro',
}

export const PAYMENT_METHOD_OPTIONS = PAYMENT_METHOD_VALUES.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}))

export const FINANCIAL_ENTRY_TYPE_OPTIONS = FINANCIAL_ENTRY_TYPE_VALUES.map((value) => ({
  value,
  label: FINANCIAL_ENTRY_TYPE_CONFIG[value].label,
}))

export function isFinancialEntryType(value: unknown): value is FinancialEntryType {
  return (
    typeof value === 'string' &&
    (FINANCIAL_ENTRY_TYPE_VALUES as readonly string[]).includes(value)
  )
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHOD_VALUES as readonly string[]).includes(value)
}

/**
 * Descrição do lançamento gerado ao pagar um indicante.
 *
 * Centralizada porque o texto é o que a clínica lê no fechamento do mês para
 * entender de onde saiu o dinheiro — e porque é assim que esses lançamentos se
 * reconhecem depois, já que `referrer_id` sozinho não diz que foi gratificação.
 */
export function buildReferralPaymentDescription(
  referrerName: string,
  indicacoes: number
): string {
  const plural = indicacoes === 1 ? 'indicação' : 'indicações'

  return `Gratificação de ${referrerName} — ${indicacoes} ${plural}`
}
