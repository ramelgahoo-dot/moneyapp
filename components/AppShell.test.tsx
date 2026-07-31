import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppShell from './AppShell'

const usePathnameMock = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}))

vi.mock('./Sidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}))

vi.mock('./MobileNav', () => ({
  default: () => <div data-testid="mobile-nav" />,
}))

describe('AppShell', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/dashboard')
  })

  it('renders children even when localStorage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable')
    })

    render(
      <AppShell>
        <div>Dashboard content</div>
      </AppShell>
    )

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })
})
