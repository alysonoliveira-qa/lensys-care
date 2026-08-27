'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Check, Loader2, Wallet } from 'lucide-react'

import {
  chargeConsultation,
  type ChargeActionState,
} from '@/app/(dashboard)/financeiro/actions'
import {
  QUICK_PAYMENT_OPTIONS,
  type PaymentMethod,
} from '@/lib/financeiro/financeiro-config'

const IDLE_STATE: ChargeActionState = { status: 'idle', message: '' }

export interface ChargeConsultationButtonProps {
  patientId: string
  /** Preço configurado, já formatado (`R$ 150,00`), ou `null` se não há preço. */
  priceLabel: string | null
  /** Compacto para a linha da lista; completo para a ficha. */
  variant?: 'compact' | 'full'
}

function MethodButton({
  method,
  label,
  compact,
}: {
  method: PaymentMethod
  label: string
  compact: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      name="payment_method"
      value={method}
      disabled={pending}
      data-cy={`charge-method-${method.toLowerCase()}`}
      className={`rounded-lg border border-border bg-card font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-50 ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      {label}
    </button>
  )
}

export default function ChargeConsultationButton({
  patientId,
  priceLabel,
  variant = 'full',
}: ChargeConsultationButtonProps) {
  const [state, formAction] = useFormState(chargeConsultation, IDLE_STATE)
  const [aberto, setAberto] = useState(false)
  const compact = variant === 'compact'

  // Fecha sozinho depois do sucesso: manter as formas de pagamento abertas
  // convida ao segundo clique, que é justamente o engano que a confirmação
  // existe para pegar.
  useEffect(() => {
    if (state.status === 'success') {
      setAberto(false)
    }
  }, [state.status])

  const precisaConfirmar = state.status === 'needs_confirmation'

  if (state.status === 'success') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
        data-cy="charge-success"
      >
        <Check className="h-3.5 w-3.5" />
        {state.message}
      </span>
    )
  }

  if (!aberto && !precisaConfirmar) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        data-cy="charge-open"
        title={priceLabel ? `Registrar ${priceLabel} no caixa` : undefined}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-card font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent ${
          compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
      >
        <Wallet className="h-3.5 w-3.5 text-primary" />
        {compact ? 'Cobrar' : `Registrar pagamento${priceLabel ? ` · ${priceLabel}` : ''}`}
      </button>
    )
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="patient_id" value={patientId} />
      {/* Só o reenvio depois do aviso carrega a confirmação. */}
      <input type="hidden" name="confirmed" value={precisaConfirmar ? 'true' : 'false'} />

      {precisaConfirmar ? (
        <span
          className="w-full text-[11px] font-medium text-amber-700 dark:text-amber-400"
          data-cy="charge-confirm"
        >
          {state.message}
        </span>
      ) : (
        <span className="text-[11px] font-medium text-muted-foreground">
          {priceLabel ?? 'Sem preço definido'} em:
        </span>
      )}

      {QUICK_PAYMENT_OPTIONS.map((option) => (
        <MethodButton
          key={option.value}
          method={option.value}
          label={option.label}
          compact={compact}
        />
      ))}

      <button
        type="button"
        onClick={() => setAberto(false)}
        className="px-1.5 text-[11px] font-medium text-muted-foreground underline underline-offset-2"
      >
        cancelar
      </button>

      <PendingIndicator />

      {state.status === 'error' ? (
        <span
          className="w-full text-[11px] font-medium text-destructive"
          data-cy="charge-error"
        >
          {state.message}
        </span>
      ) : null}
    </form>
  )
}

function PendingIndicator() {
  const { pending } = useFormStatus()

  return pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : null
}
