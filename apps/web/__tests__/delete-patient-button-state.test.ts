import { describe, expect, it } from 'vitest'

import { getDeletePatientButtonState } from '../components/patients/delete-patient-button-state'

describe('getDeletePatientButtonState', () => {
  it('returns an enabled destructive state when the patient has no exams', () => {
    expect(getDeletePatientButtonState(false)).toEqual({
      label: 'Excluir paciente',
      helper: 'Este paciente não possui exames registrados.',
      variant: 'destructive',
      disabled: false,
      blocked: false,
    })
  })

  it('returns a blocked visual state when the patient has exams', () => {
    expect(getDeletePatientButtonState(true)).toEqual({
      label: 'Exclusão bloqueada',
      helper: 'Paciente com histórico clínico não pode ser excluído.',
      variant: 'outline',
      disabled: true,
      blocked: true,
    })
  })
})
