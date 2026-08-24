// ─────────────────────────────────────────────────────────────────────────────
// lib/alerts/alert-relations.ts
// Normalização das relações embutidas que o PostgREST devolve.
// ─────────────────────────────────────────────────────────────────────────────

export interface AlertPatientRelation {
  full_name: string
  email: string | null
  phone: string | null
  clinic_id: string
}

/**
 * Normaliza o embed de relação **to-one** do PostgREST.
 *
 * `alerts.patient_id` aponta para um único paciente, e nesse caso o PostgREST
 * devolve `patients` como **objeto**, não como array. O código lia
 * `patients[0]`, que é sempre `undefined` — o alerta era descartado antes de
 * qualquer tentativa de envio, tanto no disparo automático quanto no reenvio
 * manual (que respondia 404 PATIENT_NOT_FOUND). Nenhum dos dois jamais entregou
 * um lembrete.
 *
 * Aceita as duas formas de propósito: o formato depende da versão do PostgREST
 * e de como a relação é inferida, e um upgrade do Supabase não deveria voltar a
 * quebrar o recall em silêncio.
 */
export function toSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) return null

  return Array.isArray(relation) ? (relation[0] ?? null) : relation
}
