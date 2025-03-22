// components/transactions/form-elements/TransactionTypeSelector.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { TransactionType } from '@/types/ui';

interface TransactionTypeSelectorProps {
  transactionTypes: TransactionType[];
  selectedTypeId: string;
  onTypeChange: (typeId: string) => void;
}

export function TransactionTypeSelector({
  transactionTypes,
  selectedTypeId,
  onTypeChange
}: TransactionTypeSelectorProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Tipo de transacción
      </label>
      <div className="grid grid-cols-3 gap-2">
        {transactionTypes.map((type) => (
          <Button
            key={type.id}
            type="button"
            variant={selectedTypeId === type.id ? "default" : "outline"}
            onClick={() => onTypeChange(selectedTypeId === type.id ? "" : type.id)}
            className="justify-center"
          >
            {type.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default TransactionTypeSelector;