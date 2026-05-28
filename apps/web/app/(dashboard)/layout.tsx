import React from 'react'
import AuthenticatedShellLayout from '@/components/layout/AuthenticatedShellLayout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedShellLayout>{children}</AuthenticatedShellLayout>
}
