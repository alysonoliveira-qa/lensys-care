export type PlanFeature = 'whatsapp' | 'sms' | 'bulk_send'
export type PlanId = 'ESSENTIAL' | 'CONECTA' | 'PROFESSIONAL'
export type PlanStatus = string

/**
 * Plano base: o que ele **não** tem é o que define um recurso como premium.
 * Derivar daqui evita que um plano novo, acima do Conecta, apareça como se não
 * tivesse os recursos pagos só porque o código comparava com 'CONECTA'.
 */
export const BASE_PLAN_ID: PlanId = 'ESSENTIAL'

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
  // O Conecta cobre o envio manual: alerta por WhatsApp e SMS. O recall em massa
  // e automatizado, entao pertence ao Professional — e o que separa os dois.
  //
  // Os rotulos dizem "em breve" porque o envio depende de credencial Twilio, e
  // nao ha conta Twilio criada: sem TWILIO_ACCOUNT_SID o provider lanca erro no
  // momento do disparo. O gate funcional fica como esta — no dia que a conta
  // existir, o recurso passa a valer sem mexer em codigo. Ao configurar, tirar
  // o "(em breve)" daqui e de plan-display-config.
  CONECTA: {
    functionalFeatures: ['whatsapp', 'sms'],
    uiOnlyLabels: ['Alertas via WhatsApp (em breve)', 'Alertas via SMS (em breve)'],
  },
  // `bulk_send` fica aqui para o gate ja apontar o plano certo quando a tela de
  // envio em massa existir. Hoje ela nao existe: nenhum ponto do app consulta
  // esse recurso, por isso o rotulo diz "em breve" em vez de prometer pronto.
  PROFESSIONAL: {
    functionalFeatures: ['whatsapp', 'sms', 'bulk_send'],
    uiOnlyLabels: [
      'Alertas via WhatsApp',
      'Alertas via SMS',
      'Envio em massa e recall automatizado (em breve)',
      'Módulo Financeiro (em breve)',
    ],
  },
}

/**
 * Config do plano, ou `undefined` se o plano não for conhecido.
 *
 * Usa `hasOwnProperty` de propósito: um acesso direto por índice alcançaria
 * chaves herdadas do Object.prototype ("constructor", "toString"), devolvendo
 * algo que não é config e quebrando na hora de ler `functionalFeatures`. Aqui
 * plano desconhecido é sempre `undefined`, e quem chama nega o acesso.
 */
function readPlanConfig(plan: PlanId | string | null | undefined): PlanFeatureConfig | undefined {
  if (typeof plan !== 'string') return undefined
  if (!Object.prototype.hasOwnProperty.call(PLAN_FEATURE_CONFIG, plan)) return undefined

  return PLAN_FEATURE_CONFIG[plan as PlanId]
}

export const ENTITLED_SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIALING'] as const

/** Recurso que o plano base não inclui — ou seja, exige plano pago acima dele. */
export function isPremiumFeature(feature: PlanFeature) {
  return !PLAN_FEATURE_CONFIG[BASE_PLAN_ID].functionalFeatures.includes(feature)
}

/**
 * `true` quando o plano inclui os recursos de relacionamento (WhatsApp, SMS,
 * envio em massa), independente de qual plano seja. Não considera o status da
 * assinatura — quem chama combina com a regra de status que fizer sentido ali.
 */
export function planIncludesPremiumFeatures(plan: PlanId | string | null | undefined): boolean {
  const config = readPlanConfig(plan)
  return config !== undefined && config.functionalFeatures.length > 0
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

  // Lê a lista do próprio plano em vez de comparar com um plano fixo: um plano
  // desconhecido cai fora por não ter config, e um plano acima do Conecta
  // continua tendo o que paga para ter.
  const config = readPlanConfig(plan)

  return (
    config !== undefined &&
    config.functionalFeatures.includes(feature) &&
    isEntitledSubscriptionStatus(status)
  )
}
