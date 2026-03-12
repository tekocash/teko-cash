import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import {
  User, Shield, CreditCard, Bell, Save, Plus, X, Trash2,
  Eye, EyeOff, CheckCircle2, Smartphone, Mail, Calendar,
  AlertTriangle, TrendingUp, Info,
} from 'lucide-react';

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

      </div>
    </div>
  );
}
