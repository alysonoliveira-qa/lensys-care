import { calculateAge, getAgeGroupInfo } from '../refraction'

interface PatientDetailSummarySource {
  dob: Date
}

export function formatClinicalExamDate(examDate: Date | string): string {
  const dateOnly = typeof examDate === 'string'
    ? examDate.slice(0, 10)
    : examDate.toISOString().slice(0, 10)
  const [year, month, day] = dateOnly.split('-')

  return `${day}/${month}/${year}`
}

export function mapPatientDetailSummary(
  patient: PatientDetailSummarySource,
  referenceDate?: Date
) {
  return {
    age: calculateAge(patient.dob, referenceDate),
    ageGroupLabel: getAgeGroupInfo(patient.dob, referenceDate).label,
  }
}
