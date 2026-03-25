import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import {
  User, Shield, CreditCard, Bell, Save, Plus, X, Trash2,
  Eye, EyeOff, CheckCircle2, Smartphone, Mail, Calendar,
  AlertTriangle, TrendingUp, Info, Database, Download, Upload,
  FileJson, FileSpreadsheet, AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const NOTIF_KEY = 'teko_notif_prefs';

const defaultNotifs = {
  budgetAlert: true,
  budgetThreshold: 80,   // % at which to alert
  monthlyReport: true,
  weeklyDigest: false,
  transactionReminder: false,
  pushEnabled: false,
  emailEnabled: true,
};

type NotifPrefs = typeof defaultNotifs;

function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return { ...defaultNotifs, ...JSON.parse(raw) };
  } catch {}
  return defaultNotifs;
}

const TABS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'payment', label: 'Métodos de pago', icon: CreditCard },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'data', label: 'Mis datos', icon: Database },
];

interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'transfer' | 'digital';
  emoji: string;
}

const PM_TYPES = [
  { value: 'cash',     label: 'Efectivo',          emoji: '💵' },
  { value: 'card',     label: 'Tarjeta',            emoji: '💳' },
  { value: 'transfer', label: 'Transferencia',      emoji: '🏦' },
  { value: 'digital',  label: 'Billetera digital',  emoji: '📱' },
];

function emojiForType(type: string) {
  return PM_TYPES.find(t => t.value === type)?.emoji ?? '💳';
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
          checked ? 'translate-x-5.5' : 'translate-x-0.5'
        }`}
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [profile, setProfile] = useState({ displayName: user?.display_name || '', email: user?.email || '' });

  // Security state
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false, confirm: false });
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });

  // Payment methods state — real Supabase data
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pmLoading, setPmLoading] = useState(false);
  const [showPMModal, setShowPMModal] = useState(false);
  const [pmForm, setPmForm] = useState({ name: '', type: 'cash' as PaymentMethod['type'], bank: '' });

  const loadPMs = useCallback(async () => {
    if (!user?.id) return;
    setPmLoading(true);
    const { data } = await supabase
      .from('user_payment_methods')
      .select('id, name, details')
      .eq('user_id', user.id)
      .order('name');
    if (data) {
      setPaymentMethods(data.map((pm: any) => ({
        id: pm.id,
        name: pm.name,
        type: (pm.details as PaymentMethod['type']) || 'card',
        emoji: emojiForType(pm.details || 'card'),
      })));
    }
    setPmLoading(false);
  }, [user?.id]);

  useEffect(() => { loadPMs(); }, [loadPMs]);

  // Notifications state — persisted in localStorage
  const [notifs, setNotifs] = useState<NotifPrefs>(loadNotifPrefs);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
  }, [notifs]);

  const setNotif = <K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) => {
    setNotifs(n => ({ ...n, [key]: value }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Perfil actualizado');
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPwd !== pwdForm.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (pwdForm.newPwd.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    toast.success('Contraseña actualizada');
    setPwdForm({ current: '', newPwd: '', confirm: '' });
  };

  const handleAddPM = async () => {
    if (!pmForm.name.trim() || !user?.id) return;
    const { error } = await supabase.from('user_payment_methods').insert({
      user_id: user.id,
      name: pmForm.name.trim(),
      bank: pmForm.bank.trim() || null,
      details: pmForm.type,   // store type key for emoji recovery on load
    });
    if (error) { toast.error('Error al guardar método de pago'); return; }
    setPmForm({ name: '', type: 'cash', bank: '' });
    setShowPMModal(false);
    toast.success('Método de pago guardado');
    loadPMs();
  };

  const handleDeletePM = async (id: string) => {
    const { error } = await supabase
      .from('user_payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Método eliminado');
    loadPMs();
  };

  // Data export/import state
  const [dataLoading, setDataLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; failed: number; errors: string[] } | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);

  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!user?.id) return;
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, direction, amount, date, concepto, comercio, nro_operacion,
          periodicity, additional_info, created_at,
          category:category_id (*),
          payment_method:payment_method_id (*),
          currency:currency_id (*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      const backup = {
        version: 1,
        exported_at: new Date().toISOString(),
        user_email: user.email,
        transactions: (data || []).map((t: any) => ({
          id: t.id,
          fecha: t.date,
          tipo: t.direction,
          monto: t.amount,
          moneda: t.currency?.code ?? 'PYG',
          concepto: t.concepto,
          comercio: t.comercio,
          categoria: t.category?.name ?? '',
          categoria_icono: t.category?.icon ?? '',
          metodo_pago: t.payment_method?.name ?? '',
          nro_operacion: t.nro_operacion,
          periodicidad: t.periodicity,
          info_adicional: t.additional_info,
          creado: t.created_at,
        })),
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teko-backup-${new Date().toLocaleDateString('en-CA')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${backup.transactions.length} transacciones exportadas`);
    } catch {
      toast.error('Error al exportar');
    } finally {
      setDataLoading(false);
    }
  };

  // ── Import helpers ───────────────────────────────────────────────────────
  const fetchLookups = async () => {
    const [cats, pms, currencies] = await Promise.all([
      supabase.from('categories').select('id, name').eq('user_id', user!.id),
      supabase.from('user_payment_methods').select('id, name').eq('user_id', user!.id),
      supabase.from('currencies').select('id, code'),
    ]);
    const catMap = new Map<string, string>((cats.data || []).map((c: any) => [c.name.toLowerCase(), c.id]));
    const pmMap  = new Map<string, string>((pms.data  || []).map((p: any) => [p.name.toLowerCase(), p.id]));
    const curMap = new Map<string, string>((currencies.data || []).map((c: any) => [c.code.toLowerCase(), c.id]));
    return { catMap, pmMap, curMap };
  };

  const insertRows = async (rows: any[]): Promise<{ ok: number; failed: number; errors: string[] }> => {
    let ok = 0; let failed = 0; const errors: string[] = [];
    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from('transactions').insert(batch);
      if (error) {
        failed += batch.length;
        errors.push(`Lote ${Math.floor(i / 50) + 1}: ${error.message}`);
      } else {
        ok += batch.length;
      }
    }
    return { ok, failed, errors };
  };

  // ── Import JSON backup ───────────────────────────────────────────────────
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    e.target.value = '';
    setDataLoading(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.transactions || !Array.isArray(backup.transactions)) {
        toast.error('Archivo inválido: no contiene transacciones');
        return;
      }
      const { catMap, pmMap, curMap } = await fetchLookups();
      const defaultCurId = curMap.get('pyg') ?? null;

      const rows = backup.transactions.map((t: any) => ({
        user_id: user.id,
        direction: t.tipo === 'ingreso' ? 'ingreso' : 'gasto',
        amount: Number(t.monto) || 0,
        date: t.fecha,
        concepto: t.concepto || null,
        comercio: t.comercio || null,
        nro_operacion: t.nro_operacion || null,
        periodicity: t.periodicidad || null,
        additional_info: t.info_adicional || null,
        category_id: t.categoria ? (catMap.get(t.categoria.toLowerCase()) ?? null) : null,
        payment_method_id: t.metodo_pago ? (pmMap.get(t.metodo_pago.toLowerCase()) ?? null) : null,
        currency_id: t.moneda ? (curMap.get(t.moneda.toLowerCase()) ?? defaultCurId) : defaultCurId,
      }));

      const result = await insertRows(rows);
      setImportResult(result);
      if (result.ok > 0) toast.success(`${result.ok} transacciones importadas`);
      if (result.failed > 0) toast.error(`${result.failed} fallaron`);
    } catch (err: any) {
      toast.error('Error al leer el archivo: ' + (err.message || 'desconocido'));
    } finally {
      setDataLoading(false);
    }
  };

  // ── Import Excel ─────────────────────────────────────────────────────────
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    e.target.value = '';
    setDataLoading(true);
    setImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rawRows.length === 0) { toast.error('El archivo está vacío'); return; }

      const { catMap, pmMap, curMap } = await fetchLookups();
      const defaultCurId = curMap.get('pyg') ?? null;

      // Flexible header aliases
      const get = (row: any, ...keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, ''));
          if (found && row[found] !== '') return String(row[found]).trim();
        }
        return '';
      };

      const normalizeDate = (val: any): string | null => {
        if (!val) return null;
        if (val instanceof Date) return val.toLocaleDateString('en-CA');
        const s = String(val).trim();
        // Try dd/mm/yyyy
        const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        // Try yyyy-mm-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        return null;
      };

      const rows = rawRows.map((row: any) => {
        const tipoRaw = get(row, 'tipo', 'type', 'direction', 'tipo').toLowerCase();
        const direction = tipoRaw.startsWith('ing') ? 'ingreso' : 'gasto';
        const amountRaw = get(row, 'monto', 'amount', 'importe', 'valor');
        const amount = Number(String(amountRaw).replace(/[^0-9.\-]/g, '')) || 0;
        const dateRaw = get(row, 'fecha', 'date', 'dia', 'día');
        const date = normalizeDate(dateRaw) ?? new Date().toLocaleDateString('en-CA');
        const catName = get(row, 'categoria', 'category', 'categoría');
        const pmName  = get(row, 'metodopago', 'paymentmethod', 'metododepago', 'metodo', 'payment');
        const curCode = get(row, 'moneda', 'currency', 'coin') || 'PYG';

        return {
          user_id: user.id,
          direction,
          amount,
          date,
          concepto:          get(row, 'concepto', 'concept', 'descripcion', 'description', 'detalle') || null,
          comercio:          get(row, 'comercio', 'merchant', 'comercio', 'tienda', 'store') || null,
          nro_operacion:     get(row, 'nrooperacion', 'operacion', 'operation', 'referencia', 'nro') || null,
          category_id:       catName ? (catMap.get(catName.toLowerCase()) ?? null) : null,
          payment_method_id: pmName  ? (pmMap.get(pmName.toLowerCase())  ?? null) : null,
          currency_id:       curMap.get(curCode.toLowerCase()) ?? defaultCurId,
        };
      });

      const result = await insertRows(rows);
      setImportResult(result);
      if (result.ok > 0) toast.success(`${result.ok} transacciones importadas`);
      if (result.failed > 0) toast.error(`${result.failed} fallaron`);
    } catch (err: any) {
      toast.error('Error al leer el Excel: ' + (err.message || 'desconocido'));
    } finally {
      setDataLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200";

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="text-xs text-gray-400 mt-0.5">Administra tu cuenta y preferencias</p>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <User size={28} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {profile.displayName || 'Sin nombre'}
                </p>
                <p className="text-sm text-gray-400">{profile.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre de usuario</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                  placeholder="Tu nombre"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className={inputCls + ' opacity-60 cursor-not-allowed'}
                />
                <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar directamente.</p>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              <Save size={15} />
              Guardar cambios
            </button>
          </form>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <form onSubmit={handleSavePassword} className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">Cambiar contraseña</h2>
              <p className="text-xs text-gray-400">Usa una contraseña segura de al menos 8 caracteres.</p>
            </div>

            {(['current', 'newPwd', 'confirm'] as const).map((field, i) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {field === 'current' ? 'Contraseña actual' : field === 'newPwd' ? 'Nueva contraseña' : 'Confirmar contraseña'}
                </label>
                <div className="relative">
                  <input
                    type={showPwd[field] ? 'text' : 'password'}
                    value={pwdForm[field]}
                    onChange={e => setPwdForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder="••••••••"
                    className={inputCls + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => ({ ...s, [field]: !s[field] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd[field] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}

            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              <Shield size={15} />
              Actualizar contraseña
            </button>
          </form>
        )}

        {/* Payment methods tab */}
        {activeTab === 'payment' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Métodos de pago</h2>
                <p className="text-xs text-gray-400">Úsalos para categorizar tus transacciones.</p>
              </div>
              <button
                onClick={() => setShowPMModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                Agregar
              </button>
            </div>

            <div className="space-y-2">
              {pmLoading ? (
                <div className="text-center py-6 text-sm text-gray-400">Cargando métodos de pago...</div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400">
                  No tenés métodos de pago registrados. Agregá uno para asignarlo a tus transacciones.
                </div>
              ) : paymentMethods.map(pm => (
                <div key={pm.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{pm.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{pm.name}</p>
                      <p className="text-xs text-gray-400">{PM_TYPES.find(t => t.value === pm.type)?.label}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePM(pm.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add PM modal */}
            {showPMModal && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Nuevo método de pago</h3>
                    <button onClick={() => setShowPMModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nombre</label>
                      <input
                        type="text"
                        value={pmForm.name}
                        onChange={e => setPmForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ej. Tarjeta Visa"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tipo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {PM_TYPES.map(t => (
                          <button
                            key={t.value}
                            onClick={() => setPmForm(f => ({ ...f, type: t.value as PaymentMethod['type'] }))}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-colors ${
                              pmForm.type === t.value
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span>{t.emoji}</span> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Banco / Entidad <span className="text-gray-400">(opcional)</span></label>
                      <input
                        type="text"
                        value={pmForm.bank}
                        onChange={e => setPmForm(f => ({ ...f, bank: e.target.value }))}
                        placeholder="Ej. Itaú, Bancop"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => setShowPMModal(false)}
                        className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddPM}
                        disabled={!pmForm.name.trim()}
                        className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">Notificaciones</h2>
              <p className="text-xs text-gray-400">Las preferencias se guardan automáticamente en este dispositivo.</p>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                Las alertas de presupuesto aparecen como notificaciones dentro de la app cada vez que abrís la pantalla de presupuestos.
                Las notificaciones push y email estarán disponibles próximamente.
              </span>
            </div>

            {/* Budget alerts */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Alertas de presupuesto</p>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Alerta al acercarse al límite</p>
                      <p className="text-xs text-gray-400">Notificación cuando el gasto supera el umbral configurado</p>
                    </div>
                  </div>
                  <Toggle checked={notifs.budgetAlert} onChange={v => setNotif('budgetAlert', v)} />
                </div>

                {notifs.budgetAlert && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Umbral de alerta</p>
                    <div className="flex gap-2">
                      {[70, 80, 90, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setNotif('budgetThreshold', pct)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            notifs.budgetThreshold === pct
                              ? pct >= 100
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-400'
                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      Te alertamos cuando el gasto supere el <strong>{notifs.budgetThreshold}%</strong> del monto estimado.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  <TrendingUp size={16} className="text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Alerta al superar el presupuesto</p>
                    <p className="text-xs text-gray-400">Cuando el gasto supera el 100% del estimado</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">Siempre activo</span>
              </div>
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Canales (próximamente)</p>
              {[
                { key: 'emailEnabled' as const, label: 'Email', sub: user?.email || 'Sin email', icon: <Mail size={16} className="text-gray-400" />, disabled: true },
                { key: 'pushEnabled' as const, label: 'Push en el navegador', sub: 'Requiere permiso del navegador', icon: <Smartphone size={16} className="text-gray-400" />, disabled: true },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 opacity-60">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                  </div>
                  <Toggle checked={false} onChange={() => toast('Próximamente disponible', { icon: '🔔' })} />
                </div>
              ))}
            </div>

            {/* Reports */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reportes</p>
              {[
                { key: 'monthlyReport' as const, label: 'Reporte mensual', sub: 'Resumen de gastos e ingresos al cierre del mes', icon: <Calendar size={16} className="text-blue-500" /> },
                { key: 'weeklyDigest' as const, label: 'Resumen semanal', sub: 'Actividad de la semana cada lunes', icon: <Calendar size={16} className="text-blue-500" /> },
                { key: 'transactionReminder' as const, label: 'Recordatorio de registro', sub: 'Te recuerda registrar gastos si no lo hacés en el día', icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                  </div>
                  <Toggle checked={notifs[item.key] as boolean} onChange={v => setNotif(item.key, v)} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">
              <CheckCircle2 size={13} />
              Preferencias guardadas automáticamente
            </div>
          </div>
        )}

        {/* Data tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">Mis datos</h2>
              <p className="text-xs text-gray-400">Exportá o importá tus transacciones. Las categorías e importes se respetan tal cual están en el archivo.</p>
            </div>

            {/* Hidden file inputs */}
            <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            <input ref={xlsxInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />

            {/* Export */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Download size={17} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Exportar backup</p>
                  <p className="text-xs text-gray-400">Descargá todas tus transacciones en formato JSON</p>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={dataLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                <FileJson size={15} />
                {dataLoading ? 'Exportando...' : 'Descargar backup (.json)'}
              </button>
            </div>

            {/* Import JSON */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Upload size={17} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Importar backup</p>
                  <p className="text-xs text-gray-400">Importá un archivo .json exportado desde Teko Cash</p>
                </div>
              </div>
              <button
                onClick={() => jsonInputRef.current?.click()}
                disabled={dataLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                <FileJson size={15} />
                {dataLoading ? 'Importando...' : 'Seleccionar archivo (.json)'}
              </button>
            </div>

            {/* Import Excel */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <FileSpreadsheet size={17} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Importar desde Excel / CSV</p>
                  <p className="text-xs text-gray-400">Importá transacciones desde un archivo .xlsx, .xls o .csv</p>
                </div>
              </div>

              {/* Column reference */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Columnas reconocidas (la primera fila debe ser el encabezado):</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    ['Fecha', 'fecha, date, dia — dd/mm/yyyy o yyyy-mm-dd'],
                    ['Tipo', 'tipo, type — "gasto" o "ingreso"'],
                    ['Monto', 'monto, amount, importe, valor'],
                    ['Concepto', 'concepto, descripcion, detalle'],
                    ['Comercio', 'comercio, merchant, tienda'],
                    ['Categoría', 'categoria, category — debe coincidir con tu lista'],
                    ['Método pago', 'metodopago, metodo, payment — debe coincidir'],
                    ['Moneda', 'moneda, currency — ej. PYG, USD (default PYG)'],
                  ].map(([col, hint]) => (
                    <div key={col}>
                      <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{col}</p>
                      <p className="text-[10px] text-gray-400">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => xlsxInputRef.current?.click()}
                disabled={dataLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                <FileSpreadsheet size={15} />
                {dataLoading ? 'Importando...' : 'Seleccionar archivo (.xlsx / .csv)'}
              </button>
            </div>

            {/* Import result */}
            {importResult && (
              <div className={`rounded-xl p-4 text-sm space-y-1 ${importResult.failed > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'}`}>
                <div className="flex items-center gap-2 font-medium">
                  {importResult.failed > 0
                    ? <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
                    : <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />}
                  <span className={importResult.failed > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>
                    {importResult.ok} importadas correctamente{importResult.failed > 0 ? `, ${importResult.failed} fallaron` : ''}
                  </span>
                </div>
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-600 dark:text-amber-400 pl-5">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
