import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';

export interface FinancialTrend {
  month: string;        // 'yyyy-MM'
  label: string;        // 'Ene 2025'
  incomes: number;
  expenses: number;
  balance: number;
  savingsRate: number;  // 0–100
}

export interface CategoryStat {
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
  pct: number;
}

export interface RecurringItem {
  concepto: string;
  avgAmount: number;
  occurrences: number;
  lastDate: string;
}

export interface DebtItem {
  concepto: string;
  totalPaid: number;
  lastDate: string;
}

/** Per-category amount for a single month */
export interface CategoryMonthEntry {
  name: string;
  amount: number;
}

/** Category breakdown per month (for stacked chart) */
export interface CategoryTrendItem {
  month: string;    // 'yyyy-MM'
  label: string;    // 'Ene 2025'
  categories: CategoryMonthEntry[];
}

export interface FinancialAnalysisData {
  // All-time
  allTimeIncome: number;
  allTimeExpenses: number;
  allTimeBalance: number;
  // Last 12 months trend
  trend: FinancialTrend[];
  // Category breakdown per month (last 12 months expenses)
  categoryTrend: CategoryTrendItem[];
  // All distinct category names that appear in trend
  categoryNames: string[];
  // Current month
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthBalance: number;
  // Top categories (last 3 months)
  topCategories: CategoryStat[];
  // Recurring expenses
  recurringItems: RecurringItem[];
  // Debt/loan payments
  debtItems: DebtItem[];
  // Avg monthly metrics
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  avgMonthlySavings: number;
  // Projection: if current trend continues, next month
  projectedNextMonthExpenses: number;
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`;
}

export function useFinancialAnalysis() {
  const { user } = useAuthStore();
  const [data, setData] = useState<FinancialAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch last 13 months of transactions (for 12-month trend + comparison)
      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      since.setDate(1);
      const sinceStr = since.toLocaleDateString('en-CA');

      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select('date, direction, amount, concepto, category:category_id(name)')
        .eq('user_id', user.id)
        .gte('date', sinceStr)
        .order('date', { ascending: false });

      if (txErr) throw txErr;

      // All-time totals (separate query for efficiency)
      const { data: totals } = await supabase
        .from('transactions')
        .select('direction, amount')
        .eq('user_id', user.id);

      let allTimeIncome = 0;
      let allTimeExpenses = 0;
      for (const t of totals || []) {
        if (t.direction === 'income') allTimeIncome += t.amount;
        else allTimeExpenses += t.amount;
      }

      const rows = txs || [];
      const now = new Date();
      const currentMonth = now.toLocaleDateString('en-CA').slice(0, 7);

      // Build monthly map
      const monthMap = new Map<string, { incomes: number; expenses: number }>();
      // Ensure last 12 months exist
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = d.toLocaleDateString('en-CA').slice(0, 7);
        monthMap.set(ym, { incomes: 0, expenses: 0 });
      }

      // Category map (last 3 months)
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toLocaleDateString('en-CA').slice(0, 7);
      const catMap = new Map<string, { name: string; icon: string; color: string; total: number; count: number }>();

      // Category-by-month map (all 12 months, for stacked chart)
      const catByMonth = new Map<string, Map<string, number>>(); // ym -> catName -> amount
      for (const ym of monthMap.keys()) catByMonth.set(ym, new Map());

      // Recurring expenses detection
      const descMap = new Map<string, { total: number; count: number; months: Set<string>; lastDate: string }>();

      // Debt detection
      const debtKeywords = ['prestamo', 'cuota', 'cobro automatico', 'provision ley', 'financiamiento'];
      const debtMap = new Map<string, { total: number; lastDate: string }>();

      for (const tx of rows) {
        const ym = tx.date.slice(0, 7);
        if (monthMap.has(ym)) {
          const m = monthMap.get(ym)!;
          if (tx.direction === 'income') m.incomes += tx.amount;
          else m.expenses += tx.amount;
        }

        // Category stats (last 3 months) + category-by-month (all 12)
        if (tx.direction === 'expense') {
          const cat = (tx as any).category;
          const catName = cat?.name || 'Sin categoría';

          // All-12-month category stacked data
          if (catByMonth.has(ym)) {
            const mMap = catByMonth.get(ym)!;
            mMap.set(catName, (mMap.get(catName) || 0) + tx.amount);
          }

          // Last-3-months aggregate for top categories
          if (ym >= threeMonthsAgo && cat?.name) {
            if (!catMap.has(cat.name)) catMap.set(cat.name, { name: cat.name, icon: '📦', color: '#6366f1', total: 0, count: 0 });
            const c = catMap.get(cat.name)!;
            c.total += tx.amount; c.count++;
          }
        }

        // Recurring (last 12 months expenses)
        if (tx.direction === 'expense' && tx.concepto) {
          const key = tx.concepto.trim().toLowerCase().slice(0, 35);
          if (!descMap.has(key)) descMap.set(key, { total: 0, count: 0, months: new Set(), lastDate: tx.date });
          const d = descMap.get(key)!;
          d.total += tx.amount; d.count++; d.months.add(ym);
          if (tx.date > d.lastDate) d.lastDate = tx.date;
        }

        // Debt detection
        if (tx.direction === 'expense' && tx.concepto) {
          const n = tx.concepto.toLowerCase();
          if (debtKeywords.some(kw => n.includes(kw))) {
            const key = tx.concepto.trim().slice(0, 40);
            if (!debtMap.has(key)) debtMap.set(key, { total: 0, lastDate: tx.date });
            const d = debtMap.get(key)!;
            d.total += tx.amount;
            if (tx.date > d.lastDate) d.lastDate = tx.date;
          }
        }
      }

      // Build trend array (sorted)
      const trend: FinancialTrend[] = [...monthMap.entries()]
        .map(([month, v]) => {
          const sr = v.incomes > 0 ? Math.round(((v.incomes - v.expenses) / v.incomes) * 100) : 0;
          return { month, label: monthLabel(month), incomes: v.incomes, expenses: v.expenses, balance: v.incomes - v.expenses, savingsRate: Math.max(0, sr) };
        })
        .sort((a, b) => a.month.localeCompare(b.month));

      // Averages (exclude current incomplete month)
      const completedMonths = trend.filter(t => t.month < currentMonth);
      const monthCount = completedMonths.length || 1;
      const avgMonthlyIncome = completedMonths.reduce((s, t) => s + t.incomes, 0) / monthCount;
      const avgMonthlyExpenses = completedMonths.reduce((s, t) => s + t.expenses, 0) / monthCount;
      const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpenses;

      // Current month
      const cur = monthMap.get(currentMonth) || { incomes: 0, expenses: 0 };
      const currentMonthIncome = cur.incomes;
      const currentMonthExpenses = cur.expenses;
      const currentMonthBalance = cur.incomes - cur.expenses;

      // Projection: weighted average of last 3 months
      const last3 = trend.slice(-3);
      const projectedNextMonthExpenses = last3.length > 0
        ? Math.round(last3.reduce((s, t) => s + t.expenses, 0) / last3.length)
        : avgMonthlyExpenses;

      // Category trend (stacked chart data)
      // Find top 6 categories by total volume across all 12 months
      const catTotals = new Map<string, number>();
      for (const mMap of catByMonth.values()) {
        for (const [name, amt] of mMap.entries()) {
          catTotals.set(name, (catTotals.get(name) || 0) + amt);
        }
      }
      const topCatNames = [...catTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name]) => name);

      const categoryTrend: CategoryTrendItem[] = trend.map(t => ({
        month: t.month,
        label: t.label,
        categories: topCatNames.map(name => ({
          name,
          amount: catByMonth.get(t.month)?.get(name) || 0,
        })),
      }));
      const categoryNames = topCatNames;

      // Top categories (last 3 months)
      const totalCatExpenses = [...catMap.values()].reduce((s, c) => s + c.total, 0) || 1;
      const topCategories: CategoryStat[] = [...catMap.values()]
        .map(c => ({ ...c, pct: Math.round((c.total / totalCatExpenses) * 100) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 7);

      // Recurring (>=2 occurrences in >=2 months)
      const recurringItems: RecurringItem[] = [...descMap.entries()]
        .filter(([, v]) => v.count >= 2 && v.months.size >= 2)
        .map(([concepto, v]) => ({ concepto, avgAmount: Math.round(v.total / v.count), occurrences: v.count, lastDate: v.lastDate }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 8);

      // Debts
      const debtItems: DebtItem[] = [...debtMap.entries()]
        .map(([concepto, v]) => ({ concepto, totalPaid: v.total, lastDate: v.lastDate }))
        .sort((a, b) => b.totalPaid - a.totalPaid)
        .slice(0, 6);

      setData({
        allTimeIncome, allTimeExpenses, allTimeBalance: allTimeIncome - allTimeExpenses,
        trend, categoryTrend, categoryNames,
        currentMonthIncome, currentMonthExpenses, currentMonthBalance,
        topCategories, recurringItems, debtItems,
        avgMonthlyIncome, avgMonthlyExpenses, avgMonthlySavings,
        projectedNextMonthExpenses,
      });
    } catch (e: any) {
      setError(e.message || 'Error al cargar análisis financiero');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, error, reload: load };
}
