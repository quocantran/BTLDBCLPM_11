import { NextRequest, NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'

const PUBLIC_ROUTES = ['/', '/certificate-verify']
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

// Routes cần role cụ thể
const TEACHER_ROUTES = ['/dashboard/teacher', '/teacher']
const STUDENT_ROUTES = ['/dashboard/student', '/student']

// Routes chỉ cần login (không phân biệt role)
const PROTECTED_ROUTES_PREFIXES = ['/certificate', '/profile', '/settings']

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.includes(pathname)
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.includes(pathname)
}

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isTeacherRoute(pathname: string) {
  return TEACHER_ROUTES.some((route) => pathname.startsWith(route))
}

function isStudentRoute(pathname: string) {
  return STUDENT_ROUTES.some((route) => pathname.startsWith(route))
}

function getUserFromToken(token: string): { role: string } | null {
  try {
    const decoded: any = jwtDecode(token)
    return { role: decoded.role }
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('access_token')?.value

  const isLoggedIn = !!accessToken
  const user = accessToken ? getUserFromToken(accessToken) : null

  // 1. Public routes: luôn cho qua
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // 2. Auth routes: nếu đã login thì redirect về dashboard theo role
  if (isAuthRoute(pathname) && isLoggedIn && user) {
    const dashboardUrl =
      user.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student'
    return NextResponse.redirect(new URL(dashboardUrl, request.url))
  }

  // 3. Teacher routes: cần login + role teacher
  if (isTeacherRoute(pathname)) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (user?.role !== 'teacher') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // 4. Student routes: cần login + role student
  if (isStudentRoute(pathname)) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (user?.role !== 'student') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // 5. Protected routes: chỉ cần login (không phân biệt role)
  if (isProtectedRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'
  ]
}
