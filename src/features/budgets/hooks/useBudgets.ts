import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, addWeeks, addYears, parseISO, isBefore, startOfDay,
} from 'date-fns';

const NOTIF_KEY = 'teko_notif_prefs';
const ALERT_SEEN_KEY = 'teko_budget_alerts_seen';
export const PENDING_NOTIFS_KEY = 'teko_pending_notifs';

export type RepeatFrequency = 'none' | 'mensual' | 'semanal' | 'anual';

export interface PendingNotif {
  id: string;
  budgetName: string;
  pct: number;
  type: 'warn' | 'over';
  timestamp: number;
}

function pushPendingNotif(notif: PendingNotif) {
  try {
    const existing: PendingNotif[] = JSON.parse(localStorage.getItem(PENDING_NOTIFS_KEY) || '[]');
    if (existing.find(n => n.id === notif.id)) return;
    existing.unshift(notif);
    localStorage.setItem(PENDING_NOTIFS_KEY, JSON.stringify(existing.slice(0, 30)));
  } catch {}
}

function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); } catch { return {}; }
}
function getAlertsSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(ALERT_SEEN_KEY) || '[]')); } catch { return new Set(); }
}
function markAlertSeen(key: string) {
  const seen = getAlertsSeen();
  seen.add(key);
  localStorage.setItem(ALERT_SEEN_KEY, JSON.stringify([...seen]));
}

function checkBudgetAlerts(budgets: BudgetItem[]) {
  const prefs = getNotifPrefs();
  if (prefs.budgetAlert === false) return;
  const threshold = prefs.budgetThreshold ?? 80;
  const today = format(new Date(), 'yyyy-MM-dd');
  const seen = getAlertsSeen();

  budgets.forEach(b => {
    if (b.planned_amount <= 0) return;
    const pct = (b.spent / b.planned_amount) * 100;
    const overKey = `over_${b.id}_${today}`;
    const warnKey = `warn_${b.id}_${today}`;

    if (pct >= 100 && !seen.has(overKey)) {
      toast.error(`Presupuesto superado: "${b.name}" — gastaste ${Math.round(pct)}%`, { duration: 5000 });
      markAlertSeen(overKey);
      pushPendingNotif({ id: overKey, budgetName: b.name, pct: Math.round(pct), type: 'over', timestamp: Date.now() });
    } else if (pct >= threshold && pct < 100 && !seen.has(warnKey)) {
      toast(`"${b.name}": ya usaste el ${Math.round(pct)}% de tu estimado`, { icon: '⚠️', duration: 5000 });
      markAlertSeen(warnKey);
      pushPendingNotif({ id: warnKey, budgetName: b.name, pct: Math.round(pct), type: 'warn', timestamp: Date.now() });
    }
  });
}

/** Advance start/end by one period according to repeat_frequency */
function nextPeriod(start: string, end: string, freq: RepeatFrequency): { start: string; end: string } {
  const s = parseISO(start);
  const e = parseISO(end);
  if (freq === 'mensual') return { start: format(addMonths(s, 1), 'yyyy-MM-dd'), end: format(addMonths(e, 1), 'yyyy-MM-dd') };
  if (freq === 'semanal') return { start: format(addWeeks(s, 1), 'yyyy-MM-dd'), end: format(addWeeks(e, 1), 'yyyy-MM-dd') };
  if (freq === 'anual')   return { start: format(addYears(s, 1), 'yyyy-MM-dd'), end: format(addYears(e, 1), 'yyyy-MM-dd') };
  return { start, end };
}

export interface BudgetItem {
  id: string;
  name: string;
  periodicity: string | null;
  repeat_frequency: RepeatFrequency;
  start_date: string;
  end_date: string;
  planned_amount: number;
  spent: number;
  month: string;
}

export interface CreateBudgetInput {
  name: string;
  planned_amount: number;
  periodicity: 'mensual' | 'anual' | 'otro';
  repeat_frequency: RepeatFrequency;
  start_date: string;
  end_date: string;
}

export function useBudgets() {
  const { user } = useAuthStore();
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: budgetsData, error: budgetsErr } = await supabase
        .from('budgets')
        .select('id, name, start_date, end_date, planned_amount, month, periodicity, repeat_frequency')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (budgetsErr) throw budgetsErr;
      if (!budgetsData || budgetsData.length === 0) {
        setBudgets([]);
        return;
      }

      // Auto-renew: for each repeating budget whose end_date < today, create the next period
      // if it doesn't already exist (checked by name + period overlap)
      const today = startOfDay(new Date());
      const existingNames = new Set(budgetsData.map(b => b.name));

      for (const b of budgetsData) {
        const freq = (b.repeat_frequency ?? 'none') as RepeatFrequency;
        if (freq === 'none') continue;

        let { start, end } = { start: String(b.start_date).slice(0, 10), end: String(b.end_date).slice(0, 10) };

        // Advance until we reach current or future period
        let iterations = 0;
        while (isBefore(parseISO(end), today) && iterations < 24) {
          const next = nextPeriod(start, end, freq);
          start = next.start;
          end = next.end;
          iterations++;
        }

        // If we advanced at least once, the current period is new → create if not covered
        if (iterations > 0) {
          const newMonth = format(parseISO(start), 'yyyy-MM');
          const alreadyExists = budgetsData.some(
            x => x.name === b.name && String(x.month).startsWith(newMonth)
          );
          if (!alreadyExists && !existingNames.has(`${b.name}_auto_${newMonth}`)) {
            const { data: cur } = await supabase.from('currencies').select('id').eq('code', 'PYG').maybeSingle();
            await supabase.from('budgets').insert({
              user_id: user.id,
              name: b.name,
              planned_amount: b.planned_amount,
              amount: b.planned_amount,
              start_date: start,
              end_date: end,
              month: newMonth,
              periodicity: b.periodicity,
              repeat_frequency: freq,
              currency_id: cur?.id ?? null,
            });
            // Re-fetch after auto-create
            await load();
            return;
          }
        }
      }

      // Compute spending per budget
      const withSpending = await Promise.all(
        budgetsData.map(async (b) => {
          const { data: txs } = await supabase
            .from('transactions')
            .select('amount')
            .eq('budget_id', b.id)
            .eq('direction', 'expense');

          const spent = (txs ?? []).reduce((s: number, t: any) => s + Number(t.amount), 0);
          return {
            id: b.id,
            name: b.name,
            periodicity: b.periodicity,
            repeat_frequency: (b.repeat_frequency ?? 'none') as RepeatFrequency,
            start_date: String(b.start_date).slice(0, 10),
            end_date: String(b.end_date).slice(0, 10),
            planned_amount: Number(b.planned_amount),
            month: b.month,
            spent,
          };
        })
      );

      setBudgets(withSpending);
      checkBudgetAlerts(withSpending);
    } catch (e: any) {
      setError(e.message || 'Error al cargar presupuestos');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const createBudget = async (input: CreateBudgetInput): Promise<{ error: any }> => {
    if (!user?.id) return { error: 'No hay sesión activa' };
    try {
      const { data: cur } = await supabase
        .from('currencies')
        .select('id')
        .eq('code', 'PYG')
        .maybeSingle();

      const month = format(new Date(input.start_date + 'T12:00:00'), 'yyyy-MM');

      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        name: input.name.trim(),
        planned_amount: input.planned_amount,
        amount: input.planned_amount,
        start_date: input.start_date,
        end_date: input.end_date,
        month,
        periodicity: input.periodicity,
        repeat_frequency: input.repeat_frequency,
        currency_id: cur?.id ?? null,
      });

      if (!error) await load();
      return { error };
    } catch (e: any) {
      return { error: e };
    }
  };

  const deleteBudget = async (id: string): Promise<{ error: any }> => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id);
    if (!error) await load();
    return { error };
  };

  const updateBudget = async (id: string, input: CreateBudgetInput): Promise<{ error: any }> => {
    if (!user?.id) return { error: 'No hay sesión activa' };
    const month = format(new Date(input.start_date + 'T12:00:00'), 'yyyy-MM');
    const { error } = await supabase
      .from('budgets')
      .update({
        name: input.name.trim(),
        planned_amount: input.planned_amount,
        amount: input.planned_amount,
        start_date: input.start_date,
        end_date: input.end_date,
        month,
        periodicity: input.periodicity,
        repeat_frequency: input.repeat_frequency,
      })
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) await load();
    return { error };
  };

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentBudgets = budgets.filter(b => b.month === currentMonth);
  const totalBudgeted = currentBudgets.reduce((s, b) => s + b.planned_amount, 0);
  const totalSpent = currentBudgets.reduce((s, b) => s + b.spent, 0);

  return { budgets, isLoading, error, reload: load, createBudget, deleteBudget, updateBudget, totalBudgeted, totalSpent };
}

// Period presets — dates computed once at module level
const _now = new Date();
export const PERIOD_PRESETS = [
  {
    label: 'Este mes',
    value: 'mensual' as const,
    start: format(startOfMonth(_now), 'yyyy-MM-dd'),
    end: format(endOfMonth(_now), 'yyyy-MM-dd'),
  },
  {
    label: 'Esta semana',
    value: 'otro' as const,
    start: format(startOfWeek(_now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(_now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  },
  {
    label: 'Este año',
    value: 'anual' as const,
    start: format(new Date(_now.getFullYear(), 0, 1), 'yyyy-MM-dd'),
    end: format(new Date(_now.getFullYear(), 11, 31), 'yyyy-MM-dd'),
  },
];
