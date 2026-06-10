'use client'

import { useState } from 'react'
import { Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import PasswordCard from '@/components/account/PasswordCard'

interface AccountFormProps {
  initialValues: {
    fullName: string
    preferredName: string
    email: string
  }
}

export default function AccountForm({ initialValues }: AccountFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialValues.fullName)
  const [preferredName, setPreferredName] = useState(initialValues.preferredName)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const inputClassName =
    'h-11 rounded-xl border border-slate-200/80 bg-white text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-700 dark:placeholder:text-slate-500'

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fullName.trim()) {
      setError('O nome completo é obrigatório.')
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          preferredName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível atualizar a conta.')
      }

      setFullName(data.profile.full_name)
      setPreferredName(data.profile.preferred_name ?? '')
      setSuccessMessage('Dados da conta atualizados com sucesso.')
      window.dispatchEvent(new Event('profile-updated'))
      router.refresh()
    } catch (saveError: unknown) {
      console.error('Error updating account:', saveError)
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível atualizar a conta.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8" data-cy="account-page">
      <section className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-indigo-50/90 p-6 shadow-sm shadow-violet-100/50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-indigo-100/60 to-transparent dark:from-indigo-950/20 lg:block" />
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
        <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm dark:border-violet-900/60 dark:bg-slate-900/80 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Preferências da conta
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                Minha Conta
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Gerencie seus dados de acesso, identificação interna e preferências exibidas no
                Lensys Care dentro da clínica.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <Mail className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>{initialValues.email}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Perfil interno</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 lg:max-w-xs">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Impacto imediato</p>
            <p className="mt-1.5 leading-5">
              O nome preferido salvo aqui continua refletindo na sidebar e em outras áreas internas
              do produto.
            </p>
          </div>
        </div>
      </section>

      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Perfil
              </p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Dados pessoais e exibição
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Atualize as informações básicas usadas para identificação dentro da plataforma.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label
                  htmlFor="account-full-name"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Nome completo
                </label>
                <Input
                  id="account-full-name"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClassName}
                  maxLength={120}
                  disabled={isSaving}
                  data-cy="account-full-name-input"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="account-preferred-name"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Como prefere ser chamado
                </label>
                <Input
                  id="account-preferred-name"
                  type="text"
                  value={preferredName}
                  onChange={(event) => setPreferredName(event.target.value)}
                  placeholder="Ex: Dra. Ana ou Ana"
                  className={inputClassName}
                  maxLength={60}
                  disabled={isSaving}
                  data-cy="account-preferred-name-input"
                />
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Esse nome aparece na sidebar e em outras áreas internas do Lensys Care.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/20">
                <div className="space-y-2">
                  <label
                    htmlFor="account-email"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    E-mail
                  </label>
                  <Input
                    id="account-email"
                    type="email"
                    value={initialValues.email}
                    readOnly
                    disabled
                    className="h-11 rounded-xl border border-slate-200/80 bg-white text-sm font-medium text-slate-500 shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400 dark:shadow-none"
                    data-cy="account-email-readonly"
                  />
                </div>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  A alteração de e-mail será adicionada futuramente.
                </p>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                data-cy="account-success-message"
              >
                {successMessage}
              </div>
            ) : null}

            <div className="flex justify-end border-t border-slate-100 pt-6 dark:border-slate-800">
              <Button
                type="submit"
                className="h-11 rounded-xl bg-indigo-600 px-8 font-semibold shadow-lg shadow-indigo-500/15 hover:bg-indigo-500"
                disabled={isSaving}
                data-cy="account-save-button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <PasswordCard />
    </div>
  )
}
