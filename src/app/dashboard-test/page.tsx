// src/app/dashboard-test/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardTestPage() {
  const { user, session, refreshSession } = useAuthStore();
  const [authStatus, setAuthStatus] = useState('');
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await refreshSession();
        setAuthStatus(`After refresh - Session: ${session ? 'Yes' : 'No'}, User: ${user ? 'Yes' : 'No'}`);
      } catch (error) {
        console.error('Error refreshing session:', error);
        setAuthStatus('Error refreshing session');
      }
    };
    
    setAuthStatus(`Initial - Session: ${session ? 'Yes' : 'No'}, User: ${user ? 'Yes' : 'No'}`);
    checkAuth();
  }, [refreshSession, session, user]);
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard de Prueba (Sin Protección)</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Estado de Autenticación:</h2>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
          <pre>{authStatus}</pre>
        </div>
        
        {user ? (
          <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 dark:text-green-300 mb-2">
              Usuario autenticado
            </h3>
            <p className="mb-2">
              <span className="font-semibold">Nombre:</span> {user.display_name}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {user.email}
            </p>
          </div>
        ) : (
          <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-300">
              No hay usuario autenticado o los datos no están disponibles.
            </p>
          </div>
        )}
      </div>
      
      <div className="flex space-x-4">
        <Link 
          href="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Volver al Login
        </Link>
        
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Ir al Dashboard Real
        </button>
      </div>
    </div>
  );
}