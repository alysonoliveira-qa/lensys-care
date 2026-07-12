import type { createClient as createAdminClient } from '@supabase/supabase-js'

type AdminClient = ReturnType<typeof createAdminClient>
type AuthUser = Awaited<
  ReturnType<AdminClient['auth']['admin']['listUsers']>
>['data']['users'][number]

// Busca um usuário do Supabase Auth por e-mail percorrendo as páginas do admin API.
// `listUsers()` sem argumentos retorna apenas a primeira página (padrão), então uma base
// grande faria convidados existentes além da página 1 não serem encontrados — o fluxo
// tentaria criar um usuário com e-mail duplicado e falharia. Paginamos até achar ou
// esgotar as páginas.
export async function findAuthUserByEmail(
  admin: AdminClient,
  email: string
): Promise<AuthUser | null> {
  const target = email.toLowerCase()
  const perPage = 1000
  const maxPages = 100 // trava de segurança: até 100k usuários

  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const found = data.users.find((u) => u.email?.toLowerCase() === target)
    if (found) return found

    if (data.users.length < perPage) break // última página
  }

  return null
}
