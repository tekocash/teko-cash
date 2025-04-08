// src/components/budgets/BudgetProgress.tsx
'use client';

import { useMemo } from 'react';

interface BudgetProgressProps {
  current: number;
  target: number;
  title: string;
  category?: string;
  period?: string;
}

export default function BudgetProgress({ 
  current, 
  target, 
  title, 
  category, 
  period 
}: BudgetProgressProps) {
  // Calcular porcentaje de progreso
  const percentage = useMemo(() => {
    if (target <= 0) return 0;
    const pct = (current / target) * 100;
    return Math.min(pct, 100); // No superar el 100%
  }, [current, target]);
  
  // Determinar color según progreso
  const getStatusColor = useMemo(() => {
    if (percentage < 70) return 'bg-green-600 dark:bg-green-500';
    if (percentage < 90) return 'bg-yellow-500 dark:bg-yellow-500';
    return 'bg-red-600 dark:bg-red-500';
  }, [percentage]);
  
  // Calcular monto restante
  const remaining = useMemo(() => {
    return Math.max(target - current, 0);
  }, [current, target]);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white">{title}</h3>
          {category && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{category}</p>
          )}
        </div>
        {period && (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
            {period}
          </span>
        )}
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-3">
        <div 
          className={`h-2.5 rounded-full ${getStatusColor}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <div className="text-gray-700 dark:text-gray-300">
          ${current.toFixed(2)} <span className="text-gray-500 dark:text-gray-500">/ ${target.toFixed(2)}</span>
        </div>
        <div className="font-medium">
          ${remaining.toFixed(2)} <span className="text-gray-500 dark:text-gray-500">restante</span>
        </div>
      </div>
    </div>
  );
}