'use client'

import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { changePassword, type ChangePasswordState } from '@/app/(dashboard)/account/actions'

const initialState: ChangePasswordState = { status: 'idle', message: '' }

const inputClassName =
  'h-11 rounded-xl border border-slate-200/80 bg-white text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-700 dark:placeholder:text-slate-500'

// React 18: useFormState não retorna isPending — o estado de envio vem de
// useFormStatus, que só funciona dentro de um descendente do <form>.
function PasswordFormBody({ state }: { state: ChangePasswordState }) {
  const { pending } = useFormStatus()

  return (
    <>
      <fieldset disabled={pending} className="m-0 space-y-3 border-0 p-0">
        <div className="space-y-1.5">
          <label
            htmlFor="current_password"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Senha atual
          </label>
          <Input
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            className={inputClassName}
            required
            data-cy="current-password-input"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="new_password"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Nova senha
          </label>
          <Input
            id="new_password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            required
            data-cy="new-password-input"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="confirm_password"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Confirmar nova senha
          </label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            required
            data-cy="confirm-password-input"
          />
        </div>
      </fieldset>

      {state.status === 'error' && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
          {state.message}
        </div>
      )}
      {state.status === 'success' && (
        <div
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          data-cy="password-success-message"
        >
          {state.message}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          className="h-10 rounded-xl bg-indigo-600 px-6 text-sm font-semibold shadow-lg shadow-indigo-500/15 hover:bg-indigo-500"
          disabled={pending}
          data-cy="change-password-button"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Alterando...
            </>
          ) : (
            'Alterar senha'
          )}
        </Button>
      </div>
    </>
  )
}

export default function PasswordCard() {
  const [state, formAction] = useFormState(changePassword, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Limpa os campos após sucesso (evita side effect durante o render).
  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 text-slate-600 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-300">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Segurança</p>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Senha</h3>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                Escolha uma senha com pelo menos 8 caracteres.
              </p>
            </div>
            <form action={formAction} ref={formRef} className="space-y-3">
              <PasswordFormBody state={state} />
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
