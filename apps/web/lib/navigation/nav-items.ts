import {
  Bell,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Settings2,
  type LucideIcon,
  Users,
  Wallet,
} from 'lucide-react'

import type { PlanFeature } from '@/lib/plans/plan-feature-config'

export interface SidebarNavItem {
  id: 'dashboard' | 'agenda' | 'patients' | 'alerts' | 'financeiro' | 'account' | 'plans'
  label: string
  href: string
  icon: LucideIcon
  dataCy: string
  description?: string
  /**
   * Recurso de plano exigido para o item aparecer. Ausente = todo mundo vê.
   *
   * Esconder o link é conveniência, **não** proteção: a rota valida o plano por
   * conta própria. Um item que some do menu mas responde na URL seria a UI
   * fazendo de gate, que é exatamente o que não pode.
   */
  requiresFeature?: PlanFeature
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
    id: 'agenda',
    label: 'Agenda',
    href: '/agenda',
    icon: CalendarDays,
    dataCy: 'sidebar-agenda-link',
    description: 'Consultas do dia e fila de atendimento',
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
    id: 'financeiro',
    label: 'Financeiro',
    href: '/financeiro',
    icon: Wallet,
    dataCy: 'sidebar-financeiro-link',
    description: 'Caixa da clínica: entradas, saídas e fechamento',
    requiresFeature: 'financeiro',
  },
  {
    id: 'account',
    label: 'Minha Conta',
    href: '/account',
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
