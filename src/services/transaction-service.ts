// src/services/transaction-service.ts
import { createClient } from '@supabase/supabase-js';
import { DbTransaction, DbTransactionParticipant } from '@/types/database';
import { ApiTransaction, ApiTransactionTotals, ApiExpenseDistribution } from '@/types/api';
import { TransactionFormData } from '@/types/ui';

// Asumimos que estas variables están definidas en tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

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
): Promise<{ data: ApiTransaction[] | null; error: any }> => {
  // Calcular el offset para la paginación
  const offset = (page - 1) * limit;

  // Consulta a Supabase
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:category_id (*),
      payment_method:payment_method_id (*),
      currency:currency_id (*)
    `)
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
): Promise<{ data: ApiTransaction[] | null; error: any }> => {
  // Calcular el offset para la paginación
  const offset = (page - 1) * limit;

  // Iniciar la consulta base
  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:category_id (*),
      payment_method:payment_method_id (*),
      currency:currency_id (*)
    `)
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
): Promise<ApiTransactionTotals> => {
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
  transaction: TransactionFormData
): Promise<{ data: ApiTransaction | null; error: any }> => {
  // Convertir el objeto TransactionFormData a DbTransaction sin los campos id y created_at
  const dbTransaction: Omit<DbTransaction, 'id' | 'created_at' | 'updated_at'> = {
    user_id: transaction.user_id,
    direction: transaction.direction,
    amount: transaction.amount,
    date: transaction.date,
    category_id: transaction.category_id,
    concepto: transaction.concepto,
    comercio: transaction.comercio,
    family_group_id: transaction.family_group_id,
    use_group_ratio: transaction.use_group_ratio,
    payment_method_id: transaction.payment_method_id,
    transaction_type_id: transaction.transaction_type_id,
    currency_id: transaction.currency_id,
    additional_info: transaction.additional_info,
    periodicity: transaction.periodicity,
    budget_id: transaction.budget_id,
    nro_operacion: transaction.nro_operacion
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(dbTransaction)
    .select(`
      *,
      category:category_id (*),
      payment_method:payment_method_id (*),
      currency:currency_id (*)
    `)
    .single();

  return { data, error };
};

/**
 * Actualiza una transacción existente
 */
export const updateTransaction = async (
  id: string,
  updates: Partial<DbTransaction>
): Promise<{ data: ApiTransaction | null; error: any }> => {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      category:category_id (*),
      payment_method:payment_method_id (*),
      currency:currency_id (*)
    `)
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
): Promise<{ data: ApiTransaction[] | null; error: any }> => {
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:category_id (*),
      payment_method:payment_method_id (*),
      currency:currency_id (*)
    `)
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
): Promise<{ data: DbTransactionParticipant[] | null; error: any }> => {
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
  participants: Omit<DbTransactionParticipant, 'id' | 'created_at'>[]
): Promise<{ data: DbTransactionParticipant[] | null; error: any }> => {
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
): Promise<{ data: ApiExpenseDistribution[] | null; error: any }> => {
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