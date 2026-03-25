import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBudgets, PERIOD_PRESETS, RepeatFrequency } from '@/features/budgets/hooks/useBudgets';
import { toast } from 'react-hot-toast';
import { Plus, X, AlertTriangle, TrendingUp, Trash2, RefreshCw, Wallet, Info, Repeat, Pencil } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

function barStyle(spent: number, planned: number) {
  if (planned <= 0) return { width: 0, color: 'bg-gray-300' };
  const raw = (spent / planned) * 100;
  if (raw >= 100) return { width: 100, color: 'bg-red-500' };
  if (raw >= 80)  return { width: raw,  color: 'bg-amber-500' };
  return { width: raw, color: 'bg-emerald-500' };
}

function badgeClass(spent: number, planned: number) {
  const p = planned > 0 ? spent / planned : 0;
  if (p >= 1)   return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  if (p >= 0.8) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
  return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
}

const PERIODICITY_LABEL: Record<string, string> = {
  mensual: 'Mensual', anual: 'Anual', otro: 'Semanal', ocasional: 'Ocasional', trimestral: 'Trimestral',
};

const REPEAT_LABEL: Record<RepeatFrequency, string> = {
  none: 'No repetir', mensual: 'Repetir mensualmente', semanal: 'Repetir semanalmente', anual: 'Repetir anualmente',
};

// Quick-preset suggestions for common budget names + amounts (PYG)
const BUDGET_PRESETS = [
  { emoji: '🛒', name: 'Supermercado',   amount: 500_000  },
  { emoji: '🚗', name: 'Combustible',    amount: 300_000  },
  { emoji: '🍽️', name: 'Salidas/Comida', amount: 200_000  },
  { emoji: '🏠', name: 'Hogar',          amount: 800_000  },
  { emoji: '💊', name: 'Salud',          amount: 200_000  },
  { emoji: '🎬', name: 'Entretenimiento',amount: 150_000  },
  { emoji: '📱', name: 'Tecnología',     amount: 300_000  },
  { emoji: '✈️', name: 'Viajes',         amount: 1_000_000 },
];

const now = new Date();

export default function BudgetsPage() {
  const { budgets, isLoading, error, reload, createBudget, deleteBudget, updateBudget, totalBudgeted, totalSpent } = useBudgets();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    emoji: '💰',
    name: '',
    amount: '',
    presetIdx: 0,
    start_date: PERIOD_PRESETS[0].start,
    end_date: PERIOD_PRESETS[0].end,
    repeat_frequency: 'none' as RepeatFrequency,
  });

  // Close modal on ESC
  useEffect(() => {
    if (!showModal && !deleteConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (deleteConfirm) { setDeleteConfirm(null); return; }
      setShowModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal, deleteConfirm]);

  const handlePreset = (idx: number) => {
    setForm(f => ({
      ...f,
      presetIdx: idx,
      start_date: PERIOD_PRESETS[idx]?.start ?? f.start_date,
      end_date: PERIOD_PRESETS[idx]?.end ?? f.end_date,
      // Auto-match repeat_frequency to period preset
      repeat_frequency: idx === 0 ? 'mensual' : idx === 1 ? 'semanal' : idx === 2 ? 'anual' : f.repeat_frequency,
    }));
  };

  const applyBudgetPreset = (p: typeof BUDGET_PRESETS[0]) => {
    setForm(f => ({ ...f, emoji: p.emoji, name: p.name, amount: String(p.amount) }));
  };

  const openModal = () => {
    setEditingBudgetId(null);
    setForm({ emoji: '💰', name: '', amount: '', presetIdx: 0, start_date: PERIOD_PRESETS[0].start, end_date: PERIOD_PRESETS[0].end, repeat_frequency: 'mensual' });
    setShowModal(true);
  };

  const openEdit = (budget: typeof budgets[0]) => {
    // Try to split emoji from name (first char may be emoji)
    const parts = budget.name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*(.*)$/u);
    const emoji = parts ? parts[1] : '💰';
    const name = parts ? parts[2] : budget.name;
    const presetIdx = PERIOD_PRESETS.findIndex(p => p.start === budget.start_date && p.end === budget.end_date);
    setEditingBudgetId(budget.id);
    setForm({
      emoji,
      name,
      amount: String(budget.planned_amount),
      presetIdx: presetIdx >= 0 ? presetIdx : 0,
      start_date: budget.start_date,
      end_date: budget.end_date,
      repeat_frequency: budget.repeat_frequency,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    const input = {
      name: `${form.emoji} ${form.name.trim()}`,
      planned_amount: Number(form.amount),
      periodicity: PERIOD_PRESETS[form.presetIdx]?.value ?? 'mensual',
      repeat_frequency: form.repeat_frequency,
      start_date: form.start_date,
      end_date: form.end_date,
    };
    const { error: err } = editingBudgetId
      ? await updateBudget(editingBudgetId, input)
      : await createBudget(input);
    setSaving(false);
    if (err) toast.error(editingBudgetId ? 'Error al actualizar' : 'Error al crear presupuesto');
    else {
      toast.success(editingBudgetId ? 'Presupuesto actualizado' : 'Presupuesto creado');
      setShowModal(false);
      setEditingBudgetId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const { error: err } = await deleteBudget(deleteConfirm.id);
    setDeleting(false);
    setDeleteConfirm(null);
    if (err) toast.error('Error al eliminar');
    else toast.success('Presupuesto eliminado');
  };

  const overallPct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Presupuestos</h1>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">
            {format(now, "MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} disabled={isLoading}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
            <Plus size={15} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-4 py-3 text-xs text-indigo-700 dark:text-indigo-300">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Los presupuestos son <strong>estimativos de gasto</strong>. Asignale un gasto al registrar una transacción.
          Podés configurarlos para que <strong>se repitan automáticamente</strong> cada mes, semana o año.
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Summary */}
      {!isLoading && totalBudgeted > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Estimado',   value: fmt(totalBudgeted), color: 'text-gray-800 dark:text-white' },
              { label: 'Gastado',    value: fmt(totalSpent),    color: totalSpent > totalBudgeted ? 'text-red-600' : 'text-gray-800 dark:text-white' },
              { label: 'Disponible', value: fmt(Math.max(totalBudgeted - totalSpent, 0)), color: totalBudgeted - totalSpent < 0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400' },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                <p className="text-xs text-gray-400 font-medium mb-1">{c.label}</p>
                <p className={`text-base font-bold truncate ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gasto total del mes</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass(totalSpent, totalBudgeted)}`}>
                {overallPct}%
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${barStyle(totalSpent, totalBudgeted).color}`}
                style={{ width: `${barStyle(totalSpent, totalBudgeted).width}%` }} />
            </div>
            {totalSpent > totalBudgeted && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <AlertTriangle size={11} /> Excedido por {fmt(totalSpent - totalBudgeted)}
              </p>
            )}
          </div>
        </>
      )}

      {/* Budget list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3 w-32 bg-gray-100 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-2 w-20 bg-gray-100 dark:bg-gray-700 rounded" />
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full" />
            </div>
          ))
        ) : budgets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <Wallet size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-1">Sin presupuestos</h3>
            <p className="text-sm text-gray-400 mb-5">Creá un presupuesto para estimar cuánto querés gastar.</p>
            <button onClick={openModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
              <Plus size={14} /> Crear presupuesto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {budgets.map(budget => {
              const { width, color } = barStyle(budget.spent, budget.planned_amount);
              const pct = budget.planned_amount > 0 ? Math.round((budget.spent / budget.planned_amount) * 100) : 0;
              const remaining = budget.planned_amount - budget.spent;
              const isOver = remaining < 0;
              const isWarn = !isOver && pct >= 80;

              return (
                <div key={budget.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border shadow-sm ${
                    isOver ? 'border-red-200 dark:border-red-800' : isWarn ? 'border-amber-200 dark:border-amber-800' : 'border-gray-100 dark:border-gray-700'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{budget.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {budget.periodicity && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                            {PERIODICITY_LABEL[budget.periodicity] ?? budget.periodicity}
                          </span>
                        )}
                        {budget.repeat_frequency !== 'none' && (
                          <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Repeat size={9} /> Auto
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {budget.start_date} → {budget.end_date}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass(budget.spent, budget.planned_amount)}`}>
                        {pct}%
                      </span>
                      <button
                        onClick={() => openEdit(budget)}
                        className="p-1 rounded-lg text-gray-300 hover:text-indigo-500 dark:text-gray-600 dark:hover:text-indigo-400 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ id: budget.id, name: budget.name })}
                        className="p-1 rounded-lg text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${width}%` }} />
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      Gastado: <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(budget.spent)}</span>
                    </span>
                    {isOver ? (
                      <span className="flex items-center gap-0.5 text-red-500 font-semibold">
                        <TrendingUp size={11} /> Excedido {fmt(Math.abs(remaining))}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">{fmt(remaining)} restante</span>
                    )}
                    <span className="text-gray-400">Est. {fmt(budget.planned_amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-2">Eliminar presupuesto</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              ¿Eliminar <strong>"{deleteConfirm.name}"</strong>? Las transacciones asignadas no se borran.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirmed} disabled={deleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                {deleting && <RefreshCw size={13} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingBudgetId ? 'Editar presupuesto' : 'Nuevo presupuesto'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Estimá cuánto querés gastar en este período</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Quick presets */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Sugerencias rápidas</label>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGET_PRESETS.map(p => (
                    <button key={p.name} onClick={() => applyBudgetPreset(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                        form.name === p.name
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300'
                      }`}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Combustible, Hogar, Salidas"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Monto estimado (₲) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Ej. 500000"
                  min="1"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
                />
                {form.amount && Number(form.amount) > 0 && (
                  <p className="text-xs text-indigo-500 mt-1">{fmt(Number(form.amount))}</p>
                )}
              </div>

              {/* Period */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Período</label>
                <div className="flex gap-2 mb-2">
                  {PERIOD_PRESETS.map((p, i) => (
                    <button key={i} onClick={() => handlePreset(i)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.presetIdx === i
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                  <button onClick={() => setForm(f => ({ ...f, presetIdx: -1 }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.presetIdx === -1
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>
                    Personalizado
                  </button>
                </div>

                {form.presetIdx === -1 ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-400 mb-1">Desde</label>
                      <input type="date" value={form.start_date}
                        onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-400 mb-1">Hasta</label>
                      <input type="date" value={form.end_date}
                        onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-300" />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                    {form.start_date} → {form.end_date}
                  </p>
                )}
              </div>

              {/* Repeat frequency */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <Repeat size={11} className="inline mr-1" />
                  Repetición automática
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['none', 'mensual', 'semanal', 'anual'] as RepeatFrequency[]).map(freq => (
                    <button key={freq} onClick={() => setForm(f => ({ ...f, repeat_frequency: freq }))}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors text-left ${
                        form.repeat_frequency === freq
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}>
                      {freq === 'none' ? '🚫 Sin repetir' : freq === 'mensual' ? '📅 Mensual' : freq === 'semanal' ? '🗓️ Semanal' : '📆 Anual'}
                    </button>
                  ))}
                </div>
                {form.repeat_frequency !== 'none' && (
                  <p className="text-[10px] text-indigo-500 mt-1.5">
                    Al terminar el período, se creará automáticamente el siguiente.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancelar
                </button>
                <button onClick={handleSave}
                  disabled={!form.name.trim() || !form.amount || saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-2">
                  {saving && <RefreshCw size={13} className="animate-spin" />}
                  {saving ? 'Guardando...' : editingBudgetId ? 'Guardar cambios' : 'Crear presupuesto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
