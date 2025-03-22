// src/components/transactions/form-elements/index.ts

// Exportar tipos
export type TransactionDirection = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface FamilyGroup {
  id: string;
  name: string;
  calculation_type: 'fixed' | 'ratio';
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
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

// Exportar todos los componentes
export { default as DirectionSelector } from './DirectionSelector';
export { default as FamilyGroupSelector } from './FamilyGroupSelector';
export { default as AmountInput } from './AmountInput';
export { default as CategorySelector } from './CategorySelector';
export { default as PaymentMethodSelector } from './PaymentMethodSelector';
export { default as TransactionTypeSelector } from './TransactionTypeSelector';
export { default as PeriodicitySelector } from './PeriodicitySelector';
export { default as AdditionalInfoInput } from './AdditionalInfoInput';
export { default as ReceiptUploader } from './ReceiptUploader';
export { default as CommerceInput } from './CommerceInput';
export { default as SubmitButton } from './SubmitButton';
export { default as ErrorMessage } from './ErrorMessage';
export { default as SuccessMessage } from './SuccessMessage';
export { default as AdvancedOptionsToggle } from './AdvancedOptionsToggle';

// Exportar el tipo de periodicidad que se menciona en el código
export type PeriodicityType = null | 'weekly' | 'monthly' | 'yearly';