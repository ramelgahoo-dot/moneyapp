import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DashboardPage from './page'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: unknown; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(async () => ({ data: [], error: null })),
      order: vi.fn(async () => ({ data: [], error: null })),
    })),
  },
}))

describe('DashboardPage', () => {
  it('renders dashboard content when Supabase config is missing by using demo data', async () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    render(<DashboardPage />)

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Plan:\s*FREE/i)).toBeInTheDocument()

    if (previousUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
    }
    if (previousAnon !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon
    }
  })
})
