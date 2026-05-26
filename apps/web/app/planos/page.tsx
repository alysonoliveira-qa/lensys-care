import Link from 'next/link'
import { ArrowLeft, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PLAN_DISPLAY_CONFIG,
  PUBLIC_PLANS_BADGE_LABEL,
  PUBLIC_PLANS_FOOTER_MESSAGES,
  PUBLIC_PLANS_TRIAL_BANNER,
} from '@/lib/plans/plan-display-config'

export default function PlanosPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white selection:bg-indigo-500/30 sm:py-12"
      data-cy="public-plans-page"
    >
      <div className="pointer-events-none absolute left-[-20%] top-[-20%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o início
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            {PUBLIC_PLANS_BADGE_LABEL}
          </span>
        </header>

        <section className="mx-auto max-w-2xl pb-12 pt-14 text-center sm:pt-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Planos para sua{' '}
            <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              rotina clínica
            </span>
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-400 sm:text-lg">
            Escolha o plano ideal para organizar pacientes, exames, retornos e a evolução clínica da sua operação.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            {PUBLIC_PLANS_TRIAL_BANNER}
          </div>
        </section>

        <section className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {PLAN_DISPLAY_CONFIG.map((plan) => (
            <Card
              key={plan.id}
              data-cy={plan.publicCardDataCy}
              className={`relative flex flex-col overflow-hidden bg-slate-900/60 shadow-2xl ${
                plan.featured
                  ? 'border-indigo-500/40 shadow-indigo-950/40'
                  : 'border-slate-800 shadow-slate-950/30'
              }`}
            >
              {plan.featured && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-l from-violet-600 to-indigo-600 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  {plan.recommendedLabel}
                </div>
              )}

              <CardHeader className="space-y-3 p-7">
                <div className="flex min-h-6 items-center gap-2">
                  <CardTitle className={`text-2xl ${plan.featured ? 'text-indigo-300' : 'text-white'}`}>
                    {plan.name}
                  </CardTitle>
                  {!plan.featured && plan.tierLabel && (
                    <Badge variant="secondary" className="border-slate-700 bg-slate-800 text-slate-300">
                      {plan.tierLabel}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-extrabold text-white">{plan.monthlyPrice}</span>
                  <span className="text-sm font-medium text-slate-400">{plan.monthlyPriceSuffix}</span>
                </div>
                <p className="text-xs font-medium text-emerald-300">{plan.trialLabel}</p>
                <CardDescription className="pt-2 text-sm leading-6 text-slate-400">
                  {plan.publicDescription}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-grow px-7 pb-2">
                <div className="mb-5 border-t border-slate-800/80" />
                <ul className="space-y-3">
                  {plan.publicFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                          plan.featured ? 'text-indigo-300' : 'text-emerald-400'
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-7 pt-8">
                <Button
                  asChild
                  variant={plan.featured ? 'premium' : 'outline'}
                  className={`h-11 w-full text-sm font-semibold ${
                    plan.featured
                      ? ''
                      : 'border-slate-700 bg-slate-950/40 text-white hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Link href="/register">Começar teste grátis</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>

        <div className="mt-10 space-y-2 text-center text-sm text-slate-500">
          {PUBLIC_PLANS_FOOTER_MESSAGES.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      </div>
    </main>
  )
}
