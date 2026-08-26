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
  it('mantem o envio manual no Essencial e o automatico a partir do Conecta', () => {
    // Decisao de produto: o Essencial ve o alerta e envia na mao. O que o
    // Conecta compra e o disparo sozinho. Envio em massa continua separando
    // Professional de Conecta.
    expect(PLAN_FEATURE_CONFIG.ESSENTIAL.functionalFeatures).toEqual([])
    expect(PLAN_FEATURE_CONFIG.CONECTA.functionalFeatures).toEqual([
      'auto_alerts',
      'whatsapp',
      'sms',
    ])
    expect(PLAN_FEATURE_CONFIG.PROFESSIONAL.functionalFeatures).toEqual([
      'auto_alerts',
      'whatsapp',
      'sms',
      'bulk_send',
      'financeiro',
    ])
  })

  it('nao da recall automatico ao Essencial', () => {
    // O cron consulta este gate antes de qualquer canal. Se `auto_alerts` vazar
    // para o plano base, o Essencial passa a receber disparo sozinho de graca e
    // o Conecta perde a unica coisa que hoje entrega de verdade.
    expect(hasPlanFeatureAccess('ESSENTIAL', 'ACTIVE', 'auto_alerts')).toBe(false)
    expect(hasPlanFeatureAccess('CONECTA', 'ACTIVE', 'auto_alerts')).toBe(true)
    expect(hasPlanFeatureAccess('CONECTA', 'TRIALING', 'auto_alerts')).toBe(true)
    expect(hasPlanFeatureAccess('CONECTA', 'CANCELED', 'auto_alerts')).toBe(false)
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'ACTIVE', 'auto_alerts')).toBe(true)
    expect(isPremiumFeature('auto_alerts')).toBe(true)
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

    // O Financeiro so existe do Professional para cima: e o que o plano cobra.
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'ACTIVE', 'financeiro')).toBe(true)
    expect(hasPlanFeatureAccess('CONECTA', 'ACTIVE', 'financeiro')).toBe(false)
    expect(hasPlanFeatureAccess('ESSENTIAL', 'ACTIVE', 'financeiro')).toBe(false)
    expect(hasPlanFeatureAccess('PROFESSIONAL', 'CANCELED', 'financeiro')).toBe(false)
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
