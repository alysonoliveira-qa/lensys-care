import { createClient } from '@/lib/supabase/server'

export interface AuthenticatedProfile {
  id: string
  clinic_id: string
  role: string
}

/**
 * Perfil do usuário autenticado, resolvido no servidor.
 *
 * O `clinic_id` das server actions vem SEMPRE daqui — nunca do formulário —, para que
 * nenhum campo enviado pelo cliente consiga apontar para outra clínica.
 */
export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, clinic_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.clinic_id) return null

  return { id: profile.id, clinic_id: profile.clinic_id, role: profile.role }
}
