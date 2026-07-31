'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function safeGetStorageItem(key: string) {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetStorageItem(key: string, value: string) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage access issues in restricted browser contexts.
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full w-full flex-col bg-gray-950 text-gray-100">
      <div className="flex-1 overflow-auto p-4 md:p-7">
        {children}
      </div>
    </div>
  )
}
