// components/transactions/form-elements/FamilyGroupSelector.tsx
'use client';

import React, { useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FamilyGroup, TransactionDirection } from './types';

interface FamilyGroupSelectorProps {
  familyGroups: FamilyGroup[];
  selectedGroupId: string;
  onGroupChange: (groupId: string) => void;
  useGroupRatio: boolean;
  onRatioChange: (useRatio: boolean) => void;
  direction: TransactionDirection;
}

/**
 * Componente para seleccionar a qué grupo familiar pertenece la transacción
 * También permite establecer si se usa la proporción predefinida del grupo para gastos
 */
export function FamilyGroupSelector({
  familyGroups,
  selectedGroupId,
  onGroupChange,
  useGroupRatio,
  onRatioChange,
  direction
}: FamilyGroupSelectorProps) {
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);
  
  if (familyGroups.length === 0) return null;
  
  const getSelectedFamilyName = () => {
    const selected = familyGroups.find(group => group.id === selectedGroupId);
    return selected ? selected.name : 'Ninguno';
  };
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          ¿A qué cartera pertenece esta transacción?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={selectedGroupId === '' ? "default" : "outline"}
            onClick={() => onGroupChange('')}
            className="justify-start"
          >
            <span>Personal</span>
          </Button>
          
          <Button
            type="button"
            variant={selectedGroupId !== '' ? "default" : "outline"}
            onClick={() => {
              if (familyGroups.length === 1) {
                onGroupChange(familyGroups[0].id);
              } else {
                setShowFamilyDropdown(!showFamilyDropdown);
              }
            }}
            className="justify-between"
          >
            <span>
              {familyGroups.length === 1 
                ? familyGroups[0].name 
                : selectedGroupId 
                  ? getSelectedFamilyName() 
                  : 'Familiar'}
            </span>
            {familyGroups.length > 1 && <ChevronDown size={16} />}
          </Button>

          {/* Dropdown para seleccionar grupo familiar específico si hay más de uno */}
          {familyGroups.length > 1 && showFamilyDropdown && (
            <div className="col-span-2 mt-1 relative">
              <Card className="absolute w-full z-10">
                <CardContent className="p-1">
                  {familyGroups.map(group => (
                    <Button
                      key={group.id}
                      type="button"
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        onGroupChange(group.id);
                        setShowFamilyDropdown(false);
                      }}
                    >
                      <Users size={16} className="mr-2" />
                      {group.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Opción para usar la proporción del grupo */}
          {selectedGroupId && direction === 'expense' && (
            <div className="col-span-2 mt-2 flex items-center space-x-2">
              <Checkbox 
                id="use-ratio" 
                checked={useGroupRatio} 
                onCheckedChange={(checked: any) => onRatioChange(!!checked)}
              />
              <Label htmlFor="use-ratio" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Usar proporción predefinida del grupo
              </Label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default FamilyGroupSelector;