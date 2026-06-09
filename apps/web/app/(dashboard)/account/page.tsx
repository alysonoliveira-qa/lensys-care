import { redirect } from 'next/navigation'
import AccountForm from '@/components/account/AccountForm'
import TeamSection from '@/components/account/TeamSection'
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'
import { prisma } from '@/lib/db'

export const revalidate = 0

export default async function AccountPage() {
  const shellData = await getAuthenticatedShellData()

  if (!shellData) {
    redirect('/login')
  }

  const clinicId = shellData.profile.clinic_id
  const isOwner = shellData.profile.role === 'OWNER'

  const [members, pendingInvites] = await Promise.all([
    prisma.profile.findMany({
      where: { clinic_id: clinicId },
      orderBy: { created_at: 'asc' },
      select: { id: true, full_name: true, preferred_name: true, role: true, created_at: true },
    }),
    isOwner
      ? prisma.invite.findMany({
          where: {
            clinic_id: clinicId,
            status: 'PENDING',
            expires_at: { gt: new Date() },
          },
          orderBy: { created_at: 'desc' },
          select: { id: true, email: true, role: true, expires_at: true },
        })
      : Promise.resolve([]),
  ])

  return (
    <div className="space-y-8">
      <AccountForm
        initialValues={{
          fullName: shellData.profile.full_name,
          preferredName: shellData.profile.preferred_name ?? '',
          email: shellData.userEmail ?? '',
        }}
      />

      <TeamSection
        currentUserId={shellData.userId}
        isOwner={isOwner}
        members={members.map((member) => ({
          id: member.id,
          fullName: member.full_name,
          preferredName: member.preferred_name,
          role: member.role,
          createdAt: member.created_at.toISOString(),
        }))}
        pendingInvites={pendingInvites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expires_at.toISOString(),
        }))}
      />
    </div>
  )
}
