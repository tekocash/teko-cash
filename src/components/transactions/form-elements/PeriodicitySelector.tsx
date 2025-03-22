// components/transactions/form-elements/PeriodicitySelector.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

// Definimos un tipo específico para las opciones de periodicidad
export type PeriodicityType = "mensual" | "trimestral" | "anual" | "ocasional" | null;

interface PeriodicitySelectorProps {
  periodicity: PeriodicityType;
  onPeriodicityChange: (periodicity: PeriodicityType) => void;
}

/**
 * Componente para seleccionar la periodicidad de la transacción 
 * (mensual, trimestral, anual, ocasional)
 */
export function PeriodicitySelector({
  periodicity,
  onPeriodicityChange
}: PeriodicitySelectorProps) {
  // Usamos Exclude para excluir null del array
  const periods: Exclude<PeriodicityType, null>[] = ["mensual", "trimestral", "anual", "ocasional"];
  
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Periodicidad
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {periods.map((period) => (
          <Button
            key={period}
            type="button"
            variant={periodicity === period ? "default" : "outline"}
            onClick={() => onPeriodicityChange(periodicity === period ? null : period)}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default PeriodicitySelector;
