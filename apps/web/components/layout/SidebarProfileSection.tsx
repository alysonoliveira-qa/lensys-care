'use client'

import { useState } from 'react'
import { PencilLine, User } from 'lucide-react'
import { getDisplayName, getRoleLabel } from '@/lib/profile'
import PreferredDisplayNameDialog, { type UpdatedProfileSummary } from './PreferredDisplayNameDialog'

interface SidebarProfileSectionProps {
  authEmail: string | null
  fullName: string | null | undefined
  preferredName: string | null | undefined
  role: string | null | undefined
  isCollapsed: boolean
  onProfileUpdated: (profile: UpdatedProfileSummary) => void
}

export default function SidebarProfileSection({
  authEmail,
  fullName,
  preferredName,
  role,
  isCollapsed,
  onProfileUpdated,
}: SidebarProfileSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const displayName = getDisplayName({
    preferredName,
    fullName,
    email: authEmail,
  })
  const roleLabel = getRoleLabel(role)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        title={isCollapsed ? displayName : undefined}
        className={`group rounded-xl text-left transition-colors hover:bg-slate-800/50 ${
          isCollapsed ? 'flex h-11 w-11 items-center justify-center p-0' : 'flex min-w-0 flex-1 items-center gap-3 px-2 py-2'
        }`}
        data-cy="sidebar-profile-button"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
          <User className="h-4.5 w-4.5" />
        </div>
        {!isCollapsed && (
          <>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold leading-none text-white">
                {displayName}
              </span>
              <span className="mt-1 block truncate text-[10px] text-slate-500">{roleLabel}</span>
            </div>
            <PencilLine className="h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover:text-indigo-400" />
          </>
        )}
      </button>

      {isDialogOpen && (
        <PreferredDisplayNameDialog
          preferredName={preferredName}
          onClose={() => setIsDialogOpen(false)}
          onProfileUpdated={onProfileUpdated}
        />
      )}
    </>
  )
}
