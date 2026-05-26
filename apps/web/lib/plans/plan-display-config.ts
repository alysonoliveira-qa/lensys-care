export type DisplayPlanId = 'ESSENTIAL' | 'CONECTA'

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
    monthlyPrice: 'R$ 149,90',
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
] as const

export const PUBLIC_PLANS_BADGE_LABEL = 'Lensys Care'
export const PUBLIC_PLANS_TRIAL_BANNER = 'Teste grátis por 7 dias em qualquer plano'
export const PUBLIC_PLANS_FOOTER_MESSAGES = [
  'Durante a fase de validação, o acesso ao sistema está gratuito.',
  'A cobrança dos planos será ativada após a fase de validação.',
] as const

export const DASHBOARD_PLANS_VALIDATION_MESSAGE =
  'Durante a fase de validação, a ativação dos planos é gratuita. A cobrança será ativada posteriormente.'
