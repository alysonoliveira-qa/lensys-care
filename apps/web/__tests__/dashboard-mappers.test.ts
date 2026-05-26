import { describe, expect, it } from 'vitest'

import {
  buildDashboardAgeDistribution,
  buildDashboardSummaryCards,
  resolveDashboardPlanStatus,
} from '../lib/dashboard/dashboard-mappers'

describe('dashboard mappers', () => {
  it('resolves active Conecta subscription status for display', () => {
    expect(resolveDashboardPlanStatus({
      subscription_plan: 'CONECTA',
      subscription_status: 'ACTIVE',
    })).toEqual({
      isConecta: true,
      planLabel: 'Plano Conecta ativo',
    })

    expect(resolveDashboardPlanStatus({
      subscription_plan: 'CONECTA',
      subscription_status: 'CANCELED',
    })).toEqual({
      isConecta: false,
      planLabel: 'Plano Essencial',
    })
  })

  it('maps summary metrics to the configured dashboard cards', () => {
    const items = buildDashboardSummaryCards({
      totalPatients: 12,
      totalExams: 31,
      pendingAlerts: 4,
      sentAlerts: 19,
    })

    expect(items.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'totalPatients', value: 12 },
      { id: 'totalExams', value: 31 },
      { id: 'pendingAlerts', value: 4 },
      { id: 'sentAlerts', value: 19 },
    ])
  })

  it('maps age group counts and preserves the maximum bar reference', () => {
    const distribution = buildDashboardAgeDistribution({
      infant: 2,
      young: 8,
      presbyopia: 5,
      elderly: 1,
    })

    expect(distribution.maxGroupValue).toBe(8)
    expect(distribution.groups.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: 'Infantil / Adolescente (< 18 anos)', value: 2 },
      { label: 'Adulto Jovem (18 - 39 anos)', value: 8 },
      { label: 'Adulto Presbita (40 - 59 anos)', value: 5 },
      { label: 'Idoso (60+ anos)', value: 1 },
    ])
  })
})
