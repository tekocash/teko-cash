import { createClient } from '@supabase/supabase-js';

// Asumimos que estas variables están definidas en tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos basados en el esquema de la base de datos
export interface Transaction {
  id: string;
  user_id: string;
  family_group_id: string | null;
  budget_id: string | null;
  direction: 'income' | 'expense';
  amount: number;
  date: string;
  category_id: string;
  concepto: string;
  comercio: string | null;
  additional_info: string | null;
  nro_operacion: string | null;
  payment_method_id: string | null;
  transaction_type_id: string | null;
  periodicity: 'mensual' | 'trimestral' | 'anual' | 'ocasional' | null;
  created_at: string;
  use_group_ratio: boolean;
  currency_id: string | null;
}

export interface TransactionParticipant {
  id: string;
  transaction_id: string;
  user_id: string;
  assigned_amount: number;
}

// Funciones para interactuar con la tabla de transacciones

/**
 * Obtiene las transacciones del usuario actual
 * @param userId ID del usuario
 * @param limit Número máximo de transacciones a retornar
 * @param page Número de página para paginación
 * @returns Lista de transacciones
 */
export const getUserTransactions = async (
  userId: string,
  limit: number = 10, 
  page: number = 1
): Promise<{ data: Transaction[] | null; error: any }> => {
  // Calcular el offset para la paginación
  const offset = (page - 1) * limit;

  // Consulta a Supabase
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);

  return { data, error };
};

/**
 * Obtiene transacciones filtradas por diversos criterios
 */
export const getFilteredTransactions = async (
  userId: string,
  filters: {
    direction?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    familyGroupId?: string | null;
    minAmount?: number;
    maxAmount?: number;
    searchQuery?: string;
  },
  limit: number = 10,
  page: number = 1
): Promise<{ data: Transaction[] | null; error: any }> => {
  // Calcular el offset para la paginación
  const offset = (page - 1) * limit;

  // Iniciar la consulta base
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);

  // Aplicar filtros si están presentes
  if (filters.direction) {
    query = query.eq('direction', filters.direction);
  }

  if (filters.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('date', filters.endDate);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.familyGroupId !== undefined) {
    if (filters.familyGroupId === null) {
      query = query.is('family_group_id', null);
    } else {
      query = query.eq('family_group_id', filters.familyGroupId);
    }
  }

  if (filters.minAmount) {
    query = query.gte('amount', filters.minAmount);
  }

  if (filters.maxAmount) {
    query = query.lte('amount', filters.maxAmount);
  }

  if (filters.searchQuery) {
    query = query.or(`concepto.ilike.%${filters.searchQuery}%,comercio.ilike.%${filters.searchQuery}%`);
  }

  // Completar la consulta con ordenamiento y paginación
  const { data, error } = await query
    .order('date', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);

  return { data, error };
};

/**
 * Obtiene el total de ingresos y gastos para un período específico
 */
export const getTransactionTotals = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ incomes: number; expenses: number; error: any }> => {
  // Obtener todas las transacciones del período
  const { data, error } = await supabase
    .from('transactions')
    .select('direction, amount')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error || !data) {
    return { incomes: 0, expenses: 0, error };
  }

  // Calcular totales
  const totals = data.reduce(
    (acc, transaction) => {
      if (transaction.direction === 'income') {
        acc.incomes += transaction.amount;
      } else {
        acc.expenses += transaction.amount;
      }
      return acc;
    },
    { incomes: 0, expenses: 0 }
  );

  return { ...totals, error: null };
};

/**
 * Crea una nueva transacción
 */
export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'created_at'>
): Promise<{ data: Transaction | null; error: any }> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  return { data, error };
};

/**
 * Actualiza una transacción existente
 */
export const updateTransaction = async (
  id: string,
  updates: Partial<Transaction>
): Promise<{ data: Transaction | null; error: any }> => {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

/**
 * Elimina una transacción
 */
export const deleteTransaction = async (
  id: string
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  return { error };
};

/**
 * Obtiene las transacciones de un grupo familiar
 */
export const getFamilyGroupTransactions = async (
  familyGroupId: string,
  limit: number = 10,
  page: number = 1
): Promise<{ data: Transaction[] | null; error: any }> => {
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('family_group_id', familyGroupId)
    .order('date', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);

  return { data, error };
};

/**
 * Obtiene los participantes de una transacción
 */
export const getTransactionParticipants = async (
  transactionId: string
): Promise<{ data: TransactionParticipant[] | null; error: any }> => {
  const { data, error } = await supabase
    .from('transaction_participants')
    .select('*')
    .eq('transaction_id', transactionId);

  return { data, error };
};

/**
 * Asigna participantes a una transacción
 */
export const assignTransactionParticipants = async (
  participants: Omit<TransactionParticipant, 'id'>[]
): Promise<{ data: TransactionParticipant[] | null; error: any }> => {
  const { data, error } = await supabase
    .from('transaction_participants')
    .insert(participants)
    .select();

  return { data, error };
};

/**
 * Obtiene la distribución de gastos por categoría para un período
 */
export const getExpenseDistributionByCategory = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ data: { category_id: string; total: number }[] | null; error: any }> => {
  // Esta consulta usa PostgreSQL functions para agrupar y sumar por categoría
  const { data, error } = await supabase
    .rpc('get_expense_distribution_by_category', { 
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate
    });

  return { data, error };
};

export default {
  getUserTransactions,
  getFilteredTransactions,
  getTransactionTotals,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFamilyGroupTransactions,
  getTransactionParticipants,
  assignTransactionParticipants,
  getExpenseDistributionByCategory
};