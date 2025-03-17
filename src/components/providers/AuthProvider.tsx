// src/components/providers/AuthProvider.tsx
'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'react-hot-toast';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, isLoading, refreshSession } = useAuthStore();
  const [hasPerformedInitialCheck, setHasPerformedInitialCheck] = useState(false);

  const isAuthRoute = ['/login', '/register', '/reset-password'].includes(pathname);
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/transactions') || 
                          pathname.startsWith('/budgets') || 
                          pathname.startsWith('/family') || 
                          pathname.startsWith('/settings');

  useEffect(() => {
    // Only perform initial check once
    if (!hasPerformedInitialCheck) {
      const performInitialCheck = async () => {
        try {
          console.log('Performing initial session check');
          await refreshSession();
          setHasPerformedInitialCheck(true);
        } catch (error) {
          console.error('Initial session check failed', error);
          setHasPerformedInitialCheck(true);
          
          if (isProtectedRoute) {
            toast.error('Tu sesión ha expirado');
            router.push('/login');
          }
        }
      };

      performInitialCheck();
    }
  }, [refreshSession, hasPerformedInitialCheck, isProtectedRoute, router]);

  useEffect(() => {
    // Handle redirections after initial check
    if (hasPerformedInitialCheck) {
      console.log('Checking authentication state:', { 
        session: !!session, 
        isAuthRoute, 
        isProtectedRoute 
      });

      if (!session && isProtectedRoute) {
        console.log('No session, redirecting to login');
        router.push(`/login?redirectTo=${pathname}`);
      } else if (session && isAuthRoute) {
        console.log('Session exists, redirecting to dashboard');
        router.push('/dashboard');
      }
    }
  }, [session, hasPerformedInitialCheck, isAuthRoute, isProtectedRoute, router, pathname]);

  // Loading state
  if (!hasPerformedInitialCheck || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return children;
}