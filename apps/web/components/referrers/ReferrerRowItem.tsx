'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Copy, Loader2, Pencil } from 'lucide-react'

import {
  markReferralsPaid,
  setReferrerActive,
  type ReferrerActionState,
} from '@/app/(dashboard)/patients/referrers-actions'
import ReferrerForm from '@/components/referrers/ReferrerForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ReferrerRow } from '@/lib/referrers/referrers-mappers'

const IDLE_STATE: ReferrerActionState = { status: 'idle', message: '' }

function PendingSubmitButton({
  label,
  dataCy,
  variant = 'default',
}: {
  label: string
  dataCy: string
  variant?: 'default' | 'outline' | 'ghost'
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      disabled={pending}
      className="h-8 rounded-lg text-[11px] font-bold"
      data-cy={dataCy}
    >
      {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </Button>
  )
}

export default function ReferrerRowItem({ row }: { row: ReferrerRow }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [payState, payAction] = useFormState(markReferralsPaid, IDLE_STATE)
  const [activeState, activeAction] = useFormState(setReferrerActive, IDLE_STATE)

  if (isEditing) {
    return (
      <li className="px-5 py-4" data-cy="referrer-row">
        <ReferrerForm referrer={row} onDone={() => setIsEditing(false)} />
      </li>
    )
  }

  return (
    <li className="space-y-3 px-5 py-4" data-cy="referrer-row" data-referrer-active={row.active}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 truncate text-sm font-bold text-foreground">
            <span data-cy="referrer-name">{row.name}</span>
            {row.active ? null : (
              <Badge variant="outline" data-cy="referrer-inactive-badge">
                Inativo
              </Badge>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant={row.hasPendingReferrals ? 'warning' : 'secondary'}
              data-cy="referrer-pending-count"
              data-pending={row.pendingCount}
            >
              {row.pendingLabel}
            </Badge>
            {row.whatsapp ? <span>{row.whatsapp}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {row.hasPendingReferrals ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsPaying((current) => !current)}
              className="h-8 rounded-lg bg-emerald-600 text-[11px] font-bold hover:bg-emerald-500"
              data-cy="referrer-pay-button"
            >
              Pagar
            </Button>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="h-8 gap-1.5 rounded-lg text-[11px] font-bold"
            data-cy="referrer-edit-button"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </Button>

          <form action={activeAction}>
            <input type="hidden" name="referrer_id" value={row.id} />
            <input type="hidden" name="active" value={row.active ? 'false' : 'true'} />
            <PendingSubmitButton
              label={row.active ? 'Desativar' : 'Reativar'}
              dataCy="referrer-toggle-active"
              variant="ghost"
            />
          </form>
        </div>
      </div>

      {isPaying && row.hasPendingReferrals ? (
        <div
          className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          data-cy="referrer-pay-panel"
        >
          {row.hasPixKey ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Chave PIX
              </p>
              <p
                className="flex items-center gap-2 break-all font-mono text-sm font-semibold text-foreground"
                data-cy="referrer-pix-key"
              >
                <Copy className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                {row.pixKey}
              </p>
            </div>
          ) : (
            <p className="text-xs font-medium text-muted-foreground">
              Este indicante não tem chave PIX cadastrada. Pague por outro meio e registre
              abaixo.
            </p>
          )}

          <form action={payAction} className="flex items-center gap-2">
            <input type="hidden" name="referrer_id" value={row.id} />
            <PendingSubmitButton label="Marcar pago" dataCy="referrer-mark-paid" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-[11px] font-bold"
              onClick={() => setIsPaying(false)}
            >
              Fechar
            </Button>
          </form>
        </div>
      ) : null}

      {payState.status !== 'idle' ? (
        <p
          className={`text-xs font-medium ${
            payState.status === 'error'
              ? 'text-destructive'
              : 'text-emerald-700 dark:text-emerald-400'
          }`}
          data-cy="referrer-pay-feedback"
        >
          {payState.message}
        </p>
      ) : null}

      {activeState.status === 'error' ? (
        <p className="text-xs font-medium text-destructive">
          {activeState.message}
        </p>
      ) : null}
    </li>
  )
}
