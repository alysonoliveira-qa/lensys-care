// ─────────────────────────────────────────────────────────────────────────────
// lib/patients/patient-dob.ts
// Interpretação de data de nascimento vinda do formulário (string `YYYY-MM-DD`).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte `YYYY-MM-DD` no instante que representa aquela data de calendário
 * numa coluna `DATE` do Postgres: meia-noite **UTC**.
 *
 * O código anterior fazia `new Date(dob)` seguido de `setHours(0, 0, 0, 0)`.
 * `new Date('1990-04-12')` já nasce em meia-noite UTC, e o `setHours` então
 * arrasta para a meia-noite **local** — que em qualquer fuso negativo é o dia
 * anterior. Em produção não quebrava porque as funções da Vercel rodam em UTC e
 * o `setHours` virava no-op; ou seja, o resultado certo dependia de uma variável
 * de ambiente do servidor. Em UTC-3 (`pnpm dev` no Brasil, ou o dia em que
 * alguém mudar a região de execução) gravava o dia errado e a trava de data
 * futura parava de travar.
 *
 * Devolve `null` para entrada que não é data — quem chama decide o erro.
 */
export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const [, ano, mes, dia] = match
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)))

  // Rejeita data que não existe: `Date.UTC(2026, 1, 31)` vira 3 de março em
  // silêncio, e um 31 de fevereiro digitado não pode virar cadastro válido.
  if (
    data.getUTCFullYear() !== Number(ano) ||
    data.getUTCMonth() !== Number(mes) - 1 ||
    data.getUTCDate() !== Number(dia)
  ) {
    return null
  }

  return data
}

/**
 * `true` quando a data de calendário é posterior a hoje.
 *
 * O "hoje" também é medido em UTC, para comparar calendário com calendário. Usar
 * o hoje local aqui reabriria a mesma porta pelo outro lado.
 */
export function isFutureDateOnly(data: Date, agora: Date = new Date()): boolean {
  const hojeUtc = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())

  return data.getTime() > hojeUtc
}
