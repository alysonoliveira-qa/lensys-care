import { describe, expect, it } from 'vitest'

import {
  FEATURE_UI_META,
  PLAN_FEATURE_CONFIG,
  hasPlanFeatureAccess,
  isEntitledSubscriptionStatus,
  isPremiumFeature,
  planIncludesPremiumFeatures,
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

  it('da ao Professional tudo que o Conecta tem', () => {
    // Regressao: `plan === 'CONECTA'` fazia o plano MAIS CARO perder WhatsApp,
    // SMS e envio em massa — quem pagava mais recebia menos.
    expect(PLAN_FEATURE_CONFIG.PROFESSIONAL.functionalFeatures).toEqual(
      PLAN_FEATURE_CONFIG.CONECTA.functionalFeatures
    )

    expect(hasPlanFeatureAccess('PROFESSIONAL', 'ACTIVE', 'whatsapp')).toBe(true)
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'TRIALING', 'sms')).toBe(true)
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'ACTIVE', 'bulk_send')).toBe(true)
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'CANCELED', 'whatsapp')).toBe(false)
  })

  it('nega recursos pagos a plano desconhecido em vez de adivinhar', () => {
    expect(hasPlanFeatureAccess('PLANO_QUE_NAO_EXISTE', 'ACTIVE', 'whatsapp')).toBe(false)
    expect(hasPlanFeatureAccess(null, 'ACTIVE', 'sms')).toBe(false)
    expect(planIncludesPremiumFeatures('PLANO_QUE_NAO_EXISTE')).toBe(false)
  })

  it('nao confunde chave herdada do Object.prototype com um plano', () => {
    // Acesso direto por indice devolveria o construtor do Object aqui, e a
    // leitura de functionalFeatures estouraria em vez de negar o acesso.
    for (const key of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(planIncludesPremiumFeatures(key)).toBe(false)
      expect(() => hasPlanFeatureAccess(key, 'ACTIVE', 'whatsapp')).not.toThrow()
      expect(hasPlanFeatureAccess(key, 'ACTIVE', 'whatsapp')).toBe(false)
    }
  })

  it('sabe quais planos incluem os recursos de relacionamento', () => {
    expect(planIncludesPremiumFeatures('ESSENTIAL')).toBe(false)
    expect(planIncludesPremiumFeatures('CONECTA')).toBe(true)
    expect(planIncludesPremiumFeatures('PROFESSIONAL')).toBe(true)
  })

  it('keeps status checks and feature UI metadata explicit', () => {
    expect(isEntitledSubscriptionStatus('ACTIVE')).toBe(true)
    expect(isEntitledSubscriptionStatus('TRIALING')).toBe(true)
    expect(isEntitledSubscriptionStatus('PAST_DUE')).toBe(false)
    expect(isPremiumFeature('sms')).toBe(true)
    expect(FEATURE_UI_META.bulk_send.name).toBe('Envio em massa e Recall Inteligente')
  })
})
