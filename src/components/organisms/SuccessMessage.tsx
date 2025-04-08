// components/transactions/form-elements/SuccessMessage.tsx
'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessMessageProps {
  message: string;
  onNewTransaction: () => void;
  onGoToDashboard: () => void;
}

/**
 * Componente para mostrar un mensaje de éxito después de guardar una transacción
 * Incluye botones para crear una nueva transacción o ir al dashboard
 */
export function SuccessMessage({
  message,
  onNewTransaction,
  onGoToDashboard
}: SuccessMessageProps) {
  return (
    <div className="absolute inset-0 bg-white dark:bg-gray-800 z-10 flex items-center justify-center rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="text-center p-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{message}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Tu transacción ha sido guardada correctamente.
        </p>
        <div className="flex space-x-3 justify-center">
          <Button
            onClick={onNewTransaction}
          >
            Nueva transacción
          </Button>
          <Button
            variant="outline"
            onClick={onGoToDashboard}
          >
            Ir al dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SuccessMessage;