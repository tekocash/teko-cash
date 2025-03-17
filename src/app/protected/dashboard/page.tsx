// src/app/(protected)/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useTransactionStore } from '@/store/transaction-store';
import { PieChart, BarChart3, TrendingUp, Wallet, ArrowUp, ArrowDown } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { transactions, fetchTransactions, isLoading } = useTransactionStore();
  
  useEffect(() => {
    if (user) {
      fetchTransactions(user.id);
    }
  }, [user, fetchTransactions]);
  
  // Calcular estadísticas básicas
  const totalIncome = transactions
    .filter(t => t.direction === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = transactions
    .filter(t => t.direction === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const balance = totalIncome - totalExpense;
  
  // Obtener transacciones recientes
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Dashboard
      </h1>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
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
                    ${balance.toFixed(2)}
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
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos totales</h3>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    ${totalIncome.toFixed(2)}
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
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Gastos totales</h3>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    ${totalExpense.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Secciones de resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Transacciones recientes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transacciones recientes</h3>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <li key={transaction.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full ${
                            transaction.direction === 'income' 
                              ? 'bg-green-100 dark:bg-green-900' 
                              : 'bg-red-100 dark:bg-red-900'
                          }`}>
                            {transaction.direction === 'income' ? (
                              <ArrowUp className={`h-5 w-5 text-green-600 dark:text-green-400`} />
                            ) : (
                              <ArrowDown className={`h-5 w-5 text-red-600 dark:text-red-400`} />
                            )}
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {transaction.concepto || 'Sin descripción'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-medium ${
                          transaction.direction === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.direction === 'income' ? '+' : '-'} ${transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No hay transacciones recientes
                  </li>
                )}
              </ul>
            </div>
            
            {/* Gráficos placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Análisis financiero</h3>
              </div>
              <div className="p-6 flex flex-col items-center justify-center space-y-4">
                <p className="text-gray-500 dark:text-gray-400">
                  Próximamente gráficos y análisis detallado de tus finanzas
                </p>
                <div className="flex space-x-6">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <PieChart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                    <Wallet className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}