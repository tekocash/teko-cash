// src/app/(auth)/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const { signIn, signInWithGoogle, isLoading, session, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [authStatus, setAuthStatus] = useState('');

  // Verificación del estado de autenticación
  useEffect(() => {
    setAuthStatus(`Session: ${session ? 'Sí' : 'No'}, User: ${user ? 'Sí' : 'No'}`);
  }, [session, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      toast.success('Inicio de sesión exitoso');
      setRedirecting(true);
      setAuthStatus(`Después de login - Session: ${session ? 'Sí' : 'No'}, User: ${user ? 'Sí' : 'No'}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    }
  };
  
  const handleManualRedirect = () => {
    window.location.href = '/dashboard-test';
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow max-w-md">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg mb-2">Estado de autenticación:</p>
          <div className="bg-gray-100 p-2 mb-4 rounded text-left">
            <pre>{authStatus}</pre>
          </div>
          <p className="text-lg mb-4">La redirección automática puede fallar debido a protección de rutas.</p>
          <button 
            onClick={handleManualRedirect} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ir al Dashboard manualmente
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Teko Cash</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Inicia sesión para gestionar tus finanzas</p>
        </div>
        
        {/* Mostrar estado de autenticación */}
        <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
          <p>Estado de autenticación: {authStatus}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Resto del formulario... */}
        </form>
        
        <div className="mt-4">
          <button 
            onClick={handleManualRedirect}
            className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg"
          >
            Ir al Dashboard (prueba directa)
          </button>
        </div>
      </div>
    </div>
  );
}