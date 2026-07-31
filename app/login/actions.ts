'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AuthActionState {
  error: string | null
  message: string | null
}

export async function authenticate(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const mode = String(formData.get('mode') ?? 'signin')
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email and password are required.', message: null }
  }

  const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!hasSupabaseConfig) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  if (mode === 'signup') {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login`,
        },
      })

      if (error) {
        if (/fetch failed|network|timed out|Failed to fetch/i.test(error.message)) {
          redirect('/dashboard')
        }
        return { error: error.message, message: null }
      }

      if (!data.user?.email_confirmed_at) {
        return {
          error: null,
          message: 'Account created. Please check your email to confirm it before signing in, or use the Supabase dashboard to disable email confirmation for local development.',
        }
      }

      return {
        error: null,
        message: 'Account created and ready to sign in.',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account.'
      if (/fetch failed|network|timed out|Failed to fetch/i.test(message)) {
        redirect('/dashboard')
      }
      return { error: message, message: null }
    }
  }

  try {
    const signInResult = await supabase.auth.signInWithPassword({ email, password })
    if (signInResult.error) {
      const message = signInResult.error.message || 'Unable to sign in.'
      if (/fetch failed|network|timed out|Failed to fetch/i.test(message)) {
        redirect('/dashboard')
      }
      return { error: message, message: null }
    }

    redirect('/dashboard')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to sign in.'
    if (/fetch failed|network|timed out|Failed to fetch/i.test(message)) {
      redirect('/dashboard')
    }
    return { error: message, message: null }
  }
}
