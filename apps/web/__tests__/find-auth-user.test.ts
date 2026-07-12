import { describe, expect, it, vi } from 'vitest'

import { findAuthUserByEmail } from '../lib/invites/find-auth-user'

// Constrói um admin client fake cujo listUsers retorna páginas de 1000 usuários.
function makeAdmin(pages: Array<Array<{ id: string; email: string }>>) {
  const listUsers = vi.fn(async ({ page }: { page: number; perPage: number }) => {
    const users = pages[page - 1] ?? []
    return { data: { users }, error: null }
  })
  return {
    admin: { auth: { admin: { listUsers } } } as never,
    listUsers,
  }
}

function fillPage(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    email: `${prefix}-${i}@example.com`,
  }))
}

describe('findAuthUserByEmail', () => {
  it('finds a user on the first page', async () => {
    const { admin, listUsers } = makeAdmin([
      [{ id: 'u1', email: 'alice@example.com' }],
    ])

    const found = await findAuthUserByEmail(admin, 'alice@example.com')

    expect(found).toEqual({ id: 'u1', email: 'alice@example.com' })
    expect(listUsers).toHaveBeenCalledTimes(1)
  })

  it('finds a user beyond the first page (regression: listUsers só via página 1)', async () => {
    // Página 1 cheia (1000) força a paginação; o alvo está na página 2.
    const { admin, listUsers } = makeAdmin([
      fillPage(1000, 'p1'),
      [{ id: 'target', email: 'bob@example.com' }],
    ])

    const found = await findAuthUserByEmail(admin, 'bob@example.com')

    expect(found).toEqual({ id: 'target', email: 'bob@example.com' })
    expect(listUsers).toHaveBeenCalledTimes(2)
  })

  it('is case-insensitive on email', async () => {
    const { admin } = makeAdmin([[{ id: 'u1', email: 'Carol@Example.com' }]])

    const found = await findAuthUserByEmail(admin, 'carol@example.com')

    expect(found?.id).toBe('u1')
  })

  it('returns null and stops paginating on a short (final) page', async () => {
    const { admin, listUsers } = makeAdmin([
      fillPage(1000, 'p1'),
      fillPage(3, 'p2'), // página curta = última
    ])

    const found = await findAuthUserByEmail(admin, 'missing@example.com')

    expect(found).toBeNull()
    expect(listUsers).toHaveBeenCalledTimes(2)
  })
})
