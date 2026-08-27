'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, Tag } from 'lucide-react'

import {
  updateConsultationPrice,
  type FinanceiroActionState,
} from '@/app/(dashboard)/financeiro/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const IDLE_STATE: FinanceiroActionState = { status: 'idle', message: '' }

export interface ConsultationPriceCardProps {
  /** Valor atual formatado sem "R$" (`150,00`), ou `null` se não configurado. */
  currentPrice: string | null
  /** Só o OWNER pode alterar; os demais veem o valor e a explicação. */
  canEdit: boolean
}

function SaveButton({ isFirstTime }: { isFirstTime: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold hover:bg-primary/90"
      data-cy="consultation-price-submit"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {isFirstTime ? 'Definir' : 'Salvar'}
    </Button>
  )
}

export default function ConsultationPriceCard({
  currentPrice,
  canEdit,
}: ConsultationPriceCardProps) {
  const [state, formAction] = useFormState(updateConsultationPrice, IDLE_STATE)
  const naoConfigurado = currentPrice === null

  return (
    <Card data-cy="consultation-price-card">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            Preço da consulta
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {naoConfigurado
              ? 'Defina um valor para habilitar o botão de cobrança na ficha do paciente.'
              : 'Usado pelo botão de cobrança rápida na ficha e na lista de pacientes.'}
          </p>
        </div>

        {canEdit ? (
          <form action={formAction} className="flex shrink-0 items-end gap-2">
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                htmlFor="consultation-price"
              >
                Valor
              </label>
              <Input
                id="consultation-price"
                name="price"
                type="text"
                inputMode="decimal"
                placeholder="150,00"
                defaultValue={currentPrice ?? ''}
                className="h-10 w-32 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm outline-none transition-all focus:border-primary/30 focus:ring-4 focus:ring-ring/20"
                data-cy="consultation-price-input"
              />
            </div>
            <SaveButton isFirstTime={naoConfigurado} />
          </form>
        ) : (
          <p className="shrink-0 text-lg font-bold tabular-nums text-foreground">
            {naoConfigurado ? '—' : `R$ ${currentPrice}`}
          </p>
        )}
      </CardContent>

      {state.status !== 'idle' && state.message ? (
        <p
          className={`px-4 pb-3 text-xs font-medium ${
            state.status === 'error' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
          }`}
          data-cy="consultation-price-message"
        >
          {state.message}
        </p>
      ) : null}
    </Card>
  )
}
