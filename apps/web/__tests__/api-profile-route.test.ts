import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileFindUnique: vi.fn(),
  profileUpdate: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    profile: {
      findUnique: mocks.profileFindUnique,
      update: mocks.profileUpdate,
    },
  },
}))

import { PATCH } from '../app/api/profile/route'

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    })
    mocks.profileFindUnique.mockResolvedValue({
      id: 'user-1',
      full_name: 'Ana Maria',
    })
    mocks.profileUpdate.mockResolvedValue({
      full_name: 'Ana Maria Silva',
      preferred_name: 'Dra. Ana',
      role: 'OWNER',
    })
  })

  it('updates full_name and preferred_name for the authenticated user', async () => {
    const response = await PATCH(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Ana Maria Silva',
        preferredName: 'Dra. Ana',
      }),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Perfil atualizado com sucesso.',
      profile: {
        full_name: 'Ana Maria Silva',
        preferred_name: 'Dra. Ana',
        role: 'OWNER',
      },
    })
    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        full_name: 'Ana Maria Silva',
        preferred_name: 'Dra. Ana',
      },
      select: {
        full_name: true,
        preferred_name: true,
        role: true,
      },
    })
  })

  it('keeps the existing full_name when only preferred_name is provided', async () => {
    const response = await PATCH(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferredName: 'Ana',
      }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        full_name: 'Ana Maria',
        preferred_name: 'Ana',
      },
      select: {
        full_name: true,
        preferred_name: true,
        role: true,
      },
    })
  })

  it('rejects an empty full_name when the field is explicitly sent', async () => {
    const response = await PATCH(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: '   ',
        preferredName: 'Ana',
      }),
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'INVALID_FULL_NAME',
      message: 'O nome completo é obrigatório.',
    })
    expect(mocks.profileUpdate).not.toHaveBeenCalled()
  })
})
