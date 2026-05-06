'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const isAuthPage = pathname === '/login'

  useEffect(() => {
    const seen = localStorage.getItem('moneyapp_onboarding_seen_v1')
    if (!seen) {
      setShowOnboarding(true)
    }
  }, [])

  useEffect(() => {
    const dismissed = localStorage.getItem('moneyapp_install_dismissed_v1')
    if (dismissed) return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPromptEvent(event as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    if (installPromptEvent) return
    const dismissed = localStorage.getItem('moneyapp_install_dismissed_v1')
    if (dismissed) return

    const ua = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(ua)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isIos && !isStandalone) {
      setShowInstallBanner(true)
    }
  }, [installPromptEvent])

  async function installApp() {
    if (!installPromptEvent) return
    await installPromptEvent.prompt()
    const choice = await installPromptEvent.userChoice
    if (choice.outcome === 'accepted') {
      setShowInstallBanner(false)
      localStorage.setItem('moneyapp_install_dismissed_v1', '1')
    }
    setInstallPromptEvent(null)
  }

  function dismissInstallBanner() {
    setShowInstallBanner(false)
    localStorage.setItem('moneyapp_install_dismissed_v1', '1')
  }

  function closeOnboarding() {
    setShowOnboarding(false)
    localStorage.setItem('moneyapp_onboarding_seen_v1', '1')
  }

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      <MobileNav isOpen={sidebarOpen} onToggle={setSidebarOpen} />
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-30 md:hidden"
        />
      )}
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-60 bg-gray-900/90 border-r border-gray-800 z-35 md:static md:z-0 transition-transform duration-200 transform md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 pt-16 md:pt-0`}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>
      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto pt-16 md:pt-0 p-4 md:p-7"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {showInstallBanner && (
          <div className="mb-4 bg-indigo-600/15 border border-indigo-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-100">
              Install MoneyApp for one-tap access and a full-screen app feel.
              {!installPromptEvent && ' On iPhone or iPad: tap Share, then Add to Home Screen.'}
            </p>
            <div className="flex items-center gap-2">
              {installPromptEvent && (
                <button onClick={installApp} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
                  Install
                </button>
              )}
              <button onClick={dismissInstallBanner} className="text-sm text-gray-300 hover:text-white px-2 py-1">
                Dismiss
              </button>
            </div>
          </div>
        )}
        {children}
      </main>

      {showOnboarding && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Welcome to MoneyApp</h2>
            <p className="text-sm text-gray-300 mb-4">Quick setup to make this easy to access every day:</p>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal pl-5">
              <li>Connect your bank or import a CSV in Banking.</li>
              <li>Add your first car and mark it sold when done.</li>
              <li>Install the app to your home screen for one-tap access.</li>
            </ol>
            <div className="flex justify-end mt-5">
              <button onClick={closeOnboarding} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Let&apos;s Go
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
