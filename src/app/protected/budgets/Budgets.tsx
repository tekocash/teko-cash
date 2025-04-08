// src/app/(protected)/budgets/page.tsx
'use client';

import { useState } from 'react';
import { Plus, Filter, ChartPie, Zap } from 'lucide-react';
import BudgetProgress from '@/features/budgets/components/BudgetProgress';

// Datos de ejemplo (reemplazar con datos reales)
const sampleBudgets = [
  { id: 'b1', title: 'Alimentación', category: 'Gastos mensuales', period: 'Marzo 2025', current: 450, target: 600 },
  { id: 'b2', title: 'Transporte', category: 'Gastos mensuales', period: 'Marzo 2025', current: 180, target: 200 },
  { id: 'b3', title: 'Entretenimiento', category: 'Gastos mensuales', period: 'Marzo 2025', current: 210, target: 150 },
  { id: 'b4', title: 'Viaje a la playa', category: 'Ahorro', period: 'Junio 2025', current: 1200, target: 3000 },
];

export default function BudgetsPage() {
  const [showNewBudgetForm, setShowNewBudgetForm] = useState(false);
  
  // Calcular progreso general
  const totalBudgeted = sampleBudgets.reduce((sum, budget) => sum + budget.target, 0);
  const totalSpent = sampleBudgets.reduce((sum, budget) => sum + budget.current, 0);
  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Presupuestos
        </h1>
        
        <button
          onClick={() => setShowNewBudgetForm(!showNewBudgetForm)}
          className="px-4 py-2 flex items-center bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo presupuesto
        </button>
      </div>
      
      {/* Formulario para nuevo presupuesto (oculto por defecto) */}
      {showNewBudgetForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Crear nuevo presupuesto
          </h2>
          
          <form className="space-y-4">
            {/* Aquí iría el formulario real de presupuesto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Ej. Alimentación"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría
                </label>
                <select className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Seleccionar categoría</option>
                  <option>Alimentación</option>
                  <option>Transporte</option>
                  <option>Vivienda</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto objetivo
                </label>
                <input
                  type="number"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Periodo
                </label>
                <select className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:outline-none focus:border-blue-500 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option>Marzo 2025</option>
                  <option>Abril 2025</option>
                  <option>Mayo 2025</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowNewBudgetForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 mr-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Resumen del presupuesto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Resumen del mes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Marzo 2025</p>
            </div>
            <ChartPie className="h-6 w-6 text-blue-500" />
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
            <div 
              className={`h-3 rounded-full ${
                overallPercentage < 70 
                  ? 'bg-green-600 dark:bg-green-500' 
                  : overallPercentage < 90 
                    ? 'bg-yellow-500 dark:bg-yellow-500' 
                    : 'bg-red-600 dark:bg-red-500'
              }`}
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center text-sm mb-4">
            <div className="text-gray-700 dark:text-gray-300">
              ${totalSpent.toFixed(2)} <span className="text-gray-500 dark:text-gray-500">/ ${totalBudgeted.toFixed(2)}</span>
            </div>
            <div className="font-medium">
              {overallPercentage.toFixed(1)}%
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total presupuestado</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">${totalBudgeted.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total gastado</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">${totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Presupuestos activos
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Progreso actual</p>
            </div>
            <Zap className="h-6 w-6 text-blue-500" />
          </div>
          
          <div className="space-y-4">
            {sampleBudgets
              .filter((_, index) => index < 3) // Mostrar solo los 3 primeros
              .map(budget => (
                <div key={budget.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{budget.title}</p>
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                        className={`h-1.5 rounded-full ${
                          (budget.current / budget.target) * 100 < 70 
                            ? 'bg-green-600 dark:bg-green-500' 
                            : (budget.current / budget.target) * 100 < 90 
                              ? 'bg-yellow-500 dark:bg-yellow-500' 
                              : 'bg-red-600 dark:bg-red-500'
                        }`}
                        style={{ width: `${Math.min((budget.current / budget.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${budget.current.toFixed(2)} <span className="text-gray-500 dark:text-gray-400">/ ${budget.target.toFixed(2)}</span>
                  </p>
                </div>
              ))}
          </div>
          
          <button className="w-full mt-6 text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            Ver todos los presupuestos
          </button>
        </div>
      </div>
      
      {/* Lista de presupuestos */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Todos los presupuestos
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleBudgets.map(budget => (
          <BudgetProgress
            key={budget.id}
            title={budget.title}
            category={budget.category}
            period={budget.period}
            current={budget.current}
            target={budget.target}
          />
        ))}
      </div>
    </div>
  );
}