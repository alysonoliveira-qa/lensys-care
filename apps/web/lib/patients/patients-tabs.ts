export type PatientsTab = 'pacientes' | 'indicantes'

export interface PatientsTabConfigItem {
  id: PatientsTab
  label: string
  dataCy: string
}

export const PATIENTS_TABS: PatientsTabConfigItem[] = [
  { id: 'pacientes', label: 'Pacientes', dataCy: 'patients-tab-pacientes' },
  { id: 'indicantes', label: 'Indicantes', dataCy: 'patients-tab-indicantes' },
]

export const DEFAULT_PATIENTS_TAB: PatientsTab = 'pacientes'

export function parsePatientsTab(value: string | undefined | null): PatientsTab {
  return value === 'indicantes' ? 'indicantes' : DEFAULT_PATIENTS_TAB
}

/** A aba vive na URL para sobreviver ao refresh das server actions. */
export function buildPatientsTabHref(tab: PatientsTab): string {
  return tab === DEFAULT_PATIENTS_TAB ? '/patients' : `/patients?tab=${tab}`
}
