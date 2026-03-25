import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { deleteTransaction, updateTransaction } from '../service/transaction-service';
import { toast } from 'react-hot-toast';
import {
  ArrowUpRight, ArrowDownRight, Search, RefreshCw, Plus, X, Calendar,
  BarChart2, PieChart, List, TrendingDown, Pencil, Trash2,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, endOfYear, subMonths, startOfDay, endOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
};

const now = new Date();

const PERIODS = [
  { label: 'Hoy',       start: format(startOfDay(now), 'yyyy-MM-dd'),                        end: format(endOfDay(now), 'yyyy-MM-dd') },
  { label: 'Semana',    start: format(startOfWeek(now, { locale: es }), 'yyyy-MM-dd'),        end: format(endOfWeek(now, { locale: es }), 'yyyy-MM-dd') },
  { label: 'Este mes',  start: format(startOfMonth(now), 'yyyy-MM-dd'),                       end: format(endOfMonth(now), 'yyyy-MM-dd') },
  { label: 'Mes ant.',  start: format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'),          end: format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd') },
  { label: '3 meses',   start: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'),          end: format(endOfMonth(now), 'yyyy-MM-dd') },
  { label: 'Este año',  start: format(startOfYear(now), 'yyyy-MM-dd'),                        end: format(endOfYear(now), 'yyyy-MM-dd') },
];

const CHART_COLORS = ['#6366f1','#f43f5e','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

type ViewMode = 'list' | 'analytics';

export default function TransactionList() {
  const navigate = useNavigate();
  const { items, isLoading, filters, setFilters, totals, reload } = useTransactions();
  const [showCustom, setShowCustom] = useState(false);
  const [activePeriod, setActivePeriod] = useState(2);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const balance = totals.incomes - totals.expenses;

  // Edit / Delete state
  type EditForm = { id: string; concepto: string; comercio: string; amount: string; date: string; direction: 'income' | 'expense' };
  const [editTx, setEditTx] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTx, setDeleteTx] = useState<{ id: string; concepto: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openEdit = (tx: any) => {
    setEditTx({
      id: tx.id,
      concepto: tx.concepto || '',
      comercio: tx.comercio || '',
      amount: String(tx.amount),
      date: tx.date.slice(0, 10),
      direction: tx.direction,
    });
  };

  const handleEditSave = async () => {
    if (!editTx) return;
    setEditSaving(true);
    const { error } = await updateTransaction(editTx.id, {
      concepto: editTx.concepto || null,
      comercio: editTx.comercio || null,
      amount: Number(editTx.amount),
      date: editTx.date,
      direction: editTx.direction,
    } as any);
    setEditSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Transacción actualizada');
    setEditTx(null);
    reload();
  };

  const handleDelete = async () => {
    if (!deleteTx) return;
    setDeleting(true);
    const { error } = await deleteTransaction(deleteTx.id);
    setDeleting(false);
    setDeleteTx(null);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Transacción eliminada');
    reload();
  };

  const applyPeriod = (idx: number) => {
    setActivePeriod(idx);
    setShowCustom(false);
    const p = PERIODS[idx];
    setFilters(f => ({ ...f, startDate: p.start, endDate: p.end }));
  };

  const applyCustomDate = (field: 'startDate' | 'endDate', value: string) => {
    setActivePeriod(-1);
    setFilters(f => ({ ...f, [field]: value }));
  };

  // --- Analytics computations ---
  const expenses = items.filter(t => t.direction === 'expense');
  const incomeItems = items.filter(t => t.direction === 'income');

  // Category breakdown (expenses)
  const categoryMap = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach(t => {
      const name = (t.category as any)?.name || 'Sin categoría';
      m.set(name, (m.get(name) || 0) + t.amount);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [expenses]);

  const doughnutData = {
    labels: categoryMap.map(([name]) => name),
    datasets: [{
      data: categoryMap.map(([, amt]) => amt),
      backgroundColor: CHART_COLORS,
      borderWidth: 2,
      borderColor: 'transparent',
    }],
  };

  // Top comercios
  const comercioMap = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach(t => {
      if (t.comercio) m.set(t.comercio, (m.get(t.comercio) || 0) + t.amount);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses]);

  // Daily grouped bar chart
  const dailyMap = useMemo(() => {
    const m = new Map<string, { inc: number; exp: number }>();
    items.forEach(t => {
      const d = t.date.slice(0, 10);
      const cur = m.get(d) || { inc: 0, exp: 0 };
      if (t.direction === 'income') cur.inc += t.amount;
      else cur.exp += t.amount;
      m.set(d, cur);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  }, [items]);

  const barData = {
    labels: dailyMap.map(([d]) => d.slice(5)),
    datasets: [
      { label: 'Ingresos', data: dailyMap.map(([, v]) => v.inc), backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Gastos',   data: dailyMap.map(([, v]) => v.exp), backgroundColor: '#f43f5e', borderRadius: 4 },
    ],
  };

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.04)' } } },
  };

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '65%',
  };

  // avg ticket
  const avgExpense = expenses.length > 0 ? totals.expenses / expenses.length : 0;
  const maxExpense = expenses.length > 0 ? Math.max(...expenses.map(t => t.amount)) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Transacciones</h1>
          <p className="text-xs text-gray-400 mt-0.5">{filters.startDate} — {filters.endDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex p-0.5 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'analytics' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BarChart2 size={15} />
            </button>
          </div>
          <button
            onClick={reload} disabled={isLoading}
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

      {/* Filter panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 space-y-3">
        {/* Period quick-filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {PERIODS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPeriod(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activePeriod === i
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => { setShowCustom(v => !v); setActivePeriod(-1); }}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showCustom || activePeriod === -1
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Calendar size={12} /> Custom
          </button>
        </div>

        {showCustom && (
          <div className="flex gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
            {(['startDate', 'endDate'] as const).map((field, i) => (
              <div key={field} className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{i === 0 ? 'Desde' : 'Hasta'}</label>
                <input type="date" value={filters[field]}
                  onChange={e => applyCustomDate(field, e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
                />
              </div>
            ))}
          </div>
        )}

        {/* Direction + search */}
        <div className="flex items-center gap-2 border-t border-gray-50 dark:border-gray-700 pt-2">
          <div className="flex gap-0.5 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl flex-shrink-0">
            {(['all', 'income', 'expense'] as const).map(dir => (
              <button key={dir}
                onClick={() => setFilters(f => ({ ...f, direction: dir }))}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filters.direction === dir
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {dir === 'all' ? 'Todos' : dir === 'income' ? '↑ Ing.' : '↓ Gas.'}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar concepto o comercio..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
            />
            {filters.search && (
              <button onClick={() => setFilters(f => ({ ...f, search: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Ingresos</p>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate">{fmt(totals.incomes)}</p>
          <p className="text-[10px] text-emerald-500 dark:text-emerald-500">{incomeItems.length} movs.</p>
        </div>
        <div className="rounded-2xl p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Gastos</p>
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300 truncate">{fmt(totals.expenses)}</p>
          <p className="text-[10px] text-rose-500 dark:text-rose-500">{expenses.length} movs.</p>
        </div>
        <div className={`rounded-2xl p-3 border ${
          balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
        }`}>
          <p className={`text-xs font-medium ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>Balance</p>
          <p className={`text-sm font-bold truncate ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {fmt(balance)}
          </p>
          <p className="text-[10px] text-gray-400">{items.length} total</p>
        </div>
      </div>

      {/* === ANALYTICS VIEW === */}
      {viewMode === 'analytics' && !isLoading && items.length > 0 && (
        <div className="space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ticket promedio gasto', value: fmt(avgExpense), icon: <TrendingDown size={14} className="text-rose-500" /> },
              { label: 'Mayor gasto único', value: fmt(maxExpense), icon: <TrendingDown size={14} className="text-orange-500" /> },
              { label: 'Categorías activas', value: String(categoryMap.length), icon: <PieChart size={14} className="text-indigo-500" /> },
              { label: 'Comercios distintos', value: String(new Set(expenses.filter(t => t.comercio).map(t => t.comercio)).size), icon: <BarChart2 size={14} className="text-blue-500" /> },
            ].map((kpi, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1">{kpi.icon}<p className="text-[10px] text-gray-400">{kpi.label}</p></div>
                <p className="text-base font-bold text-gray-800 dark:text-gray-200">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Category donut */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Gastos por categoría</h3>
              {categoryMap.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Sin gastos en el período</p>
              ) : (
                <div className="flex gap-4">
                  <div className="relative h-36 w-36 flex-shrink-0">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                  <div className="flex flex-col gap-1.5 overflow-y-auto max-h-36 flex-1 min-w-0">
                    {categoryMap.map(([name, amt], i) => (
                      <div key={i} className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{name}</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                          {totals.expenses > 0 ? Math.round((amt / totals.expenses) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Daily bar chart */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Movimientos diarios</h3>
              <div className="h-44">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>
          </div>

          {/* Top comercios */}
          {comercioMap.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top comercios por gasto</h3>
              <div className="space-y-2">
                {comercioMap.map(([name, amt], i) => {
                  const pct = totals.expenses > 0 ? (amt / totals.expenses) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{fmt(amt)}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === LIST VIEW === */}
      {viewMode === 'list' && (
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              >
                <Plus size={15} /> Agregar transacción
              </button>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto] gap-x-4 px-4 py-2 bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                <span>Concepto / Comercio</span>
                <span>Categoría</span>
                <span>Fecha</span>
                <span className="text-right">Monto</span>
                <span>Tipo</span>
                <span></span>
              </div>

              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {items.map(tx => (
                  <div key={tx.id} className="flex sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    {/* Concepto + icon */}
                    <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tx.direction === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.direction === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{tx.concepto}</p>
                        {tx.comercio && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{tx.comercio}</p>
                        )}
                      </div>
                    </div>

                    {/* Categoría — hidden on mobile */}
                    <div className="hidden sm:block min-w-0">
                      {(tx.category as any)?.name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {(tx.category as any).name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </div>

                    {/* Fecha — hidden on mobile */}
                    <div className="hidden sm:block">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(tx.date.slice(0, 10))}</span>
                    </div>

                    {/* Monto */}
                    <div className="sm:text-right ml-auto sm:ml-0">
                      <span className={`text-sm font-semibold ${
                        tx.direction === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.direction === 'income' ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                    </div>

                    {/* Tipo badge — hidden on mobile */}
                    <div className="hidden sm:block">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${
                        tx.direction === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.direction === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(tx)}
                        className="p-1 rounded-lg text-gray-300 hover:text-indigo-500 dark:text-gray-600 dark:hover:text-indigo-400 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTx({ id: tx.id, concepto: tx.concepto || 'Sin concepto' })}
                        className="p-1 rounded-lg text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer count */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 text-center">
                  {items.length} transacción{items.length !== 1 ? 'es' : ''}
                  {activePeriod >= 0 ? ` · ${PERIODS[activePeriod].label}` : ' · Período personalizado'}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Analytics loading state */}
      {viewMode === 'analytics' && isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
          <RefreshCw size={24} className="animate-spin text-indigo-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Cargando análisis...</p>
        </div>
      )}

      {viewMode === 'analytics' && !isLoading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
          <BarChart2 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No hay datos para analizar en este período</p>
        </div>
      )}

      {/* Edit modal */}
      {editTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setEditTx(null); }}>
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Editar transacción</h3>
              <button onClick={() => setEditTx(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {/* Direction */}
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(dir => (
                  <button key={dir} onClick={() => setEditTx(t => t ? ({ ...t, direction: dir }) : t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      editTx.direction === dir
                        ? dir === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                    {dir === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                  </button>
                ))}
              </div>
              {[
                { label: 'Monto', key: 'amount' as const, type: 'number', placeholder: '0' },
                { label: 'Concepto', key: 'concepto' as const, type: 'text', placeholder: 'Ej. Compra supermercado' },
                { label: 'Comercio', key: 'comercio' as const, type: 'text', placeholder: 'Ej. Stock Center' },
                { label: 'Fecha', key: 'date' as const, type: 'date', placeholder: '' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input type={f.type} value={editTx[f.key]} placeholder={f.placeholder}
                    onChange={e => setEditTx(t => t ? ({ ...t, [f.key]: e.target.value }) : t)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditTx(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancelar
                </button>
                <button onClick={handleEditSave} disabled={editSaving}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium flex items-center justify-center gap-2">
                  {editSaving && <RefreshCw size={13} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTx(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-2">Eliminar transacción</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              ¿Eliminar <strong>"{deleteTx.concepto}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTx(null)}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                {deleting && <RefreshCw size={13} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
