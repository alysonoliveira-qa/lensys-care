'use client'

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'

interface SidebarPlanStatusProps {
  isCollapsed: boolean
  isConecta: boolean
  plansHref: string
  onPlansClick?: () => void
}

export default function SidebarPlanStatus({
  isCollapsed,
  isConecta,
  plansHref,
  onPlansClick,
}: SidebarPlanStatusProps) {
  if (isCollapsed) {
    return null
  }

  return (
    <div className="m-4 flex flex-col items-center gap-2 rounded-xl border-t border-slate-800 bg-slate-950/40 px-4 py-3">
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Seu Plano:</span>
        <Badge variant={isConecta ? 'premium' : 'secondary'} className="px-2 py-0.5 text-[10px] font-bold">
          {isConecta ? 'Conecta' : 'Essencial'}
        </Badge>
      </div>

      {!isConecta && (
        <Link href={plansHref} className="w-full text-center" onClick={onPlansClick}>
          <span className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline">
            Upgrade para WhatsApp/SMS
          </span>
        </Link>
      )}
    </div>
  )
}
