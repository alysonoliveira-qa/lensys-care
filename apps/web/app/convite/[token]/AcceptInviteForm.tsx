'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface AcceptInviteFormProps {
  token: string
  email: string
}

export default function AcceptInviteForm({ token, email }: AcceptInviteFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fullName.trim() || !password) {
      setError('Informe seu nome completo e uma senha para aceitar o convite.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fullName: fullName.trim(), password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível aceitar o convite.')
      }

      router.push('/login?message=convite-aceito')
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error ? submitError.message : 'Não foi possível aceitar o convite.'
      )
      setSubmitting(false)
    }
  }

  const inputClassName =
    'h-11 border-slate-800 bg-slate-950/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20'

  return (
    <Card glass className="border-slate-800 bg-slate-900/60 shadow-2xl">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4" data-cy="invite-form">
          {error && (
            <div
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-medium text-red-400"
              data-cy="invite-form-error"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              htmlFor="invite-email"
            >
              E-mail
            </label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              readOnly
              disabled
              className="h-11 border-slate-800 bg-slate-950/30 text-slate-400"
              data-cy="invite-email-readonly"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              htmlFor="invite-fullname"
            >
              Nome completo
            </label>
            <Input
              id="invite-fullname"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Seu nome completo"
              className={inputClassName}
              maxLength={120}
              disabled={submitting}
              data-cy="invite-fullname-input"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              htmlFor="invite-password"
            >
              Senha
            </label>
            <Input
              id="invite-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={inputClassName}
              disabled={submitting}
              data-cy="invite-password-input"
            />
            <p className="text-xs leading-5 text-slate-500">
              Se você já tem conta no Lensys Care com este e-mail, use a sua senha atual.
            </p>
          </div>

          <Button
            type="submit"
            variant="premium"
            className="mt-2 h-11 w-full text-base font-semibold"
            disabled={submitting}
            data-cy="invite-submit-button"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aceitando convite...
              </>
            ) : (
              'Aceitar convite'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
