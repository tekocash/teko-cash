import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  RefreshCw,
  Plus,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 bg-white/60 dark:bg-gray-800/60 animate-pulse border border-gray-100 dark:border-gray-700">
      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-2 w-16 bg-gray-100 dark:bg-gray-700 rounded" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { isLoading, recentTx, totals, categories, monthly, error, reload } = useDashboardData();

  const doughnutData = {
    labels: categories.map(c => c.name),
    datasets: [{
      data: categories.map(c => c.amount),
      backgroundColor: categories.map(c => c.color),
      borderWidth: 2,
      borderColor: 'transparent',
    }],
  };

  const barData = {
    labels: monthly.map(m => m.month),
    datasets: [
      {
        label: 'Ingresos',
        data: monthly.map(m => m.incomes),
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
      {
        label: 'Gastos',
        data: monthly.map(m => m.expenses),
        backgroundColor: '#f43f5e',
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    cutout: '70%',
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting()}, {user?.display_name || user?.email?.split('@')[0] || 'Usuario'} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Resumen del mes actual
          </p>
        </div>
        <button
          onClick={reload}
          disabled={isLoading}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* Ingresos */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-emerald-100 text-sm font-medium">Ingresos</span>
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <p className="text-xl font-bold truncate">{fmt(totals.incomes)}</p>
              <p className="text-emerald-100 text-xs mt-1">Este mes</p>
            </div>

            {/* Gastos */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-rose-100 text-sm font-medium">Gastos</span>
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <ArrowDownRight size={16} />
                </div>
              </div>
              <p className="text-xl font-bold truncate">{fmt(totals.expenses)}</p>
              <p className="text-rose-100 text-xs mt-1">Este mes</p>
            </div>

            {/* Balance */}
            <div className={`rounded-2xl p-5 text-white shadow-lg ${
              totals.balance >= 0
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200 dark:shadow-blue-900/30'
                : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200 dark:shadow-amber-900/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-blue-100 text-sm font-medium">Balance</span>
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Wallet size={16} />
                </div>
              </div>
              <p className="text-xl font-bold truncate">{fmt(totals.balance)}</p>
              <p className="text-blue-100 text-xs mt-1">Disponible</p>
            </div>

            {/* Tasa ahorro */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-violet-100 text-sm font-medium">Ahorro</span>
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="text-xl font-bold">{totals.savingsRate}%</p>
              <p className="text-violet-100 text-xs mt-1">Del ingreso</p>
            </div>
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Donut chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Gastos por categoría</h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-gray-300" />
            </div>
          ) : categories.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-sm">
              <Wallet size={32} className="mb-2 opacity-40" />
              Sin gastos este mes
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="relative h-36 w-36 flex-shrink-0">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-36 flex-1 min-w-0">
                {categories.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{c.name}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Últimos 6 meses</h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="h-48">
              <Bar data={barData} options={barOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transacciones recientes</h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-32 bg-gray-100 dark:bg-gray-700 rounded mb-1.5" />
                  <div className="h-2 w-20 bg-gray-100 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-100 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : recentTx.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            No hay transacciones este mes
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {recentTx.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.direction === 'income'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {tx.direction === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {tx.concepto}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {(tx.category as any)?.name || tx.comercio || 'Sin categoría'} · {fmtDate(tx.date)}
                  </p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${
                  tx.direction === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {tx.direction === 'income' ? '+' : '-'}{fmt(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add transaction CTA */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => navigate('/transactions?action=new&type=expense')}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nueva transacción
          </button>
        </div>
      </div>
    </div>
  );
}
