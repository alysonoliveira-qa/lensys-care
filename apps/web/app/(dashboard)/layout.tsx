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
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar controls */}
        <TopBar />

        {/* Dynamic page content */}
        <main className="flex-grow p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
