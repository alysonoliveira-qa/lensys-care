'use client'

import { type ReactNode } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Check, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_DISPLAY_CONFIG } from '@/lib/plans/plan-display-config'
import { activatePlan, type AvailablePlan, type PlanActionState } from './actions'

interface PlanActivationCardsProps {
  currentPlan: AvailablePlan
  canManagePlan: boolean
}

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
  const [state, formAction] = useFormState(activatePlan, initialPlanActionState)

  // O plano em destaque é sempre o que veio do servidor. A action não confirma
  // ativação: quem clica sai daqui para o Stripe, e o plano novo só chega de
  // volta pelo webhook, num carregamento seguinte.
  const activePlan = currentPlan

  return (
    <>
      {state.message ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          data-cy="plan-error-message"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        {PLAN_DISPLAY_CONFIG.map((plan) => {
          const isCurrent = activePlan === plan.id

          return (
            <Card
              key={plan.id}
              className={`flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm ${
                isCurrent ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              }`}
              data-cy={plan.dashboardCardDataCy}
            >
              <CardHeader className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>
                  {isCurrent ? (
                    <Badge variant="premium" data-cy="current-plan-badge">
                      Plano atual
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">{plan.monthlyPrice}</span>
                  <span className="text-sm font-medium text-muted-foreground">{plan.monthlyPriceSuffix}</span>
                </div>
                <CardDescription className="text-sm leading-6 text-muted-foreground">
                  {plan.dashboardDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow px-6 pb-2">
                <ul className="space-y-3 border-t border-border pt-5">
                  {plan.dashboardFeatures.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-6 pt-8">
                <form action={formAction} className="w-full">
                  <input type="hidden" name="plan" value={plan.id} />
                  <SubmitButton dataCy={plan.dashboardButtonDataCy} disabled={!canManagePlan || isCurrent}>
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
