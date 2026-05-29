import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'

import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import {
  getAuthenticatedShellData,
  getPendingAlertsCountForClinic,
} from '@/lib/authenticated-shell'

async function TopBarWithPendingAlerts({ clinicId }: { clinicId: string }) {
  const pendingAlertsCount = await getPendingAlertsCountForClinic(clinicId)

  return <TopBar initialPendingCount={pendingAlertsCount} />
}

export default async function AuthenticatedShellLayout({
  children,
  mainClassName = 'flex-1 min-w-0 overflow-y-auto p-4 md:p-6',
}: {
  children: React.ReactNode
  mainClassName?: string
}) {
  const shellData = await getAuthenticatedShellData()

  if (!shellData) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar
        initialAuthEmail={shellData.userEmail}
        initialClinic={{ name: shellData.profile.clinic_name }}
        initialProfile={{
          full_name: shellData.profile.full_name,
          preferred_name: shellData.profile.preferred_name,
          role: shellData.profile.role,
          clinic_id: shellData.profile.clinic_id,
          clinic: { name: shellData.profile.clinic_name },
        }}
        initialSubscription={shellData.subscription}
      />

      <div className="flex-1 flex min-w-0 flex-col overflow-hidden">
        <Suspense fallback={<TopBar initialPendingCount={0} />}>
          <TopBarWithPendingAlerts clinicId={shellData.profile.clinic_id} />
        </Suspense>

        <main className={mainClassName}>
          {children}
        </main>
      </div>
    </div>
  )
}
