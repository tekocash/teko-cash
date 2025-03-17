// src/lib/supabase/schemas.ts
// Usuarios
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
  
  // Ingresos
  export interface Income {
    id: string;
    user_id: string;
    type: 'fijo' | 'variable';
    amount: number;
    month?: string | null; // Ej: "2025-02"
    description?: string | null;
    currency_id?: string | null;
    created_at: string;
    updated_at?: string | null;
  }
  
  // Categorías
  export interface Category {
    id: string;
    user_id?: string | null; // Si es global, puede ser NULL
    family_group_id?: string | null;
    name: string;
    category_type: 'expense' | 'income';
    parent_id?: string | null;
    created_at: string;
  }
  
  // Transacciones
  export interface Transaction {
    id: string;
    user_id: string;
    family_group_id?: string | null;
    budget_id?: string | null;
    direction: 'income' | 'expense';
    amount: number;
    date: string; // TIMESTAMP
    category_id?: string | null;
    concepto?: string | null;
    comercio?: string | null;
    additional_info?: string | null;
    nro_operacion?: string | null;
    payment_method_id?: string | null;
    transaction_type_id?: string | null;
    periodicity?: 'mensual' | 'trimestral' | 'anual' | 'ocasional' | null;
    created_at: string;
    use_group_ratio: boolean;
    currency_id?: string | null;
  }
  
  // Grupos Familiares
  export interface FamilyGroup {
    id: string;
    name: string;
    owner_id: string;
    invite_code: string;
    type_calculo: 'fixed' | 'ratio';
    created_at: string;
  }
  
  // (Nota: Las otras interfaces como Balance, TransactionParticipant, etc. también
  // deben definirse aquí, pero omito algunas por brevedad)