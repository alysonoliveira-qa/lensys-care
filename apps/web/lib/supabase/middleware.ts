// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/middleware.ts
// Supabase middleware session refresh helper.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public paths that do not require authentication
  const isPublicPage = pathname === '/' || pathname === '/planos'
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/auth/login' ||
    pathname === '/auth/register'
  const isStaticOrFavicon = pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname.startsWith('/fonts')
  
  // APIs that have their own validation: Stripe Webhooks, Supabase alerts cron, etc.
  const isPublicApi = 
    pathname.startsWith('/api/webhooks') || 
    pathname === '/api/alerts/send' ||
    pathname.startsWith('/api/stripe/webhooks') // fallback just in case

  if (isStaticOrFavicon || isPublicApi) {
    return response
  }

  // Route protection
  if (!user && !isAuthPage && !isPublicPage) {
    // Redirect to login if trying to access dashboard/protected pages
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    // Redirect to dashboard if trying to access login/register while authenticated
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}
