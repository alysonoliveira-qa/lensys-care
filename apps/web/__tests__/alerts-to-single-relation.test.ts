import { describe, expect, it } from 'vitest'

import { toSingleRelation } from '../lib/alerts/alert-relations'

describe('toSingleRelation', () => {
  // Regressao: o embed to-one do PostgREST volta OBJETO, e o codigo lia
  // `patients[0]`. Isso era `undefined` sempre, entao o disparo descartava todo
  // alerta antes de tentar enviar e o reenvio manual respondia 404. O recall
  // nunca entregou um lembrete — nem automatico, nem no botao.
  it('devolve o proprio objeto quando o embed vem como objeto', () => {
    const patient = { full_name: 'Maria', email: 'maria@exemplo.com' }
    expect(toSingleRelation(patient)).toBe(patient)
  })

  it('devolve o primeiro item quando o embed vem como array', () => {
    const patient = { full_name: 'Maria', email: 'maria@exemplo.com' }
    expect(toSingleRelation([patient])).toBe(patient)
  })

  it('devolve null para array vazio, null e undefined', () => {
    expect(toSingleRelation([])).toBeNull()
    expect(toSingleRelation(null)).toBeNull()
    expect(toSingleRelation(undefined)).toBeNull()
  })
})
