// src/types/ui/index.ts

/**
 * Este archivo contiene interfaces adaptadas para los componentes de UI
 * que pueden diferir de la estructura de la base de datos.
 */

// Tipos básicos para UI
export type TransactionDirection = 'income' | 'expense';
export type PeriodicityType = 'mensual' | 'trimestral' | 'anual' | 'ocasional' | null;

export interface Category {
    id: string;
    name: string;
    category_type: 'income' | 'expense';
    user_id: string | null;
    family_group_id: string | null;
    parent_id: string | null;
    // Estas propiedades vienen de user_category_preferences pero los componentes
    // esperan tenerlas directamente en la categoría
    icon?: string;
    color?: string;
    is_enabled?: boolean;
    is_favorite?: boolean; // Solo puede ser true o undefined, no null
}

export interface FamilyGroup {
  id: string;
  name: string;
  type_calculo: 'fixed' | 'ratio';
}

export interface PaymentMethod {
  id: string;
  name: string;
  bank?: string;
  details?: string;
  is_active?: boolean;
  currency_id?: string;
  icon?: string;
  color?: string;
  currencies?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  } | null;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export interface TransactionType {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  direction: TransactionDirection;
  amount: number;
  date: string;
  category_id: string;
  concepto?: string;
  comercio?: string | null;
  family_group_id?: string | null;
  use_group_ratio?: boolean;
  payment_method_id?: string | null;
  transaction_type_id?: string | null;
  currency_id: string;
  additional_info?: string | null;
  periodicity?: PeriodicityType;
  // Propiedades para UI
  categoryName?: string;
  paymentMethodName?: string;
  currencySymbol?: string;
}

export interface TransactionFormData {
  user_id: string;
  direction: TransactionDirection;
  amount: number;
  date: string;
  category_id: string;
  concepto: string;
  comercio: string | null;
  family_group_id: string | null;
  use_group_ratio: boolean;
  payment_method_id: string | null;
  transaction_type_id: string | null;
  currency_id: string;
  additional_info: string | null;
  periodicity: PeriodicityType;
  budget_id: string | null;
  nro_operacion: string;
}

export interface ExpenseDistribution {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  color?: string;
}

export interface TransactionFilters {
  direction?: TransactionDirection;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  familyGroupId?: string | null;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
}

export interface GroupMember {
  userId: string;
  email: string;
  displayName: string;
  status: 'pending' | 'active' | 'left' | 'rejected';
  percentage: number | null;
  joinedAt: string | null;
  netBalance: number;
}