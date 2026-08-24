'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Menu, Search } from 'lucide-react'

import ThemeToggle from '@/components/theme/ThemeToggle'

const MOBILE_SIDEBAR_EVENT = 'lensys:toggle-mobile-sidebar'

interface TopBarProps {
  initialPendingCount: number
}

export default function TopBar({ initialPendingCount }: TopBarProps) {
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const pendingCount = initialPendingCount

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/patients?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className="relative z-10 flex h-16 items-center justify-between border-b border-border bg-card/70 px-4 backdrop-blur-md select-none md:px-6">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(MOBILE_SIDEBAR_EVENT))}
        className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent md:hidden"
        aria-label="Abrir menu"
        data-cy="mobile-menu-button"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hoje e</span>
        <span className="text-xs font-bold capitalize text-foreground">{formattedDate}</span>
      </div>

      <form onSubmit={handleSearchSubmit} className="relative mx-2 flex-1 md:mx-4 md:max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar pacientes por nome ou e-mail..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-input bg-background pl-9 pr-4 text-xs text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </form>

      <div className="flex items-center gap-3 md:gap-4">
        <ThemeToggle />

        <button
          onClick={() => router.push('/alerts')}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Ver alertas pendentes"
        >
          <Bell className="h-4.5 w-4.5" />
          {pendingCount > 0 && (
            <span className="absolute right-[-3px] top-[-3px] flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <div className="hidden items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Online</span>
        </div>
      </div>
    </header>
  )
}
