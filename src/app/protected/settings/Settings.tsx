import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import {
  User, Shield, CreditCard, Bell, Save, Plus, X, Trash2,
  Eye, EyeOff, CheckCircle2, Smartphone, Mail, Calendar,
  AlertTriangle, TrendingUp, Info, Database, Download, Upload,
  FileJson, FileSpreadsheet, AlertCircle, ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  parseForPreview, importSelected, detectFormat, formatLabel,
  type BankFormat, type ImportResult, type PreviewRow,
} from '@/features/transactions/service/bank-importer';
import {
  isPushSupported, getPermissionState, requestPermission,
  subscribeToPush, unsubscribeFromPush, isSubscribed,
} from '@/lib/notifications/push';

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
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full overflow-hidden transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    return TABS.some(t => t.id === tab) ? tab! : 'profile';
  });

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

  // Push notification state
  const [pushSupported] = useState(isPushSupported);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getPermissionState);
  const [pushLoading, setPushLoading] = useState(false);

  // Sync pushEnabled pref with actual subscription state on mount
  useEffect(() => {
    if (!pushSupported || !user?.id) return;
    isSubscribed().then(subscribed => {
      if (notifs.pushEnabled !== subscribed) {
        setNotif('pushEnabled', subscribed);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushSupported, user?.id]);

  const handleTogglePush = async (enable: boolean) => {
    if (!user?.id) return;
    setPushLoading(true);
    try {
      if (enable) {
        const permission = await requestPermission();
        setPushPermission(permission);
        if (permission !== 'granted') {
          toast.error('Permiso denegado. Habilitá las notificaciones en la configuración del navegador.');
          return;
        }
        const sub = await subscribeToPush(user.id);
        if (sub) {
          setNotif('pushEnabled', true);
          toast.success('Notificaciones push activadas');
        } else {
          toast.error('No se pudo activar. Verificá que la app esté en HTTPS.');
        }
      } else {
        await unsubscribeFromPush(user.id);
        setNotif('pushEnabled', false);
        toast.success('Notificaciones push desactivadas');
      }
    } catch (err) {
      toast.error('Error al configurar notificaciones push');
    } finally {
      setPushLoading(false);
    }
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

  // Smart bank importer state
  const bankInputRef = useRef<HTMLInputElement>(null);
  const [bankFormat, setBankFormat] = useState<BankFormat | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankProgress, setBankProgress] = useState<{ pct: number; msg: string } | null>(null);
  const [bankResult, setBankResult] = useState<ImportResult | null>(null);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  // Preview table state
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewFormat, setPreviewFormat] = useState<BankFormat>('generic');
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'dup'>('all');
  const PREVIEW_PAGE_SIZE = 50;
  // Category and budget options for preview table inline editing
  const [previewCategories, setPreviewCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [previewBudgetList, setPreviewBudgetList] = useState<{ id: string; name: string }[]>([]);

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

  // ── Smart bank file selection → parse + show preview table ──────────────
  const handleBankFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (bankInputRef.current) bankInputRef.current.value = '';
    setBankResult(null);
    setBankLoading(true);
    setBankProgress({ pct: 0, msg: 'Leyendo archivo...' });
    try {
      const { format, rows } = await parseForPreview(file, user.id, (pct, msg) => setBankProgress({ pct, msg }));
      setPreviewFormat(format);
      setBankFormat(format);
      setPreviewRows(rows);
      setPreviewPage(0);
      setPreviewFilter('all');
      if (rows.length === 0) { toast.error('No se encontraron transacciones en el archivo.'); return; }
      // Load categories and budgets for inline editing
      Promise.all([
        supabase.from('categories').select('id, name, category_type').eq('user_id', user!.id),
        supabase.from('budgets').select('id, name').eq('user_id', user!.id).order('name'),
      ]).then(([cats, budgets]) => {
        if (cats.data) setPreviewCategories(cats.data.map((c: any) => ({ id: c.id, name: c.name, type: c.category_type })));
        if (budgets.data) setPreviewBudgetList(budgets.data.map((b: any) => ({ id: b.id, name: b.name })));
      });
      setShowPreview(true);
    } catch (err: any) {
      toast.error('Error al leer el archivo: ' + (err.message || 'desconocido'));
    } finally {
      setBankLoading(false);
      setBankProgress(null);
    }
  };

  const handleConfirmImport = async () => {
    const selected = previewRows.filter(r => r.selected);
    if (selected.length === 0) { toast.error('No hay transacciones seleccionadas'); return; }
    if (!user?.id) return;
    setShowPreview(false);
    setBankLoading(true);
    setBankProgress({ pct: 0, msg: 'Iniciando importación...' });
    try {
      const lookups = await fetchLookups();
      const result = await importSelected(
        selected, user.id, lookups, previewFormat,
        (pct, msg) => setBankProgress({ pct, msg })
      );
      setBankResult(result);
      localStorage.setItem('teko_last_import_analysis', JSON.stringify({
        savedAt: new Date().toISOString(),
        analysis: result.analysis,
        format: result.format,
      }));
      if (result.ok > 0) toast.success(`${result.ok} transacciones importadas`);
      if (result.failed > 0) toast.error(`${result.failed} fallaron`);
    } catch (err: any) {
      toast.error('Error al importar: ' + (err.message || 'desconocido'));
    } finally {
      setBankLoading(false);
      setBankProgress(null);
    }
  };

  const togglePreviewRow = (id: string) => {
    setPreviewRows(rows => rows.map(r => r.previewId === id ? { ...r, selected: !r.selected } : r));
  };
  const toggleAllPreview = (val: boolean) => {
    setPreviewRows(rows => rows.map(r => ({ ...r, selected: val })));
  };
  const selectOnlyNew = () => {
    setPreviewRows(rows => rows.map(r => ({ ...r, selected: !r.isDuplicate })));
  };

  const updateRowCategory = (previewId: string, catName: string) => {
    const cat = previewCategories.find(c => c.name === catName);
    setPreviewRows(rows => rows.map(r =>
      r.previewId === previewId
        ? { ...r, suggestedCategory: catName || null, suggestedCategoryType: (cat?.type as 'income' | 'expense') ?? (r.direction === 'income' ? 'income' : 'expense') }
        : r
    ));
  };

  const updateRowBudget = (previewId: string, budgetId: string) => {
    setPreviewRows(rows => rows.map(r =>
      r.previewId === previewId ? { ...r, budgetId: budgetId || null } : r
    ));
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
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Canales</p>

              {/* Email — coming soon */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 opacity-60">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
                    <p className="text-xs text-gray-400">{user?.email || 'Sin email'} · próximamente</p>
                  </div>
                </div>
                <Toggle checked={false} onChange={() => toast('Email disponible próximamente', { icon: '📧' })} />
              </div>

              {/* Web Push — real implementation */}
              <div className={`flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 ${!pushSupported ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <Smartphone size={16} className={notifs.pushEnabled ? 'text-indigo-500' : 'text-gray-400'} />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Push en el navegador
                      {pushLoading && <span className="ml-2 text-xs text-gray-400">Cargando…</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {!pushSupported
                        ? 'Tu navegador no soporta notificaciones push'
                        : pushPermission === 'denied'
                          ? 'Permiso bloqueado — habilitalo en ajustes del navegador'
                          : notifs.pushEnabled
                            ? 'Recibirás alertas aunque la app esté cerrada'
                            : 'Activa para recibir alertas en este dispositivo'}
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={notifs.pushEnabled}
                  onChange={handleTogglePush}
                />
              </div>
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

            {/* Smart bank importer */}
            <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-900/10 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Database size={17} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Importar extracto bancario</p>
                  <p className="text-xs text-gray-400">Detecta el formato · Atlas Bank, Itaú Tarjeta, Itaú Ahorro · Revisás antes de confirmar</p>
                </div>
              </div>

              <input ref={bankInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBankFileChange} />

              <button
                onClick={() => bankInputRef.current?.click()}
                disabled={bankLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-300 dark:border-violet-700 bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-300 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50"
              >
                <Upload size={14} />
                {bankLoading ? 'Procesando...' : 'Seleccionar archivo (.xlsx / .xls)'}
              </button>

              {bankLoading && bankProgress && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{bankProgress.msg}</span><span>{bankProgress.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${bankProgress.pct}%` }} />
                  </div>
                </div>
              )}

              {/* Results */}
              {bankResult && (() => {
                const a = bankResult.analysis;
                const fmtA = (n: number, cur = 'PYG') => cur === 'USD'
                  ? `$${n.toLocaleString('es-PY', { maximumFractionDigits: 2 })}`
                  : new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);
                return (
                  <div className="space-y-3">
                    <div className="rounded-xl p-4 text-sm space-y-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-emerald-700 dark:text-emerald-300">
                          {bankResult.ok} importadas{bankResult.failed > 0 ? ` · ${bankResult.failed} fallaron` : ''}
                        </span>
                      </div>
                      {bankResult.newCategoriesCreated.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Categorías creadas: {bankResult.newCategoriesCreated.map(c => <span key={c} className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full px-2 py-0.5 mr-1 mb-0.5">{c}</span>)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setAnalysisExpanded(x => !x)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span>📊 Análisis financiero del extracto</span>
                      <ChevronDown size={15} className={`transition-transform ${analysisExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {analysisExpanded && (
                      <div className="rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                        <div className="grid grid-cols-3">
                          {[['Ingresos', fmtA(a.totalIncome), 'text-emerald-600 dark:text-emerald-400'], ['Gastos', fmtA(a.totalExpenses), 'text-red-500 dark:text-red-400'], ['Balance', fmtA(a.netBalance), a.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400']].map(([l, v, cls]) => (
                            <div key={l as string} className="p-3 text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{l}</p>
                              <p className={`text-xs font-bold mt-0.5 ${cls}`}>{v}</p>
                            </div>
                          ))}
                        </div>
                        {a.dateRange.from && <div className="px-4 py-2 text-xs text-gray-400">{a.dateRange.from} → {a.dateRange.to} · {a.transactionCount} transacciones</div>}
                        {a.topCategories.length > 0 && (
                          <div className="p-4 space-y-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Top categorías</p>
                            {a.topCategories.map(c => (
                              <div key={c.name} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 dark:text-gray-300 w-36 truncate">{c.name}</span>
                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.min(100, (c.total / a.topCategories[0].total) * 100)}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 shrink-0">{fmtA(c.total)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {a.recurringExpenses.length > 0 && (
                          <div className="p-4 space-y-1.5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Gastos recurrentes</p>
                            {a.recurringExpenses.slice(0, 5).map(r => (
                              <div key={r.description} className="flex justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-300 truncate max-w-[180px]">{r.description}</span>
                                <span className="text-gray-400 shrink-0 ml-2">{r.occurrences}× · {fmtA(r.avgAmount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {a.monthlyTrend.length > 1 && (
                          <div className="p-4 space-y-1.5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Por mes</p>
                            {a.monthlyTrend.map(m => (
                              <div key={m.month} className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400 w-16">{m.month}</span>
                                <span className="text-emerald-600 dark:text-emerald-400">↑{fmtA(m.incomes)}</span>
                                <span className="text-red-500 ml-auto">↓{fmtA(m.expenses)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Preview modal */}
            {showPreview && (() => {
              const fmtPrev = (n: number, cur = 'PYG') => cur === 'USD'
                ? `$${n.toFixed(2)}`
                : new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n);
              const filtered = previewFilter === 'new' ? previewRows.filter(r => !r.isDuplicate)
                : previewFilter === 'dup' ? previewRows.filter(r => r.isDuplicate)
                : previewRows;
              const totalPages = Math.ceil(filtered.length / PREVIEW_PAGE_SIZE);
              const pageRows = filtered.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE);
              const selectedCount = previewRows.filter(r => r.selected).length;
              const dupCount = previewRows.filter(r => r.isDuplicate).length;
              const newCount = previewRows.length - dupCount;

              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
                  <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          Revisar transacciones — {formatLabel(previewFormat)}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {previewRows.length} totales · <span className="text-emerald-600 dark:text-emerald-400">{newCount} nuevas</span> · <span className="text-amber-500">{dupCount} posibles duplicadas</span>
                        </p>
                      </div>
                      <button onClick={() => setShowPreview(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
                    </div>

                    {/* Filters + bulk actions */}
                    <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                      {(['all', 'new', 'dup'] as const).map(f => (
                        <button key={f} onClick={() => { setPreviewFilter(f); setPreviewPage(0); }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${previewFilter === f ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                          {f === 'all' ? `Todas (${previewRows.length})` : f === 'new' ? `Nuevas (${newCount})` : `Duplicadas (${dupCount})`}
                        </button>
                      ))}
                      <div className="ml-auto flex gap-2">
                        <button onClick={() => toggleAllPreview(true)} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">Seleccionar todas</button>
                        <button onClick={selectOnlyNew} className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50">Solo nuevas</button>
                        <button onClick={() => toggleAllPreview(false)} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">Deseleccionar</button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-auto flex-1">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900/60">
                          <tr>
                            <th className="px-3 py-2 text-left w-8">
                              <input type="checkbox"
                                checked={previewRows.every(r => r.selected)}
                                onChange={e => toggleAllPreview(e.target.checked)}
                                className="rounded"
                              />
                            </th>
                            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Fecha</th>
                            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                            <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 font-medium">Monto</th>
                            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Descripción</th>
                            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Categoría</th>
                            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Presupuesto</th>
                            <th className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 font-medium">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                          {pageRows.map(row => (
                            <tr key={row.previewId}
                              onClick={() => togglePreviewRow(row.previewId)}
                              className={`cursor-pointer transition-colors ${row.selected ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-900/20 opacity-60'} hover:bg-violet-50/30 dark:hover:bg-violet-900/10`}
                            >
                              <td className="px-3 py-2">
                                <input type="checkbox" checked={row.selected} onChange={() => togglePreviewRow(row.previewId)} onClick={e => e.stopPropagation()} className="rounded" />
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.date}</td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${row.direction === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                  {row.direction === 'income' ? 'Ingreso' : 'Gasto'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                {fmtPrev(row.amount, row.currency)} {row.currency !== 'PYG' && <span className="text-gray-400 text-[10px]">{row.currency}</span>}
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{row.description}</td>
                              <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                                {(() => {
                                  const existsInList = !!previewCategories.find(
                                    c => c.name.toLowerCase() === (row.suggestedCategory ?? '').toLowerCase()
                                  );
                                  const isNewSuggestion = !!row.suggestedCategory && !existsInList;
                                  return (
                                    <select
                                      value={row.suggestedCategory ?? ''}
                                      onChange={e => updateRowCategory(row.previewId, e.target.value)}
                                      className={`w-full text-[11px] px-1.5 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                        isNewSuggestion
                                          ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                                      }`}
                                    >
                                      <option value="">— Sin categoría —</option>
                                      {isNewSuggestion && (
                                        <option value={row.suggestedCategory!}>✨ Crear: {row.suggestedCategory}</option>
                                      )}
                                      {previewCategories.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                      ))}
                                    </select>
                                  );
                                })()}
                              </td>
                              <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                                <select
                                  value={row.budgetId ?? ''}
                                  onChange={e => updateRowBudget(row.previewId, e.target.value)}
                                  className="w-full text-[11px] px-1.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="">— Sin presupuesto —</option>
                                  {previewBudgetList.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {row.isDuplicate
                                  ? <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Duplicada</span>
                                  : <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">Nueva</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination + confirm */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs disabled:opacity-40">‹ Anterior</button>
                        <span className="text-xs text-gray-400">Página {previewPage + 1}/{Math.max(1, totalPages)}</span>
                        <button onClick={() => setPreviewPage(p => Math.min(totalPages - 1, p + 1))} disabled={previewPage >= totalPages - 1}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs disabled:opacity-40">Siguiente ›</button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{selectedCount} seleccionadas</span>
                        <button onClick={handleConfirmImport} disabled={selectedCount === 0}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-medium transition-colors">
                          <FileSpreadsheet size={14} />
                          Importar {selectedCount > 0 ? selectedCount : ''} transacciones
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

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
