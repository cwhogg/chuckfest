import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'chuckfest_member_id'

// Routes that require authentication (member selection)
const protectedRoutes = ['/sites', '/dates', '/past-trips']

// Routes that don't require authentication
const publicRoutes = ['/', '/admin', '/test-permits']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for member cookie on protected routes
  const memberId = request.cookies.get(COOKIE_NAME)?.value

  if (!memberId && protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    // Redirect to member selector
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
