'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDisplayName, getRoleLabel } from '@/lib/profile'
import {
  LayoutDashboard,
  Users,
  Bell,
  CreditCard,
  LogOut,
  Sparkles,
  User,
  Loader2,
  PencilLine,
  X,
} from 'lucide-react'

interface ClinicSummary {
  name: string
}

interface ProfileSummary {
  full_name: string
  preferred_name: string | null
  role: string
  clinic_id: string
  clinic: ClinicSummary | ClinicSummary[] | null
}

interface SubscriptionSummary {
  plan: string
  status: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const profileSuccessCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [clinic, setClinic] = useState<ClinicSummary | null>(null)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [preferredNameInput, setPreferredNameInput] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null)

  const clearProfileSuccessCloseTimer = () => {
    if (profileSuccessCloseTimerRef.current) {
      clearTimeout(profileSuccessCloseTimerRef.current)
      profileSuccessCloseTimerRef.current = null
    }
  }

  useEffect(() => {
    setPendingPath(null)
  }, [pathname])

  useEffect(() => {
    return () => {
      clearProfileSuccessCloseTimer()
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setProfile(null)
          setClinic(null)
          setSubscription(null)
          setAuthEmail(null)
          return
        }

        setAuthEmail(user.email ?? null)

        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, preferred_name, role, clinic_id, clinic:clinics(name)')
          .eq('id', user.id)
          .single()

        if (!prof) {
          setProfile(null)
          setClinic(null)
          setSubscription(null)
          return
        }

        const typedProfile = prof as unknown as ProfileSummary
        const normalizedClinic = Array.isArray(typedProfile.clinic)
          ? typedProfile.clinic[0] ?? null
          : typedProfile.clinic
        setProfile(typedProfile)
        setClinic(normalizedClinic)

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('clinic_id', typedProfile.clinic_id)
          .single()

        if (sub) {
          setSubscription(sub as SubscriptionSummary)
        }
      } catch (err) {
        console.error('Error loading sidebar data:', err)
      }
    }

    loadData()

    window.addEventListener('subscription-updated', loadData)
    window.addEventListener('profile-updated', loadData)

    return () => {
      window.removeEventListener('subscription-updated', loadData)
      window.removeEventListener('profile-updated', loadData)
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleOpenProfileModal = () => {
    clearProfileSuccessCloseTimer()
    setPreferredNameInput(profile?.preferred_name ?? '')
    setProfileSaveError(null)
    setProfileSaveSuccess(null)
    setIsProfileModalOpen(true)
  }

  const handleCloseProfileModal = () => {
    if (isSavingProfile) {
      return
    }

    setIsProfileModalOpen(false)
    setProfileSaveError(null)
    setProfileSaveSuccess(null)
    clearProfileSuccessCloseTimer()
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    setProfileSaveError(null)
    setProfileSaveSuccess(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredName: preferredNameInput,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível atualizar o perfil.')
      }

      setProfile((currentProfile) =>
        currentProfile
          ? {
            ...currentProfile,
            preferred_name: data.profile.preferred_name,
            full_name: data.profile.full_name,
            role: data.profile.role,
          }
          : currentProfile
      )
      setProfileSaveSuccess('Perfil atualizado com sucesso.')
      window.dispatchEvent(new Event('profile-updated'))
      router.refresh()
      clearProfileSuccessCloseTimer()
      profileSuccessCloseTimerRef.current = setTimeout(() => {
        setIsProfileModalOpen(false)
        setProfileSaveSuccess(null)
        profileSuccessCloseTimerRef.current = null
      }, 850)
    } catch (error) {
      console.error('Error updating profile:', error)
      setProfileSaveError(error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const menuItems = [
    { label: 'Painel Geral', icon: LayoutDashboard, path: '/dashboard', dataCy: 'sidebar-dashboard-link' },
    { label: 'Pacientes', icon: Users, path: '/patients', dataCy: 'sidebar-patients-link' },
    { label: 'Alertas de Renovação', icon: Bell, path: '/alerts', dataCy: 'sidebar-alerts-link' },
    { label: 'Planos & Preços', icon: CreditCard, path: '/dashboard/planos', dataCy: 'sidebar-plans-link' },
  ]

  const isConecta = subscription?.plan === 'CONECTA' && subscription?.status !== 'CANCELED'
  const displayName = useMemo(
    () =>
      getDisplayName({
        preferredName: profile?.preferred_name,
        fullName: profile?.full_name,
        email: authEmail,
      }),
    [authEmail, profile?.full_name, profile?.preferred_name]
  )
  const roleLabel = getRoleLabel(profile?.role)

  return (
    <>
      <aside className="relative z-20 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-400 select-none">
        <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full bg-violet-600/5 blur-xl" />

        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/10">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-extrabold leading-none tracking-tight text-white">
              Lensys <span className="text-indigo-400">Care</span>
            </span>
            <span className="mt-1 truncate text-[10px] font-semibold text-slate-500">
              {clinic?.name || 'Carregando clínica...'}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
            const isPending = pendingPath === item.path
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                href={item.path}
                aria-busy={isPending}
                data-cy={item.dataCy}
                onClick={() => {
                  if (!isActive) {
                    setPendingPath(item.path)
                  }
                }}
              >
                <span
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${isActive
                      ? 'border-l-4 border-indigo-500 bg-indigo-600/15 font-bold text-white'
                      : 'hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                >
                  {isPending ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-indigo-400" />
                  ) : (
                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  )}
                  <span>{item.label}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        {subscription && (
          <div className="m-4 flex flex-col items-center gap-2 rounded-xl border-t border-slate-800 bg-slate-950/40 px-4 py-3">
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Seu Plano:</span>
              <Badge variant={isConecta ? 'premium' : 'secondary'} className="px-2 py-0.5 text-[10px] font-bold">
                {isConecta ? 'Conecta' : 'Essencial'}
              </Badge>
            </div>
            {!isConecta && (
              <Link href="/dashboard/planos" className="w-full text-center">
                <span className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline">
                  Upgrade para WhatsApp/SMS →
                </span>
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={handleOpenProfileModal}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-800/50"
            data-cy="sidebar-profile-button"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold leading-none text-white">
                {displayName}
              </span>
              <span className="mt-1 block truncate text-[10px] text-slate-500">{roleLabel}</span>
            </div>
            <PencilLine className="h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover:text-indigo-400" />
          </button>

          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800/40 hover:text-red-400"
            title="Sair"
            data-cy="logout-button"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </aside>

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            data-cy="edit-profile-modal"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Editar perfil</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Atualize como o Lensys Care deve te chamar no dashboard e na sidebar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseProfileModal}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                aria-label="Fechar modal"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Como prefere ser chamado?
              </label>
              <Input
                type="text"
                value={preferredNameInput}
                onChange={(event) => setPreferredNameInput(event.target.value)}
                placeholder="Ex: Dra. Ana ou Ana"
                className="border-slate-800 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20"
                maxLength={60}
                disabled={isSavingProfile}
                data-cy="preferred-name-input"
              />
              <p className="text-xs text-slate-500">
                Se ficar em branco, o sistema usará seu nome completo, e-mail ou Usuário.
              </p>
            </div>

            {profileSaveError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
                {profileSaveError}
              </div>
            )}

            {profileSaveSuccess && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
                {profileSaveSuccess}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={handleCloseProfileModal}
                disabled={isSavingProfile}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-indigo-600 font-semibold hover:bg-indigo-500"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                data-cy="save-profile-button"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
