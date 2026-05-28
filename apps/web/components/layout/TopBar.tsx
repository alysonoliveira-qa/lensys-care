'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Menu, Search } from 'lucide-react'

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
    <header className="relative z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/70 px-4 backdrop-blur-md select-none dark:border-slate-800 dark:bg-slate-900/70 md:px-6">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(MOBILE_SIDEBAR_EVENT))}
        className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/40 md:hidden"
        aria-label="Abrir menu"
        data-cy="mobile-menu-button"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hoje e</span>
        <span className="text-xs font-bold capitalize text-slate-700 dark:text-slate-300">{formattedDate}</span>
      </div>

      <form onSubmit={handleSearchSubmit} className="relative mx-2 flex-1 md:mx-4 md:max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar pacientes por nome ou e-mail..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs transition-all duration-200 placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/40"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </form>

      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.push('/alerts')}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40"
          title="Ver alertas pendentes"
        >
          <Bell className="h-4.5 w-4.5" />
          {pendingCount > 0 && (
            <span className="absolute right-[-3px] top-[-3px] flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse dark:ring-slate-950">
              {pendingCount}
            </span>
          )}
        </button>

        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950/20 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Online</span>
        </div>
      </div>
    </header>
  )
}
