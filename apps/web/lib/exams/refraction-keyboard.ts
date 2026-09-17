// ─────────────────────────────────────────────────────────────────────────────
// lib/exams/refraction-keyboard.ts
// Preenchimento da receita só pelas setas: ←→ trocam de campo, ↑↓ ajustam.
//
// É o jeito de quem está com o instrumento numa mão e o olho na dioptria — o
// teclado faz o papel da caneta, sem precisar achar o Tab nem o mouse.
// ─────────────────────────────────────────────────────────────────────────────

import { VISUAL_ACUITY_OPTIONS } from '@/lib/exams/exam-options'

/**
 * Atributo que marca um campo como parada da navegação por setas. A ordem é a
 * do DOM, que já é a da receita: OD (esf, cil, eixo, AV), OE, ADD, DP.
 */
export const REFRACTION_NAV_ATTRIBUTE = 'data-refraction-nav'

export type NavDirection = 1 | -1

/** Direção de navegação da tecla, ou `null` se a tecla não troca de campo. */
export function navDirectionFromKey(key: string): NavDirection | null {
  if (key === 'ArrowRight') return 1
  if (key === 'ArrowLeft') return -1

  return null
}

/**
 * Índice do próximo campo. Não dá a volta: seta à direita no DP não pode pular
 * para o esférico do OD, que já está preenchido e seria sobrescrito sem aviso.
 */
export function nextNavIndex(current: number, total: number, direction: NavDirection): number | null {
  if (current < 0) return null

  const next = current + direction

  return next >= 0 && next < total ? next : null
}

/**
 * Leva o foco ao campo vizinho e seleciona o conteúdo, para que digitar um
 * número substitua o valor em vez de emendar nele.
 *
 * Devolve `false` na ponta da sequência — quem chama decide se ainda assim
 * segura a tecla.
 */
export function moveRefractionFocus(from: HTMLElement, direction: NavDirection): boolean {
  const scope: ParentNode = from.closest('form') ?? document
  const stops = Array.from(
    scope.querySelectorAll<HTMLElement>(`[${REFRACTION_NAV_ATTRIBUTE}]`)
  ).filter((element) => !element.hasAttribute('disabled'))

  const nextIndex = nextNavIndex(stops.indexOf(from), stops.length, direction)

  if (nextIndex === null) return false

  const target = stops[nextIndex]

  target.focus()

  if (target instanceof HTMLInputElement) target.select()

  return true
}

/**
 * Anda `steps` posições na lista de acuidade. ↑ vai para o topo da lista, que é
 * a melhor visão (20/20) — mesma direção que o select nativo usa.
 *
 * Campo vazio ou valor manual parte da referência do exame anterior quando
 * existe, senão de 20/20. Não entra em "Manual": essa opção abre um campo de
 * texto, e cair nela no meio do ajuste tiraria o foco das setas.
 */
export function stepVisualAcuity(value: string, steps: number, referenceValue?: string | null): string {
  const values: readonly string[] = VISUAL_ACUITY_OPTIONS.map((option) => option.value)

  const indexOf = (candidate?: string | null) => (candidate ? values.indexOf(candidate) : -1)

  const currentIndex = indexOf(value)
  const baseIndex = currentIndex >= 0 ? currentIndex : Math.max(indexOf(referenceValue), 0)

  // `steps` positivo é ↑, e ↑ sobe na lista (índice menor).
  const nextIndex = Math.min(values.length - 1, Math.max(0, baseIndex - steps))

  return values[nextIndex]
}
