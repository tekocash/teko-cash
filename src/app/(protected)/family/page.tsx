// src/app/(protected)/family/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, UserPlus, Settings, Copy, ArrowRight, Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Datos de ejemplo (reemplazar con datos reales desde el store)
const sampleFamilyGroups = [
  { 
    id: 'fam1', 
    name: 'Mi Familia', 
    members: 4, 
    isOwner: true,
    inviteCode: 'FAM123',
    balance: 1250.50
  },
  { 
    id: 'fam2', 
    name: 'Amigos', 
    members: 3, 
    isOwner: false,
    inviteCode: 'AMI456',
    balance: -320.25
  }
];

// Datos de ejemplo para invitaciones pendientes
const pendingInvitations = [
  {
    id: 'inv1',
    groupName: 'Compañeros de Trabajo',
    invitedBy: 'Carlos Ramírez',
    date: '2025-03-12T10:30:00'
  }
];

export default function FamilyGroupsPage() {
  const router = useRouter();
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [showJoinGroupForm, setShowJoinGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // Manejar creación de nuevo grupo
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error('Ingresa un nombre para el grupo');
      return;
    }
    
    // Aquí iría la lógica real para crear el grupo
    toast.success(`Grupo "${newGroupName}" creado con éxito`);
    setNewGroupName('');
    setShowNewGroupForm(false);
  };
  
  // Manejar unirse a un grupo
  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error('Ingresa un código de invitación');
      return;
    }
    
    // Aquí iría la lógica real para unirse al grupo
    toast.success('Te has unido al grupo correctamente');
    setInviteCode('');
    setShowJoinGroupForm(false);
  };
  
  // Manejar copia de código de invitación
  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código de invitación copiado al portapapeles');
  };
  
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Grupos Familiares
        </h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowJoinGroupForm(!showJoinGroupForm)}
            className="px-4 py-2 flex items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Unirse a grupo
          </button>
          
          <button
            onClick={() => setShowNewGroupForm(!showNewGroupForm)}
            className="px-4 py-2 flex items-center bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear grupo
          </button>
        </div>
      </div>
      
      {/* Formulario para crear nuevo grupo */}
      {showNewGroupForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Crear nuevo grupo familiar
          </h2>
          
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre del grupo
              </label>
              <input
                id="groupName"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ej. Mi Familia"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowNewGroupForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 mr-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear grupo
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Formulario para unirse a un grupo */}
      {showJoinGroupForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Unirse a un grupo familiar
          </h2>
          
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Código de invitación
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ingresa el código de invitación"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowJoinGroupForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 mr-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Unirse
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Invitaciones pendientes */}
      {pendingInvitations.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-medium text-yellow-800 dark:text-yellow-400 mb-4">
            Invitaciones pendientes
          </h2>
          
          <div className="space-y-4">
            {pendingInvitations.map(invitation => (
              <div key={invitation.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{invitation.groupName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Invitado por {invitation.invitedBy} • {new Date(invitation.date).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                    Rechazar
                  </button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Aceptar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Lista de grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sampleFamilyGroups.map(group => (
          <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {group.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {group.members} {group.members === 1 ? 'miembro' : 'miembros'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {group.isOwner && (
                    <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                      <Settings className="h-5 w-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleCopyInviteCode(group.inviteCode)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    title="Copiar código de invitación"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tu balance</p>
                  <p className={`text-lg font-semibold ${
                    group.balance >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    ${Math.abs(group.balance).toFixed(2)} {group.balance >= 0 ? 'a favor' : 'en contra'}
                  </p>
                </div>
                
                <button
                  onClick={() => router.push(`/family/${group.id}`)}
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Ver detalles
                  <ArrowRight className="ml-1 h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-between items-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Código: <span className="font-medium">{group.inviteCode}</span>
              </p>
              
              {!group.isOwner && (
                <button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center text-xs">
                  <Trash className="h-3 w-3 mr-1" />
                  Salir del grupo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Mensaje si no hay grupos */}
      {sampleFamilyGroups.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="inline-flex items-center justify-center p-6 bg-blue-100 dark:bg-blue-900 rounded-full mb-6">
            <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No tienes grupos familiares
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Crea tu primer grupo para compartir gastos con familiares o amigos
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setShowJoinGroupForm(true)}
              className="px-4 py-2 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Unirse a un grupo
            </button>
            
            <button
              onClick={() => setShowNewGroupForm(true)}
              className="px-4 py-2 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear grupo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}