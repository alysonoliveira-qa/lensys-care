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
    odSph: formState.odSph ? parseFloat(formState.odSph) : '',
    odCyl: formState.odCyl ? parseFloat(formState.odCyl) : '',
    odAxis: formState.odAxis ? parseInt(formState.odAxis) : '',
    odVa: formState.odVa || null,
    oeSph: formState.oeSph ? parseFloat(formState.oeSph) : '',
    oeCyl: formState.oeCyl ? parseFloat(formState.oeCyl) : '',
    oeAxis: formState.oeAxis ? parseInt(formState.oeAxis) : '',
    oeVa: formState.oeVa || null,
    addition: formState.addition ? parseFloat(formState.addition) : '',
    pd: formState.pd ? parseFloat(formState.pd) : '',
    prescriptionNotes: formState.prescriptionNotes || null,
  }
}
