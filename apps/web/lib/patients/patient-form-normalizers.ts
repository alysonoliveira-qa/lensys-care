export function emptyStringToNull(value: string) {
  return value === '' ? null : value
}

export function normalizePatientName(value: string) {
  return value
}

export function normalizePatientDob(value: string) {
  return value
}

export function normalizePatientPhone(value: string) {
  return emptyStringToNull(value)
}

export function normalizePatientEmail(value: string) {
  return emptyStringToNull(value)
}

export function normalizePatientNotes(value: string) {
  return emptyStringToNull(value)
}
