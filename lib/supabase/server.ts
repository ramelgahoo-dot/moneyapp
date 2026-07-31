import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseFetchWithTimeout } from '@/lib/supabase/fetch'

function createMissingConfigClient() {
  const errorMessage = 'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app.'

  const queryBuilder = {
    select: () => queryBuilder,
    insert: () => queryBuilder,
    update: () => queryBuilder,
    delete: () => queryBuilder,
    eq: () => queryBuilder,
    order: () => queryBuilder,
    limit: () => queryBuilder,
    single: async () => ({ data: null, error: new Error(errorMessage) }),
    maybeSingle: async () => ({ data: null, error: new Error(errorMessage) }),
  }

  return {
    from: () => queryBuilder,
    auth: {
      signUp: async () => ({ data: null, error: new Error(errorMessage) }),
      signInWithPassword: async () => ({ data: null, error: new Error(errorMessage) }),
      getUser: async () => ({ data: { user: null }, error: new Error(errorMessage) }),
      signOut: async () => ({ error: null }),
    },
  }
}

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return createMissingConfigClient()
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: supabaseFetchWithTimeout,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — middleware handles refresh
        }
      },
    },
  })
}
