import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendInviteEmail } from '@/lib/email/invite'

// ─── POST /api/invites/send ───────────────────────────────────────────────────
// Endpoint HTTP para envio de convite. A action createInvite chama
// sendInviteEmail diretamente; esta rota expõe o mesmo envio via HTTP,
// validando antes que o token exista e ainda esteja PENDING.

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'MISSING_TOKEN', message: 'Token de convite não informado.' },
        { status: 400 }
      )
    }

    // Valida que o token existe e ainda está PENDING.
    // Segurança: destinatário, clínica e função são derivados do registro Invite,
    // nunca do corpo da requisição — impede spoofing/phishing pelo domínio verificado.
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { clinic: { select: { name: true } } },
    })

    if (!invite || invite.status !== 'PENDING' || invite.expires_at < new Date()) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Token de convite inválido ou expirado.' },
        { status: 404 }
      )
    }

    await sendInviteEmail({
      to: invite.email,
      token: invite.token,
      clinicName: invite.clinic.name,
      role: invite.role,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Falha ao enviar email de convite:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Falha ao enviar o e-mail de convite.' },
      { status: 500 }
    )
  }
}
