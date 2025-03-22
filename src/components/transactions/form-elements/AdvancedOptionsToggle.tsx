// components/transactions/form-elements/AdvancedOptionsToggle.tsx
'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvancedOptionsToggleProps {
  showOptions: boolean;
  onToggle: () => void;
}

/**
 * Componente para mostrar/ocultar opciones avanzadas en el formulario
 */
export function AdvancedOptionsToggle({
  showOptions,
  onToggle
}: AdvancedOptionsToggleProps) {
  return (
    <div className="flex justify-center my-5">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center"
      >
        {showOptions ? (
          <>
            <ChevronUp size={16} className="mr-1" />
            Ocultar opciones avanzadas
          </>
        ) : (
          <>
            <ChevronDown size={16} className="mr-1" />
            Mostrar opciones avanzadas
          </>
        )}
      </Button>
    </div>
  );
}

export default AdvancedOptionsToggle;