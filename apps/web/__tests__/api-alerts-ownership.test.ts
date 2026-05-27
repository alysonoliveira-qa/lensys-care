import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  getClaims: vi.fn(),
  getAlertClinicForUser: vi.fn(),
  getAlertByIdForClinic: vi.fn(),
  serviceFrom: vi.fn(),
  serviceUpdate: vi.fn(),
  serviceEq: vi.fn(),
  serviceSelect: vi.fn(),
  serviceSingle: vi.fn(),
  sendAlertEmail: vi.fn(),
  sendAlertWhatsApp: vi.fn(),
  sendAlertSMS: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createServiceClient,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getClaims: mocks.getClaims,
    },
  }),
}))

vi.mock('@/lib/alerts/alert-data', () => ({
  getAlertClinicForUser: mocks.getAlertClinicForUser,
  getAlertByIdForClinic: mocks.getAlertByIdForClinic,
}))

vi.mock('@/lib/alerts', () => ({
  sendAlertEmail: mocks.sendAlertEmail,
  sendAlertWhatsApp: mocks.sendAlertWhatsApp,
  sendAlertSMS: mocks.sendAlertSMS,
}))

import { POST } from '../app/api/alerts/[id]/route'

function createActionRequest(action: 'dismiss' | 'resend') {
  return new Request('http://localhost/api/alerts/alert-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

describe('POST /api/alerts/[id] ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-clinic-a' } },
      error: null,
    })
    mocks.getAlertClinicForUser.mockResolvedValue({ clinic_id: 'clinic-a' })
    mocks.getAlertByIdForClinic.mockResolvedValue(null)
    mocks.serviceSingle.mockResolvedValue({
      data: { id: 'alert-clinic-a', status: 'DISMISSED' },
      error: null,
    })
    mocks.serviceSelect.mockReturnValue({ single: mocks.serviceSingle })
    mocks.serviceEq.mockReturnValue({ select: mocks.serviceSelect })
    mocks.serviceUpdate.mockReturnValue({ eq: mocks.serviceEq })
    mocks.serviceFrom.mockReturnValue({ update: mocks.serviceUpdate })
    mocks.createServiceClient.mockReturnValue({ from: mocks.serviceFrom })
  })

  it('allows dismiss after validating an alert from the authenticated clinic', async () => {
    mocks.getAlertByIdForClinic.mockResolvedValue({ id: 'alert-clinic-a' })

    const response = await POST(createActionRequest('dismiss'), {
      params: { id: 'alert-clinic-a' },
    })

    expect(response.status).toBe(200)
    expect(mocks.getAlertByIdForClinic).toHaveBeenCalledWith('alert-clinic-a', 'clinic-a')
    expect(mocks.createServiceClient).toHaveBeenCalledOnce()
    expect(mocks.serviceUpdate).toHaveBeenCalledWith({ status: 'DISMISSED' })
    expect(mocks.serviceEq).toHaveBeenCalledWith('id', 'alert-clinic-a')
    expect(mocks.getAlertByIdForClinic.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.createServiceClient.mock.invocationCallOrder[0])
  })

  it('blocks dismiss for an alert outside the authenticated clinic', async () => {
    const response = await POST(createActionRequest('dismiss'), {
      params: { id: 'alert-clinic-b' },
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: 'ALERT_NOT_FOUND' })
    expect(mocks.getAlertByIdForClinic).toHaveBeenCalledWith('alert-clinic-b', 'clinic-a')
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.serviceUpdate).not.toHaveBeenCalled()
  })

  it('blocks resend for an alert outside the authenticated clinic without sending communication', async () => {
    const response = await POST(createActionRequest('resend'), {
      params: { id: 'alert-clinic-b' },
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: 'ALERT_NOT_FOUND' })
    expect(mocks.getAlertByIdForClinic).toHaveBeenCalledWith('alert-clinic-b', 'clinic-a')
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.sendAlertEmail).not.toHaveBeenCalled()
    expect(mocks.sendAlertWhatsApp).not.toHaveBeenCalled()
    expect(mocks.sendAlertSMS).not.toHaveBeenCalled()
  })

  it('blocks actions for an alert that does not exist', async () => {
    const response = await POST(createActionRequest('dismiss'), {
      params: { id: 'missing-alert' },
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: 'ALERT_NOT_FOUND' })
    expect(mocks.getAlertByIdForClinic).toHaveBeenCalledWith('missing-alert', 'clinic-a')
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.serviceUpdate).not.toHaveBeenCalled()
  })
})
