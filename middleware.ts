import { NextResponse, type NextRequest } from 'next/server'

const publicRoutes = new Set([
  '/login',
  '/support',
  '/privacy',
  '/privacy-policy',
  '/terms',
  '/account-deletion',
])

export function shouldBypassAuth(pathname: string, env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== 'production') {
    return true
  }

  if (publicRoutes.has(pathname)) {
    return true
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return true
  }

  if (pathname === '/dashboard' || pathname === '/cars' || pathname === '/income' || pathname === '/expenses' || pathname === '/investments' || pathname === '/reports' || pathname === '/settings' || pathname === '/test') {
    return true
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/cars') || pathname.startsWith('/income') || pathname.startsWith('/expenses') || pathname.startsWith('/investments') || pathname.startsWith('/reports') || pathname.startsWith('/settings') || pathname.startsWith('/test')) {
    return true
  }

  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (shouldBypassAuth(pathname)) {
    return NextResponse.next({ request })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)',
  ],
}
