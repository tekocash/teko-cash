// src/components/dashboard/Dashboard.tsx
'use client';

import { useState } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, CreditCard, Wallet, Calendar, BarChart2, PieChart } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('month'); // 'month', 'week', 'year'
  
  // Datos de ejemplo para mostrar (en una aplicación real, vendrían de un store)
  const balanceData = {
    balance: 1250.0,
    income: 3200.0,
    expenses: 1950.0,
  };
  
  const recentTransactions = [
    { id: 1, type: 'expense', category: 'Supermercado', date: '15 de marzo, 2025', amount: 120.5, icon: CreditCard },
    { id: 2, type: 'income', category: 'Salario', date: '10 de marzo, 2025', amount: 2500.0, icon: Wallet },
    { id: 3, type: 'expense', category: 'Suscripción', date: '5 de marzo, 2025', amount: 15.99, icon: Calendar },
  ];
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ¡Bienvenido, {user?.display_name || 'Usuario'}!
        </h1>
        
        {/* Selector de período */}
        <div className="mt-3 md:mt-0 flex bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 text-sm font-medium ${
              period === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 text-sm font-medium ${
              period === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 text-sm font-medium ${
              period === 'year' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Año
          </button>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance actual</h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${balanceData.balance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
              <ArrowUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ingresos del {period === 'week' ? 'semana' : period === 'month' ? 'mes' : 'año'}
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${balanceData.income.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
              <ArrowDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Gastos del {period === 'week' ? 'semana' : period === 'month' ? 'mes' : 'año'}
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${balanceData.expenses.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Secciones principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transacciones recientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transacciones recientes</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`p-2 ${
                        transaction.type === 'income'
                          ? 'bg-green-100 dark:bg-green-900'
                          : 'bg-red-100 dark:bg-red-900'
                      } rounded-full`}>
                        <transaction.icon className={`h-4 w-4 ${
                          transaction.type === 'income'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`} />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.category}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.date}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${
                      transaction.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No hay transacciones recientes</p>
              )}
            </div>
            
            <button className="mt-4 w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              Ver todas las transacciones
            </button>
          </div>
        </div>
        
        {/* Gráficos y estadísticas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Análisis de gastos</h3>
          </div>
          <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
            <div className="flex space-x-6 mb-6">
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                <PieChart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-full">
                <BarChart2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
              Los análisis de gastos estarán disponibles próximamente
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Ver análisis detallado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}