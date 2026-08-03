'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, UserRound } from 'lucide-react'

import {
  setAppointmentStatus,
  type AppointmentActionState,
} from '@/app/(dashboard)/agenda/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AppointmentAction } from '@/lib/appointments/appointments-config'
import type { AppointmentRow } from '@/lib/appointments/appointments-mappers'

const IDLE_STATE: AppointmentActionState = { status: 'idle', message: '' }

function StatusActionButton({ action }: { action: AppointmentAction }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      name="status"
      value={action.nextStatus}
      size="sm"
      variant={action.buttonVariant}
      disabled={pending}
      className="h-8 rounded-lg text-[11px] font-bold"
      data-cy={action.dataCy}
    >
      {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
      {action.label}
    </Button>
  )
}

export default function AgendaAppointmentRow({ row }: { row: AppointmentRow }) {
  const [state, formAction] = useFormState(setAppointmentStatus, IDLE_STATE)

  return (
    <li
      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between"
      data-cy="agenda-appointment-row"
      data-appointment-status={row.status}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          className="inline-flex h-11 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
          data-cy="appointment-slot"
        >
          {row.slotLabel}
        </span>

        <div className="min-w-0 space-y-1">
          <p
            className={`flex items-center gap-1.5 truncate text-sm font-bold text-slate-800 dark:text-slate-100 ${row.rowClassName ?? ''}`}
            data-cy="appointment-patient-name"
          >
            <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {row.patientName}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={row.badgeVariant} data-cy="appointment-status-badge">
              {row.statusLabel}
            </Badge>
            {row.referrerName ? (
              <span
                className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300"
                data-cy="appointment-referrer-tag"
              >
                Indicante: {row.referrerName}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1 sm:items-end">
        {row.actions.length > 0 ? (
          <form action={formAction} className="flex gap-2">
            <input type="hidden" name="appointment_id" value={row.id} />
            {row.actions.map((action) => (
              <StatusActionButton key={action.nextStatus} action={action} />
            ))}
          </form>
        ) : null}

        {state.status === 'error' ? (
          <p className="text-xs font-medium text-red-600 dark:text-red-400" data-cy="appointment-row-error">
            {state.message}
          </p>
        ) : null}
      </div>
    </li>
  )
}
