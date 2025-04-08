// src/services/adapter-service.ts

import {
    ApiCategory,
    ApiFamilyGroup,
    ApiPaymentMethod,
    ApiTransaction,
    ApiTransactionType,
    ApiCategoryWithPreferences,
    ApiGroupMemberDetails,
    ApiExpenseDistribution
  } from '@/types/api';
  
  import {
    Category,
    FamilyGroup,
    PaymentMethod,
    Transaction,
    TransactionType,
    TransactionFormData,
    ExpenseDistribution,
    GroupMember,
    PeriodicityType
  } from '@/types/ui';
  
  import { DbTransaction } from '@/types/database';
  
  /**
   * Servicio de adaptación para transformar datos entre las distintas capas
   * (Base de datos -> API -> UI)
   */
  
  /**
   * Adapta las categorías que vienen de servicios al formato esperado por los componentes UI
   */
  export function adaptCategories(apiCategories: ApiCategory[]): Category[] {
    return apiCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      category_type: cat.category_type,
      user_id: cat.user_id,
      family_group_id: cat.family_group_id,
      parent_id: cat.parent_id,
      // Tomamos los valores de iconos y colores de las preferencias
      icon: cat.preferences?.icon || undefined,
      color: cat.preferences?.color || undefined,
      is_enabled: cat.preferences?.is_enabled === true || undefined,
      // Convertimos explícitamente is_favorite a boolean o undefined para evitar null
      is_favorite: cat.preferences?.is_favorite === true ? true : undefined
    }));
  }
  
  /**
   * Adapta las categorías con preferencias al formato esperado por los componentes UI
   */
  export function adaptCategoriesWithPreferences(apiCategories: ApiCategoryWithPreferences[]): Category[] {
    return apiCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      category_type: cat.category_type,
      user_id: cat.user_id,
      family_group_id: cat.family_group_id,
      parent_id: cat.parent_id,
      icon: cat.icon || undefined,
      color: cat.color || undefined,
      is_enabled: cat.is_enabled === true || undefined,
      // Convertimos explícitamente is_favorite a boolean o undefined para evitar null
      is_favorite: cat.is_favorite === true ? true : undefined
    }));
  }
  
  /**
   * Adapta los grupos familiares para la UI
   */
  export function adaptFamilyGroups(apiFamilyGroups: ApiFamilyGroup[]): FamilyGroup[] {
    return apiFamilyGroups.map(group => ({
      id: group.id,
      name: group.name,
      type_calculo: group.type_calculo
    }));
  }
  
  /**
   * Adapta los métodos de pago para la UI
   */
  export function adaptPaymentMethods(apiPaymentMethods: ApiPaymentMethod[]): PaymentMethod[] {
    return apiPaymentMethods.map(method => ({
      id: method.id,
      name: method.name,
      bank: method.bank || undefined,
      details: method.details || undefined,
      is_active: method.is_active,
      currency_id: method.currency_id || undefined,
      icon: method.icon || undefined,
      color: method.color || undefined,
      currencies: method.currencies || undefined
    }));
  }
  
  /**
   * Adapta las transacciones para la UI
   */
  export function adaptTransactions(apiTransactions: ApiTransaction[]): Transaction[] {
    return apiTransactions.map(tx => ({
      id: tx.id,
      direction: tx.direction,
      amount: tx.amount,
      date: tx.date,
      category_id: tx.category_id,
      concepto: tx.concepto || undefined,
      comercio: tx.comercio,
      family_group_id: tx.family_group_id,
      use_group_ratio: tx.use_group_ratio,
      payment_method_id: tx.payment_method_id,
      transaction_type_id: tx.transaction_type_id,
      currency_id: tx.currency_id || 'cur3', // Valor predeterminado PYG
      additional_info: tx.additional_info,
      periodicity: tx.periodicity as PeriodicityType,
      // Propiedades agregadas para UI
      categoryName: tx.category?.name,
      paymentMethodName: tx.payment_method?.name,
      currencySymbol: tx.currency?.symbol
    }));
  }
  
  /**
   * Adapta los tipos de transacción para la UI
   */
  export function adaptTransactionTypes(apiTypes: ApiTransactionType[]): TransactionType[] {
    return apiTypes.map(type => ({
      id: type.id,
      name: type.name
    }));
  }
  
  /**
   * Adapta los miembros del grupo para la UI
   */
  export function adaptGroupMembers(apiMembers: ApiGroupMemberDetails[]): GroupMember[] {
    return apiMembers.map(member => ({
      userId: member.user_id,
      email: member.email,
      displayName: member.display_name,
      status: member.status,
      percentage: member.percentage,
      joinedAt: member.joined_at,
      netBalance: member.net_balance
    }));
  }
  
  /**
   * Adapta la distribución de gastos para la UI
   */
  export function adaptExpenseDistribution(apiDistribution: ApiExpenseDistribution[]): ExpenseDistribution[] {
    const total = apiDistribution.reduce((sum, item) => sum + item.total, 0);
    
    return apiDistribution.map(item => ({
      categoryId: item.category_id,
      categoryName: item.category_name || 'Sin categoría',
      total: item.total,
      percentage: total ? (item.total / total) * 100 : 0
    }));
  }
  
  /**
   * Prepara los datos de un formulario de transacción para enviarlos a la API
   */
  export function prepareTransactionForApi(formData: TransactionFormData): Omit<DbTransaction, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: formData.user_id,
      direction: formData.direction,
      amount: formData.amount,
      date: formData.date,
      category_id: formData.category_id,
      concepto: formData.concepto,
      comercio: formData.comercio,
      family_group_id: formData.family_group_id,
      use_group_ratio: formData.use_group_ratio,
      payment_method_id: formData.payment_method_id,
      transaction_type_id: formData.transaction_type_id,
      currency_id: formData.currency_id,
      additional_info: formData.additional_info,
      periodicity: formData.periodicity,
      budget_id: formData.budget_id,
      nro_operacion: formData.nro_operacion
    };
  }