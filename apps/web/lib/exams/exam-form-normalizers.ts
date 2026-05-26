export function parseOptionalDecimal(value: string): number | '' {
  return value ? parseFloat(value) : ''
}

export function parseOptionalInteger(value: string): number | '' {
  return value ? parseInt(value) : ''
}

export function emptyStringToNull(value: string): string | null {
  return value || null
}
