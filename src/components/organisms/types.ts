// components/transactions/form-elements/types.ts

// Tipos básicos para el formulario de transacciones
export type TransactionDirection = 'income' | 'expense';

// Tipo para la periodicidad de transacciones
export type PeriodicityType = "mensual" | "trimestral" | "anual" | "ocasional" | null;

// Interfaces para las entidades principales
export interface Category {
  id: string;
  name: string;
  category_type: 'income' | 'expense';
  user_id: string | null;
  family_group_id: string | null;
  parent_id: string | null;
  // Las propiedades icon y color pueden venir de user_category_preferences
  // pero algunos componentes esperan tenerlas aquí
  icon?: string;
  color?: string;
  is_enabled?: boolean;
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

export interface TransactionType {
  id: string;
  name: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

// Interfaz para las preferencias de categorías del usuario
export interface UserCategoryPreference {
  id: string;
  user_id: string;
  category_id: string;
  is_enabled: boolean;
  color?: string;
  icon?: string;
  is_favorite?: boolean;
}

// Interfaces auxiliares para mapear entre la API y los componentes
export interface CategoryWithPreferences extends Category {
  preferences?: UserCategoryPreference;
}