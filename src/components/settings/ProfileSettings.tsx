// src/components/settings/ProfileSettings.tsx
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function ProfileSettings() {
  const { user, updateUserProfile } = useAuthStore();
  
  const [profileForm, setProfileForm] = useState({
    displayName: user?.display_name || '',
    email: user?.email || '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulación de actualización de perfil
      // En un caso real, llamarías a updateUserProfile con los datos
      toast.success('Perfil actualizado con éxito');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar perfil');
    }
  };
  
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        Información Personal
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={profileForm.displayName}
              onChange={handleChange}
              className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Tu nombre"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={profileForm.email}
              onChange={handleChange}
              className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="tu@email.com"
              disabled // El email no se puede cambiar normalmente
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}