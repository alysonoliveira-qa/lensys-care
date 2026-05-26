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
  Bell,
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react'

const SIDEBAR_STORAGE_KEY = 'lensys-care-sidebar-collapsed'
const MOBILE_SIDEBAR_EVENT = 'lensys:toggle-mobile-sidebar'

type ViewportMode = 'mobile' | 'tablet' | 'desktop'

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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [tabletCollapsed, setTabletCollapsed] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop')
  const [hasLoadedCollapsePreference, setHasLoadedCollapsePreference] = useState(false)

  const clearProfileSuccessCloseTimer = () => {
    if (profileSuccessCloseTimerRef.current) {
      clearTimeout(profileSuccessCloseTimerRef.current)
      profileSuccessCloseTimerRef.current = null
    }
  }

  useEffect(() => {
    setPendingPath(null)
    setMobileDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (storedValue === 'true') {
        setDesktopCollapsed(true)
      }
    } catch (error) {
      console.error('Error reading sidebar preference:', error)
    } finally {
      setHasLoadedCollapsePreference(true)
    }
  }, [])

  useEffect(() => {
    const updateViewportMode = () => {
      const width = window.innerWidth

      if (width < 768) {
        setViewportMode('mobile')
        return
      }

      if (width < 1024) {
        setViewportMode('tablet')
        setTabletCollapsed(true)
        return
      }

      setViewportMode('desktop')
    }

    updateViewportMode()
    window.addEventListener('resize', updateViewportMode)

    return () => {
      window.removeEventListener('resize', updateViewportMode)
    }
  }, [])

  useEffect(() => {
    if (viewportMode !== 'mobile') {
      setMobileDrawerOpen(false)
    }
  }, [viewportMode])

  useEffect(() => {
    const handleToggleMobileSidebar = () => {
      if (window.innerWidth < 768) {
        setMobileDrawerOpen((currentValue) => !currentValue)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileDrawerOpen(false)
      }
    }

    window.addEventListener(MOBILE_SIDEBAR_EVENT, handleToggleMobileSidebar)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener(MOBILE_SIDEBAR_EVENT, handleToggleMobileSidebar)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

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
      } catch (error) {
        console.error('Error loading sidebar data:', error)
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
    setMobileDrawerOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleToggleCollapse = () => {
    if (viewportMode === 'tablet') {
      setTabletCollapsed((currentValue) => !currentValue)
      return
    }

    setDesktopCollapsed((currentValue) => {
      const nextValue = !currentValue

      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextValue))
      } catch (error) {
        console.error('Error saving sidebar preference:', error)
      }

      return nextValue
    })
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
        throw new Error(data.message || 'Nao foi possivel atualizar o perfil.')
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
      setProfileSaveError(error instanceof Error ? error.message : 'Nao foi possivel atualizar o perfil.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleMenuItemClick = (path: string, isActive: boolean) => {
    if (!isActive) {
      setPendingPath(path)
    }

    if (viewportMode === 'mobile') {
      setMobileDrawerOpen(false)
    }
  }

  const menuItems = [
    { label: 'Painel Geral', icon: LayoutDashboard, path: '/dashboard', dataCy: 'sidebar-dashboard-link' },
    { label: 'Pacientes', icon: Users, path: '/patients', dataCy: 'sidebar-patients-link' },
    { label: 'Alertas de Renovacao', icon: Bell, path: '/alerts', dataCy: 'sidebar-alerts-link' },
    { label: 'Planos e Precos', icon: CreditCard, path: '/dashboard/planos', dataCy: 'sidebar-plans-link' },
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
  const isMobile = viewportMode === 'mobile'
  const isCollapsed = viewportMode === 'tablet'
    ? tabletCollapsed
    : viewportMode === 'desktop'
      ? hasLoadedCollapsePreference && desktopCollapsed
      : false

  const asideWidthClass = viewportMode === 'tablet'
    ? (isCollapsed ? 'md:w-20 lg:w-20' : 'md:w-56 lg:w-56')
    : (isCollapsed ? 'md:w-20 lg:w-20' : 'md:w-20 lg:w-64')

  return (
    <>
      {isMobile && mobileDrawerOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => setMobileDrawerOpen(false)}
          aria-label="Fechar menu lateral"
          data-cy="mobile-sidebar-overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'} w-[min(20rem,86vw)] flex h-screen flex-col border-r border-slate-800 bg-slate-900 text-slate-400 shadow-2xl shadow-slate-950/20 transition-[width,transform] duration-300 select-none md:relative md:left-auto md:z-20 md:translate-x-0 md:shadow-none ${asideWidthClass}`}
        data-cy={isMobile ? 'mobile-sidebar-drawer' : undefined}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full bg-violet-600/5 blur-xl" />

        <div className={`flex h-16 items-center border-b border-slate-800 ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-3 px-4 lg:px-6'}`}>
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/10">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-extrabold leading-none tracking-tight text-white">
                  Lensys <span className="text-indigo-400">Care</span>
                </span>
                <span className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                  {clinic?.name || 'Carregando clinica...'}
                </span>
              </div>
            )}
          </div>

          {!isMobile && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              data-cy="sidebar-collapse-button"
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              aria-label="Fechar menu lateral"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className={`flex-1 space-y-1.5 overflow-y-auto py-6 ${isCollapsed ? 'px-2' : 'px-3 lg:px-4'}`}>
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
                title={isCollapsed ? item.label : undefined}
                onClick={() => handleMenuItemClick(item.path, isActive)}
              >
                <span
                  className={`flex cursor-pointer items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
                  } ${
                    isActive
                      ? 'border-l-4 border-indigo-500 bg-indigo-600/15 font-bold text-white'
                      : 'hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {isPending ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-indigo-400" />
                  ) : (
                    <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  )}
                  {!isCollapsed && <span>{item.label}</span>}
                </span>
              </Link>
            )
          })}
        </nav>

        {subscription && !isCollapsed && (
          <div className="m-4 flex flex-col items-center gap-2 rounded-xl border-t border-slate-800 bg-slate-950/40 px-4 py-3">
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Seu Plano:</span>
              <Badge variant={isConecta ? 'premium' : 'secondary'} className="px-2 py-0.5 text-[10px] font-bold">
                {isConecta ? 'Conecta' : 'Essencial'}
              </Badge>
            </div>
            {!isConecta && (
              <Link
                href="/dashboard/planos"
                className="w-full text-center"
                onClick={() => {
                  if (isMobile) {
                    setMobileDrawerOpen(false)
                  }
                }}
              >
                <span className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline">
                  Upgrade para WhatsApp/SMS
                </span>
              </Link>
            )}
          </div>
        )}

        <div className={`border-t border-slate-800 p-4 ${isCollapsed ? 'flex flex-col items-center gap-3' : 'flex items-center justify-between gap-3'}`}>
          <button
            type="button"
            onClick={handleOpenProfileModal}
            title={isCollapsed ? displayName : undefined}
            className={`group rounded-xl text-left transition-colors hover:bg-slate-800/50 ${
              isCollapsed ? 'flex h-11 w-11 items-center justify-center p-0' : 'flex min-w-0 flex-1 items-center gap-3 px-2 py-2'
            }`}
            data-cy="sidebar-profile-button"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
              <User className="h-4.5 w-4.5" />
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold leading-none text-white">
                    {displayName}
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-slate-500">{roleLabel}</span>
                </div>
                <PencilLine className="h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover:text-indigo-400" />
              </>
            )}
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
                Se ficar em branco, o sistema usara seu nome completo, e-mail ou Usuario.
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
