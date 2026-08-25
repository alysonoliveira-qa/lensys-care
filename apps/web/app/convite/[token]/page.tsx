import Link from 'next/link'
import BrandMark from '@/components/brand/BrandMark'
import { prisma } from '@/lib/db'
import AcceptInviteForm from './AcceptInviteForm'

export const revalidate = 0

const ROLE_LABELS: Record<string, string> = {
  OPTOMETRIST: 'Optometrista',
  RECEPTIONIST: 'Recepcionista',
  OWNER: 'Proprietário',
}

interface InvitePageProps {
  params: { token: string }
}

function InviteErrorShell({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="pointer-events-none absolute left-[-20%] top-[-20%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl">
        <h1 className="text-xl font-bold text-white" data-cy="invite-error">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  )
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = params

  const invite = await prisma.invite
    .findUnique({
      where: { token },
      include: { clinic: { select: { name: true } } },
    })
    .catch(() => null)

  if (!invite) {
    return (
      <InviteErrorShell
        title="Convite não encontrado"
        description="Este link de convite é inválido. Confirme com o proprietário da clínica se o link está correto."
      />
    )
  }

  if (invite.status !== 'PENDING') {
    return (
      <InviteErrorShell
        title="Convite indisponível"
        description="Este convite já foi utilizado ou foi revogado. Solicite um novo convite ao proprietário da clínica."
      />
    )
  }

  if (invite.expires_at < new Date()) {
    return (
      <InviteErrorShell
        title="Convite expirado"
        description="Este convite expirou. Solicite um novo ao proprietário da clínica."
      />
    )
  }

  const roleLabel = ROLE_LABELS[invite.role] ?? invite.role

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="pointer-events-none absolute left-[-20%] top-[-20%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="z-10 w-full max-w-md" data-cy="invite-page">
        <div className="mb-6 text-center">
          <BrandMark className="mx-auto mb-3 h-14 w-14 text-indigo-400" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Lensys <span className="text-indigo-400">Care</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Você foi convidado para entrar na clínica{' '}
            <span className="font-semibold text-white" data-cy="invite-clinic-name">
              {invite.clinic.name}
            </span>{' '}
            como{' '}
            <span className="font-semibold text-indigo-300" data-cy="invite-role">
              {roleLabel}
            </span>
            .
          </p>
        </div>

        <AcceptInviteForm token={token} email={invite.email} />
      </div>
    </div>
  )
}
