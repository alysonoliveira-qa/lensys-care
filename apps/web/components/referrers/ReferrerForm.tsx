'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import {
  createReferrer,
  updateReferrer,
  type ReferrerActionState,
} from '@/app/(dashboard)/patients/referrers-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ReferrerRow } from '@/lib/referrers/referrers-mappers'

const IDLE_STATE: ReferrerActionState = { status: 'idle', message: '' }

interface ReferrerFormProps {
  referrer?: ReferrerRow | null
  onDone?: () => void
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="h-10 rounded-xl bg-indigo-600 px-5 font-semibold hover:bg-indigo-500"
      disabled={pending}
      data-cy="referrer-submit"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {isEditing ? 'Salvar' : 'Cadastrar indicante'}
    </Button>
  )
}

export default function ReferrerForm({ referrer, onDone }: ReferrerFormProps) {
  const isEditing = Boolean(referrer)
  const [state, formAction] = useFormState(
    isEditing ? updateReferrer : createReferrer,
    IDLE_STATE
  )

  useEffect(() => {
    if (state.status === 'success') {
      onDone?.()
    }
  }, [state.status, onDone])

  const labelClassName =
    'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400'
  const fieldClassName =
    'h-11 w-full rounded-xl border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200'

  return (
    <form action={formAction} className="space-y-3" data-cy="referrer-form">
      {referrer ? <input type="hidden" name="referrer_id" value={referrer.id} /> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className={labelClassName} htmlFor="referrer-name">
            Nome
          </label>
          <Input
            id="referrer-name"
            name="name"
            type="text"
            defaultValue={referrer?.name ?? ''}
            placeholder="Ex.: Ótica Central"
            className={fieldClassName}
            data-cy="referrer-name-input"
          />
          {state.fieldErrors?.name ? (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label className={labelClassName} htmlFor="referrer-pix">
            Chave PIX (opcional)
          </label>
          <Input
            id="referrer-pix"
            name="pix_key"
            type="text"
            defaultValue={referrer?.pixKey ?? ''}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            className={fieldClassName}
            data-cy="referrer-pix-input"
          />
          {state.fieldErrors?.pixKey ? (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              {state.fieldErrors.pixKey}
            </p>
          ) : null}
        </div>

        <div>
          <label className={labelClassName} htmlFor="referrer-whatsapp">
            WhatsApp (opcional)
          </label>
          <Input
            id="referrer-whatsapp"
            name="whatsapp"
            type="text"
            defaultValue={referrer?.whatsapp ?? ''}
            placeholder="(11) 99999-9999"
            className={fieldClassName}
            data-cy="referrer-whatsapp-input"
          />
          {state.fieldErrors?.whatsapp ? (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              {state.fieldErrors.whatsapp}
            </p>
          ) : null}
        </div>
      </div>

      {state.status === 'error' ? (
        <p
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-300"
          data-cy="referrer-form-error"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <SubmitButton isEditing={isEditing} />
        {isEditing ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl font-semibold"
            onClick={() => onDone?.()}
            data-cy="referrer-cancel-edit"
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
