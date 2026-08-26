import React from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'

import type { ResolucaoDoTeste } from '@/lib/plans/trial-status'

export interface TrialNoticeProps {
  resolucao: ResolucaoDoTeste
  /** Só o OWNER pode assinar — para os demais a faixa informa, sem oferecer botão. */
  podeAssinar: boolean
}

function textoDoVencido(dias: number): string {
  if (dias <= 0) return 'Seu período de teste terminou hoje.'
  if (dias === 1) return 'Seu período de teste terminou ontem.'

  return `Seu período de teste terminou há ${dias} dias.`
}

function textoDoAndamento(dias: number): string {
  if (dias === 1) return 'Seu período de teste termina amanhã.'

  return `Seu período de teste termina em ${dias} dias.`
}

/**
 * Faixa de aviso do teste. Avisa, **não bloqueia** — decisão de 26/08/2026: com
 * uma clínica real usando o sistema todo dia, cortar acesso no meio do
 * expediente cobra o preço da falha de quem a construiu. A faixa aparece em toda
 * página autenticada justamente para não depender de o usuário visitar
 * `/subscription` por conta própria.
 *
 * Componente visual puro: quem decide o estado é `resolveTrialStatus`.
 */
export default function TrialNotice({ resolucao, podeAssinar }: TrialNoticeProps) {
  if (!resolucao.avisar) {
    return null
  }

  const vencido = resolucao.estado === 'vencido'

  const mensagem = vencido
    ? textoDoVencido(resolucao.diasVencido ?? 0)
    : textoDoAndamento(resolucao.diasRestantes ?? 0)

  const complemento = vencido
    ? 'O acesso segue liberado, mas a assinatura ainda não foi ativada.'
    : 'Ative a assinatura para não perder o acesso.'

  return (
    <div
      role="status"
      data-cy="trial-notice"
      data-estado={resolucao.estado}
      className={[
        'flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5 text-sm md:px-6',
        vencido
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100'
          : 'border-border bg-muted text-foreground',
      ].join(' ')}
    >
      {vencido ? (
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
      ) : (
        <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}

      <span className="font-medium">{mensagem}</span>
      <span className="text-muted-foreground">{complemento}</span>

      {podeAssinar && (
        <Link
          href="/subscription"
          className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Ativar assinatura
        </Link>
      )}
    </div>
  )
}
