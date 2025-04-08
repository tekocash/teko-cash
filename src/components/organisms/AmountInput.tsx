// components/transactions/form-elements/AmountInput.tsx
'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Currency } from './types';

interface AmountInputProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  currencyId: string;
  onCurrencyChange: (currencyId: string) => void;
  currencies: Currency[];
}

/**
 * Componente para ingresar el monto de la transacción y seleccionar la moneda
 * Incluye botones de cantidad rápida para facilitar la entrada
 */
export function AmountInput({
  amount,
  onAmountChange,
  currencyId,
  onCurrencyChange,
  currencies
}: AmountInputProps) {
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  
  const getSelectedCurrencySymbol = () => {
    const selected = currencies.find(currency => currency.id === currencyId);
    return selected ? selected.symbol : '₲';
  };
  
  const getSelectedCurrencyCode = () => {
    const selected = currencies.find(currency => currency.id === currencyId);
    return selected ? selected.code : 'PYG';
  };
  
  return (
    <div>
      <div className="relative flex mb-4">
        {/* Amount input field - fixed at 75% width */}
        <div className="relative w-3/4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400">{getSelectedCurrencySymbol()}</span>
          </div>
          <Input
            type="number"
            id="amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="pl-8 pr-3 py-6 text-xl w-full"
            min="0"
            step="0.01"
          />
        </div>
        
        {/* Currency selector - fixed at 25% width */}
        <div className="w-1/4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
            className="rounded-l-none w-full h-full"
          >
            {getSelectedCurrencyCode()}
          </Button>
        </div>
        
        {/* Currency dropdown remains unchanged */}
        {showCurrencyDropdown && (
          <div className="absolute right-0 top-full mt-1 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
            {currencies.map(currency => (
              <Button
                key={currency.id}
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onCurrencyChange(currency.id);
                  setShowCurrencyDropdown(false);
                }}
              >
                <span className="mr-2">{currency.symbol}</span>
                <span>{currency.code}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
      
      {/* Quick amounts section remains unchanged */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[10000, 20000, 50000, 100000].map(value => (
          <Button
            key={value}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAmountChange(value.toString())}
          >
            {getSelectedCurrencySymbol()}{value.toLocaleString()}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default AmountInput;