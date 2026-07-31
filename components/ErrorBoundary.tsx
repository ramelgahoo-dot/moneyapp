'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-2xl border border-amber-700 bg-amber-950/40 p-6 text-sm text-amber-100">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2">The page could not be rendered. Please refresh and try again.</p>
        </div>
      )
    }

    return this.props.children
  }
}
