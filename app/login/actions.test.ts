import { describe, expect, it, vi, beforeEach } from 'vitest'
import { authenticate } from './actions'
import { shouldBypassAuth } from '@/middleware'

const redirectMock = vi.fn()
const signInWithPasswordMock = vi.fn()
const signUpMock = vi.fn()
const getUserByEmailMock = vi.fn()
const updateUserByIdMock = vi.fn()
const createUserMock = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectMock(path)
    throw new Error(`REDIRECT:${path}`)
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
    },
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        getUserByEmail: getUserByEmailMock,
        updateUserById: updateUserByIdMock,
        createUser: createUserMock,
      },
    },
  })),
}))

describe('middleware', () => {
  it('allows dashboard access in local development without redirecting', () => {
    vi.stubEnv('NODE_ENV', 'development')

    expect(shouldBypassAuth('/dashboard')).toBe(true)
  })
})

describe('authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInWithPasswordMock.mockReset()
    signUpMock.mockReset()
    getUserByEmailMock.mockReset()
    updateUserByIdMock.mockReset()
    createUserMock.mockReset()
    redirectMock.mockReset()
  })

  it('returns the provider error when sign-in fails with a non-retriable auth error', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    signInWithPasswordMock.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    })

    await expect(authenticate({ error: null, message: null }, createFormData('signin', 'user@example.com', 'password'))).resolves.toEqual({
      error: 'Invalid login credentials',
      message: null,
    })
  })
})

function createFormData(mode: string, email: string, password: string) {
  const formData = new FormData()
  formData.set('mode', mode)
  formData.set('email', email)
  formData.set('password', password)
  return formData
}
