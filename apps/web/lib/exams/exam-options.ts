export const DEFAULT_VISUAL_ACUITY = '20/20'
export const CUSTOM_VISUAL_ACUITY_OPTION = '__custom__'

export const VISUAL_ACUITY_OPTIONS = [
  { id: '20_20', label: '20/20', value: '20/20' },
  { id: '20_25', label: '20/25', value: '20/25' },
  { id: '20_30', label: '20/30', value: '20/30' },
  { id: '20_40', label: '20/40', value: '20/40' },
  { id: '20_50', label: '20/50', value: '20/50' },
  { id: '20_60', label: '20/60', value: '20/60' },
  { id: '20_80', label: '20/80', value: '20/80' },
  { id: '20_100', label: '20/100', value: '20/100' },
  { id: '20_200', label: '20/200', value: '20/200' },
] as const

export const QUICK_PRESCRIPTION_OPTIONS = [
  {
    id: 'antirreflexo',
    label: 'Antirreflexo',
    text: 'Antirreflexo.',
    dataCy: 'quick-note-antireflexo-checkbox',
  },
  {
    id: 'filtroAzul',
    label: 'Filtro azul',
    text: 'Filtro azul.',
    dataCy: 'quick-note-filtro-azul-checkbox',
  },
  {
    id: 'fotossensivel',
    label: 'Fotossensível',
    text: 'Fotossensível.',
    dataCy: 'quick-note-fotossensivel-checkbox',
  },
] as const

export const PRESCRIPTION_NOTE_OPTIONS = [
  {
    id: 'nao_policarbonato',
    label: 'Não fazer em policarbonato.',
    value: 'Não fazer em policarbonato.',
  },
  {
    id: 'marcas_lentes',
    label: 'Sugiro lentes Hoya, Zeiss, Essilor, Freestyle ou Haytek.',
    value: 'Sugiro lentes Hoya, Zeiss, Essilor, Freestyle ou Haytek.',
  },
  {
    id: 'recomendo_antirreflexo',
    label: 'Recomendo lentes com antirreflexo.',
    value: 'Recomendo lentes com antirreflexo.',
  },
  {
    id: 'retorno_12_meses',
    label: 'Retorno recomendado em 12 meses.',
    value: 'Retorno recomendado em 12 meses.',
  },
  {
    id: 'orientar_adaptacao',
    label: 'Orientar paciente sobre adaptação das lentes.',
    value: 'Orientar paciente sobre adaptação das lentes.',
  },
] as const

export type QuickPrescriptionOptionId = (typeof QUICK_PRESCRIPTION_OPTIONS)[number]['id']

export function isCommonVisualAcuity(value: string) {
  return VISUAL_ACUITY_OPTIONS.some((option) => option.value === value)
}
