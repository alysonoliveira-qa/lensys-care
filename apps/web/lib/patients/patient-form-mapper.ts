import {
  normalizePatientDob,
  normalizePatientEmail,
  normalizePatientName,
  normalizePatientNotes,
  normalizePatientPhone,
} from './patient-form-normalizers'

export type PatientFormValues = {
  fullName: string
  dob: string
  phone: string
  email: string
  notes: string
}

type BuildPatientPayloadInput = PatientFormValues & {
  patientId?: string
}

export function buildPatientPayload({
  patientId,
  fullName,
  dob,
  phone,
  email,
  notes,
}: BuildPatientPayloadInput) {
  return {
    patientId,
    fullName: normalizePatientName(fullName),
    dob: normalizePatientDob(dob),
    phone: normalizePatientPhone(phone),
    email: normalizePatientEmail(email),
    notes: normalizePatientNotes(notes),
  }
}
