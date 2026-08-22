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
  it('mantem o envio manual no Conecta e o automatizado so no Professional', () => {
    // Decisao de produto: recall em massa e automatizado, entao e o que separa
    // Professional de Conecta. O Conecta cobre o envio manual.
    expect(PLAN_FEATURE_CONFIG.ESSENTIAL.functionalFeatures).toEqual([])
    expect(PLAN_FEATURE_CONFIG.CONECTA.functionalFeatures).toEqual(['whatsapp', 'sms'])
    expect(PLAN_FEATURE_CONFIG.PROFESSIONAL.functionalFeatures).toEqual([
      'whatsapp',
      'sms',
      'bulk_send',
    ])
  })

  it('grants premium access only for active or trialing Conecta subscriptions', () => {
    expect(hasPlanFeatureAccess('CONECTA', 'ACTIVE', 'whatsapp')).toBe(true)
    expect(hasPlanFeatureAccess('CONECTA', 'TRIALING', 'sms')).toBe(true)
    expect(hasPlanFeatureAccess('CONECTA', 'CANCELED', 'bulk_send')).toBe(false)
    expect(hasPlanFeatureAccess('ESSENTIAL', 'ACTIVE', 'whatsapp')).toBe(false)
  })

  it('da ao Professional tudo que o Conecta tem, e mais', () => {
    // Regressao: `plan === 'CONECTA'` fazia o plano MAIS CARO perder WhatsApp e
    // SMS — quem pagava mais recebia menos.
    for (const feature of PLAN_FEATURE_CONFIG.CONECTA.functionalFeatures) {
      expect(PLAN_FEATURE_CONFIG.PROFESSIONAL.functionalFeatures).toContain(feature)
    }

    expect(hasPlanFeatureAccess('PROFESSIONAL', 'ACTIVE', 'whatsapp')).toBe(true)
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'TRIALING', 'sms')).toBe(true)
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'ACTIVE', 'bulk_send')).toBe(true)
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'CANCELED', 'whatsapp')).toBe(false)
  })

  it('nega o envio em massa ao Conecta', () => {
    expect(hasPlanFeatureAccess('CONECTA', 'ACTIVE', 'bulk_send')).toBe(false)
    expect(hasPlanFeatureAccess('CONECTA', 'TRIALING', 'bulk_send')).toBe(false)
    // O que ele tem continua valendo.
    expect(hasPlanFeatureAccess('CONECTA', 'ACTIVE', 'whatsapp')).toBe(true)
    expect(hasPlanFeatureAccess('CONECTA', 'ACTIVE', 'sms')).toBe(true)
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
