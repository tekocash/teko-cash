import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const CHART_COLORS = [
  '#6366f1', '#f43f5e', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

export interface DashboardTx {
  id: string;
  direction: 'income' | 'expense';
  amount: number;
  date: string;
  concepto: string;
  comercio?: string | null;
  category?: { id: string; name: string } | null;
}

export interface CategoryStat {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

export interface MonthStat {
  month: string;
  incomes: number;
  expenses: number;
}

export function useDashboardData() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [recentTx, setRecentTx] = useState<DashboardTx[]>([]);
  const [totals, setTotals] = useState({ incomes: 0, expenses: 0, balance: 0, savingsRate: 0 });
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [monthly, setMonthly] = useState<MonthStat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  async function load() {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const start = format(startOfMonth(now), 'yyyy-MM-dd');
      const end = format(endOfMonth(now), 'yyyy-MM-dd');

      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select('id, direction, amount, date, concepto, comercio, category:category_id(id, name)')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (txErr) throw txErr;

      const transactions = (txs || []) as unknown as DashboardTx[];

      let inc = 0, exp = 0;
      transactions.forEach(t => {
        if (t.direction === 'income') inc += t.amount;
        else exp += t.amount;
      });
      setTotals({
        incomes: inc,
        expenses: exp,
        balance: inc - exp,
        savingsRate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
      });

      setRecentTx(transactions.slice(0, 5));

      const catMap = new Map<string, number>();
      transactions
        .filter(t => t.direction === 'expense')
        .forEach(t => {
          const name = (t.category as any)?.name || 'Sin categoría';
          catMap.set(name, (catMap.get(name) || 0) + t.amount);
        });

      const catEntries = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7);
      const totalExp = catEntries.reduce((s, [, v]) => s + v, 0);
      setCategories(
        catEntries.map(([name, amount], i) => ({
          name,
          amount,
          color: CHART_COLORS[i % CHART_COLORS.length],
          percentage: totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0,
        }))
      );

      const monthData: MonthStat[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i);
        const mStart = format(startOfMonth(m), 'yyyy-MM-dd');
        const mEnd = format(endOfMonth(m), 'yyyy-MM-dd');
        const { data: mTx } = await supabase
          .from('transactions')
          .select('direction, amount')
          .eq('user_id', user.id)
          .gte('date', mStart)
          .lte('date', mEnd);
        const mi = (mTx || []).filter(t => t.direction === 'income').reduce((s, t) => s + t.amount, 0);
        const me = (mTx || []).filter(t => t.direction === 'expense').reduce((s, t) => s + t.amount, 0);
        monthData.push({ month: format(m, 'MMM', { locale: es }), incomes: mi, expenses: me });
      }
      setMonthly(monthData);

    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }

  return { isLoading, recentTx, totals, categories, monthly, error, reload: load };
}
