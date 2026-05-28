import React from 'react'
import AuthenticatedShellLayout from '@/components/layout/AuthenticatedShellLayout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthenticatedShellLayout mainClassName="flex-1 min-w-0 overflow-y-auto p-6">
      {children}
    </AuthenticatedShellLayout>
  )
}
