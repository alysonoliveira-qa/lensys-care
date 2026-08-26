import React from 'react'
import { ArrowDownCircle, ArrowUpCircle, Receipt, Scale } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, type CashSummary } from '@/lib/financeiro/financeiro-normalizers'

export interface CashSummaryCardsProps {
  summary: CashSummary
  periodLabel: string
}

export default function CashSummaryCards({ summary, periodLabel }: CashSummaryCardsProps) {
  const negativo = summary.balanceCents < 0

  const cards = [
    {
      key: 'income',
      label: 'Entradas',
      value: formatCurrency(summary.incomeCents),
      icon: ArrowUpCircle,
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
      dataCy: 'summary-income',
    },
    {
      key: 'expense',
      label: 'Saídas',
      value: formatCurrency(summary.expenseCents),
      icon: ArrowDownCircle,
      valueClassName: 'text-rose-600 dark:text-rose-400',
      dataCy: 'summary-expense',
    },
    {
      key: 'balance',
      label: 'Saldo',
      // O sinal aparece quando o caixa fecha no vermelho. Esconder isso seria
      // mentir no único número que a clínica realmente olha.
      value: formatCurrency(summary.balanceCents),
      icon: Scale,
      valueClassName: negativo
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-foreground',
      dataCy: 'summary-balance',
    },
    {
      key: 'count',
      label: 'Lançamentos',
      value: String(summary.entryCount),
      icon: Receipt,
      valueClassName: 'text-foreground',
      dataCy: 'summary-count',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card key={card.key} data-cy={card.dataCy}>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{card.label}</span>
              </div>
              <p className={`text-xl font-bold tabular-nums ${card.valueClassName}`}>
                {card.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{periodLabel}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
