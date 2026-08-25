'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SidebarProfileSection from '@/components/layout/SidebarProfileSection'
import SidebarNavigation from '@/components/layout/sidebar/SidebarNavigation'
import SidebarPlanStatus from '@/components/layout/sidebar/SidebarPlanStatus'
import useSidebarState from '@/components/layout/sidebar/useSidebarState'
import BrandMark from '@/components/brand/BrandMark'
import { getPlanDisplayName } from '@/lib/plans/plan-display-config'
import { planIncludesPremiumFeatures } from '@/lib/plans/plan-feature-config'
import { ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react'

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

  const hasPremiumPlan =
    planIncludesPremiumFeatures(subscription?.plan) && subscription?.status !== 'CANCELED'
  const planName = hasPremiumPlan
    ? getPlanDisplayName(subscription?.plan)
    : getPlanDisplayName('ESSENTIAL')

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
        className={`fixed inset-y-0 left-0 z-40 ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'} w-[min(20rem,86vw)] flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl shadow-slate-950/20 transition-[width,transform] duration-300 select-none md:relative md:left-auto md:z-20 md:translate-x-0 md:shadow-none ${asideWidthClass}`}
        data-cy={isMobile ? 'mobile-sidebar-drawer' : undefined}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full bg-violet-600/5 blur-xl" />

        <div className={`flex h-16 items-center border-b border-sidebar-border ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-3 px-4 lg:px-6'}`}>
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <BrandMark className="h-8 w-8 flex-shrink-0 text-indigo-400" />
            {!isCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-extrabold leading-none tracking-tight text-white">
                  Lensys <span className="text-indigo-400">Care</span>
                </span>
                <span className="mt-1 truncate text-[10px] font-semibold text-sidebar-foreground/70">
                  {clinic?.name || 'Carregando clínica...'}
                </span>
              </div>
            )}
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="rounded-lg border border-sidebar-border bg-slate-950/50 p-2 text-sidebar-foreground transition-colors hover:border-slate-700 hover:bg-sidebar-accent hover:text-white"
              aria-label="Fechar menu lateral"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Etiqueta de recolher: metade dentro, metade fora da borda direita.
            Dentro do cabeçalho ela dividia os ~56px úteis com o quadrado da
            marca quando o menu estava colapsado (4.5rem menos o px-2), e
            acabava por cima dele. Na borda, o cabeçalho colapsado fica só com
            a marca e o alvo de clique deixa de depender da largura do menu.
            `hidden md:flex` além do `!isMobile`: até o primeiro efeito medir a
            viewport, `viewportMode` vale 'desktop', e sem a classe a etiqueta
            piscaria na gaveta do celular. */}
        {!isMobile && (
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="absolute -right-3 top-8 z-30 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md shadow-slate-950/40 transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 md:flex"
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            data-cy="sidebar-collapse-button"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        <SidebarNavigation
          pathname={pathname}
          pendingPath={pendingPath}
          isCollapsed={isCollapsed}
          onNavigate={handleMenuItemClick}
        />

        {subscription && (
          <SidebarPlanStatus
            isCollapsed={isCollapsed}
            hasPremiumPlan={hasPremiumPlan}
            planName={planName}
            plansHref="/subscription"
            onPlansClick={() => {
              if (isMobile) {
                setMobileDrawerOpen(false)
              }
            }}
          />
        )}

        <div className={`border-t border-sidebar-border p-4 ${isCollapsed ? 'flex flex-col items-center gap-3' : 'flex items-center justify-between gap-3'}`}>
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
            className="rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/40 hover:text-red-400"
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
