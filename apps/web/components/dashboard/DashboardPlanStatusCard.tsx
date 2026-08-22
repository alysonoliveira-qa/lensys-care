import Link from 'next/link'
import { ArrowRight, UserCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardPlanStatusCardProps {
  hasPremiumPlan: boolean
  planLabel: string
}

export default function DashboardPlanStatusCard({
  hasPremiumPlan,
  planLabel,
}: DashboardPlanStatusCardProps) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />
      <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl dark:bg-violet-950/30" />
      <CardHeader className="pb-3">
        <div className="mb-3 inline-flex w-fit items-center rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
          Status da Conta
        </div>
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          <UserCheck className="h-5 w-5" />
          <span>Modalidade Clínica</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4">
        <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          {planLabel}
        </div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {hasPremiumPlan
            ? 'Sua clínica está com todas as automações de alertas via WhatsApp, SMS e Recall em Massa ativas.'
            : 'Sua clínica está no plano Essencial. Assine o plano Conecta para desbloquear automações via WhatsApp e SMS.'}
        </p>
        {!hasPremiumPlan && (
          <Link href="/subscription" passHref>
            <Button className="h-10 w-full gap-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/15 transition-all duration-200 hover:bg-indigo-500">
              Ativar Plano Conecta
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
