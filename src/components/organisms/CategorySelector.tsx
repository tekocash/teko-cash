// components/transactions/form-elements/CategorySelector.tsx
'use client';

import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Category, TransactionDirection } from './types';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  direction: TransactionDirection;
  onNewCategoryClick: () => void;
}

/**
 * Componente para seleccionar la categoría de la transacción
 * Muestra solo categorías relevantes según el tipo de transacción (ingreso/gasto)
 * Permite crear una nueva categoría
 */
export function CategorySelector({
  categories,
  selectedCategoryId,
  onCategoryChange,
  direction,
  onNewCategoryClick
}: CategorySelectorProps) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Filtrar categorías según el tipo de transacción y excluir las desactivadas
  const filteredCategories = categories.filter(
    cat => cat.category_type === direction && cat.is_enabled !== false
  );
  
  const getSelectedCategoryName = () => {
    const selected = categories.find(cat => cat.id === selectedCategoryId);
    return selected ? selected.name : 'Selecciona una categoría';
  };
  
  return (
    <div className="mb-6 relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Categoría *
      </label>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
        className="w-full justify-between py-6"
      >
        <div className="flex items-center">
          {selectedCategoryId ? (
            <>
              <span className="text-xl mr-2">
                {categories.find(c => c.id === selectedCategoryId)?.icon || '📁'}
              </span>
              <span>{getSelectedCategoryName()}</span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">Selecciona una categoría</span>
          )}
        </div>
        <ChevronDown size={20} className="text-gray-400" />
      </Button>

      {showCategoryDropdown && (
        <Card className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto">
          <CardContent className="p-2">
            {filteredCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {filteredCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    type="button"
                    variant="ghost"
                    className="flex items-center justify-start p-3"
                    onClick={() => {
                      onCategoryChange(cat.id);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <span className="text-xl mr-2">{cat.icon || '📁'}</span>
                    <span className="truncate">{cat.name}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No hay categorías disponibles
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
                onNewCategoryClick();
                setShowCategoryDropdown(false);
              }}
            >
              <Plus size={16} className="mr-1" />
              <span>Nueva categoría</span>
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {!selectedCategoryId && (
        <Button
          type="button"
          variant="link"
          className="mt-1 p-0 h-auto text-blue-600 dark:text-blue-400"
          onClick={onNewCategoryClick}
        >
          <Plus size={16} className="mr-1" />
          <span>Crear nueva categoría</span>
        </Button>
      )}
    </div>
  );
}

export default CategorySelector;