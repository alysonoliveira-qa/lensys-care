'use client'

import { useState } from 'react'
import { Loader2, LockKeyhole, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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
    <div className="space-y-6" data-cy="account-page">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Minha Conta</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie seus dados de acesso e identificação dentro da clínica.
        </p>
      </div>

      <Card className="border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nome completo
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-10 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20"
                  maxLength={120}
                  disabled={isSaving}
                  data-cy="account-full-name-input"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Como prefere ser chamado
                </label>
                <Input
                  type="text"
                  value={preferredName}
                  onChange={(event) => setPreferredName(event.target.value)}
                  placeholder="Ex: Dra. Ana ou Ana"
                  className="h-10 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20"
                  maxLength={60}
                  disabled={isSaving}
                  data-cy="account-preferred-name-input"
                />
                <p className="text-xs text-slate-500">
                  Esse nome aparece na sidebar e em outras áreas internas do Lensys Care.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  E-mail
                </label>
                <Input
                  type="email"
                  value={initialValues.email}
                  readOnly
                  disabled
                  className="h-10 border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-950/30"
                  data-cy="account-email-readonly"
                />
                <p className="text-xs text-slate-500">
                  A alteração de e-mail será adicionada futuramente.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {successMessage && (
              <div
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                data-cy="account-success-message"
              >
                {successMessage}
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-6 dark:border-slate-800">
              <Button
                type="submit"
                className="h-10 bg-indigo-600 px-8 font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-500"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <LockKeyhole className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Senha</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Alteração de senha será adicionada futuramente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Gestão de equipe</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Em breve será possível adicionar recepcionistas e outros profissionais da clínica com permissões específicas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
