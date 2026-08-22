'use client'

import { useState } from 'react'
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Leva ao portal de cobrança do Stripe, onde o cliente troca de plano, atualiza
 * o cartão, vê faturas e cancela.
 *
 * Existe porque o único caminho até o portal era clicar em "ativar plano" já
 * tendo assinatura — a server action redirecionava para lá. Funcionava, mas
 * ninguém adivinha que "assinar de novo" é onde se cancela.
 */
export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPortal() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await response.json()

      if (!response.ok || !data.url) {
        setError(data.message ?? 'Não foi possível abrir o portal de cobrança.')
        setLoading(false)
        return
      }

      // Sem resetar `loading`: a navegação sai desta página, e voltar o botão ao
      // estado normal só daria a chance de um segundo clique durante a saída.
      window.location.href = data.url
    } catch {
      setError('Não foi possível abrir o portal de cobrança. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={openPortal}
        disabled={loading}
        variant="outline"
        className="h-11 gap-2 rounded-xl font-semibold"
        data-cy="manage-subscription-button"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {loading ? 'Abrindo...' : 'Gerenciar assinatura'}
        {!loading && <ExternalLink className="h-3.5 w-3.5 opacity-60" />}
      </Button>

      <p className="text-xs leading-5 text-slate-500">
        Trocar de plano, atualizar o cartão, ver faturas ou cancelar.
      </p>

      {error && (
        <p className="text-xs font-medium text-red-600" data-cy="manage-subscription-error">
          {error}
        </p>
      )}
    </div>
  )
}
