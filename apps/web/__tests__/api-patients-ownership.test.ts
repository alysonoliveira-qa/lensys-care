import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  profileFindUnique: vi.fn(),
  patientCreate: vi.fn(),
  patientFindFirst: vi.fn(),
  patientUpdate: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getClaims: mocks.getClaims,
    },
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    profile: {
      findUnique: mocks.profileFindUnique,
    },
    patient: {
      create: mocks.patientCreate,
      findFirst: mocks.patientFindFirst,
      update: mocks.patientUpdate,
    },
  },
}))

vi.mock('@/lib/performance', () => ({
  endPerformanceTimer: vi.fn(),
  logPerformanceStep: vi.fn(),
  startPerformanceStep: vi.fn(() => 0),
  startPerformanceTimer: vi.fn(() => ({ id: 'test', label: 'test', startedAt: 0 })),
}))

import { PATCH, POST } from '../app/api/patients/route'

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )

const patch = (body: unknown) =>
  PATCH(
    new Request('http://localhost/api/patients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )

const PACIENTE_VALIDO = {
  fullName: 'Maria Silva',
  dob: '1990-04-12',
  phone: '11999990000',
  email: 'maria@exemplo.com',
  notes: 'Primeira consulta',
}

describe('/api/patients — isolamento entre clínicas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-clinica-a' } },
      error: null,
    })
    mocks.profileFindUnique.mockResolvedValue({ clinic_id: 'clinica-a' })
    mocks.patientCreate.mockResolvedValue({ id: 'paciente-novo' })
    mocks.patientFindFirst.mockResolvedValue(null)
    mocks.patientUpdate.mockResolvedValue({ id: 'paciente-a' })
  })

  describe('POST', () => {
    it('grava o paciente na clínica da SESSÃO, ignorando o clinicId do corpo', async () => {
      // O ataque que este teste cobre: um usuário autenticado da clínica A manda
      // `clinicId` da clínica B no JSON para plantar um paciente na base alheia.
      // O `clinic_id` tem que vir sempre do profile da sessão.
      const response = await post({
        ...PACIENTE_VALIDO,
        clinicId: 'clinica-b',
        clinic_id: 'clinica-b',
      })

      expect(response.status).toBe(200)
      expect(mocks.patientCreate).toHaveBeenCalledTimes(1)
      expect(mocks.patientCreate.mock.calls[0][0].data.clinic_id).toBe('clinica-a')
    })

    it('recusa sem sessão e não encosta no banco', async () => {
      mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: null })

      const response = await post(PACIENTE_VALIDO)

      expect(response.status).toBe(401)
      expect(mocks.profileFindUnique).not.toHaveBeenCalled()
      expect(mocks.patientCreate).not.toHaveBeenCalled()
    })

    it('recusa quando a sessão não tem profile — usuário sem clínica não cria paciente', async () => {
      mocks.profileFindUnique.mockResolvedValue(null)

      const response = await post(PACIENTE_VALIDO)

      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ error: 'PROFILE_NOT_FOUND' })
      expect(mocks.patientCreate).not.toHaveBeenCalled()
    })

    it('recusa data de nascimento no futuro', async () => {
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)

      const response = await post({ ...PACIENTE_VALIDO, dob: amanha.toISOString().slice(0, 10) })

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: 'FUTURE_DOB' })
      expect(mocks.patientCreate).not.toHaveBeenCalled()
    })

    it('recusa data de nascimento inválida', async () => {
      const response = await post({ ...PACIENTE_VALIDO, dob: 'nao-e-data' })

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: 'INVALID_DOB' })
      expect(mocks.patientCreate).not.toHaveBeenCalled()
    })
  })

  describe('PATCH', () => {
    it('não edita paciente de outra clínica, e não chama update', async () => {
      // `patientFindFirst` devolve null porque o filtro por clinic_id não casa.
      // O que importa aqui não é só o 404: é que o update nunca acontece.
      const response = await patch({ patientId: 'paciente-da-clinica-b', ...PACIENTE_VALIDO })

      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ error: 'PATIENT_NOT_FOUND' })
      expect(mocks.patientUpdate).not.toHaveBeenCalled()
    })

    it('filtra por clinic_id da sessão ao localizar o paciente', async () => {
      // Regressão: se alguém trocar o `findFirst` por `findUnique({ id })`, o
      // 404 acima continua passando por acidente enquanto o isolamento some.
      mocks.patientFindFirst.mockResolvedValue({ id: 'paciente-a' })

      await patch({ patientId: 'paciente-a', ...PACIENTE_VALIDO })

      expect(mocks.patientFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'paciente-a', clinic_id: 'clinica-a' },
        })
      )
    })

    it('edita o paciente da própria clínica', async () => {
      mocks.patientFindFirst.mockResolvedValue({ id: 'paciente-a' })

      const response = await patch({ patientId: 'paciente-a', ...PACIENTE_VALIDO })

      expect(response.status).toBe(200)
      expect(mocks.patientUpdate).toHaveBeenCalledTimes(1)
      expect(mocks.patientUpdate.mock.calls[0][0].where).toEqual({ id: 'paciente-a' })
    })

    it('recusa sem sessão e não encosta no banco', async () => {
      mocks.getClaims.mockResolvedValue({ data: null, error: new Error('sem sessão') })

      const response = await patch({ patientId: 'paciente-a', ...PACIENTE_VALIDO })

      expect(response.status).toBe(401)
      expect(mocks.patientFindFirst).not.toHaveBeenCalled()
      expect(mocks.patientUpdate).not.toHaveBeenCalled()
    })

    it('exige patientId — sem ele não há o que validar dono', async () => {
      const response = await patch({ ...PACIENTE_VALIDO })

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: 'MISSING_FIELDS' })
      expect(mocks.patientFindFirst).not.toHaveBeenCalled()
    })
  })
})
