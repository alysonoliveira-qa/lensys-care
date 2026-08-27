'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Wallet } from 'lucide-react'

import CashSummaryCards from '@/components/financeiro/CashSummaryCards'
import ConsultationPriceCard from '@/components/financeiro/ConsultationPriceCard'
import FinancialEntryForm from '@/components/financeiro/FinancialEntryForm'
import FinancialEntryRowItem from '@/components/financeiro/FinancialEntryRowItem'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { FinancialEntryRow } from '@/lib/financeiro/financeiro-mappers'
import type { CashSummary } from '@/lib/financeiro/financeiro-normalizers'
import {
  PERIOD_PRESETS,
  PERIOD_PRESET_LABELS,
  buildCustomPeriodHref,
  buildPeriodHref,
  type ResolvedPeriod,
} from '@/lib/financeiro/financeiro-period'
import type { ReferrerOption } from '@/lib/referrers/referrers-mappers'

interface FinanceiroViewProps {
  rows: FinancialEntryRow[]
  summary: CashSummary
  period: ResolvedPeriod
  today: string
  referrerOptions: ReferrerOption[]
  consultationPrice: string | null
  canEditPrice: boolean
}

export default function FinanceiroView({
  rows,
  summary,
  period,
  today,
  referrerOptions,
  consultationPrice,
  canEditPrice,
}: FinanceiroViewProps) {
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleFromChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      router.push(buildCustomPeriodHref(event.target.value, period.to))
    }
  }

  const handleToChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      router.push(buildCustomPeriodHref(period.from, event.target.value))
    }
  }

  const dateFieldClassName =
    'h-9 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground shadow-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-ring/20'

  return (
    <div className="space-y-5" data-cy="financeiro-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Wallet className="h-6 w-6 text-primary" />
            Financeiro
          </h1>
          <p className="text-sm text-muted-foreground">
            Caixa da clínica: o que entrou, o que saiu e quanto sobrou.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsFormOpen((open) => !open)}
          className="h-11 rounded-xl bg-primary px-5 font-semibold hover:bg-primary/90"
          data-cy="financeiro-new"
        >
          <Plus className="mr-2 h-4 w-4" />
          {isFormOpen ? 'Fechar' : 'Novo lançamento'}
        </Button>
      </header>

      {isFormOpen ? (
        <Card>
          <CardContent className="p-4">
            <FinancialEntryForm
              // Abre na data que está sendo olhada: quem revisa o caixa de ontem
              // quase sempre está lançando algo de ontem.
              defaultDate={period.preset === 'hoje' ? today : period.to}
              referrerOptions={referrerOptions}
            />
          </CardContent>
        </Card>
      ) : null}

      <ConsultationPriceCard currentPrice={consultationPrice} canEdit={canEditPrice} />

      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={period.preset === preset ? 'default' : 'outline'}
            onClick={() => router.push(buildPeriodHref(preset))}
            className="h-9 rounded-lg px-3 text-xs font-semibold"
            data-cy={`financeiro-preset-${preset}`}
          >
            {PERIOD_PRESET_LABELS[preset]}
          </Button>
        ))}

        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="date"
            value={period.from}
            onChange={handleFromChange}
            className={dateFieldClassName}
            aria-label="Data inicial"
            data-cy="financeiro-from"
          />
          até
          <input
            type="date"
            value={period.to}
            onChange={handleToChange}
            className={dateFieldClassName}
            aria-label="Data final"
            data-cy="financeiro-to"
          />
        </span>
      </div>

      <CashSummaryCards summary={summary} periodLabel={period.label} />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p
              className="px-4 py-10 text-center text-sm text-muted-foreground"
              data-cy="financeiro-empty"
            >
              Nenhum lançamento neste período.
            </p>
          ) : (
            <ul>
              {rows.map((row) => (
                <FinancialEntryRowItem key={row.id} row={row} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
