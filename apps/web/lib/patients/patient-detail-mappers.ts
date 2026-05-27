import { calculateAge, getAgeGroupInfo } from '../refraction'

interface PatientDetailSummarySource {
  dob: Date
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
