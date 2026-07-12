import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  inviteFindUnique: vi.fn(),
  sendInviteEmail: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    invite: {
      findUnique: mocks.inviteFindUnique,
    },
  },
}))

vi.mock('@/lib/email/invite', () => ({
  sendInviteEmail: mocks.sendInviteEmail,
}))

import { POST } from '../app/api/invites/send/route'

function futureDate() {
  return new Date(Date.now() + 72 * 60 * 60 * 1000)
}

describe('POST /api/invites/send — derives email fields from the invite (M-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendInviteEmail.mockResolvedValue(undefined)
  })

  it('ignores attacker-supplied to/clinicName/role and uses the invite record', async () => {
    mocks.inviteFindUnique.mockResolvedValue({
      token: 'valid-token',
      email: 'real-invitee@clinicaA.com',
      role: 'OPTOMETRIST',
      status: 'PENDING',
      expires_at: futureDate(),
      clinic: { name: 'Clínica A (real)' },
    })

    const response = await POST(new Request('http://localhost/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        // valores maliciosos no corpo — devem ser ignorados
        to: 'victim@gmail.com',
        clinicName: 'Banco Falso S.A.',
        role: 'OWNER',
      }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.sendInviteEmail).toHaveBeenCalledOnce()
    expect(mocks.sendInviteEmail).toHaveBeenCalledWith({
      to: 'real-invitee@clinicaA.com',
      token: 'valid-token',
      clinicName: 'Clínica A (real)',
      role: 'OPTOMETRIST',
    })
  })

  it('rejects a missing token', async () => {
    const response = await POST(new Request('http://localhost/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'x@y.com' }),
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'MISSING_TOKEN' })
    expect(mocks.sendInviteEmail).not.toHaveBeenCalled()
  })

  it('does not send for a non-PENDING invite', async () => {
    mocks.inviteFindUnique.mockResolvedValue({
      token: 'used-token',
      email: 'x@y.com',
      role: 'OPTOMETRIST',
      status: 'ACCEPTED',
      expires_at: futureDate(),
      clinic: { name: 'Clínica A' },
    })

    const response = await POST(new Request('http://localhost/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'used-token' }),
    }))

    expect(response.status).toBe(404)
    expect(mocks.sendInviteEmail).not.toHaveBeenCalled()
  })

  it('does not send for an expired invite', async () => {
    mocks.inviteFindUnique.mockResolvedValue({
      token: 'old-token',
      email: 'x@y.com',
      role: 'OPTOMETRIST',
      status: 'PENDING',
      expires_at: new Date(Date.now() - 1000),
      clinic: { name: 'Clínica A' },
    })

    const response = await POST(new Request('http://localhost/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'old-token' }),
    }))

    expect(response.status).toBe(404)
    expect(mocks.sendInviteEmail).not.toHaveBeenCalled()
  })
})
