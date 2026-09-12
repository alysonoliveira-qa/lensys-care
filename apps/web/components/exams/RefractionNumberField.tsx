'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  DRAG_THRESHOLD_PX,
  REFRACTION_FIELD_SPECS,
  stepRefractionValue,
  stepsFromDrag,
  type RefractionFieldKind,
} from '@/lib/exams/refraction-stepper'

/** Espera antes de o botão segurado começar a repetir. */
const HOLD_DELAY_MS = 400

/** Intervalo entre repetições enquanto o botão fica pressionado. */
const HOLD_REPEAT_MS = 70

interface DragState {
  pointerId: number
  startX: number
  /** Valor no instante do toque — ancorar aqui evita acúmulo de erro no arrasto. */
  anchor: string
  steps: number
  engaged: boolean
}

interface RefractionNumberFieldProps {
  kind: RefractionFieldKind
  value: string
  onChange: (value: string) => void
  /** Preservado no input, não no invólucro: é o seletor dos testes clínicos. */
  dataCy: string
  label: string
  placeholder?: string
  highlightPlaceholder?: boolean
  inputClassName?: string
  className?: string
}

/**
 * Campo de grau com quatro formas de ajuste: arrastar o número para os lados,
 * roda do mouse, setas do teclado e os botões −/+.
 *
 * O input continua sendo `type="number"` com `min`/`max`/`step`. Trocar por
 * texto daria mais liberdade de formatação, mas hoje a validação de faixa da
 * refração só existe no navegador — não há checagem de intervalo na rota de
 * exames — então tirar o `type="number"` removeria a única trava que impede
 * salvar um esférico de +80 D.
 */
export default function RefractionNumberField({
  kind,
  value,
  onChange,
  dataCy,
  label,
  placeholder,
  highlightPlaceholder = false,
  inputClassName = '',
  className = '',
}: RefractionNumberFieldProps) {
  const spec = REFRACTION_FIELD_SPECS[kind]

  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const holdRef = useRef<{
    delay?: ReturnType<typeof setTimeout>
    repeat?: ReturnType<typeof setInterval>
  }>({})

  // Os handlers nativos (roda) e os temporizadores (segurar o botão) sobrevivem
  // a re-renders; sem estes espelhos eles ajustariam sempre o valor da primeira
  // renderização e o campo andaria um passo só.
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  valueRef.current = value
  onChangeRef.current = onChange

  const [isScrubbing, setIsScrubbing] = useState(false)

  const applySteps = useCallback(
    (steps: number) => {
      onChangeRef.current(stepRefractionValue(valueRef.current, steps, spec))
    },
    [spec]
  )

  // ─── Roda do mouse ────────────────────────────────────────────────────────
  // Listener nativo com `passive: false` de propósito: o `onWheel` do React é
  // registrado como passivo, e nele o `preventDefault` é ignorado — a página
  // rolaria junto com o grau.
  useEffect(() => {
    const element = inputRef.current

    if (!element) return

    const handleWheel = (event: WheelEvent) => {
      // Só com o campo focado. Sem esta guarda, rolar a página com o cursor de
      // passagem por cima do formulário mudaria o grau do paciente sem querer.
      if (document.activeElement !== element) return

      const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX

      if (delta === 0) return

      event.preventDefault()
      onChangeRef.current(stepRefractionValue(valueRef.current, delta < 0 ? 1 : -1, spec))
    }

    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => element.removeEventListener('wheel', handleWheel)
  }, [spec])

  // ─── Botões −/+ com repetição ao segurar ──────────────────────────────────
  const stopHold = useCallback(() => {
    if (holdRef.current.delay) clearTimeout(holdRef.current.delay)
    if (holdRef.current.repeat) clearInterval(holdRef.current.repeat)
    holdRef.current = {}
  }, [])

  const startHold = useCallback(
    (direction: 1 | -1) => {
      stopHold()
      applySteps(direction)
      holdRef.current.delay = setTimeout(() => {
        holdRef.current.repeat = setInterval(() => applySteps(direction), HOLD_REPEAT_MS)
      }, HOLD_DELAY_MS)
    },
    [applySteps, stopHold]
  )

  useEffect(() => stopHold, [stopHold])

  // ─── Arrastar sobre o número ──────────────────────────────────────────────
  const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    if (event.button !== 0) return

    // Sem `preventDefault` aqui: o clique curto tem que continuar focando o
    // campo e posicionando o cursor como em qualquer input.
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      anchor: value,
      steps: 0,
      engaged: false,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLInputElement>) => {
    const state = dragRef.current

    if (!state || state.pointerId !== event.pointerId) return

    const travel = event.clientX - state.startX

    if (!state.engaged) {
      if (Math.abs(travel) < DRAG_THRESHOLD_PX) return

      state.engaged = true
      setIsScrubbing(true)
      inputRef.current?.setPointerCapture(event.pointerId)
    }

    event.preventDefault()

    // Desconta o limiar para o valor não saltar no instante em que o gesto
    // deixa de ser clique e vira arrasto.
    const steps = stepsFromDrag(
      travel - Math.sign(travel) * DRAG_THRESHOLD_PX,
      spec,
      event.shiftKey
    )

    if (steps === state.steps) return

    state.steps = steps
    onChange(stepRefractionValue(state.anchor, steps, spec))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLInputElement>) => {
    const state = dragRef.current

    if (!state || state.pointerId !== event.pointerId) return

    dragRef.current = null

    if (!state.engaged) return

    setIsScrubbing(false)

    if (inputRef.current?.hasPointerCapture(event.pointerId)) {
      inputRef.current.releasePointerCapture(event.pointerId)
    }
  }

  // ─── Teclado ──────────────────────────────────────────────────────────────
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const stepsByKey: Record<string, number> = {
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 4,
      PageDown: -4,
    }

    const steps = stepsByKey[event.key]

    if (!steps) return

    // Assume as setas do próprio `type="number"`: as nativas não conhecem a
    // volta do eixo em 180 nem o encaixe na grade de 0,25.
    event.preventDefault()
    applySteps(steps)
  }

  const buttonClassName =
    'flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-sm shadow-slate-200/40 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-indigo-600 active:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400 dark:shadow-none dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-indigo-400'

  // `select-none` durante o arrasto: o gesto começa sem `preventDefault` no
  // pointerdown (para o clique curto ainda focar o campo), e nesse intervalo o
  // navegador já iniciou uma seleção de texto — sem isto o número fica destacado
  // em azul enquanto o grau corre.
  const scrubbingClassName = isScrubbing
    ? 'select-none border-indigo-500/60 ring-4 ring-indigo-500/20'
    : ''

  const placeholderClassName = highlightPlaceholder
    ? 'placeholder:text-amber-500/80 dark:placeholder:text-amber-400/80'
    : ''

  return (
    <div className={'inline-flex items-center gap-1 ' + className}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={'Diminuir ' + label}
        data-cy={dataCy + '-decrement'}
        className={buttonClassName}
        onPointerDown={() => startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <Input
        ref={inputRef}
        type="number"
        step={spec.step}
        min={spec.min}
        max={spec.max}
        inputMode="decimal"
        aria-label={label}
        title={label + ' — arraste para os lados, use a roda do mouse ou as setas ↑↓'}
        data-cy={dataCy}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        // `pan-y` cede a rolagem vertical da página ao navegador e fica só com o
        // gesto horizontal. Sem isto, no tablet o arrasto do grau disputa com a
        // rolagem lateral da tabela de refração.
        style={{ touchAction: 'pan-y' }}
        className={[
          'no-spinner cursor-ew-resize',
          inputClassName,
          scrubbingClassName,
          placeholderClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      />

      <button
        type="button"
        tabIndex={-1}
        aria-label={'Aumentar ' + label}
        data-cy={dataCy + '-increment'}
        className={buttonClassName}
        onPointerDown={() => startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
