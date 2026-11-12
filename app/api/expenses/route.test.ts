import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  ownedCars: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) } }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => table === 'cars'
      ? {
          select: () => ({
            in: (_column: string, ids: string[]) => ({
              eq: (_userColumn: string, userId: string) => mocks.ownedCars(ids, userId),
            }),
          }),
        }
      : { insert: mocks.insert },
  }),
}))

import { POST } from './route'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.insert.mockResolvedValue({ error: null })
  mocks.ownedCars.mockImplementation(async (ids: string[]) => ({ data: ids.map((id) => ({ id })), error: null }))
})

const request = (extra: Record<string, unknown> = {}) => new Request('http://localhost/api/expenses', {
  method: 'POST',
  body: JSON.stringify({ category: 'Repair', amount: 100, date: '2026-11-10', ...extra }),
})

describe('POST /api/expenses multi-car entries', () => {
  it('creates one full-amount expense for every selected car in one insert', async () => {
    const response = await POST(request({ expenseType: 'car', carIds: ['car-1', 'car-2'] }))

    expect(response.status).toBe(200)
    expect(mocks.ownedCars).toHaveBeenCalledWith(['car-1', 'car-2'], 'user-1')
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({ car_id: 'car-1', amount: 100, user_id: 'user-1' }),
      expect.objectContaining({ car_id: 'car-2', amount: 100, user_id: 'user-1' }),
    ])
  })

  it('removes duplicate car ids before inserting', async () => {
    await POST(request({ expenseType: 'car', carIds: ['car-1', 'car-1'] }))

    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({ car_id: 'car-1' })])
  })

  it('keeps compatibility with a single car id', async () => {
    await POST(request({ expenseType: 'car', carId: 'car-1' }))

    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({ car_id: 'car-1' })])
  })

  it.each([[], ['car-1', '  '], 'car-1'])('rejects invalid car selections %j', async (carIds) => {
    const response = await POST(request({ expenseType: 'car', carIds }))

    expect(response.status).toBe(400)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('rejects cars that do not belong to the authenticated user', async () => {
    mocks.ownedCars.mockResolvedValue({ data: [{ id: 'car-1' }], error: null })

    const response = await POST(request({ expenseType: 'car', carIds: ['car-1', 'other-user-car'] }))

    expect(response.status).toBe(400)
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
