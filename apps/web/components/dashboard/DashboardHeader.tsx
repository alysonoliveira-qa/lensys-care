import Link from 'next/link'
import { Building2, Plus, ShieldCheck, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface DashboardHeaderProps {
  clinicName: string
  displayName: string
  pendingAlerts: number
  planLabel: string
}

export default function DashboardHeader({
  clinicName,
  displayName,
  pendingAlerts,
  planLabel,
}: DashboardHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-indigo-50/90 p-6 shadow-sm shadow-violet-100/50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-indigo-100/60 to-transparent dark:from-indigo-950/20 lg:block" />
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />
      <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm dark:border-violet-900/60 dark:bg-slate-900/80 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Painel clÃ­nico
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">OlÃ¡,</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              {displayName}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Aqui estÃ¡ o resumo clÃ­nico e operacional da{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{clinicName}</span> hoje.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <Building2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <span>{clinicName}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-700 dark:text-indigo-400" />
              <span>{planLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[240px]">
          <Link href="/patients/new">
            <Button
              className="h-11 w-full gap-2 rounded-xl bg-indigo-600 font-semibold shadow-lg shadow-indigo-500/15 hover:bg-indigo-500"
              data-cy="new-patient-button"
            >
              <Plus className="h-4.5 w-4.5" />
              Novo Paciente
            </Button>
          </Link>
          <div className="rounded-2xl border border-white/80 bg-white/70 p-3 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Resumo do dia</p>
            <p className="mt-1 leading-5">
              {pendingAlerts > 0
                ? `${pendingAlerts} alerta(s) pendente(s) para acompanhar hoje.`
                : 'Nenhum alerta pendente para acompanhar no momento.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
