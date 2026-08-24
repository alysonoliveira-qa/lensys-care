'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'

/**
 * Ordem do ciclo. Começa em `system` porque é o padrão do provider: o primeiro
 * clique de quem nunca escolheu nada assume o controle no estado que ele já via.
 */
const CYCLE = ['system', 'light', 'dark'] as const

type ThemeOption = (typeof CYCLE)[number]

const OPTION_CONFIG: Record<ThemeOption, { label: string; Icon: typeof Sun }> = {
  system: { label: 'Seguindo o sistema', Icon: Monitor },
  light: { label: 'Tema claro', Icon: Sun },
  dark: { label: 'Tema escuro', Icon: Moon },
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  // O servidor não sabe o tema — ele vive em localStorage e no `prefers-color-scheme`
  // do navegador. Renderizar o ícone antes de montar faria o servidor escolher um
  // e o cliente outro, e o React acusaria mismatch. Até montar, sai um espaço do
  // mesmo tamanho, para o cabeçalho não pular quando o ícone aparecer.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden="true" />
  }

  const current = (CYCLE.find((option) => option === theme) ?? 'system') as ThemeOption
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
  const { label, Icon } = OPTION_CONFIG[current]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      // O rótulo diz o estado atual E o próximo: num botão que cicla, saber só
      // onde se está não informa o que o clique vai fazer.
      aria-label={`${label}. Clique para mudar para ${OPTION_CONFIG[next].label.toLowerCase()}.`}
      title={label}
      data-cy="theme-toggle"
      data-theme-state={current}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
