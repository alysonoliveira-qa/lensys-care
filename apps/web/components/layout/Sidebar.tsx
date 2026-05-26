'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SidebarProfileSection from '@/components/layout/SidebarProfileSection'
import SidebarNavigation from '@/components/layout/sidebar/SidebarNavigation'
import SidebarPlanStatus from '@/components/layout/sidebar/SidebarPlanStatus'
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
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

  const [clinic, setClinic] = useState<ClinicSummary | null>(null)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string | null>(null)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [tabletCollapsed, setTabletCollapsed] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop')
  const [hasLoadedCollapsePreference, setHasLoadedCollapsePreference] = useState(false)

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

  const handleMenuItemClick = (path: string, isActive: boolean) => {
    if (!isActive) {
      setPendingPath(path)
    }

    if (viewportMode === 'mobile') {
      setMobileDrawerOpen(false)
    }
  }

  const isConecta = subscription?.plan === 'CONECTA' && subscription?.status !== 'CANCELED'
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

        <SidebarNavigation
          pathname={pathname}
          pendingPath={pendingPath}
          isCollapsed={isCollapsed}
          onNavigate={handleMenuItemClick}
        />

        {subscription && (
          <SidebarPlanStatus
            isCollapsed={isCollapsed}
            isConecta={isConecta}
            plansHref="/dashboard/planos"
            onPlansClick={() => {
              if (isMobile) {
                setMobileDrawerOpen(false)
              }
            }}
          />
        )}

        <div className={`border-t border-slate-800 p-4 ${isCollapsed ? 'flex flex-col items-center gap-3' : 'flex items-center justify-between gap-3'}`}>
          <SidebarProfileSection
            authEmail={authEmail}
            fullName={profile?.full_name}
            preferredName={profile?.preferred_name}
            role={profile?.role}
            isCollapsed={isCollapsed}
            onProfileUpdated={(updatedProfile) => {
              setProfile((currentProfile) =>
                currentProfile
                  ? {
                      ...currentProfile,
                      ...updatedProfile,
                    }
                  : currentProfile
              )
            }}
          />

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
    </>
  )
}
