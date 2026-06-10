import { resend } from './resend'

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

  // Fallback de desenvolvimento: sem chave configurada, apenas loga o link
  // para não quebrar o fluxo local. Em produção a chave existe e o envio é real.
  if (!process.env.RESEND_API_KEY) {
    console.info(`[INVITE] (sem RESEND_API_KEY) Link para ${to}: ${inviteUrl}`)
    console.info(`[INVITE] Clínica: ${clinicName} | Função: ${roleLabel}`)
    return
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'Lensys Care <noreply@lensyscare.com.br>',
    to,
    subject: `Você foi convidado para a clínica ${clinicName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Você foi convidado!</h2>
        <p>Você recebeu um convite para entrar na clínica <strong>${clinicName}</strong> como <strong>${roleLabel}</strong> no Lensys Care.</p>
        <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
        <a href="${inviteUrl}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Aceitar convite
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px;">
          Este link expira em 72 horas. Se você não esperava este convite, ignore este email.
        </p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Falha ao enviar email de convite via Resend: ${error.message}`)
  }
}
