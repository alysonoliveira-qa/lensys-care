// ─────────────────────────────────────────────────────────────────────────────
// lib/financeiro/financeiro-mappers.ts
// Persistido → linha de UI.
// ─────────────────────────────────────────────────────────────────────────────

import { formatAppointmentDate } from '@/lib/appointments/appointments-normalizers'

import {
  FINANCIAL_ENTRY_TYPE_CONFIG,
  PAYMENT_METHOD_LABELS,
  type FinancialEntryType,
  type PaymentMethod,
} from './financeiro-config'
import { formatCurrency } from './financeiro-normalizers'

export interface FinancialEntryRecord {
  id: string
  type: FinancialEntryType
  amount_cents: number
  description: string
  payment_method: PaymentMethod
  entry_date: Date
  created_at: Date
  patient: { id: string; full_name: string } | null
  referrer: { id: string; name: string } | null
}

export interface FinancialEntryRow {
  id: string
  type: FinancialEntryType
  typeLabel: string
  /** Já com sinal e "R$": `+ R$ 150,00`. */
  amountLabel: string
  amountClassName: string
  badgeClassName: string
  description: string
  paymentMethodLabel: string
  /** `YYYY-MM-DD`, para ordenação e para o `<input type="date">`. */
  entryDate: string
  /** `26/08/2026`, para leitura. */
  entryDateLabel: string
  linkedName: string | null
  linkedHref: string | null
}

/** `YYYY-MM-DD` → `DD/MM/YYYY`, sem passar por `Date` de novo. */
export function toBrazilianDate(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-')

  return `${dia}/${mes}/${ano}`
}

export function mapEntryToRow(record: FinancialEntryRecord): FinancialEntryRow {
  const config = FINANCIAL_ENTRY_TYPE_CONFIG[record.type]

  // `formatAppointmentDate` usa getters UTC. Sem isso, um lançamento de 26/08
  // aparece como 25/08 em UTC-3, e o fechamento do dia fica errado por um dia
  // inteiro — a mesma armadilha da agenda, pelo mesmo motivo.
  const entryDate = formatAppointmentDate(record.entry_date)

  return {
    id: record.id,
    type: record.type,
    typeLabel: config.label,
    amountLabel: `${config.sign} ${formatCurrency(record.amount_cents)}`,
    amountClassName: config.amountClassName,
    badgeClassName: config.badgeClassName,
    description: record.description,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[record.payment_method],
    entryDate,
    entryDateLabel: toBrazilianDate(entryDate),
    linkedName: record.patient?.full_name ?? record.referrer?.name ?? null,
    // Só paciente tem página própria; indicante vive na aba de pacientes.
    linkedHref: record.patient ? `/patients/${record.patient.id}` : null,
  }
}

export function mapEntriesToRows(records: FinancialEntryRecord[]): FinancialEntryRow[] {
  return records.map(mapEntryToRow)
}
