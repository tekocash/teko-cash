// src/types/api/index.ts

import {
    DbCategory,
    DbUserCategoryPreference,
    DbFamilyGroup,
    DbFamilyGroupParticipant,
    DbBalance,
    DbPaymentMethod,
    DbCurrency,
    DbTransaction,
    DbTransactionParticipant,
    DbTransactionType,
    DbUser
  } from '../database';
  
  /**
   * Este archivo contiene interfaces que representan los datos tal como son devueltos
   * por los servicios, incluyendo posibles joins o transformaciones.
   */
  
  export interface ApiCategory extends DbCategory {
    preferences?: DbUserCategoryPreference;
  }
  
  export interface ApiFamilyGroup extends DbFamilyGroup {
    members_count?: number;
    participants?: DbFamilyGroupParticipant[];
    balances?: DbBalance[];
  }
  
  export interface ApiPaymentMethod extends DbPaymentMethod {
    currencies?: DbCurrency | null;
  }
  
  export interface ApiTransaction extends DbTransaction {
    category?: DbCategory;
    payment_method?: DbPaymentMethod;
    participants?: DbTransactionParticipant[];
    transaction_type?: DbTransactionType;
    currency?: DbCurrency;
  }
  
  export interface ApiTransactionType extends DbTransactionType {}
  
  export interface ApiGroupMemberDetails {
    user_id: string;
    email: string;
    display_name: string;
    status: 'pending' | 'active' | 'left' | 'rejected';
    percentage: number | null;
    joined_at: string | null;
    net_balance: number;
  }
  
  export interface ApiCategoryWithPreferences {
    id: string;
    user_id: string | null;
    family_group_id: string | null;
    name: string;
    category_type: 'expense' | 'income';
    parent_id: string | null;
    created_at: string;
    is_enabled?: boolean;
    color?: string | null;
    icon?: string | null;
    is_favorite?: boolean | null;
  }
  
  export interface ApiExpenseDistribution {
    category_id: string;
    total: number;
    category_name?: string;
    percentage?: number;
  }
  
  export interface ApiTransactionTotals {
    incomes: number;
    expenses: number;
    error: any;
  }