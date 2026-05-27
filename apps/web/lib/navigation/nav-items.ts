import {
  Bell,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  Users,
} from 'lucide-react'

export interface SidebarNavItem {
  id: 'dashboard' | 'patients' | 'alerts' | 'plans'
  label: string
  href: string
  icon: LucideIcon
  dataCy: string
  description?: string
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'dashboard',
    label: 'Painel Geral',
    href: '/dashboard',
    icon: LayoutDashboard,
    dataCy: 'sidebar-dashboard-link',
    description: 'Visão geral da operação clínica',
  },
  {
    id: 'patients',
    label: 'Pacientes',
    href: '/patients',
    icon: Users,
    dataCy: 'sidebar-patients-link',
    description: 'Cadastro e prontuários dos pacientes',
  },
  {
    id: 'alerts',
    label: 'Alertas de Renovação',
    href: '/alerts',
    icon: Bell,
    dataCy: 'sidebar-alerts-link',
    description: 'Lembretes e retornos programados',
  },
  {
    id: 'plans',
    label: 'Planos e Preços',
    href: '/dashboard/planos',
    icon: CreditCard,
    dataCy: 'sidebar-plans-link',
    description: 'Gestão do plano atual da clínica',
  },
]
