// components/transactions/form-elements/SubmitButton.tsx
'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionDirection } from './types';

interface SubmitButtonProps {
  isSubmitting: boolean;
  isValid: boolean;
  direction: TransactionDirection;
}

/**
 * Componente de botón de envío para el formulario de transacción
 * Cambia de color según el tipo de transacción (ingreso/gasto)
 * Muestra estado de carga y se deshabilita cuando el formulario no es válido
 */
export function SubmitButton({
  isSubmitting,
  isValid,
  direction
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isSubmitting || !isValid}
      className={`${
        direction === 'expense' 
          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
          : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
      } ${(!isValid || isSubmitting) ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {isSubmitting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Guardando...
        </>
      ) : (
        <>
          <Check size={16} className="mr-1" />
          {direction === 'expense' ? 'Guardar gasto' : 'Guardar ingreso'}
        </>
      )}
    </Button>
  );
}

export default SubmitButton;