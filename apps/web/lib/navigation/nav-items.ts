import {
  Bell,
  CreditCard,
  LayoutDashboard,
  Settings2,
  type LucideIcon,
  Users,
} from 'lucide-react'

export interface SidebarNavItem {
  id: 'dashboard' | 'patients' | 'alerts' | 'account' | 'plans'
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
    id: 'account',
    label: 'Minha Conta',
    href: '/dashboard/conta',
    icon: Settings2,
    dataCy: 'sidebar-account-link',
    description: 'Dados pessoais e identificação do usuário',
  },
  {
    id: 'plans',
    label: 'Planos e Preços',
    href: '/subscription',
    icon: CreditCard,
    dataCy: 'sidebar-plans-link',
    description: 'Gestão do plano atual da clínica',
  },
]
