'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import {
  createFinancialEntry,
  type FinanceiroActionState,
} from '@/app/(dashboard)/financeiro/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FINANCIAL_ENTRY_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  type FinancialEntryType,
} from '@/lib/financeiro/financeiro-config'
import type { ReferrerOption } from '@/lib/referrers/referrers-mappers'

const IDLE_STATE: FinanceiroActionState = { status: 'idle', message: '' }

interface FinancialEntryFormProps {
  /** Data que o formulário abre preenchida — o dia que está sendo olhado. */
  defaultDate: string
  referrerOptions: ReferrerOption[]
  onDone?: () => void
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="h-11 rounded-xl bg-primary px-5 font-semibold hover:bg-primary/90"
      disabled={pending}
      data-cy="financeiro-submit"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Lançar
    </Button>
  )
}

export default function FinancialEntryForm({
  defaultDate,
  referrerOptions,
  onDone,
}: FinancialEntryFormProps) {
  const [state, formAction] = useFormState(createFinancialEntry, IDLE_STATE)
  const [type, setType] = useState<FinancialEntryType>('INCOME')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') {
      // Limpa para o próximo lançamento em vez de fechar: no fechamento do dia
      // ninguém lança uma coisa só, e reabrir o formulário a cada linha é o tipo
      // de atrito que faz a recepção voltar para o caderno.
      formRef.current?.reset()
      setType('INCOME')
      onDone?.()
    }
  }, [state.status, onDone])

  const labelClassName =
    'mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground'
  const fieldClassName =
    'h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm outline-none transition-all focus:border-primary/30 focus:ring-4 focus:ring-ring/20'
  const errorClassName = 'mt-1 text-xs font-medium text-destructive'

  return (
    <form ref={formRef} action={formAction} className="space-y-3" data-cy="financeiro-form">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className={labelClassName} htmlFor="entry-type">
            Tipo
          </label>
          <select
            id="entry-type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as FinancialEntryType)}
            className={fieldClassName}
            data-cy="financeiro-type"
          >
            {FINANCIAL_ENTRY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.type ? (
            <p className={errorClassName}>{state.fieldErrors.type}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClassName} htmlFor="entry-amount">
            Valor
          </label>
          <Input
            id="entry-amount"
            name="amount"
            type="text"
            inputMode="decimal"
            placeholder="150,00"
            className={fieldClassName}
            data-cy="financeiro-amount"
          />
          {state.fieldErrors?.amount ? (
            <p className={errorClassName}>{state.fieldErrors.amount}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClassName} htmlFor="entry-payment-method">
            Forma
          </label>
          <select
            id="entry-payment-method"
            name="payment_method"
            defaultValue="CASH"
            className={fieldClassName}
            data-cy="financeiro-payment-method"
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="entry-date">
            Data
          </label>
          <Input
            id="entry-date"
            name="entry_date"
            type="date"
            defaultValue={defaultDate}
            className={fieldClassName}
            data-cy="financeiro-date"
          />
          {state.fieldErrors?.entryDate ? (
            <p className={errorClassName}>{state.fieldErrors.entryDate}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
        <div>
          <label className={labelClassName} htmlFor="entry-description">
            Descrição
          </label>
          <Input
            id="entry-description"
            name="description"
            type="text"
            placeholder="Consulta particular, venda de armação, aluguel…"
            className={fieldClassName}
            data-cy="financeiro-description"
          />
          {state.fieldErrors?.description ? (
            <p className={errorClassName}>{state.fieldErrors.description}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClassName} htmlFor="entry-referrer">
            Indicante (opcional)
          </label>
          <select
            id="entry-referrer"
            name="referrer_id"
            defaultValue=""
            className={fieldClassName}
            data-cy="financeiro-referrer"
          >
            {referrerOptions.map((option) => (
              <option key={option.value || 'none'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <SubmitButton />
      </div>

      {state.status === 'error' && state.message ? (
        <p className="text-sm font-medium text-destructive" data-cy="financeiro-error">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
