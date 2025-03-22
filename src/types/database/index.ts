// src/types/database/index.ts

/**
 * Este archivo contiene interfaces que representan exactamente la estructura
 * de las tablas en la base de datos Supabase.
 */

export interface DbUser {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
    current_family_group_id: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }
  
  export interface DbCategory {
    id: string;
    user_id: string | null;
    family_group_id: string | null;
    name: string;
    category_type: 'expense' | 'income';
    parent_id: string | null;
    created_at: string;
  }
  
  export interface DbUserCategoryPreference {
    id: string;
    user_id: string;
    category_id: string;
    is_enabled: boolean;
    color: string | null;
    icon: string | null;
    is_favorite: boolean | null;
    updated_at: string;
  }
  
  export interface DbFamilyGroup {
    id: string;
    name: string;
    owner_id: string;
    invite_code: string | null;
    type_calculo: 'fixed' | 'ratio';
    created_at: string;
    updated_at: string | null;
  }
  
  export interface DbFamilyGroupParticipant {
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
  
  export interface DbBalance {
    id: string;
    group_id: string;
    user_id: string;
    net_balance: number;
    last_updated: string;
  }
  
  export interface DbPaymentMethod {
    id: string;
    user_id: string;
    name: string;
    bank: string | null;
    details: string | null;
    is_active: boolean;   
    currency_id: string | null;
    created_at: string;
    updated_at: string | null;
    icon: string | null;
    color: string | null;
  }
  
  export interface DbCurrency {
    id: string;
    code: string;
    name: string;
    symbol: string;
    created_at: string;
    updated_at: string | null;
  }
  
  export interface DbTransaction {
    id: string;
    user_id: string;
    family_group_id: string | null;
    budget_id: string | null;
    direction: 'income' | 'expense';
    amount: number;
    date: string;
    category_id: string;
    concepto: string | null;
    comercio: string | null;
    additional_info: string | null;
    nro_operacion: string | null;
    payment_method_id: string | null;
    transaction_type_id: string | null;
    periodicity: 'mensual' | 'trimestral' | 'anual' | 'ocasional' | null;
    created_at: string;
    updated_at: string | null;
    use_group_ratio: boolean;
    currency_id: string | null;
  }
  
  export interface DbTransactionParticipant {
    id: string;
    transaction_id: string;
    user_id: string;
    assigned_amount: number;
    created_at: string;
  }
  
  export interface DbTransactionType {
    id: string;
    name: string;
    created_at: string;
    updated_at: string | null;
  }
  
  export interface DbIncome {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    recurrence: 'monthly' | 'biweekly' | 'weekly';
    category_id: string | null;
    expected_day: number;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
    currency_id: string;
  }
  
  export interface DbBudget {
    id: string;
    user_id: string;
    name: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    currency_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }
  
  export interface DbBudgetCategory {
    id: string;
    budget_id: string;
    category_id: string;
    amount: number;
    created_at: string;
    updated_at: string | null;
  }