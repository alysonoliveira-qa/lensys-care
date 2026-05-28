import { redirect } from 'next/navigation'
import AccountForm from '@/components/account/AccountForm'
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'

export const revalidate = 0

export default async function AccountPage() {
  const shellData = await getAuthenticatedShellData()

  if (!shellData) {
    redirect('/login')
  }

  return (
    <AccountForm
      initialValues={{
        fullName: shellData.profile.full_name,
        preferredName: shellData.profile.preferred_name ?? '',
        email: shellData.userEmail ?? '',
      }}
    />
  )
}
