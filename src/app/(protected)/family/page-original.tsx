'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import FamilyGroupManagement from '@/components/family/FamilyGroupManagement';
import { useRouter } from 'next/navigation';

export default function FamilyGroupPage() {
  const { user, session } = useAuthStore();
  const router = useRouter();

  // Redireccionar si no hay sesión
  useEffect(() => {
    if (!user || !session) {
      router.push('/login');
    }
  }, [user, session, router]);

  if (!user || !session) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return <FamilyGroupManagement />;
}