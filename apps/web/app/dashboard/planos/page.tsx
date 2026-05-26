import { redirect } from 'next/navigation'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DASHBOARD_PLANS_VALIDATION_MESSAGE } from '@/lib/plans/plan-display-config'
import PlanActivationCards from './PlanActivationCards'

export const revalidate = 0

export default async function DashboardPlansPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.clinic_id) {
    redirect('/login')
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('clinic_id', profile.clinic_id)
    .maybeSingle()

  const currentPlan = subscription?.plan === 'CONECTA' ? 'CONECTA' : 'ESSENTIAL'

  return (
    <div className="mx-auto max-w-5xl space-y-7" data-cy="plans-page">
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/80 p-7 shadow-sm">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/75 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
            Gestão do plano
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Planos &amp; Preços
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Escolha a modalidade da sua clínica e libere os recursos previstos para cada plano.
          </p>
          <div className="inline-flex max-w-3xl items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{DASHBOARD_PLANS_VALIDATION_MESSAGE}</span>
          </div>
          {!profile || profile.role !== 'OWNER' ? (
            <p className="text-sm font-medium text-amber-700">
              Somente o proprietário da clínica pode ativar ou trocar o plano.
            </p>
          ) : null}
        </div>
      </section>

      <PlanActivationCards currentPlan={currentPlan} canManagePlan={profile.role === 'OWNER'} />
    </div>
  )
}
