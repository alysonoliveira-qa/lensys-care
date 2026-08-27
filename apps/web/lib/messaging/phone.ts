// ─────────────────────────────────────────────────────────────────────────────
// lib/messaging/phone.ts
// Normalização de telefone para os provedores de mensagem.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dígitos com código do país, sem `+`, sem espaço e sem pontuação.
 *
 * `(11) 99999-0000` vira `5511999990000`. O cadastro da clínica não tem formato
 * garantido — veio de digitação livre —, então a normalização acontece na borda
 * do envio e não na leitura.
 *
 * Meta e Z-API querem exatamente o mesmo formato, e as duas implementações eram
 * idênticas. Uma cópia só: duas versões da mesma regra é como uma delas deixa de
 * receber a correção que a outra recebeu.
 */
export function normalizePhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Já veio com o código do país: 55 + DDD (2) + número (8 ou 9).
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits
  }

  return `55${digits}`
}
