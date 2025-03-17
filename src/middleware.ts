// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('teko-auth-storage');
  const isAuthenticated = authCookie && JSON.parse(authCookie.value).state.user !== null;

  // Rutas que requieren autenticación
  const protectedPaths = ['/dashboard', '/transactions', '/budgets', '/family', '/settings'];
  const isProtectedRoute = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // Rutas de autenticación
  const authPaths = ['/login', '/register', '/reset-password'];
  const isAuthRoute = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirigir usuarios autenticados que intenten acceder a páginas de auth
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirigir usuarios no autenticados que intenten acceder a rutas protegidas
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/transactions/:path*',
    '/budgets/:path*',
    '/family/:path*',
    '/settings/:path*',
    '/login',
    '/register',
    '/reset-password',
  ],
};