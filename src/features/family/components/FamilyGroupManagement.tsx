import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  Users, UserPlus, MoreVertical, Edit, X, Check, User, Share2, AlertCircle, Plus
} from 'lucide-react';
import {
  getUserFamilyGroups,
  getFamilyGroupMembers,
  inviteToFamilyGroup,
  createFamilyGroup,
  updateMemberPercentage,
  leaveFamilyGroup,
  joinFamilyGroupByInviteCode
} from '@/features/family/services/family-service';
import type { ApiFamilyGroup, ApiGroupMemberDetails } from '@/types/api';

type FamilyGroup = ApiFamilyGroup;
type GroupMemberDetails = ApiGroupMemberDetails;

// Definir el tipo para el método de cálculo
type CalculationType = 'ratio' | 'fixed';

// Definir la interfaz para el formulario de nuevo grupo
interface FamilyGroupInput {
  name: string;
  type_calculo: CalculationType;
}

interface FamilyGroupManagementProps {
  initialGroupId?: string;
}

// Estado inicial para el formulario de nuevo grupo con tipado explícito
const initialNewGroupState: FamilyGroupInput = {
  name: '',
  type_calculo: 'ratio'
};

// Estado inicial para el formulario de invitación
const initialInviteState = {
  email: '',
  percentage: 0
};

export default function FamilyGroupManagement({ initialGroupId }: FamilyGroupManagementProps) {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
  const [groupMembers, setGroupMembers] = useState<GroupMemberDetails[]>([]);
  
  // Estados para gestionar UI
  const [showNewGroupForm, setShowNewGroupForm] = useState<boolean>(false);
  const [showInviteForm, setShowInviteForm] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState<boolean>(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<boolean>(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState<boolean>(false);
  
  // Estados para formularios
  const [newGroup, setNewGroup] = useState<FamilyGroupInput>(initialNewGroupState);
  const [invite, setInvite] = useState(initialInviteState);
  const [editPercentage, setEditPercentage] = useState<number>(0);
  const [joinCode, setJoinCode] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(false);

  // Estados para mensajes
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Cargar grupos familiares del usuario
  useEffect(() => {
    if (user?.id) loadUserGroups();
  }, [user?.id]);

  // Cargar miembros cuando se selecciona un grupo
  useEffect(() => {
    if (selectedGroupId) {
      loadGroupMembers(selectedGroupId);
    } else {
      setGroupMembers([]);
    }
  }, [selectedGroupId]);

  // Función para cargar grupos del usuario
  const loadUserGroups = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await getUserFamilyGroups(user.id);
      if (error) throw error;
      
      setGroups(data || []);
      // Si hay grupos y no hay uno seleccionado, seleccionar el primero
      if (data && data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los grupos familiares');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cargar miembros de un grupo
  const loadGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await getFamilyGroupMembers(groupId);
      if (error) throw error;
      
      setGroupMembers(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los miembros del grupo');
    }
  };

  // Crear un nuevo grupo familiar
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    try {
      const { data, error } = await createFamilyGroup({
        name: newGroup.name,
        owner_id: user.id,
        type_calculo: newGroup.type_calculo
      });
      
      if (error) throw error;
      
      setGroups([...groups, data as FamilyGroup]);
      setSelectedGroupId(data?.id || null);
      setShowNewGroupForm(false);
      setNewGroup(initialNewGroupState);
      setSuccess('Grupo familiar creado exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al crear el grupo familiar');
    }
  };

  // Invitar a un usuario al grupo
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    
    try {
      const { error } = await inviteToFamilyGroup(
        selectedGroupId, 
        invite.email, 
        invite.percentage
      );
      
      if (error) {
        if (error.message?.includes('no encontrado') || error.message?.includes('not found')) {
          // User not yet registered — guide them to share the code instead
          const selectedGroup = groups.find(g => g.id === selectedGroupId);
          const code = selectedGroup?.invite_code ?? '';
          setError(`Ese email aún no está registrado en Teko Cash. Compartí el código de invitación: ${code}`);
        } else {
          throw error;
        }
        return;
      }

      // Recargar miembros
      loadGroupMembers(selectedGroupId);
      setShowInviteForm(false);
      setInvite(initialInviteState);
      setSuccess(`Invitación enviada a ${invite.email}`);
    } catch (err: any) {
      setError(err.message || 'Error al enviar la invitación');
    }
  };

  // Actualizar porcentaje de un miembro
  const handleUpdatePercentage = async (memberId: string) => {
    if (!selectedGroupId) return;
    
    try {
      const { error } = await updateMemberPercentage(
        selectedGroupId,
        memberId,
        editPercentage
      );
      
      if (error) throw error;
      
      // Actualizar en la UI
      setGroupMembers(members => 
        members.map(member => 
          member.user_id === memberId 
            ? { ...member, percentage: editPercentage } 
            : member
        )
      );
      
      setEditingMemberId(null);
      setSuccess('Porcentaje actualizado');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el porcentaje');
    }
  };

  // Abandonar grupo
  const handleLeaveGroup = async () => {
    if (!selectedGroupId || !user?.id) return;
    
    try {
      const { error } = await leaveFamilyGroup(selectedGroupId, user.id);
      if (error) throw error;
      
      // Eliminar grupo de la lista
      setGroups(groups.filter(group => group.id !== selectedGroupId));
      setSelectedGroupId(groups.length > 1 ? groups[0].id : null);
      setConfirmLeaveGroup(false);
      setSuccess('Has abandonado el grupo familiar');
    } catch (err: any) {
      setError(err.message || 'Error al abandonar el grupo');
    }
  };

  // Copiar código de invitación al portapapeles
  const copyInviteLink = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode)
      .then(() => {
        setInviteLinkCopied(true);
        setTimeout(() => setInviteLinkCopied(false), 2000);
      })
      .catch(() => {
        setError('Error al copiar el código de invitación');
      });
  };

  // Unirse a un grupo con código de invitación
  const handleJoinByCode = async () => {
    if (!joinCode.trim() || !user?.id) return;
    setJoiningGroup(true);
    setError(null);
    const { error: joinErr } = await joinFamilyGroupByInviteCode(joinCode.trim().toUpperCase(), user.id);
    setJoiningGroup(false);
    if (joinErr) {
      setError(joinErr.message || 'Código inválido o ya sos miembro');
    } else {
      setSuccess('Te uniste al grupo exitosamente');
      setJoinCode('');
      // Recargar grupos
      const { data } = await getUserFamilyGroups(user.id);
      if (data) setGroups(data);
    }
  };

  // Verificar si el usuario es el propietario del grupo seleccionado
  const isGroupOwner = () => {
    if (!selectedGroupId || !user?.id) return false;
    const selectedGroup = groups.find(group => group.id === selectedGroupId);
    return selectedGroup?.owner_id === user.id;
  };

  // Calcular el porcentaje total asignado
  const calculateTotalPercentage = () => {
    return groupMembers
      .filter(member => member.status === 'active')
      .reduce((sum, member) => sum + (member.percentage || 0), 0);
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Grupos Familiares</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Administra tus grupos familiares para compartir gastos
        </p>
      </div>

      {/* Unirse a un grupo con código de invitación */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unirse a un grupo con código</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Ej: A3B7C9D2"
            maxLength={10}
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200 font-mono tracking-wider"
          />
          <button
            onClick={handleJoinByCode}
            disabled={!joinCode.trim() || joiningGroup}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {joiningGroup ? 'Uniéndose...' : 'Unirse'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Pedile el código de 8 caracteres al dueño del grupo.</p>
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md flex items-start">
          <AlertCircle className="mt-0.5 mr-2 flex-shrink-0" size={18} />
          <div className="flex-grow">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-sm text-red-700 dark:text-red-300 underline mt-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-md flex items-start">
          <Check className="mt-0.5 mr-2 flex-shrink-0" size={18} />
          <div className="flex-grow">
            <p>{success}</p>
            <button 
              onClick={() => setSuccess(null)}
              className="text-sm text-green-700 dark:text-green-300 underline mt-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Panel izquierdo - Lista de grupos */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Mis Grupos</h2>
              <button
                onClick={() => setShowNewGroupForm(true)}
                className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 w-7 h-7 flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {isLoading ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Cargando grupos...
              </div>
            ) : groups.length === 0 ? (
              <div className="p-6 text-center">
                <Users size={36} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No tienes grupos familiares
                </p>
                <button
                  onClick={() => setShowNewGroupForm(true)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <UserPlus size={16} className="mr-2" />
                  Crear Grupo
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`w-full p-4 text-left flex items-center ${
                      selectedGroupId === group.id 
                        ? 'bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 mr-3">
                      <Users size={20} />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {group.owner_id === user?.id ? 'Propietario' : 'Miembro'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Formulario para nuevo grupo */}
            {showNewGroupForm && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Crear nuevo grupo
                </h3>
                <form onSubmit={handleCreateGroup}>
                  <div className="mb-3">
                    <label 
                      htmlFor="groupName" 
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Nombre del grupo
                    </label>
                    <input
                      type="text"
                      id="groupName"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Método de reparto
                    </label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="ratio"
                          checked={newGroup.type_calculo === 'ratio'}
                          onChange={() => setNewGroup({...newGroup, type_calculo: 'ratio'})}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Porcentaje
                        </span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="fixed"
                          checked={newGroup.type_calculo === 'fixed'}
                          onChange={() => setNewGroup({...newGroup, type_calculo: 'fixed'})}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Fijo
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowNewGroupForm(false)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!newGroup.name}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Crear
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
        
        {/* Panel derecho - Detalles y miembros del grupo */}
        <div className="md:col-span-2">
          {selectedGroupId ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              {/* Cabecera del grupo */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {groups.find(g => g.id === selectedGroupId)?.name}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <UserPlus size={16} className="mr-1" />
                    Invitar
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen ? null : 'groupActions')}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-full"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuOpen === 'groupActions' && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border dark:border-gray-700">
                        {isGroupOwner() && (
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              // Implementar edición del grupo
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit size={16} className="mr-2" />
                            Editar grupo
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            const selectedGroup = groups.find(g => g.id === selectedGroupId);
                            if (selectedGroup?.invite_code) {
                              copyInviteLink(selectedGroup.invite_code);
                            }
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Share2 size={16} className="mr-2" />
                          {inviteLinkCopied ? 'Código copiado ✓' : 'Copiar código de invitación'}
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            setConfirmLeaveGroup(true);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <X size={16} className="mr-2" />
                          Abandonar grupo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Formulario de invitación */}
              {showInviteForm && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Invitar a un nuevo miembro
                  </h3>
                  <form onSubmit={handleInviteUser}>
                    <div className="mb-3">
                      <label 
                        htmlFor="inviteEmail" 
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="inviteEmail"
                        value={invite.email}
                        onChange={(e) => setInvite({...invite, email: e.target.value})}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    
                    {groups.find(g => g.id === selectedGroupId)?.type_calculo === 'ratio' && (
                      <div className="mb-3">
                        <label 
                          htmlFor="invitePercentage" 
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Porcentaje de participación
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            id="invitePercentage"
                            value={invite.percentage}
                            onChange={(e) => setInvite({...invite, percentage: parseFloat(e.target.value)})}
                            min="0"
                            max="100"
                            className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">%</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowInviteForm(false)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={!invite.email || (groups.find(g => g.id === selectedGroupId)?.type_calculo === 'ratio' && invite.percentage <= 0)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Enviar invitación
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Información del grupo */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Información del grupo
                  </h3>
                  {inviteLinkCopied && (
                    <div className="text-sm text-green-600 dark:text-green-400 flex items-center">
                      <Check size={14} className="mr-1" />
                      Enlace copiado
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Tipo de cálculo:</span>
                    <span className="text-gray-900 dark:text-white">
                      {groups.find(g => g.id === selectedGroupId)?.type_calculo === 'ratio' ? 'Porcentaje' : 'Fijo'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Miembros activos:</span>
                    <span className="text-gray-900 dark:text-white">
                      {groupMembers.filter(m => m.status === 'active').length}
                    </span>
                  </div>
                  {groups.find(g => g.id === selectedGroupId)?.type_calculo === 'ratio' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Porcentaje total:</span>
                      <span className={`font-medium ${
                        calculateTotalPercentage() === 100 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {calculateTotalPercentage()}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de miembros */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Miembros
                </h3>
                
                {groupMembers.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 my-4">
                    Cargando miembros...
                  </p>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {groupMembers.map(member => (
                      <div 
                        key={member.user_id} 
                        className="py-3 flex flex-wrap items-center justify-between"
                      >
                        <div className="flex items-center mb-2 sm:mb-0">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                            <User size={16} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {member.display_name || member.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {groups.find(g => g.id === selectedGroupId)?.type_calculo === 'ratio' && (
                            editingMemberId === member.user_id ? (
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  value={editPercentage}
                                  onChange={(e) => setEditPercentage(parseFloat(e.target.value))}
                                  min="0"
                                  max="100"
                                  className="w-16 p-1 border border-gray-300 dark:border-gray-600 rounded-md text-center"
                                />
                                <span className="ml-1 text-gray-500 dark:text-gray-400">%</span>
                                <button
                                  onClick={() => handleUpdatePercentage(member.user_id)}
                                  className="ml-2 p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingMemberId(null)}
                                  className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span className="text-sm text-gray-900 dark:text-white mr-2">
                                  {member.percentage || 0}%
                                </span>
                                {isGroupOwner() && member.user_id !== user?.id && (
                                  <button
                                    onClick={() => {
                                      setEditingMemberId(member.user_id);
                                      setEditPercentage(member.percentage || 0);
                                    }}
                                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                              </div>
                            )
                          )}
                          
                          <div className="text-sm">
                            {member.status === 'active' ? (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full">
                                Activo
                              </span>
                            ) : member.status === 'pending' ? (
                              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 rounded-full">
                                Pendiente
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                {member.status === 'left' ? 'Abandonó' : 'Rechazó'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 text-center">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Ningún grupo seleccionado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Selecciona un grupo existente o crea uno nuevo para empezar a compartir gastos
              </p>
              <button
                onClick={() => setShowNewGroupForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <UserPlus size={18} className="mr-2" />
                Crear Grupo Familiar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación para abandonar grupo */}
      {confirmLeaveGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              ¿Abandonar grupo?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              ¿Estás seguro de que deseas abandonar este grupo familiar? No podrás ver los gastos compartidos después de abandonarlo.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmLeaveGroup(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleLeaveGroup}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Abandonar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
