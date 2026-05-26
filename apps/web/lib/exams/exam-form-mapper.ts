import {
  emptyStringToNull,
  parseOptionalDecimal,
  parseOptionalInteger,
} from './exam-form-normalizers'

export interface ExamFormPayloadInput {
  patientId: string
  examDate: string
  odSph: string
  odCyl: string
  odAxis: string
  odVa: string
  oeSph: string
  oeCyl: string
  oeAxis: string
  oeVa: string
  addition: string
  pd: string
  prescriptionNotes: string
}

export interface ExamPayload {
  patientId: string
  examDate: string
  odSph: number | ''
  odCyl: number | ''
  odAxis: number | ''
  odVa: string | null
  oeSph: number | ''
  oeCyl: number | ''
  oeAxis: number | ''
  oeVa: string | null
  addition: number | ''
  pd: number | ''
  prescriptionNotes: string | null
}

export function buildExamPayload(formState: ExamFormPayloadInput): ExamPayload {
  return {
    patientId: formState.patientId,
    examDate: formState.examDate,
    odSph: parseOptionalDecimal(formState.odSph),
    odCyl: parseOptionalDecimal(formState.odCyl),
    odAxis: parseOptionalInteger(formState.odAxis),
    odVa: emptyStringToNull(formState.odVa),
    oeSph: parseOptionalDecimal(formState.oeSph),
    oeCyl: parseOptionalDecimal(formState.oeCyl),
    oeAxis: parseOptionalInteger(formState.oeAxis),
    oeVa: emptyStringToNull(formState.oeVa),
    addition: parseOptionalDecimal(formState.addition),
    pd: parseOptionalDecimal(formState.pd),
    prescriptionNotes: emptyStringToNull(formState.prescriptionNotes),
  }
}
