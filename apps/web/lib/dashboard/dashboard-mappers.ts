import { getPlanDisplayName } from '@/lib/plans/plan-display-config'
import { BASE_PLAN_ID, planIncludesPremiumFeatures } from '@/lib/plans/plan-feature-config'

import { DASHBOARD_CARD_CONFIG } from './dashboard-card-config'

export interface DashboardMetrics {
  totalPatients: number
  totalExams: number
  pendingAlerts: number
  sentAlerts: number
}

export interface DashboardSubscriptionSource {
  subscription_plan: string | null
  subscription_status: string | null
}

export interface DashboardAgeGroupCounts {
  infant: number
  young: number
  presbyopia: number
  elderly: number
}

export function resolveDashboardPlanStatus(subscription: DashboardSubscriptionSource) {
  // Lê a lista de recursos do plano em vez de comparar com 'CONECTA': qualquer
  // plano acima do base entra aqui sem precisar editar esta função de novo.
  const hasPremiumPlan =
    planIncludesPremiumFeatures(subscription.subscription_plan) &&
    subscription.subscription_status !== 'CANCELED'

  // Sem direito aos recursos pagos, a clínica é mostrada como base — inclusive
  // um Conecta cancelado, que na prática só tem o Essencial.
  const planName = hasPremiumPlan
    ? getPlanDisplayName(subscription.subscription_plan)
    : getPlanDisplayName(BASE_PLAN_ID)

  return {
    hasPremiumPlan,
    planName,
    planLabel: hasPremiumPlan ? `Plano ${planName} ativo` : `Plano ${planName}`,
  }
}

export function buildDashboardSummaryCards(metrics: DashboardMetrics) {
  return DASHBOARD_CARD_CONFIG.map((item) => ({
    ...item,
    value: metrics[item.id],
  }))
}

export function buildDashboardAgeDistribution(ageGroups: DashboardAgeGroupCounts) {
  return {
    maxGroupValue: Math.max(...Object.values(ageGroups), 1),
    groups: [
      {
        label: 'Infantil / Adolescente (< 18 anos)',
        value: ageGroups.infant,
        colorClassName: 'bg-sky-500',
        accentClassName: 'text-sky-600 dark:text-sky-400',
      },
      {
        label: 'Adulto Jovem (18 - 39 anos)',
        value: ageGroups.young,
        colorClassName: 'bg-emerald-500',
        accentClassName: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        label: 'Adulto Presbita (40 - 59 anos)',
        value: ageGroups.presbyopia,
        colorClassName: 'bg-indigo-500',
        accentClassName: 'text-indigo-600 dark:text-indigo-400',
      },
      {
        label: 'Idoso (60+ anos)',
        value: ageGroups.elderly,
        colorClassName: 'bg-violet-500',
        accentClassName: 'text-violet-600 dark:text-violet-400',
      },
    ],
  }
}
