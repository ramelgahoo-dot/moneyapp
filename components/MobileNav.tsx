'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

interface MobileNavProps {
  onToggle: (open: boolean) => void
  isOpen: boolean
}

export default function MobileNav({ onToggle, isOpen }: MobileNavProps) {
  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-4 py-3 z-40 flex items-center justify-between"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
      }}
    >
      <span className="text-lg font-bold text-white tracking-tight">MoneyApp</span>
      <button
        onClick={() => onToggle(!isOpen)}
        className="text-gray-300 hover:text-white transition-colors rounded-lg border border-gray-700 px-2 py-1"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  )
}
