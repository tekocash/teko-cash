'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Dashboard from '@/features/dashboard/Dashboard';

export default function DashboardPage() {
  const { user, session } = useAuthStore();

  // Logging para depuración
  useEffect(() => {
    console.log("DashboardPage: Cambio en user o session", {
      user: !!user,
      session: !!session
    });
  }, [user, session]);

  // Aunque AuthProvider debería redirigir si no hay sesión, se muestra un mensaje por si acaso
  if (!user || !session) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-400 mb-2">
            No hay sesión activa
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            Parece que no has iniciado sesión o tu sesión ha expirado.
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 mb-2">
            <strong>Estado de autenticación:</strong> Session: {session ? 'Sí' : 'No'}, User: {user ? 'Sí' : 'No'}
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ir a la página de login
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}