'use client';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import DashboardLayout from './DashboardLayout';
import { 
  BarChart, 
  Users, 
  DollarSign, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Plus,
  PieChart,
  Calendar,
  ChevronRight,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Link from 'next/link';

// Tipos basados en el modelo de datos compartido
interface Category {
  id: string;
  name: string;
  categoryType: 'expense' | 'income';
  parentId: string | null;
}

interface Transaction {
  id: string;
  direction: 'income' | 'expense';
  amount: number;
  date: string;
  categoryId: string;
  concepto: string;
  comercio?: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  memberCount: number;
}

interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  plannedAmount: number;
  spentAmount: number; // Calculado a partir de las transacciones
  month: string;
  percentage: number; // Porcentaje de uso (spentAmount / plannedAmount)
}

// Componente principal
export default function Dashboard() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [currentBudgets, setCurrentBudgets] = useState<Budget[]>([]);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [totals, setTotals] = useState({
    incomes: 0,
    expenses: 0,
    balance: 0,
    pending: 0,
  });

  // Datos de ejemplo para simular la carga desde la base de datos
  const loadMockData = () => {
    // Categorías de ejemplo
    const mockCategories: Record<string, Category> = {
      'cat1': { id: 'cat1', name: 'Alimentación', categoryType: 'expense', parentId: null },
      'cat2': { id: 'cat2', name: 'Transporte', categoryType: 'expense', parentId: null },
      'cat3': { id: 'cat3', name: 'Vivienda', categoryType: 'expense', parentId: null },
      'cat4': { id: 'cat4', name: 'Salario', categoryType: 'income', parentId: null },
      'cat5': { id: 'cat5', name: 'Freelance', categoryType: 'income', parentId: null },
    };

    // Transacciones recientes
    const mockTransactions: Transaction[] = [
      { 
        id: 'tr1', 
        direction: 'expense', 
        amount: 45.50, 
        date: '2025-03-15', 
        categoryId: 'cat1', 
        concepto: 'Supermercado',
        comercio: 'Carrefour'
      },
      { 
        id: 'tr2', 
        direction: 'expense', 
        amount: 25.00, 
        date: '2025-03-14', 
        categoryId: 'cat2', 
        concepto: 'Gasolina',
        comercio: 'Shell'
      },
      { 
        id: 'tr3', 
        direction: 'income', 
        amount: 1200.00, 
        date: '2025-03-01', 
        categoryId: 'cat4', 
        concepto: 'Sueldo Marzo'
      },
      { 
        id: 'tr4', 
        direction: 'income', 
        amount: 350.00, 
        date: '2025-03-10', 
        categoryId: 'cat5', 
        concepto: 'Proyecto freelance'
      },
      { 
        id: 'tr5', 
        direction: 'expense', 
        amount: 600.00, 
        date: '2025-03-05', 
        categoryId: 'cat3', 
        concepto: 'Alquiler Marzo'
      },
    ];

    // Presupuestos actuales
    const mockBudgets: Budget[] = [
      {
        id: 'bud1',
        categoryId: 'cat1',
        categoryName: 'Alimentación',
        plannedAmount: 300,
        spentAmount: 185.75,
        month: '2025-03',
        percentage: 62
      },
      {
        id: 'bud2',
        categoryId: 'cat2',
        categoryName: 'Transporte',
        plannedAmount: 150,
        spentAmount: 125.50,
        month: '2025-03',
        percentage: 84
      },
      {
        id: 'bud3',
        categoryId: 'cat3',
        categoryName: 'Vivienda',
        plannedAmount: 650,
        spentAmount: 600,
        month: '2025-03',
        percentage: 92
      },
    ];

    // Grupos familiares
    const mockFamilyGroups: FamilyGroup[] = [
      {
        id: 'fg1',
        name: 'Familia',
        memberCount: 4
      },
      {
        id: 'fg2',
        name: 'Compañeros de piso',
        memberCount: 3
      }
    ];

    // Totales calculados
    const mockTotals = {
      incomes: mockTransactions
        .filter(t => t.direction === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expenses: mockTransactions
        .filter(t => t.direction === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
      balance: 0,
      pending: 150.25 // Ejemplo de pagos pendientes
    };
    mockTotals.balance = mockTotals.incomes - mockTotals.expenses;

    // Actualizar estados
    setRecentTransactions(mockTransactions);
    setCurrentBudgets(mockBudgets);
    setFamilyGroups(mockFamilyGroups);
    setTotals(mockTotals);
    setIsLoading(false);
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    // Simulación de carga de datos
    const timeout = setTimeout(() => {
      loadMockData();
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  // Función para formatear montos de dinero
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Función para formatear fechas
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Función para obtener la categoría de una transacción
  const getCategoryName = (categoryId: string): string => {
    const mockCategories: Record<string, Category> = {
      'cat1': { id: 'cat1', name: 'Alimentación', categoryType: 'expense', parentId: null },
      'cat2': { id: 'cat2', name: 'Transporte', categoryType: 'expense', parentId: null },
      'cat3': { id: 'cat3', name: 'Vivienda', categoryType: 'expense', parentId: null },
      'cat4': { id: 'cat4', name: 'Salario', categoryType: 'income', parentId: null },
      'cat5': { id: 'cat5', name: 'Freelance', categoryType: 'income', parentId: null },
    };
    return mockCategories[categoryId]?.name || 'Sin categoría';
  };

  return (
    <DashboardLayout>
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Control</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Bienvenido, {user?.display_name || user?.email || 'Usuario'}
        </p>
      </div>

      {/* Tarjetas de resumen financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Ingresos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Ingresos</h3>
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-800 dark:text-white">
            {isLoading ? '...' : formatCurrency(totals.incomes)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Este mes</p>
        </div>

        {/* Gastos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Gastos</h3>
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-800 dark:text-white">
            {isLoading ? '...' : formatCurrency(totals.expenses)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Este mes</p>
        </div>

        {/* Balance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Balance</h3>
            <div className={`p-2 rounded-full ${
              totals.balance >= 0 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'
            }`}>
              <DollarSign size={20} />
            </div>
          </div>
          <p className={`text-2xl font-semibold ${
            totals.balance >= 0 
              ? 'text-blue-600 dark:text-blue-300'
              : 'text-yellow-600 dark:text-yellow-300'
          }`}>
            {isLoading ? '...' : formatCurrency(totals.balance)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Disponible</p>
        </div>

        {/* Pendientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">Pendientes</h3>
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-800 dark:text-white">
            {isLoading ? '...' : formatCurrency(totals.pending)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Por pagar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Transacciones recientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Transacciones Recientes</h2>
            <Link href="/dashboard/transactions" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm">
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              recentTransactions.length > 0 ? (
                recentTransactions.map(transaction => (
                  <div key={transaction.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.direction === 'income' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' 
                          : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                      }`}>
                        {transaction.direction === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.concepto}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getCategoryName(transaction.categoryId)} • {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className={`font-medium ${
                      transaction.direction === 'income' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.direction === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay transacciones recientes
                </div>
              )
            )}
          </div>
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            <Link 
              href="/dashboard/expenses/new" 
              className="flex items-center justify-center w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={18} className="mr-1" />
              Añadir Transacción
            </Link>
          </div>
        </div>

        {/* Presupuestos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Presupuestos</h2>
            <Link href="/dashboard/budgets" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm">
              Ver todos <ChevronRight size={16} />
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              currentBudgets.length > 0 ? (
                currentBudgets.map(budget => (
                  <div key={budget.id} className="px-6 py-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{budget.categoryName}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.plannedAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                      <div 
                        className={`h-2.5 rounded-full ${
                          budget.percentage > 90 ? 'bg-red-600' : 
                          budget.percentage > 75 ? 'bg-yellow-500' : 
                          'bg-green-600'
                        }`} 
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{budget.percentage}% usado</span>
                      <span>Resta: {formatCurrency(budget.plannedAmount - budget.spentAmount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay presupuestos configurados
                </div>
              )
            )}
          </div>
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            <Link 
              href="/dashboard/budgets/new" 
              className="flex items-center justify-center w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={18} className="mr-1" />
              Crear Presupuesto
            </Link>
          </div>
        </div>
      </div>
      
      {/* Grupos Familiares */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Grupos Familiares</h2>
          <Link href="/dashboard/family" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm">
            Administrar <ChevronRight size={16} />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <RefreshCw size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          familyGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {familyGroups.map((group) => (
                <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{group.name}</h3>
                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                      {group.memberCount} miembros
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link 
                      href={`/dashboard/family/${group.id}`} 
                      className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex-1 text-center"
                    >
                      Ver Detalles
                    </Link>
                    <Link 
                      href={`/dashboard/family/${group.id}/expenses`} 
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1 text-center"
                    >
                      Gastos Compartidos
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mb-4">
                <Users size={48} className="mx-auto text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Sin grupos familiares</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Crea un grupo familiar para compartir gastos con amigos o familiares
              </p>
              <Link
                href="/dashboard/family/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={18} className="mr-2" />
                Crear Grupo Familiar
              </Link>
            </div>
          )
        )}
      </div>
      
      {/* Categorías personalizadas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Categorías</h2>
          <Link href="/dashboard/categories" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm">
            Administrar <ChevronRight size={16} />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <RefreshCw size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 flex items-center justify-center mb-2">
                  <span className="text-lg">🍔</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Alimentación</span>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-2">
                  <span className="text-lg">🚗</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Transporte</span>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-2">
                  <span className="text-lg">🏠</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Vivienda</span>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center mb-2">
                  <span className="text-lg">💰</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Salario</span>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <Link href="/dashboard/categories/new" className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-2">
                    <Plus size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Añadir</span>
                </Link>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/dashboard/categories" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Ver todas las categorías
              </Link>
            </div>
          </div>
        )}
      </div>
      
      {/* Distribución de gastos (gráfico) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mt-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Distribución de Gastos</h2>
          <Link href="/dashboard/reports" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm">
            Ver informes <ChevronRight size={16} />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-60">
            <RefreshCw size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-6">
            <div className="h-60 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <BarChart size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">
                  Aquí irá un gráfico de distribución de gastos
                </p>
                <Link
                  href="/dashboard/reports"
                  className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Ver análisis detallado
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}