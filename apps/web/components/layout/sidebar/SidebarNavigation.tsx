import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { SIDEBAR_NAV_ITEMS } from '@/lib/navigation/nav-items'
import { hasPlanFeatureAccess } from '@/lib/plans/plan-feature-config'

interface SidebarNavigationProps {
  pathname: string
  pendingPath: string | null
  isCollapsed: boolean
  onNavigate: (path: string, isActive: boolean) => void
  plan: string | null
  status: string | null
}

export default function SidebarNavigation({
  pathname,
  pendingPath,
  isCollapsed,
  onNavigate,
  plan,
  status,
}: SidebarNavigationProps) {
  // Esconder o que o plano não inclui. A rota valida de novo por conta própria:
  // isto aqui é arrumação de menu, não controle de acesso.
  const items = SIDEBAR_NAV_ITEMS.filter(
    (item) => !item.requiresFeature || hasPlanFeatureAccess(plan, status, item.requiresFeature)
  )

  return (
    <nav className={`flex-1 space-y-1.5 overflow-y-auto py-6 ${isCollapsed ? 'px-2' : 'px-3 lg:px-4'}`}>
      {items.map((item) => {
        const isDashboardRootItem = item.href === '/dashboard'
        const isActive = isDashboardRootItem
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`)
        const isPending = pendingPath === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-busy={isPending}
            data-cy={item.dataCy}
            title={isCollapsed ? item.label : undefined}
            onClick={() => onNavigate(item.href, isActive)}
          >
            <span
              className={`flex cursor-pointer items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
              } ${
                isActive
                  ? 'border-l-4 border-indigo-500 bg-indigo-600/15 font-bold text-white'
                  : 'hover:bg-sidebar-accent/50 hover:text-slate-200'
              }`}
            >
              {isPending ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin text-indigo-400" />
              ) : (
                <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-sidebar-foreground/70'}`} />
              )}
              {!isCollapsed && <span>{item.label}</span>}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
