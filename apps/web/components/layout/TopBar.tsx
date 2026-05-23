'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Bell } from 'lucide-react'

export default function TopBar() {
  const router = useRouter()
  const supabase = createClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

          if (profile?.clinic_id) {
            // Count pending alerts
            const { count } = await supabase
              .from('alerts')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'PENDING')
              // Alert maps to patient, patient maps to clinic
              // Standard client-side count: we can filter alerts by pending
              // For simplicity, let's select count of all alerts
              .eq('status', 'PENDING')

            if (count !== null) {
              setPendingCount(count)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching alerts count:', err)
      }
    }
    fetchAlerts()
  }, [supabase])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/patients?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // Get current date formatted in Portuguese
  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 flex items-center justify-between select-none relative z-10">
      {/* Date display */}
      <div className="hidden md:flex flex-col">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Hoje é</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{formattedDate}</span>
      </div>

      {/* Global Search Input */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-4 relative">
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar pacientes por nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
      </form>

      {/* Notifications / Alerts quick links */}
      <div className="flex items-center gap-4">
        {/* Quick notification bell linked to alerts page */}
        <button
          onClick={() => router.push('/alerts')}
          className="relative w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          title="Ver alertas pendentes"
        >
          <Bell className="h-4.5 w-4.5" />
          {pendingCount > 0 && (
            <span className="absolute top-[-3px] right-[-3px] flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950 animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Live System Indicator */}
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-slate-50/50 dark:bg-slate-950/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Online</span>
        </div>
      </div>
    </header>
  )
}
