'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SidebarProfileSection from '@/components/layout/SidebarProfileSection'
import SidebarNavigation from '@/components/layout/sidebar/SidebarNavigation'
import SidebarPlanStatus from '@/components/layout/sidebar/SidebarPlanStatus'
import useSidebarState from '@/components/layout/sidebar/useSidebarState'
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
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

interface SidebarProps {
  initialAuthEmail: string | null
  initialClinic: ClinicSummary | null
  initialProfile: ProfileSummary | null
  initialSubscription: SubscriptionSummary | null
}

export default function Sidebar({
  initialAuthEmail,
  initialClinic,
  initialProfile,
  initialSubscription,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [clinic, setClinic] = useState<ClinicSummary | null>(initialClinic)
  const [profile, setProfile] = useState<ProfileSummary | null>(initialProfile)
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(initialSubscription)
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string | null>(initialAuthEmail)
  const {
    asideWidthClass,
    handleToggleCollapse,
    isCollapsed,
    isMobile,
    mobileDrawerOpen,
    setMobileDrawerOpen,
  } = useSidebarState(pathname)

  useEffect(() => {
    setPendingPath(null)
  }, [pathname])

  useEffect(() => {
    setAuthEmail(initialAuthEmail)
    setProfile(initialProfile)
    setClinic(initialClinic)
    setSubscription(initialSubscription)
  }, [initialAuthEmail, initialClinic, initialProfile, initialSubscription])

  const handleLogout = async () => {
    setMobileDrawerOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleMenuItemClick = (path: string, isActive: boolean) => {
    if (!isActive) {
      setPendingPath(path)
    }

    if (isMobile) {
      setMobileDrawerOpen(false)
    }
  }

  const isConecta = subscription?.plan === 'CONECTA' && subscription?.status !== 'CANCELED'

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
        className={`fixed inset-y-0 left-0 z-40 ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'} w-[min(20rem,86vw)] flex h-screen flex-col border-r border-slate-800 bg-slate-900 text-slate-400 shadow-2xl shadow-slate-950/20 transition-[width,transform] duration-300 select-none md:relative md:left-auto md:z-20 md:translate-x-0 md:overflow-visible md:shadow-none ${asideWidthClass}`}
        data-cy={isMobile ? 'mobile-sidebar-drawer' : undefined}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full bg-violet-600/5 blur-xl" />

        <div className={`relative flex h-16 items-center border-b border-slate-800 ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-3 px-4 lg:px-6'}`}>
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
                  {clinic?.name || 'Carregando clínica...'}
                </span>
              </div>
            )}
          </div>

          {!isMobile && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
                isCollapsed
                  ? 'absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-r-xl rounded-l-none border border-slate-700 border-l-slate-800 bg-slate-900 px-2 py-3 text-slate-300 shadow-lg shadow-slate-950/30 hover:border-slate-600 hover:bg-slate-800 hover:text-white'
                  : 'rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
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
            plansHref="/subscription"
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
