// components/transactions/form-elements/DirectionSelector.tsx
'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { TransactionDirection } from './types';

interface DirectionSelectorProps { 
  direction: TransactionDirection; 
  onDirectionChange: (direction: TransactionDirection) => void;
}

/**
 * Componente que permite al usuario seleccionar entre registrar un ingreso o un gasto
 */
export function DirectionSelector({ direction, onDirectionChange }: DirectionSelectorProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onDirectionChange('expense')}
        className={`flex-1 py-3 flex items-center justify-center space-x-2 ${
          direction === 'expense'
            ? 'bg-red-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        <Minus size={18} />
        <span>Gasto</span>
      </button>
      <button
        type="button"
        onClick={() => onDirectionChange('income')}
        className={`flex-1 py-3 flex items-center justify-center space-x-2 ${
          direction === 'income'
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        <Plus size={18} />
        <span>Ingreso</span>
      </button>
    </div>
  );
}

export default DirectionSelector;