// components/transactions/form-elements/PaymentMethodSelector.tsx
'use client';

import React, { useState } from 'react';
import { CreditCard, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PaymentMethod } from './types';

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  selectedMethodId: string;
  onMethodChange: (methodId: string) => void;
  onNewMethodClick: () => void;
}

/**
 * Componente para seleccionar el método de pago de la transacción
 * Muestra los métodos de pago disponibles y permite crear uno nuevo
 */
export function PaymentMethodSelector({
  paymentMethods,
  selectedMethodId,
  onMethodChange,
  onNewMethodClick
}: PaymentMethodSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const getSelectedMethodName = () => {
    const selected = paymentMethods.find(method => method.id === selectedMethodId);
    return selected ? selected.name : 'Seleccionar método de pago';
  };
  
  return (
    <div className="mb-6 relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Método de pago
      </label>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full justify-between"
      >
        <div className="flex items-center">
          <CreditCard size={18} className="text-gray-400 mr-2" />
          <span>{getSelectedMethodName()}</span>
        </div>
        <ChevronDown size={16} className="text-gray-400" />
      </Button>

      {showDropdown && (
        <Card className="absolute z-10 mt-1 w-full">
          <CardContent className="p-2">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    onMethodChange(method.id);
                    setShowDropdown(false);
                  }}
                >
                  <CreditCard size={16} className="mr-2" />
                  <span>
                    {method.name} {method.bank ? `(${method.bank})` : ''}
                  </span>
                </Button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No hay métodos de pago disponibles
              </div>
            )}
          </CardContent>
          
          <Separator />
          
          <CardFooter className="p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center text-blue-600 dark:text-blue-400"
              onClick={() => {
                onNewMethodClick();
                setShowDropdown(false);
              }}
            >
              <Plus size={16} className="mr-1" />
              <span>Nuevo método de pago</span>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default PaymentMethodSelector;