import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import {
  DollarSign, PieChart, Users, Shield, Download, Bell,
  CalendarDays, Smartphone, Globe, Github, ArrowRight,
  CheckCircle, TrendingUp, FileText, Zap,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <DollarSign className="w-6 h-6 text-indigo-500" />,
    title: 'Control total de gastos',
    desc: 'Registrá ingresos y gastos con categorías personalizadas, múltiples monedas y métodos de pago.',
  },
  {
    icon: <PieChart className="w-6 h-6 text-emerald-500" />,
    title: 'Presupuestos inteligentes',
    desc: 'Definí límites por categoría, recibí alertas antes de superarlos y automatizá la renovación mensual.',
  },
  {
    icon: <CalendarDays className="w-6 h-6 text-blue-500" />,
    title: 'Vista calendario',
    desc: 'Visualizá tus movimientos día a día. Planeá pagos futuros y analizá tu flujo de caja.',
  },
  {
    icon: <Users className="w-6 h-6 text-purple-500" />,
    title: 'Grupos familiares',
    desc: 'Compartí presupuestos y gastos con tu familia. Cada miembro ve lo que le corresponde.',
  },
  {
    icon: <Bell className="w-6 h-6 text-amber-500" />,
    title: 'Notificaciones push',
    desc: 'Alertas en tiempo real cuando superás un umbral de presupuesto, incluso con la app cerrada.',
  },
  {
    icon: <FileText className="w-6 h-6 text-rose-500" />,
    title: 'Importación de extractos',
    desc: 'Importá extractos PDF de tu banco (Atlas, Itaú y más). OCR automático con detección de duplicados.',
  },
  {
    icon: <Shield className="w-6 h-6 text-slate-500" />,
    title: 'Tus datos, siempre tuyos',
    desc: 'Open source y transparente. Exportá o importá todo en JSON o Excel en cualquier momento.',
  },
  {
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    title: 'Rápido y offline',
    desc: 'PWA instalable en tu celular. Funciona incluso sin conexión y sincroniza cuando volvés a estar en línea.',
  },
];

const PRICING = [
  { label: 'Registro de transacciones', free: true },
  { label: 'Presupuestos ilimitados', free: true },
  { label: 'Vista calendario', free: true },
  { label: 'Grupos familiares', free: true },
  { label: 'Importación de extractos bancarios', free: true },
  { label: 'Notificaciones push', free: true },
  { label: 'Exportación JSON / Excel', free: true },
  { label: 'Multi-moneda (PYG, USD, etc.)', free: true },
  { label: 'Acceso al código fuente', free: true },
];

export default function LandingPage() {
  const { session } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true });
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Teko Cash</span>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Características</a>
            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Precios</a>
            <Link to="/tutorial" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tutorial</Link>
            <a href="#opensource" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Open Source</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Ingresar
            </Link>
            <Link
              to="/register"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950 pt-20 pb-24 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Globe size={12} />
            100% gratuito · Open Source
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
            Manejá tus finanzas<br className="hidden sm:block" />{' '}
            <span className="text-indigo-600 dark:text-indigo-400">sin pagar un guaraní</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Teko Cash es la app de presupuesto personal y familiar, gratuita, open source y hecha en Paraguay.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/register"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              Crear cuenta gratis
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="text-xs text-gray-400">O también podes instalarte una versión 100% tuya localmente desde el repositorio oficial.</p>
        </div>

        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-100 dark:bg-indigo-900/20 blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-emerald-100 dark:bg-emerald-900/20 blur-3xl opacity-40 pointer-events-none" />
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Comenza a visibilizar tus gastos.</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Proba nuestra versión beta con los siguientes features:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm mb-3 border border-gray-100 dark:border-gray-700">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 bg-indigo-50 dark:bg-gray-900">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Un solo plan. Gratis.</h2>
            <p className="text-gray-500 dark:text-gray-400">Sin tier de pago. Sin funciones bloqueadas. Sin publicidad.</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-100 dark:border-indigo-900 shadow-xl p-8 text-left">
            <div className="flex items-end gap-2 mb-6">
              <span className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400">₲0</span>
              <span className="text-gray-400 mb-1">/ mes</span>
            </div>
            <ul className="space-y-3 mb-8">
              {PRICING.map((p, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  {p.label}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
            >
              Empezar ahora
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Open Source ──────────────────────────────────────────────────── */}
      <section id="opensource" className="py-20 px-4 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">100% Open Source</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Teko Cash es software libre. Podés revisar el código, contribuir mejoras y saber exactamente
            cómo se manejan tus datos. Sin cajas negras.
          </p>
          <div className="flex flex-wrap gap-3 justify-center text-sm">
            {['React + Vite', 'TypeScript', 'Supabase', 'Tailwind CSS', 'Licencia MIT'].map(t => (
              <span key={t} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">{t}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href="https://github.com/tekocash/teko-cash"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <Github size={16} />
              Ver en GitHub
            </a>
            <a
              href="/privacy"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <Shield size={16} />
              Política de privacidad
            </a>
          </div>
        </div>
      </section>


      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-indigo-600 dark:bg-indigo-700">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-3xl font-bold text-white">Empezá a controlar tus finanzas hoy</h2>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-colors shadow-lg"
          >
            <Smartphone size={18} />
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Teko Cash</span>
            <span>·</span>
            <span>Hecho en Paraguay</span>
            <TrendingUp size={14} className="text-indigo-400" />
          </div>
          <nav className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacidad</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Términos</Link>
            <a href="https://github.com/tekocash/teko-cash" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              <Github size={14} />
              GitHub
            </a>
          </nav>
          <span>© {new Date().getFullYear()} · Licencia MIT</span>
        </div>
      </footer>
    </div>
  );
}
