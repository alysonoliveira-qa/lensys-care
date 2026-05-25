'use client'

import { useEffect, type ReactNode } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { activatePlan, type AvailablePlan, type PlanActionState } from './actions'

interface PlanActivationCardsProps {
  currentPlan: AvailablePlan
  canManagePlan: boolean
}

const plans = [
  {
    id: 'ESSENTIAL' as const,
    name: 'Essencial',
    price: 'R$ 79,90',
    description: 'Organização da rotina clínica com pacientes, exames e retornos em um único lugar.',
    features: ['Pacientes e histórico clínico', 'Registro de exames e refração', 'Alertas de retorno e renovação'],
    dataCy: 'essential-plan-card',
    buttonDataCy: 'activate-essential-plan-button',
  },
  {
    id: 'CONECTA' as const,
    name: 'Conecta',
    price: 'R$ 149,90',
    description: 'Mais automações para relacionamento e acompanhamento recorrente da clínica.',
    features: ['Tudo do Essencial', 'Alertas previstos via WhatsApp e SMS', 'Recall em massa previsto'],
    dataCy: 'connect-plan-card',
    buttonDataCy: 'activate-connect-plan-button',
  },
]

const initialPlanActionState: PlanActionState = {
  status: 'idle',
  message: '',
}

function SubmitButton({
  children,
  dataCy,
  disabled,
}: {
  children: ReactNode
  dataCy: string
  disabled: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="premium"
      className="h-11 w-full text-sm font-semibold"
      disabled={disabled || pending}
      data-cy={dataCy}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}

export default function PlanActivationCards({ currentPlan, canManagePlan }: PlanActivationCardsProps) {
  const router = useRouter()
  const [state, formAction] = useFormState(activatePlan, initialPlanActionState)

  useEffect(() => {
    if (state.status === 'success') {
      window.dispatchEvent(new Event('subscription-updated'))
      router.refresh()
    }
  }, [router, state.status, state.plan])

  const activePlan = state.status === 'success' && state.plan ? state.plan : currentPlan

  return (
    <>
      {state.message ? (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
            state.status === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
          data-cy={state.status === 'success' ? 'plan-success-message' : undefined}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = activePlan === plan.id

          return (
            <Card
              key={plan.id}
              className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ${
                isCurrent ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'
              }`}
              data-cy={plan.dataCy}
            >
              <CardHeader className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-2xl text-slate-900">{plan.name}</CardTitle>
                  {isCurrent ? (
                    <Badge variant="premium" data-cy="current-plan-badge">
                      Plano atual
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">{plan.price}</span>
                  <span className="text-sm font-medium text-slate-500">/mês</span>
                </div>
                <CardDescription className="text-sm leading-6 text-slate-600">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow px-6 pb-2">
                <ul className="space-y-3 border-t border-slate-100 pt-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-6 pt-8">
                <form action={formAction} className="w-full">
                  <input type="hidden" name="plan" value={plan.id} />
                  <SubmitButton dataCy={plan.buttonDataCy} disabled={!canManagePlan || isCurrent}>
                    {isCurrent ? 'Plano ativo' : `Ativar Plano ${plan.name}`}
                  </SubmitButton>
                </form>
              </CardFooter>
            </Card>
          )
        })}
      </section>
    </>
  )
}
