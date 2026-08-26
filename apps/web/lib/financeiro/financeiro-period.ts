// ─────────────────────────────────────────────────────────────────────────────
// lib/financeiro/financeiro-period.ts
// Resolução do período do caixa a partir da querystring.
// ─────────────────────────────────────────────────────────────────────────────

import {
  isValidAppointmentDate,
  shiftAppointmentDate,
  todayAppointmentDate,
} from '@/lib/appointments/appointments-normalizers'

export const FINANCEIRO_BASE_PATH = '/financeiro'

export const PERIOD_PRESETS = ['hoje', '7dias', 'mes'] as const
export type PeriodPreset = (typeof PERIOD_PRESETS)[number]

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  hoje: 'Hoje',
  '7dias': 'Últimos 7 dias',
  mes: 'Este mês',
}

export interface ResolvedPeriod {
  from: string
  to: string
  /** O preset que gerou o período, ou `null` quando as datas vieram à mão. */
  preset: PeriodPreset | null
  label: string
}

function isPreset(value: unknown): value is PeriodPreset {
  return typeof value === 'string' && (PERIOD_PRESETS as readonly string[]).includes(value)
}

/** Primeiro dia do mês de `date`, sem passar por `Date`. */
export function firstDayOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`
}

export function periodFromPreset(preset: PeriodPreset, today: string): ResolvedPeriod {
  switch (preset) {
    case 'hoje':
      return { from: today, to: today, preset, label: PERIOD_PRESET_LABELS.hoje }
    case '7dias':
      // Seis dias atrás mais hoje = sete dias. Usar -7 daria oito.
      return {
        from: shiftAppointmentDate(today, -6),
        to: today,
        preset,
        label: PERIOD_PRESET_LABELS['7dias'],
      }
    case 'mes':
      return {
        from: firstDayOfMonth(today),
        to: today,
        preset,
        label: PERIOD_PRESET_LABELS.mes,
      }
  }
}

export interface PeriodQuery {
  preset?: string
  from?: string
  to?: string
}

/**
 * Decide o período mostrado.
 *
 * Ordem: datas explícitas ganham do preset, preset ganha do default, e default é
 * "hoje" — o caixa é lido no fim do expediente, não no fim do mês.
 *
 * Entrada inválida cai no default em vez de quebrar a página: querystring é
 * digitada, colada e compartilhada, e um caixa que dá erro 500 porque a data
 * veio torta é pior do que um caixa que mostra hoje.
 */
export function resolvePeriod(
  query: PeriodQuery | undefined,
  today: string = todayAppointmentDate()
): ResolvedPeriod {
  const from = query?.from?.trim() ?? ''
  const to = query?.to?.trim() ?? ''

  if (isValidAppointmentDate(from) && isValidAppointmentDate(to)) {
    // Invertido é engano de digitação, não pedido de intervalo vazio: troca em
    // vez de devolver zero lançamentos e deixar a clínica achar que sumiu.
    const [inicio, fim] = from <= to ? [from, to] : [to, from]

    return {
      from: inicio,
      to: fim,
      preset: null,
      label: inicio === fim ? 'Dia selecionado' : 'Período selecionado',
    }
  }

  if (isPreset(query?.preset)) {
    return periodFromPreset(query.preset, today)
  }

  return periodFromPreset('hoje', today)
}

export function buildPeriodHref(preset: PeriodPreset): string {
  return `${FINANCEIRO_BASE_PATH}?preset=${preset}`
}

export function buildCustomPeriodHref(from: string, to: string): string {
  return `${FINANCEIRO_BASE_PATH}?from=${from}&to=${to}`
}
