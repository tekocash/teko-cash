// components/transactions/form-elements/ErrorMessage.tsx
'use client';

import React from 'react';

interface ErrorMessageProps {
  message: string | null;
}

/**
 * Componente para mostrar mensajes de error en el formulario
 * No muestra nada si no hay mensaje de error
 */
export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;
  
  return (
    <div className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm">
      {message}
    </div>
  );
}

export default ErrorMessage;