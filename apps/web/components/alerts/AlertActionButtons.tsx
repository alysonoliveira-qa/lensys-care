'use client'

import Link from 'next/link'
import { CheckCircle2, Eye, Loader2, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface AlertActionButtonsProps {
  alertStatus: 'PENDING' | 'SENT' | 'DISMISSED'
  isLoading: boolean
  isSuccess: boolean
  patientId: string
  onDismiss: () => void
  onResend: () => void
}

export default function AlertActionButtons({
  alertStatus,
  isLoading,
  isSuccess,
  patientId,
  onDismiss,
  onResend,
}: AlertActionButtonsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link href={`/patients/${patientId}`} passHref>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-lg border-slate-200 px-2.5 text-[11px] font-semibold dark:border-slate-800"
          title="Ver ficha"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </Link>

      {alertStatus === 'PENDING' ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border-slate-200 px-2.5 text-[11px] font-semibold hover:border-red-500/20 hover:text-red-500 dark:border-slate-800"
            onClick={onDismiss}
            disabled={isLoading}
            title="Dispensar alerta"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            size="sm"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-3 text-[11px] font-semibold hover:bg-indigo-500"
            onClick={onResend}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Disparando...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Disparado!</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Recall Manual</span>
              </>
            )}
          </Button>
        </>
      ) : null}
    </div>
  )
}
