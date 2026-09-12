// ─────────────────────────────────────────────────────────────────────────────
// lib/exams/refraction-stepper.ts
// Lógica pura dos campos numéricos de refração: passo, limite e arrasto.
// Sem React — é o que permite testar o comportamento sem montar o formulário.
// ─────────────────────────────────────────────────────────────────────────────

import { REFRACTION_LIMITS } from '@/lib/refraction'

export interface RefractionFieldSpec {
  min: number
  max: number
  step: number
  /** Casas decimais na exibição. O eixo é inteiro; o resto é dioptria. */
  decimals: number
  /** Valor assumido quando o campo está vazio e o usuário começa a ajustar. */
  origin: number
  /** Pixels de arrasto horizontal por passo. */
  pxPerStep: number
  /** Eixo é circular: 181° é 1°, não 180°. */
  wrap?: boolean
}

export type RefractionFieldKind = 'sph' | 'cyl' | 'axis' | 'addition' | 'pd'

// min/max/step saem de REFRACTION_LIMITS de propósito: é o mesmo limite que a
// validação usa. Duplicar aqui criaria um campo que aceita arrastar até um valor
// que o `validateSph` da borda depois recusa.
export const REFRACTION_FIELD_SPECS: Record<RefractionFieldKind, RefractionFieldSpec> = {
  sph: { ...REFRACTION_LIMITS.sph, decimals: 2, origin: 0, pxPerStep: 8 },
  cyl: { ...REFRACTION_LIMITS.cyl, decimals: 2, origin: 0, pxPerStep: 8 },
  // O eixo varre 180 posições — a 8px/passo a varredura inteira daria 1440px de
  // mesa. A 3px o giro completo cabe em meia tela.
  axis: { ...REFRACTION_LIMITS.axis, decimals: 0, origin: 0, pxPerStep: 3, wrap: true },
  addition: { ...REFRACTION_LIMITS.addition, decimals: 2, origin: 0, pxPerStep: 8 },
  // DP vazia começa em 62mm, perto da média adulta: é menos arrasto até o valor
  // real do que partir de 45.
  pd: { ...REFRACTION_LIMITS.pd, decimals: 1, origin: 62, pxPerStep: 8 },
}

/** Movimento mínimo, em pixels, para o gesto virar arrasto em vez de clique. */
export const DRAG_THRESHOLD_PX = 4

/** Multiplicador de precisão com Shift pressionado durante o arrasto. */
export const PRECISE_DRAG_FACTOR = 3

/**
 * Lê o texto do input. Devolve `null` para o que ainda não é número — campo
 * vazio, ou o `-` solto de quem está no meio da digitação de "-1.25".
 */
export function parseFieldValue(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')

  if (!normalized || normalized === '-' || normalized === '+' || normalized === '.') {
    return null
  }

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Formata para o `value` do input.
 *
 * Sem sinal de `+` forçado: `type="number"` do HTML não aceita `+2.00` como
 * valor válido e limpa o campo sozinho. O `+` da receita é assunto da
 * impressão, não do formulário.
 */
export function formatFieldValue(value: number, spec: RefractionFieldSpec): string {
  const text = value.toFixed(spec.decimals)

  // Qualquer negativo que arredonde para zero nesta precisão imprime "-0.00".
  // Testar o texto, e não a magnitude, é o que fecha o caso independente de
  // quantas casas o campo tem — um epsilon fixo deixa passar -1e-7 no eixo.
  return /^-0(?:\.0+)?$/.test(text) ? text.slice(1) : text
}

/**
 * Prende o valor na faixa do campo.
 *
 * O eixo não é preso, é enrolado: 0° e 180° são o mesmo meridiano, então passar
 * de 180 tem que cair em 1, e não travar. A faixa canônica de escrita é 1–180.
 */
export function clampFieldValue(value: number, spec: RefractionFieldSpec): number {
  if (spec.wrap) {
    const span = spec.max - spec.min
    const offset = (((value - spec.min - 1) % span) + span) % span

    return spec.min + offset + 1
  }

  return Math.min(spec.max, Math.max(spec.min, value))
}

/**
 * Move o valor `steps` passos e devolve já formatado.
 *
 * Valor fora da grade é levado para a casa seguinte na direção do movimento —
 * quem tem 1.30 herdado de outro sistema e aperta `+` quer 1.50, não 1.55.
 */
export function stepRefractionValue(
  raw: string,
  steps: number,
  spec: RefractionFieldSpec
): string {
  const current = parseFieldValue(raw)
  const base = current === null ? spec.origin : current

  if (steps === 0) {
    return formatFieldValue(clampFieldValue(base, spec), spec)
  }

  const grid = base / spec.step
  const rounded = Math.round(grid)
  const isOnGrid = Math.abs(grid - rounded) < 1e-9
  const direction = Math.sign(steps)

  const nextGrid = isOnGrid
    ? rounded + steps
    : (direction > 0 ? Math.ceil(grid) : Math.floor(grid)) + (steps - direction)

  return formatFieldValue(clampFieldValue(nextGrid * spec.step, spec), spec)
}

/**
 * Converte o arrasto horizontal em número de passos.
 *
 * Direita aumenta o valor. No cilíndrico isso significa andar em direção ao
 * zero, porque a convenção do sistema é cilindro negativo (-10 a 0) — "direita
 * é positivo" e "direita aumenta" só parecem a mesma regra enquanto o campo
 * chega a ser positivo.
 *
 * O deslocamento já vem descontado do limiar pelo componente, então o valor não
 * pula no instante em que o gesto vira arrasto.
 */
export function stepsFromDrag(
  deltaX: number,
  spec: RefractionFieldSpec,
  precise = false
): number {
  const pxPerStep = precise ? spec.pxPerStep * PRECISE_DRAG_FACTOR : spec.pxPerStep
  const steps = Math.trunc(deltaX / pxPerStep)

  // Math.trunc devolve -0 para arrasto curto à esquerda, e -0 !== 0 na
  // comparação que o componente faz para decidir se o valor mudou.
  return steps === 0 ? 0 : steps
}
