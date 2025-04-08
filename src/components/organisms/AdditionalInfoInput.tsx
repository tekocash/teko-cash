// components/transactions/form-elements/AdditionalInfoInput.tsx
'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';

interface AdditionalInfoInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Componente para ingresar información adicional o notas sobre la transacción
 */
export function AdditionalInfoInput({
  value,
  onChange
}: AdditionalInfoInputProps) {
  return (
    <div className="mb-6">
      <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Información adicional
      </label>
      <Textarea
        id="additionalInfo"
        placeholder="Notas o detalles adicionales"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}

export default AdditionalInfoInput;