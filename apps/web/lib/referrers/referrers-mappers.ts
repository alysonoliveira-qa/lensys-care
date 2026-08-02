/** Linha persistida de indicante (shape do `select` de `referrers-data`). */
export interface ReferrerRecord {
  id: string
  name: string
  pix_key: string | null
  whatsapp: string | null
  active: boolean
}

/** Indicante com a contagem de indicações pendentes (`_count` filtrado). */
export interface ReferrerWithPendingRecord extends ReferrerRecord {
  _count: { appointments: number }
}

export interface ReferrerRow {
  id: string
  name: string
  pixKey: string | null
  whatsapp: string | null
  active: boolean
  pendingCount: number
  /** Só com pendentes o fluxo Pagar → Marcar pago aparece. */
  hasPendingReferrals: boolean
  /** Sem chave PIX ainda dá para marcar pago; só não há o que copiar. */
  hasPixKey: boolean
  pendingLabel: string
}

export interface ReferrerOption {
  value: string
  label: string
}

export const REFERRER_NONE_OPTION: ReferrerOption = {
  value: '',
  label: '— sem indicante —',
}

function byNamePtBr(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, 'pt-BR')
}

export function pendingReferralsLabel(pendingCount: number): string {
  if (pendingCount === 0) return 'Nenhuma indicação pendente'
  if (pendingCount === 1) return '1 indicação pendente'

  return `${pendingCount} indicações pendentes`
}

export function mapReferrerToRow(record: ReferrerWithPendingRecord): ReferrerRow {
  const pendingCount = record._count.appointments

  return {
    id: record.id,
    name: record.name,
    pixKey: record.pix_key,
    whatsapp: record.whatsapp,
    active: record.active,
    pendingCount,
    hasPendingReferrals: pendingCount > 0,
    hasPixKey: Boolean(record.pix_key),
    pendingLabel: pendingReferralsLabel(pendingCount),
  }
}

export function mapReferrersToRows(records: ReferrerWithPendingRecord[]): ReferrerRow[] {
  return [...records].sort(byNamePtBr).map(mapReferrerToRow)
}

/** Opções do dropdown da consulta — "sem indicante" primeiro, é o default. */
export function mapReferrersToOptions(
  records: Array<{ id: string; name: string }>
): ReferrerOption[] {
  return [
    REFERRER_NONE_OPTION,
    ...[...records].sort(byNamePtBr).map((record) => ({ value: record.id, label: record.name })),
  ]
}
