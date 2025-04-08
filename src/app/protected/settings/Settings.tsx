// src/app/(protected)/settings/page.tsx
'use client';

import { useState } from 'react';
import { User, Settings as SettingsIcon, CreditCard, Bell } from 'lucide-react';
import ProfileSettings from '@/features/settings/ProfileSettings';
import SecuritySettings from '@/features/settings/SecuritySettings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Configuración
      </h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
          >
            <option value="profile">Perfil</option>
            <option value="account">Cuenta</option>
            <option value="payment">Métodos de pago</option>
            <option value="notifications">Notificaciones</option>
          </select>
        </div>
        
        <div className="hidden sm:block border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <User className="h-5 w-5 mr-2" />
              Perfil
            </button>
            
            <button
              onClick={() => setActiveTab('account')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'account'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <SettingsIcon className="h-5 w-5 mr-2" />
              Cuenta
            </button>
            
            <button
              onClick={() => setActiveTab('payment')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'payment'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Métodos de pago
            </button>
            
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Bell className="h-5 w-5 mr-2" />
              Notificaciones
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {/* Sección de Perfil */}
          {activeTab === 'profile' && <ProfileSettings />}
          
          {/* Sección de Cuenta */}
          {activeTab === 'account' && <SecuritySettings />}
          
          {/* Sección de Métodos de Pago */}
          {activeTab === 'payment' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Métodos de Pago
              </h2>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center">
                <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay métodos de pago
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Agrega métodos de pago para categorizar tus transacciones
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Agregar método de pago
                </button>
              </div>
            </div>
          )}
          
          {/* Sección de Notificaciones */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Preferencias de Notificaciones
              </h2>
              
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Las preferencias de notificaciones estarán disponibles próximamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}