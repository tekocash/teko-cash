import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { parseISO } from 'date-fns';

export interface TxItem {
  id: string;
  direction: 'income' | 'expense';
  amount: number;
  date: string;
  concepto: string;
  comercio?: string | null;
  category?: { id: string; name: string } | null;
}

export interface TxFilters {
  direction: 'all' | 'income' | 'expense';
  search: string;
  startDate: string;
  endDate: string;
}

export function useTransactions() {
  const { user } = useAuthStore();
  const now = new Date();
  const [items, setItems] = useState<TxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<TxFilters>({
    direction: 'all',
    search: '',
    startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
  });

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      let q = supabase
        .from('transactions')
        .select('id, direction, amount, date, concepto, comercio, category:category_id(id, name)')
        .eq('user_id', user.id)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)
        .order('date', { ascending: false })
        .limit(100);

      if (filters.direction !== 'all') q = q.eq('direction', filters.direction);
      if (filters.search) {
        q = q.or(`concepto.ilike.%${filters.search}%,comercio.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      setItems((data || []) as TxItem[]);
    } catch (e) {
      console.error('Error loading transactions:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filters]);

  useEffect(() => { load(); }, [load]);

  const totals = items.reduce(
    (acc, t) => {
      if (t.direction === 'income') acc.incomes += t.amount;
      else acc.expenses += t.amount;
      return acc;
    },
    { incomes: 0, expenses: 0 }
  );

  return { items, isLoading, filters, setFilters, totals, reload: load };
}
