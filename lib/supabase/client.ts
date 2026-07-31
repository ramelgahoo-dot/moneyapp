import { createBrowserClient } from '@supabase/ssr'
import { supabaseFetchWithTimeout } from '@/lib/supabase/fetch'

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>

let browserClient: BrowserSupabaseClient | null = null

function createMissingConfigClient(): BrowserSupabaseClient {
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
  } as unknown as BrowserSupabaseClient
}

export function createClient() {
  if (typeof window === 'undefined') {
    return createMissingConfigClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!browserClient && supabaseUrl && supabaseAnonKey) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: supabaseFetchWithTimeout,
      },
    })
  }

  return browserClient ?? createMissingConfigClient()
}
