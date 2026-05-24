// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/middleware.ts
// Supabase middleware session refresh helper.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  endPerformanceTimer,
  logPerformanceStep,
  startPerformanceStep,
  startPerformanceTimer,
} from '@/lib/performance'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Public paths do not need session validation or refresh.
  const isPublicPage = pathname === '/' || pathname === '/planos'
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/auth/login' ||
    pathname === '/auth/register'
  const isStaticOrFavicon =
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/images')

  // APIs that have their own validation: Stripe webhooks, Supabase alerts cron, etc.
  const isPublicApi =
    pathname === '/api/auth/register' ||
    pathname.startsWith('/api/webhooks') ||
    pathname === '/api/alerts/send' ||
    pathname.startsWith('/api/stripe/webhooks') // fallback just in case

  if (isPublicPage || isAuthPage || isStaticOrFavicon || isPublicApi) {
    return response
  }

  const timer = startPerformanceTimer(`middleware ${pathname}`)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Validate the access token while allowing refreshed cookies to propagate.
  const authStartedAt = startPerformanceStep()
  const { data, error } = await supabase.auth.getClaims()
  logPerformanceStep(timer, 'auth.getClaims', authStartedAt)

  // Route protection
  if (error || !data?.claims.sub) {
    // Redirect to login if trying to access dashboard/protected pages
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    endPerformanceTimer(timer, 'redirect_login')
    return NextResponse.redirect(url)
  }

  endPerformanceTimer(timer, 'allowed')
  return response
}
