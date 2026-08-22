export type DisplayPlanId = 'ESSENTIAL' | 'CONECTA' | 'PROFESSIONAL'

export interface PlanDisplayConfig {
  id: DisplayPlanId
  name: string
  monthlyPrice: string
  monthlyPriceSuffix: string
  trialLabel: string
  shortDescription: string
  publicDescription: string
  dashboardDescription: string
  publicFeatures: string[]
  dashboardFeatures: string[]
  featured: boolean
  recommendedLabel?: string
  tierLabel?: string
  publicCardDataCy: string
  dashboardCardDataCy: string
  dashboardButtonDataCy: string
}

export const PLAN_DISPLAY_CONFIG: PlanDisplayConfig[] = [
  {
    id: 'ESSENTIAL',
    name: 'Essencial',
    monthlyPrice: 'R$ 79,90',
    monthlyPriceSuffix: '/mês',
    trialLabel: 'Teste grátis por 7 dias',
    shortDescription: 'Organização da rotina clínica com pacientes, exames e retornos em um único lugar.',
    publicDescription: 'Para consultórios e profissionais que querem organizar a rotina clínica com clareza e agilidade.',
    dashboardDescription: 'Organização da rotina clínica com pacientes, exames e retornos em um único lugar.',
    publicFeatures: [
      'Pacientes e histórico clínico',
      'Registro de exames e refração',
      'Evolução clínica centralizada',
      'Alertas de retorno e renovação',
    ],
    dashboardFeatures: [
      'Pacientes e histórico clínico',
      'Registro de exames e refração',
      'Alertas de retorno e renovação',
    ],
    featured: false,
    tierLabel: 'Base',
    publicCardDataCy: 'essential-plan-card',
    dashboardCardDataCy: 'essential-plan-card',
    dashboardButtonDataCy: 'activate-essential-plan-button',
  },
  {
    id: 'CONECTA',
    name: 'Conecta',
    monthlyPrice: 'R$ 119,90',
    monthlyPriceSuffix: '/mês',
    trialLabel: 'Teste grátis por 7 dias',
    shortDescription: 'Mais automações para relacionamento e acompanhamento recorrente da clínica.',
    publicDescription: 'Para operações que desejam ampliar acompanhamento, recorrência e visão da rotina clínica.',
    dashboardDescription: 'Mais automações para relacionamento e acompanhamento recorrente da clínica.',
    publicFeatures: [
      'Tudo do plano Essencial',
      'Mais apoio à rotina de relacionamento',
      'Fluxos de retorno e acompanhamento',
      'Maior visão operacional da clínica',
    ],
    dashboardFeatures: [
      'Tudo do Essencial',
      'Alertas previstos via WhatsApp e SMS',
      'Recall em massa previsto',
    ],
    featured: true,
    recommendedLabel: 'Recomendado',
    publicCardDataCy: 'connect-plan-card',
    dashboardCardDataCy: 'connect-plan-card',
    dashboardButtonDataCy: 'activate-connect-plan-button',
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    monthlyPrice: 'R$ 149,90',
    monthlyPriceSuffix: '/mês',
    trialLabel: 'Teste grátis por 7 dias',
    shortDescription:
      'Tudo do Conecta, com as rotinas de mensagem automatizadas e o módulo financeiro.',
    publicDescription:
      'Para clínicas que querem tirar da mão o trabalho repetitivo de relacionamento e acompanhar o financeiro no mesmo lugar.',
    dashboardDescription:
      'Tudo do Conecta, com as rotinas de mensagem automatizadas e o módulo financeiro.',
    publicFeatures: [
      'Tudo do plano Conecta',
      'Automação das rotinas de mensagem (em breve)',
      'Módulo financeiro (em breve)',
    ],
    dashboardFeatures: [
      'Tudo do Conecta',
      'Automação das rotinas de mensagem (em breve)',
      'Módulo financeiro (em breve)',
    ],
    featured: false,
    tierLabel: 'Completo',
    publicCardDataCy: 'professional-plan-card',
    dashboardCardDataCy: 'professional-plan-card',
    dashboardButtonDataCy: 'activate-professional-plan-button',
  },
] as const

const DISPLAY_PLAN_IDS = PLAN_DISPLAY_CONFIG.map((plan) => plan.id)

/**
 * Reduz o plano vindo do banco a um id conhecido. Plano ausente ou não mapeado
 * cai no base — mas um plano conhecido **nunca** é rebaixado, que era o efeito
 * do antigo `plan === 'CONECTA' ? 'CONECTA' : 'ESSENTIAL'`.
 */
export function resolveDisplayPlanId(plan: string | null | undefined): DisplayPlanId {
  return DISPLAY_PLAN_IDS.includes(plan as DisplayPlanId) ? (plan as DisplayPlanId) : 'ESSENTIAL'
}

/** Nome de exibição do plano ("Essencial", "Conecta", "Professional"). */
export function getPlanDisplayName(plan: string | null | undefined): string {
  const id = resolveDisplayPlanId(plan)
  return PLAN_DISPLAY_CONFIG.find((item) => item.id === id)?.name ?? 'Essencial'
}

export const PUBLIC_PLANS_BADGE_LABEL = 'Lensys Care'
export const PUBLIC_PLANS_TRIAL_BANNER = 'Teste grátis por 7 dias em qualquer plano'
// Estas mensagens descrevem a cobrança para quem está prestes a assinar, então
// precisam corresponder ao que o sistema faz de verdade: trial de 7 dias vindo
// de TRIAL_PERIOD_DAYS e cancelamento pelo portal do Stripe (/api/stripe/portal).
// Ao mexer aqui, conferir os dois — dizer "gratuito" numa página que cobra é o
// tipo de erro que vira contestação de cobrança.
export const PUBLIC_PLANS_FOOTER_MESSAGES = [
  'Todos os planos começam com 7 dias grátis.',
  'Você só é cobrado se continuar depois do teste. Cancele quando quiser, direto pelo painel.',
] as const

export const DASHBOARD_PLANS_VALIDATION_MESSAGE =
  'Você tem 7 dias grátis para testar. A cobrança começa ao fim do período de teste, e você pode cancelar antes sem pagar nada.'
