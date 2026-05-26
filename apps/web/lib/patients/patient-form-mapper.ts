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
    fullName,
    dob,
    phone: phone || null,
    email: email || null,
    notes: notes || null,
  }
}
