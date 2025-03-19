import { createClient } from '@supabase/supabase-js';

// Asumimos que estas variables están definidas en tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos basados en el esquema de la base de datos
export interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string | null;
  type_calculo: 'fixed' | 'ratio';
  created_at: string;
}

export interface FamilyGroupParticipant {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'active' | 'left' | 'rejected';
  joined_at: string | null;
  left_at: string | null;
  rejected_at: string | null;
  percentage: number | null;
  income_types_used: string[] | null;
}

export interface Balance {
  id: string;
  group_id: string;
  user_id: string;
  net_balance: number;
  last_updated: string;
}

export interface GroupMemberDetails {
  user_id: string;
  email: string;
  display_name: string;
  status: 'pending' | 'active' | 'left' | 'rejected';
  percentage: number | null;
  joined_at: string | null;
  net_balance: number;
}

/**
 * Obtiene los grupos familiares a los que pertenece un usuario
 */
export const getUserFamilyGroups = async (
  userId: string
): Promise<{ data: FamilyGroup[] | null; error: any }> => {
  const { data, error } = await supabase
    .from('family_groups')
    .select('*')
    .or(`owner_id.eq.${userId},id.in.(${
      supabase.from('family_group_participants')
        .select('group_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .toString()
    })`)
    .order('created_at', { ascending: false });

  return { data, error };
};

/**
 * Obtiene un grupo familiar por su ID
 */
export const getFamilyGroupById = async (
  groupId: string
): Promise<{ data: FamilyGroup | null; error: any }> => {
  const { data, error } = await supabase
    .from('family_groups')
    .select('*')
    .eq('id', groupId)
    .single();

  return { data, error };
};

/**
 * Crea un nuevo grupo familiar
 */
export const createFamilyGroup = async (
  groupData: Omit<FamilyGroup, 'id' | 'created_at' | 'invite_code'>
): Promise<{ data: FamilyGroup | null; error: any }> => {
  // Generar código de invitación único
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { data, error } = await supabase
    .from('family_groups')
    .insert({ ...groupData, invite_code: inviteCode })
    .select()
    .single();

  // Si se creó el grupo exitosamente, añadir al propietario como participante activo
  if (data && !error) {
    await supabase.from('family_group_participants').insert({
      group_id: data.id,
      user_id: groupData.owner_id,
      status: 'active',
      joined_at: new Date().toISOString(),
      percentage: groupData.type_calculo === 'ratio' ? 100 : null // Si es ratio, asignar 100% inicialmente
    });

    // Crear balance inicial
    await supabase.from('balances').insert({
      group_id: data.id,
      user_id: groupData.owner_id,
      net_balance: 0
    });
  }

  return { data, error };
};

/**
 * Actualiza un grupo familiar
 */
export const updateFamilyGroup = async (
  groupId: string,
  updates: Partial<FamilyGroup>
): Promise<{ data: FamilyGroup | null; error: any }> => {
  const { data, error } = await supabase
    .from('family_groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  return { data, error };
};

/**
 * Elimina un grupo familiar
 */
export const deleteFamilyGroup = async (
  groupId: string
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from('family_groups')
    .delete()
    .eq('id', groupId);

  return { error };
};

/**
 * Invita a un usuario a un grupo familiar
 */
export const inviteToFamilyGroup = async (
  groupId: string,
  email: string,
  percentage?: number
): Promise<{ data: any; error: any }> => {
  // Primero verificar si el usuario ya existe en el sistema
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (userError && userError.code !== 'PGRST116') { // PGRST116 = No hay resultados
    return { data: null, error: userError };
  }

  // Verificar el tipo de cálculo del grupo
  const { data: groupData, error: groupError } = await supabase
    .from('family_groups')
    .select('type_calculo')
    .eq('id', groupId)
    .single();

  if (groupError) {
    return { data: null, error: groupError };
  }

  const userId = userData?.id;

  if (userId) {
    // El usuario existe, añadirlo como participante pendiente
    const { data, error } = await supabase
      .from('family_group_participants')
      .insert({
        group_id: groupId,
        user_id: userId,
        status: 'pending',
        percentage: groupData.type_calculo === 'ratio' ? percentage || 0 : null
      })
      .select();

    return { data, error };
  } else {
    // El usuario no existe, podríamos implementar un sistema de invitación por email
    // Esto requeriría una tabla adicional o un servicio externo para enviar emails
    return { 
      data: null, 
      error: { message: 'Usuario no encontrado. La invitación por email no está implementada.' } 
    };
  }
};

/**
 * Acepta una invitación a un grupo familiar
 */
export const acceptFamilyGroupInvitation = async (
  groupId: string,
  userId: string
): Promise<{ data: any; error: any }> => {
  // Actualizar estado del participante
  const { error } = await supabase
    .from('family_group_participants')
    .update({
      status: 'active',
      joined_at: new Date().toISOString()
    })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    return { data: null, error };
  }

  // Crear balance inicial
  const { data, error: balanceError } = await supabase
    .from('balances')
    .insert({
      group_id: groupId,
      user_id: userId,
      net_balance: 0
    })
    .select();

  return { data, error: balanceError };
};

/**
 * Rechaza una invitación a un grupo familiar
 */
export const rejectFamilyGroupInvitation = async (
  groupId: string,
  userId: string
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from('family_group_participants')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString()
    })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'pending');

  return { error };
};

/**
 * Abandona un grupo familiar
 */
export const leaveFamilyGroup = async (
  groupId: string,
  userId: string
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from('family_group_participants')
    .update({
      status: 'left',
      left_at: new Date().toISOString()
    })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'active');

  return { error };
};

/**
 * Obtiene todos los miembros de un grupo familiar con sus detalles
 */
export const getFamilyGroupMembers = async (
  groupId: string
): Promise<{ data: GroupMemberDetails[] | null; error: any }> => {
  // Esta consulta es compleja y podría implementarse como una función RPC en PostgreSQL
  // Para simplicidad, usamos múltiples consultas y combinamos los resultados

  // Obtener participantes
  const { data: participants, error: participantsError } = await supabase
    .from('family_group_participants')
    .select('user_id, status, percentage, joined_at')
    .eq('group_id', groupId);

  if (participantsError || !participants) {
    return { data: null, error: participantsError };
  }

  // Obtener información de usuarios
  const userIds = participants.map(p => p.user_id);
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, display_name')
    .in('id', userIds);

  if (usersError || !users) {
    return { data: null, error: usersError };
  }

  // Obtener balances
  const { data: balances, error: balancesError } = await supabase
    .from('balances')
    .select('user_id, net_balance')
    .eq('group_id', groupId)
    .in('user_id', userIds);

  if (balancesError) {
    return { data: null, error: balancesError };
  }

  // Mapear balances por user_id
  const balanceMap = new Map();
  balances?.forEach(balance => {
    balanceMap.set(balance.user_id, balance.net_balance);
  });

  // Mapear usuarios por id
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user.id, user);
  });

  // Combinar datos
  const memberDetails = participants.map(participant => {
    const user = userMap.get(participant.user_id);
    return {
      user_id: participant.user_id,
      email: user?.email || '',
      display_name: user?.display_name || '',
      status: participant.status,
      percentage: participant.percentage,
      joined_at: participant.joined_at,
      net_balance: balanceMap.get(participant.user_id) || 0
    };
  });

  return { data: memberDetails, error: null };
};

/**
 * Actualiza el porcentaje de participación de un miembro en un grupo familiar
 */
export const updateMemberPercentage = async (
  groupId: string,
  userId: string,
  percentage: number
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from('family_group_participants')
    .update({ percentage })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  return { error };
};

/**
 * Obtiene el balance de un usuario en un grupo familiar
 */
export const getUserGroupBalance = async (
  groupId: string,
  userId: string
): Promise<{ data: Balance | null; error: any }> => {
  const { data, error } = await supabase
    .from('balances')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  return { data, error };
};

/**
 * Actualiza el balance de un usuario en un grupo familiar
 */
export const updateUserGroupBalance = async (
  groupId: string,
  userId: string,
  amount: number // Positivo = ingreso, Negativo = gasto
): Promise<{ data: Balance | null; error: any }> => {
  // Primero obtenemos el balance actual
  const { data: currentBalance, error: getError } = await getUserGroupBalance(groupId, userId);
  
  if (getError) {
    return { data: null, error: getError };
  }

  if (!currentBalance) {
    // Si no existe un balance, lo creamos
    const { data, error } = await supabase
      .from('balances')
      .insert({
        group_id: groupId,
        user_id: userId,
        net_balance: amount
      })
      .select()
      .single();

    return { data, error };
  } else {
    // Actualizamos el balance existente
    const newBalance = currentBalance.net_balance + amount;
    const { data, error } = await supabase
      .from('balances')
      .update({
        net_balance: newBalance,
        last_updated: new Date().toISOString()
      })
      .eq('id', currentBalance.id)
      .select()
      .single();

    return { data, error };
  }
};

/**
 * Obtiene un grupo familiar por código de invitación
 */
export const getFamilyGroupByInviteCode = async (
  inviteCode: string
): Promise<{ data: FamilyGroup | null; error: any }> => {
  const { data, error } = await supabase
    .from('family_groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .single();

  return { data, error };
};

/**
 * Unirse a un grupo familiar mediante código de invitación
 */
export const joinFamilyGroupByInviteCode = async (
  inviteCode: string,
  userId: string
): Promise<{ data: FamilyGroup | null; error: any }> => {
  // Primero obtenemos el grupo
  const { data: group, error: groupError } = await getFamilyGroupByInviteCode(inviteCode);
  
  if (groupError || !group) {
    return { data: null, error: groupError || { message: 'Código de invitación inválido' } };
  }

  // Verificamos si el usuario ya es miembro
  const { data: existingMember, error: memberError } = await supabase
    .from('family_group_participants')
    .select('id, status')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    if (existingMember.status === 'active') {
      return { data: group, error: { message: 'Ya eres miembro de este grupo' } };
    } else if (existingMember.status === 'pending') {
      // Actualizar estado a activo
      await acceptFamilyGroupInvitation(group.id, userId);
      return { data: group, error: null };
    } else if (existingMember.status === 'left') {
      // Reactivar membresía
      await supabase
        .from('family_group_participants')
        .update({
          status: 'active',
          joined_at: new Date().toISOString(),
          left_at: null
        })
        .eq('group_id', group.id)
        .eq('user_id', userId);
      
      return { data: group, error: null };
    }
  }

  // Añadir como nuevo miembro
  // Calculamos porcentaje inicial según el tipo de cálculo del grupo
  let initialPercentage : number = 0;
  if (group.type_calculo === 'ratio') {
    // Obtener total de miembros activos
    const { data: activeMembers } = await supabase
      .from('family_group_participants')
      .select('user_id')
      .eq('group_id', group.id)
      .eq('status', 'active');
    
    const memberCount = (activeMembers?.length || 0) + 1;
    initialPercentage = Math.floor(100 / memberCount);
    
    // Ajustar porcentajes de otros miembros proporcionalmente
    if (activeMembers && activeMembers.length > 0) {
      // Esta es una simplificación; en producción se podría implementar
      // una distribución más sofisticada o una función RPC en PostgreSQL
      await Promise.all(activeMembers.map(async (member) => {
        await updateMemberPercentage(group.id, member.user_id, initialPercentage);
      }));
    }
  }

  const { error } = await supabase
    .from('family_group_participants')
    .insert({
      group_id: group.id,
      user_id: userId,
      status: 'active',
      joined_at: new Date().toISOString(),
      percentage: initialPercentage
    });

  if (error) {
    return { data: null, error };
  }

  // Crear balance inicial
  await supabase.from('balances').insert({
    group_id: group.id,
    user_id: userId,
    net_balance: 0
  });

  return { data: group, error: null };
};

export default {
  getUserFamilyGroups,
  getFamilyGroupById,
  createFamilyGroup,
  updateFamilyGroup,
  deleteFamilyGroup,
  inviteToFamilyGroup,
  acceptFamilyGroupInvitation,
  rejectFamilyGroupInvitation,
  leaveFamilyGroup,
  getFamilyGroupMembers,
  updateMemberPercentage,
  getUserGroupBalance,
  updateUserGroupBalance,
  getFamilyGroupByInviteCode,
  joinFamilyGroupByInviteCode
};