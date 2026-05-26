import { describe, expect, it } from 'vitest'

import {
  FEATURE_UI_META,
  PLAN_FEATURE_CONFIG,
  hasPlanFeatureAccess,
  isEntitledSubscriptionStatus,
  isPremiumFeature,
} from '../lib/plans/plan-feature-config'

describe('plan feature config', () => {
  it('keeps premium functional features assigned to Conecta only', () => {
    expect(PLAN_FEATURE_CONFIG.CONECTA.functionalFeatures).toEqual([
      'whatsapp',
      'sms',
      'bulk_send',
    ])
    expect(PLAN_FEATURE_CONFIG.ESSENTIAL.functionalFeatures).toEqual([])
  })

  it('grants premium access only for active or trialing Conecta subscriptions', () => {
    expect(hasPlanFeatureAccess('CONECTA', 'ACTIVE', 'whatsapp')).toBe(true)
    expect(hasPlanFeatureAccess('CONECTA', 'TRIALING', 'sms')).toBe(true)
    expect(hasPlanFeatureAccess('CONECTA', 'CANCELED', 'bulk_send')).toBe(false)
    expect(hasPlanFeatureAccess('ESSENTIAL', 'ACTIVE', 'whatsapp')).toBe(false)
  })

  it('keeps status checks and feature UI metadata explicit', () => {
    expect(isEntitledSubscriptionStatus('ACTIVE')).toBe(true)
    expect(isEntitledSubscriptionStatus('TRIALING')).toBe(true)
    expect(isEntitledSubscriptionStatus('PAST_DUE')).toBe(false)
    expect(isPremiumFeature('sms')).toBe(true)
    expect(FEATURE_UI_META.bulk_send.name).toBe('Envio em massa e Recall Inteligente')
  })
})
