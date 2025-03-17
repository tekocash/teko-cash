// src/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const { refreshSession } = useAuthStore();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Procesando callback de autenticación');
        await refreshSession();
        console.log('Sesión actualizada, redirigiendo a:', redirectTo);
        router.push(redirectTo);
      } catch (error) {
        console.error('Error procesando la autenticación:', error);
        router.push('/login');
      }
    };
    
    handleCallback();
  }, [router, refreshSession, redirectTo]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4">Procesando inicio de sesión...</p>
      </div>
    </div>
  );
}