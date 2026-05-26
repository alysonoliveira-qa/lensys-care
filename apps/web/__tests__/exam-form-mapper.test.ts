import { describe, expect, it } from 'vitest'
import { buildExamPayload } from '../lib/exams/exam-form-mapper'

describe('buildExamPayload', () => {
  it('normalizes entered exam values without changing manual acuity or notes', () => {
    expect(buildExamPayload({
      patientId: 'patient-1',
      examDate: '2026-05-26',
      odSph: '-1.25',
      odCyl: '-0.50',
      odAxis: '90',
      odVa: '20/37',
      oeSph: '0.25',
      oeCyl: '-1.00',
      oeAxis: '180',
      oeVa: '20/20',
      addition: '1.75',
      pd: '63.5',
      prescriptionNotes: 'Antirreflexo.\nRetorno recomendado em 12 meses.',
    })).toEqual({
      patientId: 'patient-1',
      examDate: '2026-05-26',
      odSph: -1.25,
      odCyl: -0.5,
      odAxis: 90,
      odVa: '20/37',
      oeSph: 0.25,
      oeCyl: -1,
      oeAxis: 180,
      oeVa: '20/20',
      addition: 1.75,
      pd: 63.5,
      prescriptionNotes: 'Antirreflexo.\nRetorno recomendado em 12 meses.',
    })
  })

  it('preserves empty optional values as the existing API payload contract', () => {
    expect(buildExamPayload({
      patientId: 'patient-1',
      examDate: '2026-05-26',
      odSph: '',
      odCyl: '',
      odAxis: '',
      odVa: '',
      oeSph: '',
      oeCyl: '',
      oeAxis: '',
      oeVa: '',
      addition: '',
      pd: '',
      prescriptionNotes: '',
    })).toEqual({
      patientId: 'patient-1',
      examDate: '2026-05-26',
      odSph: '',
      odCyl: '',
      odAxis: '',
      odVa: null,
      oeSph: '',
      oeCyl: '',
      oeAxis: '',
      oeVa: null,
      addition: '',
      pd: '',
      prescriptionNotes: null,
    })
  })
})
