'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * Primeiro provider React do projeto — não havia padrão anterior a seguir.
 *
 * `attribute="class"` porque o Tailwind está em `darkMode: ["class"]`: o
 * next-themes adiciona e remove a classe `dark` no `<html>`, sem substituir o
 * `className` que já está lá com as variáveis de fonte do next/font.
 *
 * `disableTransitionOnChange` corta as transições durante a troca. Sem isso,
 * cada elemento com `transition-colors` anima a mudança de tema em ritmos
 * diferentes e a tela inteira "derrete" por uns 200 ms.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
