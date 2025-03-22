// components/transactions/form-elements/CommerceInput.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent
} from '@/components/ui/card';

interface CommerceInputProps {
  value: string;
  onChange: (value: string) => void;
  recentCommerces: string[];
}

/**
 * Componente para ingresar el comercio donde se realizó la transacción
 * Incluye autocompletado con comercios recientes
 */
export function CommerceInput({
  value,
  onChange,
  recentCommerces
}: CommerceInputProps) {
  const [filteredCommerces, setFilteredCommerces] = useState<string[]>([]);
  
  // Filtra los comercios basados en el texto ingresado
  useEffect(() => {
    if (value.length > 0) {
      const filtered = recentCommerces.filter(
        c => c.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCommerces(filtered);
    } else {
      setFilteredCommerces([]);
    }
  }, [value, recentCommerces]);
  
  return (
    <div className="mb-6 relative">
      <label htmlFor="comercio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Comercio
      </label>
      <Input
        type="text"
        id="comercio"
        placeholder="¿Dónde compraste?"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      
      {/* Sugerencias de autocompletado */}
      {filteredCommerces.length > 0 && value && (
        <Card className="absolute z-10 mt-1 w-full">
          <CardContent className="p-1">
            {filteredCommerces.slice(0, 5).map((commerce, index) => (
              <Button
                key={index}
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onChange(commerce);
                  setFilteredCommerces([]);
                }}
              >
                {commerce}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CommerceInput;