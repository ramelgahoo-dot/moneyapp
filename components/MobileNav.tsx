'use client'

import { Menu, X } from 'lucide-react'

interface MobileNavProps {
  onToggle: (open: boolean) => void
  isOpen: boolean
}

export default function MobileNav({ onToggle, isOpen }: MobileNavProps) {
  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-4 py-3 z-50 flex items-center justify-between"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        // Keep controls below the native status bar touch area in Capacitor webviews.
        paddingTop: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))',
      }}
    >
      <span className="text-lg font-bold text-white tracking-tight">MoneyApp</span>
      <button
        onClick={() => onToggle(!isOpen)}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        className="text-gray-300 hover:text-white transition-colors rounded-lg border border-gray-700 px-2 py-1 min-h-11 min-w-11 flex items-center justify-center"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  )
}
