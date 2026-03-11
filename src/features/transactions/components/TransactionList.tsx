import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  X,
} from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export default function TransactionList() {
  const navigate = useNavigate();
  const { items, isLoading, filters, setFilters, totals, reload } = useTransactions();
  const [showFilters, setShowFilters] = useState(false);

  const balance = totals.incomes - totals.expenses;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Transacciones</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {filters.startDate} — {filters.endDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            disabled={isLoading}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/transactions?action=new&type=expense')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Totals summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Ingresos</p>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate">{fmt(totals.incomes)}</p>
        </div>
        <div className="rounded-xl p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Gastos</p>
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300 truncate">{fmt(totals.expenses)}</p>
        </div>
        <div className={`rounded-xl p-3 border ${
          balance >= 0
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
        }`}>
          <p className={`text-xs font-medium ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>Balance</p>
          <p className={`text-sm font-bold truncate ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {fmt(balance)}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 space-y-3">
        {/* Direction pills + search + filter toggle */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
            {(['all', 'income', 'expense'] as const).map(dir => (
              <button
                key={dir}
                onClick={() => setFilters(f => ({ ...f, direction: dir }))}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filters.direction === dir
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {dir === 'all' ? 'Todos' : dir === 'income' ? 'Ingresos' : 'Gastos'}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
            />
            {filters.search && (
              <button
                onClick={() => setFilters(f => ({ ...f, search: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Date range (collapsible) */}
        {showFilters && (
          <div className="flex gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-36 bg-gray-100 dark:bg-gray-700 rounded mb-1.5" />
                  <div className="h-2 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm mb-4">No hay transacciones para este período</p>
            <button
              onClick={() => navigate('/transactions?action=new&type=expense')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              Agregar transacción
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {items.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
      </div>
    </div>
  );
}
