type DisplayNameInput = {
  preferredName?: string | null
  fullName?: string | null
  email?: string | null
}

function cleanValue(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function getDisplayName({ preferredName, fullName, email }: DisplayNameInput) {
  const safePreferredName = cleanValue(preferredName)
  if (safePreferredName) {
    return safePreferredName
  }

  const safeFullName = cleanValue(fullName)
  if (safeFullName) {
    return safeFullName
  }

  const safeEmail = cleanValue(email)
  if (safeEmail) {
    const localPart = safeEmail.split('@')[0]?.trim()
    if (localPart) {
      return localPart
    }
  }

  return 'Usuário'
}

export function getRoleLabel(role?: string | null) {
  switch (role) {
    case 'OWNER':
      return 'Proprietário'
    case 'OPTOMETRIST':
      return 'Optometrista'
    case 'RECEPTIONIST':
      return 'Recepcionista'
    default:
      return 'Profissional'
  }
}
