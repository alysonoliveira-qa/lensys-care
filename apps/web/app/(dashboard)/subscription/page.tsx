import { redirect } from 'next/navigation'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { getAuthenticatedShellData } from '@/lib/authenticated-shell'
import {
  DASHBOARD_PLANS_VALIDATION_MESSAGE,
  resolveDisplayPlanId,
} from '@/lib/plans/plan-display-config'
import PlanActivationCards from '@/app/dashboard/planos/PlanActivationCards'
import ManageSubscriptionButton from '@/components/subscription/ManageSubscriptionButton'
import { prisma } from '@/lib/db'

export const revalidate = 0

export default async function SubscriptionPage() {
  const shellData = await getAuthenticatedShellData()

  if (!shellData) {
    redirect('/login')
  }
  const currentPlan = resolveDisplayPlanId(shellData.subscription?.plan)
  const canManagePlan = shellData.profile.role === 'OWNER'

  // O portal so existe para quem ja tem customer no Stripe. Checar aqui evita
  // oferecer um botao que responderia "voce ainda nao possui assinatura".
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { clinic_id: shellData.profile.clinic_id },
    select: { id: true },
  })
  const canOpenBillingPortal = canManagePlan && stripeCustomer !== null

  return (
    <div className="mx-auto max-w-5xl space-y-7" data-cy="plans-page">
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/80 p-7 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/20" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-card/75 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Gestão do plano
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Planos &amp; Preços
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Escolha a modalidade da sua clínica e libere os recursos previstos para cada plano.
          </p>
          <div className="inline-flex max-w-3xl items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{DASHBOARD_PLANS_VALIDATION_MESSAGE}</span>
          </div>
          {!canManagePlan ? (
            <p className="text-sm font-medium text-amber-700">
              Somente o proprietário da clínica pode ativar ou trocar o plano.
            </p>
          ) : null}

          {canOpenBillingPortal ? <ManageSubscriptionButton /> : null}
        </div>
      </section>

      <PlanActivationCards currentPlan={currentPlan} canManagePlan={canManagePlan} />
    </div>
  )
}
