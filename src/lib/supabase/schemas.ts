// src/lib/supabase/schemas.ts

export interface User {
  id: string;
  type: 'admin' | 'beta' | 'standard' | 'premium';
  level: number;
  email: string;
  user_name: string;
  display_name: string;
  current_family_group_id?: string | null;
  created_at: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  created_at: string;
}

export interface TransactionType {
  id: string;
  user_id?: string | null;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id?: string | null;
  family_group_id?: string | null;
  name: string;
  category_type: 'expense' | 'income';
  parent_id?: string | null;
  created_at: string;
}

export interface UserCategoryPreference {
  id: string;
  user_id: string;
  category_id: string;
  is_enabled: boolean;
  color?: string | null;
  icon?: string | null;
  is_favorite?: boolean | null;
  updated_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  invite_code?: string | null;
  type_calculo: 'fixed' | 'ratio';
  created_at: string;
}

export interface FamilyGroupParticipant {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'active' | 'left' | 'rejected';
  joined_at?: string | null;
  left_at?: string | null;
  rejected_at?: string | null;
  percentage?: number | null;
  income_types_used?: string[] | null;
}

export interface Balance {
  id: string;
  group_id: string;
  user_id: string;
  net_balance: number;
  last_updated: string;
}

export interface UserPaymentMethod {
  id: string;
  user_id: string;
  name: string;
  bank?: string | null;
  details?: string | null;
  created_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  type: 'fijo' | 'variable';
  amount: number;
  month?: string | null;
  description?: string | null;
  currency_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Budget {
  id: string;
  user_id: string;
  family_group_id?: string | null;
  category_id: string;
  budget_type?: 'fijo' | 'variable' | 'mixto' | null;
  periodicity?: 'mensual' | 'ocasional' | 'puntual' | 'anual' | 'otro' | null;
  name: string;
  amount: number;
  month: string;
  planned_amount: number;
  start_date: string;
  end_date: string;
  currency_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  family_group_id?: string | null;
  budget_id?: string | null;
  direction: 'income' | 'expense';
  amount: number;
  date: string;
  category_id?: string | null;
  concepto?: string | null;
  comercio?: string | null;
  additional_info?: string | null;
  nro_operacion?: string | null;
  payment_method_id?: string | null;
  transaction_type_id?: string | null;
  periodicity?: 'mensual' | 'trimestral' | 'anual' | 'ocasional' | null;
  use_group_ratio: boolean;
  currency_id?: string | null;
  created_at: string;
}

export interface TransactionParticipant {
  id: string;
  transaction_id: string;
  user_id: string;
  assigned_amount: number;
}