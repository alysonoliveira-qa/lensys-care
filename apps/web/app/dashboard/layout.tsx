import React from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex min-w-0 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 min-w-0 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
