export type DeletePatientButtonState = {
  label: string
  helper: string
  variant: 'destructive' | 'outline'
  disabled: boolean
  blocked: boolean
}

export function getDeletePatientButtonState(hasExams: boolean): DeletePatientButtonState {
  if (hasExams) {
    return {
      label: 'Exclusão bloqueada',
      helper: 'Paciente com histórico clínico não pode ser excluído.',
      variant: 'outline',
      disabled: true,
      blocked: true,
    }
  }

  return {
    label: 'Excluir paciente',
    helper: 'Este paciente não possui exames registrados.',
    variant: 'destructive',
    disabled: false,
    blocked: false,
  }
}
