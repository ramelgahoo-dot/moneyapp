const MISSING_PUBLIC_SUPABASE_CONFIG =
  'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app.'

const DEFAULT_SUPABASE_LOAD_ERROR =
  'Unable to load data from Supabase. Check that your Supabase project is running and your public keys are still configured.'

export function getSupabasePublicConfigError() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return MISSING_PUBLIC_SUPABASE_CONFIG
  }

  return null
}

export function getSupabaseLoadErrorMessage(err: unknown) {
  if (err instanceof Error && err.message.trim()) {
    return err.message
  }

  return DEFAULT_SUPABASE_LOAD_ERROR
}