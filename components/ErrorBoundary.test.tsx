import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function ThrowingComponent() {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders a fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })
})
