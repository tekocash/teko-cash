import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CreditCard, Plus, X, Upload, FileText, ChevronDown, ChevronUp,
  AlertCircle, Trash2, Edit3, TrendingUp, RefreshCw, Save,
  ArrowDownRight, Info, FileUp, CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { parsePdfStatement, pdfFormatLabel } from '@/features/transactions/service/pdf-parser';
import type { ParsedCardStatement, CardFinancialSummary, ParsedCardTransaction } from '@/features/transactions/service/pdf-parser';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegisteredCard {
  id: string;
  user_id?: string;
  name: string;
  bank: string;
  last_four: string;
  tan: number;
  tae: number;
  credit_limit: number;
  currency: 'PYG' | 'USD';
  closing_day: number;
  due_day: number;
  annual_fee: number;
  notes: string;
  // Statement snapshot
  statement_date?: string | null;
  due_date?: string | null;
  credit_available?: number | null;
  previous_debt?: number | null;
  payments?: number | null;
  financed_balance?: number | null;
  purchases_charges?: number | null;
  total_debt?: number | null;
  minimum_payment?: number | null;
  interest?: number | null;
  punitory?: number | null;
  iva_on_charges?: number | null;
  total_financial_charges?: number | null;
  days_in_default?: number | null;
  card_holder?: string | null;
  card_number_masked?: string | null;
  created_at?: string;
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

const fmt = (n: number, currency: 'PYG' | 'USD' = 'PYG') =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency', currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(n || 0);

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n || 0);

/** Strip formatting characters and return raw number string */
function parseFormattedNumber(s: string): string {
  return s.replace(/[^\d]/g, '');
}

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function urgencyColor(days: number) {
  if (days < 0) return 'text-red-600 dark:text-red-400';
  if (days <= 3) return 'text-red-500 dark:text-red-400';
  if (days <= 7) return 'text-amber-500 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

const BANK_OPTIONS = ['Ueno Bank', 'Itaú', 'Atlas Bank', 'BBVA', 'Sudameris', 'Banco Nacional', 'Otro'];

// ── Amount input with thousands separator ──────────────────────────────────────

function AmountInput({ value, onChange, placeholder, className }: {
  value: number | string;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => value ? fmtNum(Number(value)) : '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplay(value ? fmtNum(Number(value)) : '');
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? display : (value ? fmtNum(Number(value)) : '')}
      placeholder={placeholder}
      className={className}
      onFocus={() => { setFocused(true); setDisplay(value ? String(value) : ''); }}
      onChange={e => {
        const raw = parseFormattedNumber(e.target.value);
        setDisplay(raw);
        onChange(Number(raw) || 0);
      }}
      onBlur={() => {
        setFocused(false);
        const num = Number(display.replace(/[^\d]/g, '')) || 0;
        setDisplay(num ? fmtNum(num) : '');
        onChange(num);
      }}
    />
  );
}

// ── Card Form ─────────────────────────────────────────────────────────────────

function CardForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<RegisteredCard>;
  onSave: (card: Partial<RegisteredCard>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<RegisteredCard>>({
    name: '', bank: 'Ueno Bank', last_four: '', tan: 0, tae: 0,
    credit_limit: 0, currency: 'PYG', closing_day: 1, due_day: 15,
    annual_fee: 0, notes: '',
    ...initial,
  });

  const set = (k: keyof RegisteredCard, v: any) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-5">
        {initial?.id ? 'Editar tarjeta' : 'Registrar tarjeta'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre / etiqueta *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className={inputCls} placeholder="Ej. Ueno Mastercard Principal" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Banco</label>
          <select value={form.bank} onChange={e => set('bank', e.target.value)} className={inputCls}>
            {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Últimos 4 dígitos</label>
          <input value={form.last_four} onChange={e => set('last_four', e.target.value.slice(0, 4))}
            className={inputCls} placeholder="7142" maxLength={4} inputMode="numeric" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">TAN (%)</label>
          <input type="number" step="0.01" value={form.tan || ''} onChange={e => set('tan', e.target.value)}
            className={inputCls} placeholder="14.41" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">TAE (%)</label>
          <input type="number" step="0.01" value={form.tae || ''} onChange={e => set('tae', e.target.value)}
            className={inputCls} placeholder="15.49" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Línea de crédito</label>
          <AmountInput value={form.credit_limit || 0} onChange={v => set('credit_limit', v)}
            placeholder="1.500.000" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Moneda</label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
            <option value="PYG">Guaraníes (Gs.)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Día de cierre</label>
          <input type="number" min={1} max={31} value={form.closing_day || ''} onChange={e => set('closing_day', e.target.value)}
            className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Día de vencimiento</label>
          <input type="number" min={1} max={31} value={form.due_day || ''} onChange={e => set('due_day', e.target.value)}
            className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Costo anual</label>
          <AmountInput value={form.annual_fee || 0} onChange={v => set('annual_fee', v)}
            placeholder="0" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notas</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className={`${inputCls} resize-none`}
            placeholder="Ej. Débito automático desde cuenta corriente Ueno" />
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={() => {
          if (!form.name?.trim()) { toast.error('Ingresá un nombre para la tarjeta'); return; }
          onSave(form);
        }}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Guardar
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Statement Summary Panel ────────────────────────────────────────────────────

function StatementSummaryPanel({ card }: { card: RegisteredCard }) {
  const currency = card.currency;
  if (!card.total_debt && !card.previous_debt) return null;

  const rows = [
    { label: 'Deuda anterior',         value: card.previous_debt || 0 },
    { label: 'Pagos',                  value: card.payments || 0, negative: true },
    { label: 'Saldo financiado',        value: card.financed_balance || 0 },
    { label: 'Compras y cargos',        value: card.purchases_charges || 0 },
    { label: 'Deuda total',            value: card.total_debt || 0, bold: true },
  ];
  const charges = [
    { label: 'Interés',                value: card.interest || 0 },
    { label: 'Punitorio',              value: card.punitory || 0 },
    { label: 'IVA s/Cargos',          value: card.iva_on_charges || 0 },
    { label: 'Total gastos financieros', value: card.total_financial_charges || 0, bold: true },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estado de cuenta</p>
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.label} className={`flex justify-between text-sm ${r.bold ? 'font-bold border-t border-gray-200 dark:border-gray-600 pt-2 mt-2' : ''}`}>
              <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
              <span className={r.negative ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}>
                {r.negative ? '-' : ''}{fmt(r.value, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {card.total_financial_charges ? (
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-3">Gastos financieros</p>
            <div className="space-y-2">
              {charges.map(r => (
                <div key={r.label} className={`flex justify-between text-sm ${r.bold ? 'font-bold border-t border-rose-200 dark:border-rose-800 pt-2 mt-2' : ''}`}>
                  <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
                  <span className="text-rose-600 dark:text-rose-400">{fmt(r.value, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Tasas y pago</p>
          <div className="space-y-2 text-sm">
            {(card.tan || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">TAN</span><span className="font-semibold text-gray-800 dark:text-gray-200">{card.tan}%</span></div>}
            {(card.tae || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">TAE</span><span className="font-semibold text-gray-800 dark:text-gray-200">{card.tae}%</span></div>}
            {(card.minimum_payment || 0) > 0 && (
              <div className="flex justify-between border-t border-indigo-200 dark:border-indigo-800 pt-2 mt-2 font-bold">
                <span className="text-indigo-700 dark:text-indigo-300">Pago Mínimo</span>
                <span className="text-indigo-700 dark:text-indigo-300">{fmt(card.minimum_payment!, currency)}</span>
              </div>
            )}
            {(card.days_in_default || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Días mora</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{card.days_in_default}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Transaction import table ───────────────────────────────────────────────────

function TxImportTable({ transactions, currency, onImport, importing }: {
  transactions: ParsedCardTransaction[];
  currency: 'PYG' | 'USD';
  onImport: (txs: ParsedCardTransaction[]) => void;
  importing: boolean;
}) {
  const [sel, setSel] = useState<Set<number>>(new Set(transactions.map((_, i) => i)));
  const allSel = sel.size === transactions.length;
  const toggle = (i: number) => setSel(p => { const s = new Set(p); s.has(i) ? s.delete(i) : s.add(i); return s; });
  const toggleAll = () => setSel(allSel ? new Set() : new Set(transactions.map((_, i) => i)));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">{transactions.length} transacciones · {sel.size} seleccionadas</p>
        <button onClick={() => onImport(transactions.filter((_, i) => sel.has(i)))}
          disabled={importing || sel.size === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg">
          {importing ? <RefreshCw size={11} className="animate-spin" /> : <ArrowDownRight size={11} />}
          Importar ({sel.size})
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-56 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
            <tr>
              <th className="px-2 py-2"><input type="checkbox" checked={allSel} onChange={toggleAll} className="rounded" /></th>
              <th className="px-2 py-2 text-left text-gray-500 font-medium">Fecha</th>
              <th className="px-2 py-2 text-left text-gray-500 font-medium">Descripción</th>
              <th className="px-2 py-2 text-center text-gray-500 font-medium">FIN</th>
              <th className="px-2 py-2 text-right text-gray-500 font-medium">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {transactions.map((tx, i) => (
              <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${sel.has(i) ? '' : 'opacity-40'}`}>
                <td className="px-2 py-1.5"><input type="checkbox" checked={sel.has(i)} onChange={() => toggle(i)} className="rounded" /></td>
                <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{fmtDate(tx.opDate)}</td>
                <td className="px-2 py-1.5 text-gray-800 dark:text-gray-200 max-w-[160px] truncate">{tx.description}</td>
                <td className="px-2 py-1.5 text-center">{tx.isFinanceable ? <span className="text-emerald-600 font-medium">S</span> : <span className="text-gray-400">N</span>}</td>
                <td className="px-2 py-1.5 text-right font-medium text-rose-600 dark:text-rose-400">{fmt(tx.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Card row ───────────────────────────────────────────────────────────────────

function CardRow({ card, pendingTxs, onEdit, onDelete }: {
  card: RegisteredCard;
  pendingTxs?: ParsedCardTransaction[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const parsedTxs = pendingTxs ?? [];
  const [importing, setImporting] = useState(false);

  const dueDate = card.due_date || (() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), card.due_day);
    if (d < now) d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-CA');
  })();
  const days = daysUntil(dueDate);

  const utilization = (card.credit_limit || 0) > 0 && (card.total_debt || 0) > 0
    ? Math.round(((card.total_debt || 0) / (card.credit_limit || 1)) * 100)
    : null;

  const handleImport = async (txs: ParsedCardTransaction[]) => {
    if (!user?.id || txs.length === 0) return;
    setImporting(true);
    try {
      const { data: curRows } = await supabase.from('currencies').select('id, code').eq('code', card.currency);
      const currencyId = curRows?.[0]?.id || null;
      const { data: catRows } = await supabase.from('categories').select('id, name').eq('user_id', user.id).ilike('name', '%tarjeta%');
      let categoryId = catRows?.[0]?.id || null;
      if (!categoryId) {
        const { data: newCat } = await supabase.from('categories').insert({ user_id: user.id, name: 'Tarjeta de crédito', type: 'expense' }).select('id').single();
        categoryId = newCat?.id || null;
      }
      const rows = txs.map(tx => ({
        user_id: user.id, date: tx.opDate || new Date().toLocaleDateString('en-CA'),
        amount: tx.amount, direction: 'expense' as const, concepto: tx.description,
        category_id: categoryId, currency_id: currencyId, comercio: card.name,
        notes: `Extracto ${card.bank}${tx.coupon ? ` · Cupón: ${tx.coupon}` : ''}`,
      }));
      const { error } = await supabase.from('transactions').insert(rows);
      if (error) throw error;
      toast.success(`${txs.length} transacciones importadas`);
    } catch (err: any) {
      toast.error(err.message || 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <div className="flex-shrink-0 w-12 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
          <CreditCard size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-800 dark:text-white truncate">{card.name}</p>
            {card.last_four && <span className="text-xs text-gray-400 font-mono shrink-0">••••{card.last_four}</span>}
          </div>
          <p className="text-xs text-gray-400">{card.bank}{(card.tan || 0) > 0 ? ` · TAN ${card.tan}%` : ''}</p>
        </div>
        {/* Due date */}
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold ${urgencyColor(days)}`}>{days < 0 ? 'VENCIDA' : days === 0 ? 'HOY' : `${days}d`}</p>
          <p className="text-[10px] text-gray-400">vence {fmtDate(dueDate)}</p>
        </div>
        {/* Min payment */}
        {(card.minimum_payment || 0) > 0 && (
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{fmt(card.minimum_payment!, card.currency)}</p>
            <p className="text-[10px] text-gray-400">pago mínimo</p>
          </div>
        )}
        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onEdit} title="Editar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Edit3 size={15} />
          </button>
          <button onClick={onDelete} title="Eliminar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={15} />
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Utilization bar */}
      {utilization !== null && (
        <div className="px-5 pb-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Utilización: {utilization}%</span>
            <span>{fmt(card.total_debt!, card.currency)} / {fmt(card.credit_limit, card.currency)}</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(utilization, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-4">
          {card.card_holder && (
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Titular: <strong className="text-gray-700 dark:text-gray-300">{card.card_holder}</strong></span>
              {card.statement_date && <span>Cierre: <strong>{fmtDate(card.statement_date)}</strong></span>}
              {card.credit_available != null && <span>Disponible: <strong className="text-emerald-600">{fmt(card.credit_available, card.currency)}</strong></span>}
            </div>
          )}
          <StatementSummaryPanel card={card} />
          {parsedTxs.length > 0 && (
            <TxImportTable transactions={parsedTxs} currency={card.currency} onImport={handleImport} importing={importing} />
          )}
          {parsedTxs.length === 0 && (card.total_debt || 0) > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5">
              <Info size={14} /> No se detectaron transacciones individuales en el extracto (resumen disponible arriba)
            </div>
          )}
          {!card.total_debt && !card.previous_debt && (
            <div className="text-center text-sm text-gray-400 py-4">
              <FileText size={28} className="mx-auto mb-2 text-gray-200 dark:text-gray-600" />
              Usá el importador de extracto de arriba para cargar los datos de este extracto
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PDF Import Module ──────────────────────────────────────────────────────────

function PdfImportModule({ cards, onStatementLoaded }: {
  cards: RegisteredCard[];
  onStatementLoaded: (cardId: string, summary: CardFinancialSummary, txs: ParsedCardTransaction[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedCardStatement | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = async (file: File) => {
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      toast.error('Seleccioná un archivo PDF');
      return;
    }
    setParsing(true);
    setParseError(null);
    setResult(null);
    try {
      const parsed = await parsePdfStatement(file);
      setResult(parsed);
      // Auto-select card that matches bank
      if (cards.length === 1) setSelectedCardId(cards[0].id);
      else {
        const match = cards.find(c => c.bank.toLowerCase().includes(parsed.summary.bank.toLowerCase()) || parsed.summary.bank.toLowerCase().includes(c.bank.toLowerCase()));
        if (match) setSelectedCardId(match.id);
      }
    } catch (err: any) {
      setParseError(err.message || 'Error al leer el PDF');
    } finally {
      setParsing(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleAssign = () => {
    if (!result || !selectedCardId) { toast.error('Seleccioná una tarjeta'); return; }
    onStatementLoaded(selectedCardId, result.summary, result.transactions);
    setResult(null);
    setSelectedCardId('');
    toast.success('Extracto asignado a la tarjeta');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <FileUp size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Importar extracto PDF</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">Ueno Bank, Itaú, Atlas Bank</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={parsing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors">
          {parsing ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
          {parsing ? 'Procesando...' : 'Seleccionar PDF'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
      </div>

      {/* Drop zone when no result */}
      {!result && !parsing && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`m-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600'
          }`}
        >
          <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Arrastrá un PDF de extracto o hacé clic para seleccionar</p>
          <p className="text-xs text-gray-400 mt-1">Extractos de Ueno Bank Mastercard, Itaú o Atlas Bank</p>
        </div>
      )}

      {/* Error */}
      {parseError && (
        <div className="mx-4 my-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5">
          <AlertCircle size={14} /> {parseError}
          <button onClick={() => setParseError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="p-4 space-y-4">
          {/* Detected info */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">{pdfFormatLabel(result.format)}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {result.summary.cardHolder && `${result.summary.cardHolder} · `}
                {result.summary.totalDebt > 0 ? `Deuda total: ${fmt(result.summary.totalDebt, result.summary.currency)}` : 'Extracto leído'}
                {result.transactions.length > 0 ? ` · ${result.transactions.length} transacciones` : ''}
              </p>
            </div>
            <button onClick={() => setResult(null)} className="p-1 text-gray-400 hover:text-gray-600 shrink-0"><X size={14} /></button>
          </div>

          {/* Assign to card */}
          {cards.length > 0 ? (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Asignar a tarjeta</label>
                <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccioná una tarjeta...</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.bank})</option>)}
                </select>
              </div>
              <button onClick={handleAssign} disabled={!selectedCardId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                Guardar en tarjeta
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5">
              <Info size={14} /> Primero registrá una tarjeta para asignarle este extracto
            </div>
          )}

          {/* Key numbers preview */}
          {result.summary.totalDebt > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Deuda total', value: fmt(result.summary.totalDebt, result.summary.currency), color: 'text-rose-600 dark:text-rose-400' },
                { label: 'Pago mínimo', value: fmt(result.summary.minimumPayment, result.summary.currency), color: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Gastos financieros', value: fmt(result.summary.totalFinancialCharges, result.summary.currency), color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Vencimiento', value: fmtDate(result.summary.dueDate), color: urgencyColor(daysUntil(result.summary.dueDate)) },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                  <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CreditCards() {
  const { user } = useAuthStore();
  const [cards, setCards] = useState<RegisteredCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<RegisteredCard | null>(null);

  // Load cards from Supabase
  const loadCards = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_credit_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error) setCards(data as RegisteredCard[] || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const handleSaveCard = async (form: Partial<RegisteredCard>) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      if (editingCard?.id) {
        const { error } = await supabase.from('user_credit_cards').update({ ...form, updated_at: new Date().toISOString() } as any).eq('id', editingCard.id).eq('user_id', user.id);
        if (error) throw error;
        toast.success('Tarjeta actualizada');
      } else {
        const { error } = await supabase.from('user_credit_cards').insert({ ...form, user_id: user.id } as any);
        if (error) throw error;
        toast.success('Tarjeta registrada');
      }
      setShowForm(false);
      setEditingCard(null);
      loadCards();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('¿Eliminar esta tarjeta y sus datos?')) return;
    const { error } = await supabase.from('user_credit_cards').delete().eq('id', id).eq('user_id', user!.id);
    if (error) { toast.error(error.message); return; }
    setCards(c => c.filter(x => x.id !== id));
    toast.success('Tarjeta eliminada');
  };

  const handleStatementLoaded = async (cardId: string, summary: CardFinancialSummary, txs: ParsedCardTransaction[]) => {
    if (!user?.id) return;
    // Update card in Supabase with statement snapshot
    const update = {
      statement_date: summary.statementDate || null,
      due_date: summary.dueDate || null,
      credit_available: summary.availableCredit || null,
      previous_debt: summary.previousDebt || 0,
      payments: summary.payments || 0,
      financed_balance: summary.financedBalance || 0,
      purchases_charges: summary.purchasesAndCharges || 0,
      total_debt: summary.totalDebt || 0,
      minimum_payment: summary.minimumPayment || 0,
      interest: summary.interest || 0,
      punitory: summary.punitory || 0,
      iva_on_charges: summary.ivaOnCharges || 0,
      total_financial_charges: summary.totalFinancialCharges || 0,
      days_in_default: summary.daysInDefault || 0,
      card_holder: summary.cardHolder || null,
      card_number_masked: summary.cardNumberMasked || null,
      // Update rates from PDF if we don't have them
      ...(summary.tan > 0 ? { tan: summary.tan } : {}),
      ...(summary.tae > 0 ? { tae: summary.tae } : {}),
      ...(summary.creditLimit > 0 ? { credit_limit: summary.creditLimit } : {}),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('user_credit_cards').update(update as any).eq('id', cardId).eq('user_id', user.id);
    if (error) { toast.error('Error al guardar extracto: ' + error.message); return; }
    loadCards();
    // Store txs in state for the card row to display
    setPendingTxs(p => ({ ...p, [cardId]: txs }));
  };

  const [pendingTxs, setPendingTxs] = useState<Record<string, ParsedCardTransaction[]>>({});

  // Sort by nearest due date
  const sortedCards = [...cards].sort((a, b) => {
    const nextDue = (c: RegisteredCard) => {
      if (c.due_date) return new Date(c.due_date).getTime();
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth(), c.due_day);
      if (d < now) d.setMonth(d.getMonth() + 1);
      return d.getTime();
    };
    return nextDue(a) - nextDue(b);
  });

  const totalMinimum = cards.reduce((s, c) => s + (c.minimum_payment || 0), 0);
  const totalDebt = cards.reduce((s, c) => s + (c.total_debt || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis tarjetas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Extractos, vencimientos e intereses</p>
        </div>
        <button onClick={() => { setEditingCard(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
          <Plus size={16} /> Nueva tarjeta
        </button>
      </div>

      {/* Summary bar */}
      {cards.length > 0 && (totalDebt > 0 || totalMinimum > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-200 dark:shadow-rose-900/30">
            <p className="text-rose-100 text-xs mb-1">Deuda total</p>
            <p className="text-lg font-bold">{fmt(totalDebt)}</p>
            <p className="text-rose-100 text-xs mt-0.5">{cards.filter(c => (c.total_debt || 0) > 0).length} tarjetas con saldo</p>
          </div>
          <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-200 dark:shadow-amber-900/30">
            <p className="text-amber-100 text-xs mb-1">Pago mínimo total</p>
            <p className="text-lg font-bold">{fmt(totalMinimum)}</p>
            <p className="text-amber-100 text-xs mt-0.5">Este período</p>
          </div>
          <div className="hidden sm:block rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tarjetas registradas</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{cards.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cards.filter(c => c.statement_date).length} con extracto cargado</p>
          </div>
        </div>
      )}

      {/* PDF Import Module — always visible */}
      <PdfImportModule cards={cards} onStatementLoaded={handleStatementLoaded} />

      {/* Card form */}
      {(showForm || editingCard) && (
        <CardForm
          initial={editingCard || undefined}
          onSave={handleSaveCard}
          onCancel={() => { setShowForm(false); setEditingCard(null); }}
          saving={saving}
        />
      )}

      {/* Cards list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse" />
          ))}
        </div>
      ) : sortedCards.length === 0 && !showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <CreditCard size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Sin tarjetas registradas</p>
          <p className="text-xs text-gray-400 mb-4">Registrá tus tarjetas para hacer seguimiento de vencimientos e intereses</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl">
            <Plus size={14} /> Registrar primera tarjeta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCards.map(card => (
            <CardRow
              key={card.id}
              card={card}
              pendingTxs={pendingTxs[card.id]}
              onEdit={() => { setEditingCard(card); setShowForm(false); }}
              onDelete={() => handleDeleteCard(card.id)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
