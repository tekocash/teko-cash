// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

export default function Home() {
  const router = useRouter();
  const { session, refreshSession } = useAuthStore();
  
  useEffect(() => {
    // Intentar refrescar la sesión
    refreshSession();
    
    // Si hay sesión, redirigir al dashboard
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router, refreshSession]);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 dark:text-white">
      <div className="w-full max-w-lg text-center space-y-6">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">Teko Cash</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Gestiona tus finanzas personales y familiares de manera simple e intuitiva
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link 
            href="/login" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link 
            href="/register" 
            className="px-6 py-3 bg-white text-blue-600 border border-blue-300 rounded-lg font-medium hover:bg-blue-50 transition-colors dark:bg-gray-800 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-gray-700"
          >
            Registrarse
          </Link>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-white rounded-lg shadow dark:bg-gray-800">
            <h3 className="font-bold text-lg mb-2">Control de Gastos</h3>
            <p className="text-gray-600 dark:text-gray-400">Registra y categoriza todos tus gastos e ingresos</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow dark:bg-gray-800">
            <h3 className="font-bold text-lg mb-2">Presupuesto</h3>
            <p className="text-gray-600 dark:text-gray-400">Establece límites de gastos y visualiza tu progreso</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow dark:bg-gray-800">
            <h3 className="font-bold text-lg mb-2">Grupos Familiares</h3>
            <p className="text-gray-600 dark:text-gray-400">Comparte gastos y administra finanzas en familia</p>
          </div>
        </div>
      </div>
    </main>
  );
}