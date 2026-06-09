export async function sendInviteEmail({
  to,
  token,
  clinicName,
  role,
}: {
  to: string
  token: string
  clinicName: string
  role: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  const inviteUrl = `${appUrl}/convite/${token}`
  const roleLabel = role === 'RECEPTIONIST' ? 'Recepcionista' : 'Optometrista'

  // Por ora loga o link — substituir pelo Resend quando disponível
  console.info(`[INVITE] Para: ${to}`)
  console.info(`[INVITE] Link: ${inviteUrl}`)
  console.info(`[INVITE] Clínica: ${clinicName} | Função: ${roleLabel}`)
}
