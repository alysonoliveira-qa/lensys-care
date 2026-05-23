'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Users,
  Bell,
  CreditCard,
  LogOut,
  Sparkles,
  User,
} from 'lucide-react'

interface ClinicSummary {
  name: string
}

interface ProfileSummary {
  full_name: string
  role: string
  clinic_id: string
  clinic: ClinicSummary | null
}

interface SubscriptionSummary {
  plan: string
  status: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [clinic, setClinic] = useState<ClinicSummary | null>(null)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Profile
          const { data: prof } = await supabase
            .from('profiles')
            .select('*, clinic:clinics(*)')
            .eq('id', user.id)
            .single()

          if (prof) {
            const typedProfile = prof as ProfileSummary
            setProfile(typedProfile)
            setClinic(typedProfile.clinic)

            // Subscription
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('clinic_id', typedProfile.clinic_id)
              .single()

            if (sub) {
              setSubscription(sub as SubscriptionSummary)
            }
          }
        }
      } catch (err) {
        console.error('Error loading sidebar data:', err)
      }
    }
    loadData()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const menuItems = [
    { label: 'Painel Geral', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Pacientes', icon: Users, path: '/patients' },
    { label: 'Alertas de Renovação', icon: Bell, path: '/alerts' },
    { label: 'Planos & Preços', icon: CreditCard, path: '/planos' },
  ]

  const isConecta = subscription?.plan === 'CONECTA' && subscription?.status !== 'CANCELED'

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-400 flex flex-col h-screen select-none relative z-20">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-violet-600/5 blur-xl pointer-events-none rounded-full" />

      {/* Sidebar Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/10 flex-shrink-0">
          <Sparkles className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-white font-extrabold text-sm tracking-tight leading-none">
            Opto<span className="text-indigo-400">Tech</span>
          </span>
          <span className="text-[10px] text-slate-500 truncate font-semibold mt-1">
            {clinic?.name || 'Carregando clínica...'}
          </span>
        </div>
      </div>

      {/* Menu Options */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
          const Icon = item.icon
          return (
            <Link key={item.path} href={item.path}>
              <span
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/15 border-l-4 border-indigo-500 text-white font-bold'
                    : 'hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Plan Status Banner */}
      {subscription && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 m-4 rounded-xl flex flex-col items-center gap-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-500">Seu Plano:</span>
            <Badge variant={isConecta ? 'premium' : 'secondary'} className="text-[10px] font-bold py-0.5 px-2">
              {isConecta ? 'Conecta' : 'Essencial'}
            </Badge>
          </div>
          {!isConecta && (
            <Link href="/planos" className="w-full text-center">
              <span className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline">
                Upgrade para WhatsApp/SMS →
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Sidebar Footer (Profile + Logout) */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-300">
            <User className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white text-xs font-bold truncate leading-none">
              {profile?.full_name || 'Profissional'}
            </span>
            <span className="text-[10px] text-slate-500 truncate mt-1">
              {profile?.role === 'OWNER' ? 'Proprietário' : 'Optometrista'}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-slate-800/40"
          title="Sair"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>
    </aside>
  )
}
