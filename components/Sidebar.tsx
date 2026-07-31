'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Car, TrendingUp, Wallet, ArrowLeftRight, LogOut, Settings, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '../lib/supabase/client'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cars', label: 'Cars', icon: Car },
  { href: '/income', label: 'Income', icon: Wallet },
  { href: '/expenses', label: 'Expenses', icon: ArrowLeftRight },
  { href: '/investments', label: 'Investments', icon: TrendingUp },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/test', label: 'Test Lab', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login')
    router.refresh()
  }

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  return (
    <aside className="w-full h-full bg-gray-900/80 flex flex-col py-4 px-3 md:py-6 overflow-y-auto">
      <div className="mb-6 px-3 hidden md:flex items-center gap-2">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
        <span className="text-xl font-bold text-white tracking-tight">MoneyApp</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={handleNavClick}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-indigo-600 text-white shadow-[0_10px_20px_rgba(18,181,203,0.22)]'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon size={18} />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mt-2"
      >
        <LogOut size={18} />
        <span className="truncate">Sign out</span>
      </button>
    </aside>
  )
}
