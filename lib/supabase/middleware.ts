import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[v0] Missing Supabase environment variables in middleware')
      // Allow access to auth pages and home without Supabase
      if (request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname === '/') {
        return supabaseResponse
      }
      
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get user role for route protection
    let userRole = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      userRole = profile?.role
    }

    const pathname = request.nextUrl.pathname

    // Public routes
    if (pathname === '/' || pathname.startsWith('/auth')) {
      return supabaseResponse
    }

    // Require auth for dashboard
    if (!user && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    // Role-based routing
    if (user && userRole) {
      if (userRole === 'employee' && (pathname.startsWith('/dashboard/letters') || pathname.startsWith('/dashboard/subscription'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/commissions'
        return NextResponse.redirect(url)
      }

      // Restrict admin-only routes
      if (pathname.startsWith('/dashboard/admin') && userRole !== 'admin') {
        const redirects: Record<string, string> = {
          'subscriber': '/dashboard/letters',
          'employee': '/dashboard/commissions'
        }
        const url = request.nextUrl.clone()
        url.pathname = redirects[userRole] || '/dashboard'
        return NextResponse.redirect(url)
      }

      if ((pathname.startsWith('/dashboard/commissions') || pathname.startsWith('/dashboard/coupons')) && userRole === 'subscriber') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/letters'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('[v0] Middleware error:', error)
    
    // Allow access to auth pages even on error
    if (request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname === '/') {
      return supabaseResponse
    }
    
    // Redirect to home with error for other routes
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
}
