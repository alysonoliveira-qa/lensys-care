'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type AvailablePlan = 'ESSENTIAL' | 'CONECTA'

export interface PlanActionState {
  status: 'idle' | 'success' | 'error'
  message: string
  plan?: AvailablePlan
}

export async function activatePlan(
  _previousState: PlanActionState,
  formData: FormData
): Promise<PlanActionState> {
  const requestedPlan = formData.get('plan')

  if (requestedPlan !== 'ESSENTIAL' && requestedPlan !== 'CONECTA') {
    return { status: 'error', message: 'Plano selecionado inválido.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'error', message: 'Sua sessão expirou. Entre novamente para alterar o plano.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('clinic_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.clinic_id) {
    return { status: 'error', message: 'Não foi possível identificar a clínica vinculada à sua conta.' }
  }

  if (profile.role !== 'OWNER') {
    return { status: 'error', message: 'Somente o proprietário da clínica pode alterar o plano.' }
  }

  const subscriptionData = {
    plan: requestedPlan,
    status: 'ACTIVE',
  }
  const { data: updatedSubscription, error: updateError } = await supabase
    .from('subscriptions')
    .update(subscriptionData)
    .eq('clinic_id', profile.clinic_id)
    .select('plan')
    .maybeSingle()

  if (updateError) {
    return { status: 'error', message: 'Não foi possível ativar o plano. Tente novamente.' }
  }

  if (!updatedSubscription) {
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({ clinic_id: profile.clinic_id, ...subscriptionData })

    if (insertError) {
      return { status: 'error', message: 'Não foi possível ativar o plano. Tente novamente.' }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/planos')

  const planLabel = requestedPlan === 'CONECTA' ? 'Conecta' : 'Essencial'
  return {
    status: 'success',
    message: `Plano ${planLabel} ativado com sucesso. Nenhuma cobrança foi realizada.`,
    plan: requestedPlan,
  }
}
