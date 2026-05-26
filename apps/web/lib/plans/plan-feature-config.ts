export type PlanFeature = 'whatsapp' | 'sms' | 'bulk_send'
export type PlanId = 'ESSENTIAL' | 'CONECTA'
export type PlanStatus = string

export interface FeatureUiMeta {
  name: string
  description: string
  benefits: string[]
}

export interface PlanFeatureConfig {
  functionalFeatures: readonly PlanFeature[]
  uiOnlyLabels: readonly string[]
}

export const FEATURE_UI_META: Record<PlanFeature, FeatureUiMeta> = {
  whatsapp: {
    name: 'Alertas automáticos via WhatsApp',
    description:
      'Envie notificações automáticas com alto índice de leitura para lembrar seus pacientes da data de vencimento da receita.',
    benefits: [
      'Disparo automático 1 ano após o exame',
      'Mensagem direta e personalizada',
      'Maior taxa de conversão em reconsultas',
    ],
  },
  sms: {
    name: 'Alertas automatizados via SMS',
    description:
      'Lembre seus pacientes de forma rápida e direta direto na caixa de entrada SMS dos celulares.',
    benefits: [
      'Cobertura de todas as operadoras nacionais',
      'Envio automático em segundo plano',
      'Custo-benefício excelente para recall',
    ],
  },
  bulk_send: {
    name: 'Envio em massa e Recall Inteligente',
    description:
      'Selecione e envie notificações promocionais e de retorno de exames para dezenas de pacientes simultaneamente.',
    benefits: [
      'Envio em um único clique',
      'Filtro avançado por idade e vencimento',
      'Relatório completo de entregas',
    ],
  },
}

export const PLAN_FEATURE_CONFIG: Record<PlanId, PlanFeatureConfig> = {
  ESSENTIAL: {
    functionalFeatures: [],
    uiOnlyLabels: ['Alertas por e-mail'],
  },
  CONECTA: {
    functionalFeatures: ['whatsapp', 'sms', 'bulk_send'],
    uiOnlyLabels: ['Alertas via WhatsApp', 'Alertas via SMS', 'Envio em massa (recall)'],
  },
}

export const ENTITLED_SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIALING'] as const

export function isPremiumFeature(feature: PlanFeature) {
  return PLAN_FEATURE_CONFIG.CONECTA.functionalFeatures.includes(feature)
}

export function isEntitledSubscriptionStatus(status: PlanStatus | null | undefined) {
  return ENTITLED_SUBSCRIPTION_STATUSES.includes(
    (status ?? '') as (typeof ENTITLED_SUBSCRIPTION_STATUSES)[number]
  )
}

export function hasPlanFeatureAccess(
  plan: PlanId | string | null | undefined,
  status: PlanStatus | null | undefined,
  feature: PlanFeature
) {
  if (!isPremiumFeature(feature)) {
    return true
  }

  return plan === 'CONECTA' && isEntitledSubscriptionStatus(status)
}
