// src/services/payment-method-service.ts
import { supabase } from '@/lib/supabase/client';
import { DbPaymentMethod } from '@/types/database';
import { ApiPaymentMethod } from '@/types/api';

/**
 * Obtiene todos los métodos de pago de un usuario específico
 */
export async function getUserPaymentMethods(userId: string): Promise<{ data: ApiPaymentMethod[] | null; error: any }> {
  const { data, error } = await supabase
    .from('user_payment_methods')
    .select(`
      *,
      currency:currency_id(id, code, name, symbol)
    `)
    .eq('user_id', userId)
    .order('name');
  
  // Transform the data to match the expected structure
  const transformedData = data?.map(method => ({
    ...method,
    currencies: method.currency
  }));
  
  return { data: transformedData || null, error };
}

/**
 * Obtiene un método de pago específico por su ID
 */
export async function getPaymentMethodById(id: string): Promise<{ data: ApiPaymentMethod | null; error: any }> {
  const { data, error } = await supabase
    .from('user_payment_methods')
    .select(`
      *,
      currency:currency_id(id, code, name, symbol)
    `)
    .eq('id', id)
    .single();
  
  if (data) {
    // Transform to match expected structure
    data.currencies = data.currency;
  }
  
  return { data, error };
}

/**
 * Crea un nuevo método de pago
 */
export async function createPaymentMethod(
  paymentMethod: Omit<DbPaymentMethod, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: ApiPaymentMethod | null; error: any }> {
  const { data, error } = await supabase
    .from('user_payment_methods')
    .insert(paymentMethod)
    .select(`
      *,
      currency:currency_id(id, code, name, symbol)
    `)
    .single();
  
  if (data) {
    // Transform to match expected structure
    data.currencies = data.currency;
  }
  
  return { data, error };
}

/**
 * Actualiza un método de pago existente
 */
export async function updatePaymentMethod(
  id: string, 
  updates: Partial<Omit<DbPaymentMethod, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: ApiPaymentMethod | null; error: any }> {
  const { data, error } = await supabase
    .from('user_payment_methods')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      currency:currency_id(id, code, name, symbol)
    `)
    .single();
  
  if (data) {
    // Transform to match expected structure
    data.currencies = data.currency;
  }
  
  return { data, error };
}

/**
 * Elimina un método de pago
 */
export async function deletePaymentMethod(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('user_payment_methods')
    .delete()
    .eq('id', id);
  
  return { error };
}

/**
 * Activa o desactiva un método de pago
 */
export async function togglePaymentMethodStatus(
  id: string, 
  isActive: boolean
): Promise<{ data: ApiPaymentMethod | null; error: any }> {
  const { data, error } = await supabase
    .from('user_payment_methods')
    .update({ is_active: isActive })
    .eq('id', id)
    .select(`
      *,
      currency:currency_id(id, code, name, symbol)
    `)
    .single();
  
  if (data) {
    // Transform to match expected structure
    data.currencies = data.currency;
  }
  
  return { data, error };
}

/**
 * Obtiene todas las monedas disponibles
 */
export async function getAvailableCurrencies(): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase
    .from('currencies')
    .select('*')
    .order('name');
  
  return { data, error };
}

export default {
  getUserPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatus,
  getAvailableCurrencies
};