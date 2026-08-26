'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, Trash2 } from 'lucide-react'

import {
  deleteFinancialEntry,
  type FinanceiroActionState,
} from '@/app/(dashboard)/financeiro/actions'
import type { FinancialEntryRow } from '@/lib/financeiro/financeiro-mappers'

const IDLE_STATE: FinanceiroActionState = { status: 'idle', message: '' }

function DeleteButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      title="Excluir lançamento"
      aria-label="Excluir lançamento"
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      data-cy="financeiro-delete"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}

export interface FinancialEntryRowItemProps {
  row: FinancialEntryRow
}

export default function FinancialEntryRowItem({ row }: FinancialEntryRowItemProps) {
  const [state, formAction] = useFormState(deleteFinancialEntry, IDLE_STATE)

  return (
    <li
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0"
      data-cy="financeiro-row"
      data-type={row.type}
    >
      <span className="w-20 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {row.entryDateLabel}
      </span>

      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${row.badgeClassName}`}
      >
        {row.typeLabel}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{row.description}</p>
        <p className="text-xs text-muted-foreground">
          {row.paymentMethodLabel}
          {row.linkedName ? (
            <>
              {' · '}
              {row.linkedHref ? (
                <Link href={row.linkedHref} className="underline underline-offset-2">
                  {row.linkedName}
                </Link>
              ) : (
                row.linkedName
              )}
            </>
          ) : null}
        </p>
      </div>

      <span
        className={`shrink-0 text-sm font-bold tabular-nums ${row.amountClassName}`}
        data-cy="financeiro-row-amount"
      >
        {row.amountLabel}
      </span>

      <form action={formAction} className="shrink-0">
        <input type="hidden" name="entry_id" value={row.id} />
        <DeleteButton />
      </form>

      {state.status === 'error' ? (
        <p className="w-full text-xs font-medium text-destructive">{state.message}</p>
      ) : null}
    </li>
  )
}
