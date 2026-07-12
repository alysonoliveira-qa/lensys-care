import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  profileFindUnique: vi.fn(),
  examFindFirst: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getClaims: mocks.getClaims },
    from: mocks.from,
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    profile: { findUnique: mocks.profileFindUnique },
    exam: { findFirst: mocks.examFindFirst },
  },
}))

import { PATCH, DELETE } from '../app/api/exams/[id]/route'

// Builder encadeável para supabase.from('exams').update|delete().eq().select().maybeSingle()
function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  builder.update = vi.fn(() => builder)
  builder.delete = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.select = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(() => Promise.resolve(result))
  return builder
}

const params = { id: 'exam-from-clinic-b' }

function patchRequest() {
  return new Request('http://localhost/api/exams/exam-from-clinic-b', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examDate: '2026-05-27' }),
  })
}

describe('PATCH /api/exams/[id] tenant ownership (L-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-clinic-a' } }, error: null })
    mocks.profileFindUnique.mockResolvedValue({ role: 'OWNER', clinic_id: 'clinic-a' })
  })

  it('blocks editing an exam from another clinic without touching supabase', async () => {
    // Exame pertence à clínica B → a checagem Prisma escopada por clinic-a retorna null.
    mocks.examFindFirst.mockResolvedValue(null)

    const response = await PATCH(patchRequest(), { params })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: 'EXAM_NOT_FOUND' })
    expect(mocks.examFindFirst).toHaveBeenCalledWith({
      where: { id: 'exam-from-clinic-b', patient: { clinic_id: 'clinic-a' } },
      select: { id: true },
    })
    // Nenhuma mutação chegou ao banco.
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('allows editing an exam owned by the caller clinic', async () => {
    mocks.examFindFirst.mockResolvedValue({ id: 'exam-from-clinic-b' })
    const builder = makeQueryBuilder({ data: { id: 'exam-from-clinic-b' }, error: null })
    mocks.from.mockReturnValue(builder)

    const response = await PATCH(patchRequest(), { params })

    expect(response.status).toBe(200)
    expect(mocks.from).toHaveBeenCalledWith('exams')
    expect(builder.update).toHaveBeenCalledOnce()
  })

  it('blocks RECEPTIONIST before any ownership lookup', async () => {
    mocks.profileFindUnique.mockResolvedValue({ role: 'RECEPTIONIST', clinic_id: 'clinic-a' })

    const response = await PATCH(patchRequest(), { params })

    expect(response.status).toBe(403)
    expect(mocks.examFindFirst).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/exams/[id] tenant ownership (L-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-clinic-a' } }, error: null })
    mocks.profileFindUnique.mockResolvedValue({ role: 'OWNER', clinic_id: 'clinic-a' })
  })

  it('blocks deleting an exam from another clinic without touching supabase', async () => {
    mocks.examFindFirst.mockResolvedValue(null)

    const response = await DELETE(new Request('http://localhost/api/exams/exam-from-clinic-b', { method: 'DELETE' }), { params })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: 'EXAM_NOT_FOUND' })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('allows OWNER to delete an exam owned by the clinic', async () => {
    mocks.examFindFirst.mockResolvedValue({ id: 'exam-from-clinic-b', performed_by: 'someone-else' })
    const builder = makeQueryBuilder({ data: { id: 'exam-from-clinic-b' }, error: null })
    mocks.from.mockReturnValue(builder)

    const response = await DELETE(new Request('http://localhost/api/exams/exam-from-clinic-b', { method: 'DELETE' }), { params })

    expect(response.status).toBe(200)
    expect(builder.delete).toHaveBeenCalledOnce()
  })

  it('blocks OPTOMETRIST from deleting an exam performed by someone else', async () => {
    mocks.profileFindUnique.mockResolvedValue({ role: 'OPTOMETRIST', clinic_id: 'clinic-a' })
    mocks.examFindFirst.mockResolvedValue({ id: 'exam-from-clinic-b', performed_by: 'another-optometrist' })

    const response = await DELETE(new Request('http://localhost/api/exams/exam-from-clinic-b', { method: 'DELETE' }), { params })

    expect(response.status).toBe(403)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
