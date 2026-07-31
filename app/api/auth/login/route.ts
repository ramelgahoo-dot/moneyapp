import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type LoginPayload = {
  email?: string
  password?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginPayload
    const email = String(body.email ?? '').trim()
    const password = String(body.password ?? '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const signInResult = await supabase.auth.signInWithPassword({ email, password })

    if (signInResult.error) {
      const message = signInResult.error.message || 'Unable to sign in.'
      const isConfirmationIssue = /email|confirm/i.test(message)

      if (isConfirmationIssue) {
        try {
          const adminClient = createAdminClient()
          const { data: { users }, error: adminError } = await adminClient.auth.admin.listUsers()

          if (!adminError && users) {
            const user = users.find((u) => u.email === email)
            if (user?.id) {
              const retryResult = await supabase.auth.signInWithPassword({ email, password })
              if (!retryResult.error) {
                return NextResponse.json({ ok: true })
              }
            }
          }
        } catch {
          // fall through to the normal error message below
        }
      }

      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to sign in'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
