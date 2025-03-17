// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Obtener la ruta actual
  const path = request.nextUrl.pathname;
  console.log(`Middleware ejecutándose para path: ${path}`);
  
  // Obtener la cookie de autenticación
  const authCookie = request.cookies.get('teko-auth-storage');
  
  let isAuthenticated = false;
  let debugInfo = "No auth cookie";
  
  try {
    if (authCookie) {
      const authData = JSON.parse(authCookie.value);
      debugInfo = "Cookie encontrada";
      
      // Verificar si hay una sesión en la cookie
      isAuthenticated = !!authData.state?.session;
      debugInfo = `Cookie parseada, isAuthenticated: ${isAuthenticated}`;
      
      // Inspeccionar los detalles de la sesión (quitar en producción)
      console.log("Auth cookie state:", JSON.stringify(authData.state).substring(0, 100) + "...");
    }
  } catch (error) {
    console.error('Error analizando cookie de autenticación:', error);
    debugInfo = `Error: ${error instanceof Error ? error.message : 'Desconocido'}`;
  }
  
  console.log(`Middleware resultado: path=${path}, auth=${isAuthenticated}, info=${debugInfo}`);
  
  // Rutas protegidas
  const protectedPaths = ['/dashboard', '/transactions', '/budgets', '/family', '/settings'];
  const isProtectedPath = protectedPaths.some(p => 
    path === p || path.startsWith(`${p}/`)
  );
  
  // Si es una ruta protegida y no hay autenticación, redirigir al login
  if (isProtectedPath && !isAuthenticated) {
    console.log(`Redirigiendo a login desde ${path} (no autenticado)`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Si es login y ya está autenticado, redirigir al dashboard
  if ((path === '/login' || path === '/register') && isAuthenticated) {
    console.log(`Redirigiendo a dashboard desde ${path} (ya autenticado)`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// Asegúrate de que el middleware solo se ejecute para las rutas que necesitas
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/transactions/:path*',
    '/budgets/:path*',
    '/family/:path*',
    '/settings/:path*',
    '/login',
    '/register',
  ],
};