// ─────────────────────────────────────────────────────────────────────────────
// lib/financeiro/financeiro-normalizers.ts
// Funções puras do caixa: dinheiro entra como texto digitado e sai como inteiro.
// ─────────────────────────────────────────────────────────────────────────────

import { isValidAppointmentDate } from '@/lib/appointments/appointments-normalizers'

import {
  isFinancialEntryType,
  isPaymentMethod,
  type FinancialEntryType,
  type PaymentMethod,
} from './financeiro-config'

/** Teto por lançamento (R$ 1.000.000,00). Acima disso é dígito a mais, não venda. */
export const MAX_AMOUNT_CENTS = 100_000_000

export const MAX_DESCRIPTION_LENGTH = 200

/**
 * Converte valor digitado em centavos.
 *
 * O caixa é preenchido por recepção, com pressa, e o mesmo valor chega de
 * quatro jeitos: `150`, `150,00`, `1.234,56`, `1234.56`. Tratar tudo como
 * `Number(texto)` erra em dois deles — `Number('1.234,56')` é `NaN` e
 * `Number('1.234')` é **1,234**, ou seja, um valor de mil e duzentos vira um
 * real e vinte e três centavos, silenciosamente.
 *
 * A regra: o **último** separador manda. Se for vírgula, o que vem depois é
 * centavo e todo ponto antes é milhar. Se for ponto e sobrarem exatamente uma
 * ou duas casas, é centavo decimal. Ponto com três casas e nenhuma vírgula é
 * milhar (`1.234` = mil duzentos e trinta e quatro), que é como brasileiro
 * escreve.
 *
 * @returns centavos, ou `null` se não der para ler um valor positivo
 */
export function parseAmountToCents(input: string): number | null {
  const texto = input.trim()

  if (texto === '') return null

  // Aceita "R$", espaço fino e espaço normal: colar de outro sistema traz junto.
  const limpo = texto.replace(/^R\$/i, '').replace(/[\s  ]/g, '')

  if (limpo === '' || !/^\d[\d.,]*$/.test(limpo)) return null

  const ultimaVirgula = limpo.lastIndexOf(',')
  const ultimoPonto = limpo.lastIndexOf('.')
  const separador = Math.max(ultimaVirgula, ultimoPonto)

  let inteiros: string
  let centavos: string

  if (separador === -1) {
    inteiros = limpo
    centavos = '00'
  } else {
    const depois = limpo.slice(separador + 1)
    const ehDecimal = ultimaVirgula > ultimoPonto || depois.length === 1 || depois.length === 2

    if (ehDecimal) {
      // Vírgula decimal aceita 1 ou 2 casas; mais que isso é digitação errada,
      // e arredondar por conta própria seria inventar o valor de outra pessoa.
      if (depois.length === 0 || depois.length > 2) return null

      inteiros = limpo.slice(0, separador)
      centavos = depois.padEnd(2, '0')
    } else {
      // Separador de milhar: some, mas só se agrupar de três em três.
      if (depois.length !== 3) return null

      inteiros = limpo.slice(0, separador) + depois
      centavos = '00'
    }
  }

  // Sobrou separador nos inteiros? Só pode ser milhar, e tem que estar certinho.
  const inteirosLimpos = inteiros.replace(/\./g, '').replace(/,/g, '')

  if (!/^\d*$/.test(inteirosLimpos)) return null
  if (inteiros.includes(',') && inteiros.includes('.')) return null

  const grupos = inteiros.split(/[.,]/)
  if (grupos.length > 1 && grupos.slice(1).some((g) => g.length !== 3)) return null

  const total = Number(inteirosLimpos || '0') * 100 + Number(centavos)

  if (!Number.isSafeInteger(total) || total <= 0 || total > MAX_AMOUNT_CENTS) return null

  return total
}

/** Centavos → `1.234,56` (sem o "R$", que quem exibe decide se põe). */
export function formatCents(cents: number): string {
  const negativo = cents < 0
  const absoluto = Math.abs(Math.trunc(cents))

  const inteiros = Math.floor(absoluto / 100)
  const centavos = String(absoluto % 100).padStart(2, '0')
  const comMilhar = inteiros.toLocaleString('pt-BR')

  return `${negativo ? '-' : ''}${comMilhar},${centavos}`
}

/** Centavos → `R$ 1.234,56`. */
export function formatCurrency(cents: number): string {
  return `R$ ${formatCents(cents)}`
}

export interface FinancialEntryInput {
  type: string
  amount: string
  description: string
  paymentMethod: string
  entryDate: string
  patientId?: string | null
  referrerId?: string | null
}

export interface FinancialEntryInputErrors {
  type?: string
  amount?: string
  description?: string
  paymentMethod?: string
  entryDate?: string
}

export interface NormalizedFinancialEntry {
  type: FinancialEntryType
  amountCents: number
  description: string
  paymentMethod: PaymentMethod
  entryDate: string
  patientId: string | null
  referrerId: string | null
}

export type FinancialEntryInputResult =
  | { ok: true; value: NormalizedFinancialEntry }
  | { ok: false; errors: FinancialEntryInputErrors }

/**
 * Valida e normaliza o formulário de lançamento.
 *
 * Puro de propósito: a server action valida o tenant, este módulo valida o
 * conteúdo. Nenhum dos dois faz o trabalho do outro.
 */
export function validateFinancialEntryInput(
  input: FinancialEntryInput
): FinancialEntryInputResult {
  const errors: FinancialEntryInputErrors = {}

  if (!isFinancialEntryType(input.type)) {
    errors.type = 'Escolha entrada ou saída.'
  }

  if (!isPaymentMethod(input.paymentMethod)) {
    errors.paymentMethod = 'Forma de pagamento inválida.'
  }

  const amountCents = parseAmountToCents(input.amount ?? '')

  if (amountCents === null) {
    errors.amount = 'Informe um valor válido, maior que zero.'
  }

  const description = (input.description ?? '').trim().replace(/\s+/g, ' ')

  if (description === '') {
    errors.description = 'Descreva o lançamento.'
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`
  }

  if (!isValidAppointmentDate(input.entryDate ?? '')) {
    errors.entryDate = 'Informe uma data válida.'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      type: input.type as FinancialEntryType,
      amountCents: amountCents as number,
      description,
      paymentMethod: input.paymentMethod as PaymentMethod,
      entryDate: input.entryDate,
      patientId: emptyToNull(input.patientId),
      referrerId: emptyToNull(input.referrerId),
    },
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  const texto = (value ?? '').trim()
  return texto === '' ? null : texto
}

export interface CashSummary {
  incomeCents: number
  expenseCents: number
  balanceCents: number
  entryCount: number
}

export interface SummarizableEntry {
  type: FinancialEntryType
  amount_cents: number
}

/**
 * Soma o caixa. O saldo é `entradas - saídas`, e **pode ser negativo** — dia de
 * pagar indicante sem atendimento fecha no vermelho, e esconder isso seria
 * mentir no único número que a clínica olha.
 */
export function summarizeEntries(entries: SummarizableEntry[]): CashSummary {
  let incomeCents = 0
  let expenseCents = 0

  for (const entry of entries) {
    if (entry.type === 'INCOME') {
      incomeCents += entry.amount_cents
    } else {
      expenseCents += entry.amount_cents
    }
  }

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    entryCount: entries.length,
  }
}
