/**
 * CalendarView — muestra transacciones sobre un calendario mensual.
 * Cada día con transacciones muestra puntos de color (verde = ingresos, rojo = gastos).
 * Al hacer click en un día se lista el detalle.
 */
import { useState, useEffect, useMemo } from 'react';
import { DayPicker, type Modifiers } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { TrendingUp, TrendingDown, Calendar, X } from 'lucide-react';
import 'react-day-picker/dist/style.css';

interface TxDay {
  date: string; // yyyy-MM-dd
  direction: 'ingreso' | 'gasto';
  amount: number;
  concepto: string | null;
  comercio: string | null;
  category: { name: string; icon: string } | null;
  currency: { code: string; symbol: string } | null;
}

const fmt = (n: number, code = 'PYG') =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: code === 'PYG' ? 0 : 2,
  }).format(n);

export default function CalendarView() {
  const { user } = useAuthStore();
  const [month, setMonth] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<TxDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>();

  // Fetch transactions for the visible month
  useEffect(() => {
    if (!user?.id) return;
    const start = format(startOfMonth(month), 'yyyy-MM-dd');
    const end = format(endOfMonth(month), 'yyyy-MM-dd');
    setLoading(true);
    supabase
      .from('transactions')
      .select('date, direction, amount, concepto, comercio, category:category_id(name,icon), currency:currency_id(code,symbol)')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date')
      .then(({ data }) => {
        // Supabase returns joined tables as nested objects; cast via unknown
        setTransactions((data as unknown as TxDay[]) ?? []);
        setLoading(false);
      });
  }, [user?.id, month]);

  // Build a map: date-string → { income, expense }
  const dayMap = useMemo(() => {
    const m = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const key = t.date.slice(0, 10);
      const cur = m.get(key) ?? { income: 0, expense: 0 };
      if (t.direction === 'ingreso') cur.income += Number(t.amount);
      else cur.expense += Number(t.amount);
      m.set(key, cur);
    }
    return m;
  }, [transactions]);

  // Days with only expense
  const expenseDays = useMemo(() =>
    [...dayMap.entries()].filter(([, v]) => v.expense > 0 && v.income === 0).map(([d]) => parseISO(d)),
    [dayMap]);

  // Days with only income
  const incomeDays = useMemo(() =>
    [...dayMap.entries()].filter(([, v]) => v.income > 0 && v.expense === 0).map(([d]) => parseISO(d)),
    [dayMap]);

  // Days with both
  const bothDays = useMemo(() =>
    [...dayMap.entries()].filter(([, v]) => v.income > 0 && v.expense > 0).map(([d]) => parseISO(d)),
    [dayMap]);

  // Transactions for selected day
  const selectedTxs = useMemo(() => {
    if (!selected) return [];
    return transactions.filter(t => isSameDay(parseISO(t.date), selected));
  }, [selected, transactions]);

  // Monthly totals
  const totals = useMemo(() => {
    let income = 0; let expense = 0;
    for (const t of transactions) {
      if (t.direction === 'ingreso') income += Number(t.amount);
      else expense += Number(t.amount);
    }
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const modifiers: Modifiers = {
    expense: expenseDays,
    income: incomeDays,
    both: bothDays,
  } as unknown as Modifiers;

  const modifiersClassNames = {
    expense: 'rdp-day-expense',
    income: 'rdp-day-income',
    both: 'rdp-day-both',
    selected: 'rdp-day-selected-custom',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Vista Calendario</h2>
        </div>
        {loading && <span className="text-xs text-gray-400 animate-pulse">Cargando…</span>}
      </div>

      {/* Monthly summary pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <TrendingUp size={12} />
          {fmt(totals.income)}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-xs font-semibold text-red-700 dark:text-red-300">
          <TrendingDown size={12} />
          {fmt(totals.expense)}
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          totals.balance >= 0
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
        }`}>
          Balance: {fmt(totals.balance)}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 overflow-x-auto">
        <style>{`
          .rdp { --rdp-accent-color: #6366f1; --rdp-background-color: #eef2ff; }
          .dark .rdp { --rdp-background-color: #312e81; }
          .rdp-day-expense .rdp-day_button::after { content: ''; display: block; width: 5px; height: 5px; border-radius: 50%; background: #ef4444; margin: 1px auto 0; }
          .rdp-day-income .rdp-day_button::after { content: ''; display: block; width: 5px; height: 5px; border-radius: 50%; background: #10b981; margin: 1px auto 0; }
          .rdp-day-both .rdp-day_button::after { content: ''; display: block; width: 5px; height: 5px; border-radius: 50%; background: linear-gradient(90deg,#ef4444 50%,#10b981 50%); margin: 1px auto 0; }
          .rdp-day_button { display: flex; flex-direction: column; align-items: center; }
        `}</style>
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={setSelected}
          month={month}
          onMonthChange={setMonth}
          locale={es}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          showOutsideDays
        />

        {/* Legend */}
        <div className="flex items-center gap-4 justify-center mt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />Gastos</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />Ingresos</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 to-emerald-500" />Ambos</span>
        </div>
      </div>

      {/* Day detail drawer */}
      {selected && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">
              {format(selected, "EEEE d 'de' MMMM", { locale: es })}
            </span>
            <button
              onClick={() => setSelected(undefined)}
              className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={14} />
            </button>
          </div>

          {selectedTxs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin movimientos este día</p>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {selectedTxs.map((t, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{t.category?.icon ?? (t.direction === 'ingreso' ? '💰' : '💸')}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                        {t.concepto || t.comercio || t.category?.name || 'Sin descripción'}
                      </p>
                      <p className="text-xs text-gray-400">{t.category?.name ?? '—'}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.direction === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {t.direction === 'ingreso' ? '+' : '-'}{fmt(Number(t.amount), t.currency?.code)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
