import {
  CheckCircle,
  ClipboardList,
  Clock,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type DashboardMetricCardId =
  | 'totalPatients'
  | 'totalExams'
  | 'pendingAlerts'
  | 'sentAlerts'

export interface DashboardCardConfigItem {
  id: DashboardMetricCardId
  label: string
  description: string
  icon: LucideIcon
  iconClassName: string
  noteClassName: string
  noteIcon: LucideIcon | null
}

export const DASHBOARD_CARD_CONFIG: DashboardCardConfigItem[] = [
  {
    id: 'totalPatients',
    label: 'Total de Pacientes',
    description: 'Base ativa e atualizada',
    icon: Users,
    iconClassName: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    noteClassName: 'text-emerald-600 dark:text-emerald-400',
    noteIcon: TrendingUp,
  },
  {
    id: 'totalExams',
    label: 'Consultas Realizadas',
    description: 'Prontuários refrativos cadastrados',
    icon: ClipboardList,
    iconClassName: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    noteClassName: 'text-slate-500 dark:text-slate-400',
    noteIcon: null,
  },
  {
    id: 'pendingAlerts',
    label: 'Alertas Pendentes',
    description: 'Exames expirando em breve',
    icon: Clock,
    iconClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    noteClassName: 'text-amber-600 dark:text-amber-400',
    noteIcon: null,
  },
  {
    id: 'sentAlerts',
    label: 'Alertas Enviados',
    description: 'Lembretes de recall disparados',
    icon: CheckCircle,
    iconClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    noteClassName: 'text-emerald-600 dark:text-emerald-400',
    noteIcon: null,
  },
]
