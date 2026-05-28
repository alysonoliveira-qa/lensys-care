import { redirect } from 'next/navigation'
import AccountForm from '@/components/account/AccountForm'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function AccountPage() {
  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      full_name: true,
      preferred_name: true,
    },
  })

  if (!profile) {
    redirect('/login')
  }

  return (
    <AccountForm
      initialValues={{
        fullName: profile.full_name,
        preferredName: profile.preferred_name ?? '',
        email: user.email ?? '',
      }}
    />
  )
}
