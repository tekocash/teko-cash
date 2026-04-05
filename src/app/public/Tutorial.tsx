import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, DollarSign, PieChart, CalendarDays,
  Bell, Users, FileText, Download, CheckCircle, ChevronDown, ChevronRight,
  Smartphone, Plus, Tag, Shield,
} from 'lucide-react';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  tips: string[];
  action?: { label: string; to: string };
}

const STEPS: Step[] = [
  {
    icon: <Shield size={24} className="text-indigo-500" />,
    title: 'Crea tu cuenta',
    description:
      'Registrate con tu email y contraseña. Todo queda guardado en tu cuenta — podés acceder desde cualquier dispositivo.',
    tips: [
      'Usá una contraseña de al menos 8 caracteres.',
      'Podés cambiarla en cualquier momento desde Configuración → Seguridad.',
      'Tu email nunca se comparte con terceros.',
    ],
    action: { label: 'Crear cuenta gratis', to: '/register' },
  },
  {
    icon: <Tag size={24} className="text-purple-500" />,
    title: 'Configurá tus categorías',
    description:
      'Las categorías te permiten clasificar tus gastos e ingresos. Teko Cash viene con categorías predeterminadas, pero podés crear las tuyas.',
    tips: [
      'Andá a Categorías desde el menú lateral.',
      'Podés asignar un emoji y color a cada categoría.',
      'Creá subcategorías para mayor detalle (ej: Comida → Delivery).',
      'Las categorías pueden ser de tipo "Gasto" o "Ingreso".',
    ],
    action: { label: 'Ir a categorías', to: '/categories' },
  },
  {
    icon: <DollarSign size={24} className="text-emerald-500" />,
    title: 'Registrá tu primer movimiento',
    description:
      'Anotá tus gastos e ingresos al momento de realizarlos. Cuanto más consistente seas, más útil se vuelve la app.',
    tips: [
      'Usá el botón + del centro en mobile o el botón "Crear" en desktop.',
      'Completá: monto, fecha, categoría y una descripción breve.',
      'Podés asignar un método de pago (efectivo, tarjeta, transferencia).',
      'El campo "Comercio" es opcional — útil para filtrar después.',
    ],
    action: { label: 'Registrar gasto', to: '/transactions?action=new&type=expense' },
  },
  {
    icon: <PieChart size={24} className="text-blue-500" />,
    title: 'Creá un presupuesto',
    description:
      'Los presupuestos te ponen un límite de gasto por categoría o concepto. La app te avisa cuando estás por superarlo.',
    tips: [
      'Andá a Presupuestos → botón +.',
      'Elegí el nombre, monto estimado y el período (mensual, semanal, anual).',
      'Activá "Repetir" para que se renueve automáticamente cada mes.',
      'Las alertas se disparan al 80% y al 100% por defecto (configurable).',
    ],
    action: { label: 'Crear presupuesto', to: '/budgets' },
  },
  {
    icon: <Bell size={24} className="text-amber-500" />,
    title: 'Activá las notificaciones',
    description:
      'Recibí alertas cuando estés por superar un presupuesto, incluso con la app cerrada.',
    tips: [
      'Andá a Configuración → Notificaciones.',
      'Activá "Push en el navegador" y aceptá el permiso cuando el browser te lo pida.',
      'Ajustá el umbral de alerta (70%, 80%, 90% o 100%).',
      'Las notificaciones funcionan incluso si el navegador está en segundo plano.',
    ],
    action: { label: 'Configurar notificaciones', to: '/settings?tab=notifications' },
  },
  {
    icon: <CalendarDays size={24} className="text-teal-500" />,
    title: 'Usá la vista Calendario',
    description:
      'Visualizá tus movimientos día a día. Identificá fácilmente en qué días gastaste más o recibiste ingresos.',
    tips: [
      'Accedé desde el menú lateral → Calendario.',
      'Puntos rojos = días con gastos. Puntos verdes = días con ingresos.',
      'Hacé click en cualquier día para ver el detalle de movimientos.',
      'El resumen mensual muestra ingresos, gastos y balance del mes.',
    ],
    action: { label: 'Abrir calendario', to: '/calendar' },
  },
  {
    icon: <Users size={24} className="text-rose-500" />,
    title: 'Invite a tu familia',
    description:
      'Compartí presupuestos y gastos con los miembros de tu hogar. Cada uno ve solo lo que le corresponde.',
    tips: [
      'Andá a Grupos Familiares → crear grupo.',
      'Compartí el código de invitación con tu familia.',
      'El dueño del grupo puede ver todos los gastos del grupo.',
      'Los miembros ven sus propios gastos y los compartidos.',
    ],
    action: { label: 'Crear grupo familiar', to: '/family' },
  },
  {
    icon: <FileText size={24} className="text-orange-500" />,
    title: 'Importá tu extracto bancario',
    description:
      'No tenés que cargar todo a mano. Descargá el extracto de tu banco y subilo — Teko Cash detecta automáticamente los movimientos.',
    tips: [
      'Andá a Configuración → Mis datos → Importar extracto bancario.',
      'Soporta Atlas Bank, Itaú y formatos genéricos (PDF, XLS, XLSX, CSV).',
      'Antes de confirmar, podés revisar y editar cada transacción.',
      'Los duplicados se detectan automáticamente.',
    ],
    action: { label: 'Ir a Mis datos', to: '/settings?tab=data' },
  },
  {
    icon: <Download size={24} className="text-slate-500" />,
    title: 'Instalá la app en tu teléfono',
    description:
      'Teko Cash es una PWA — se puede instalar como app nativa en Android e iOS sin pasar por ninguna tienda.',
    tips: [
      'En Chrome/Android: menú (⋮) → "Agregar a pantalla de inicio".',
      'En Safari/iOS: compartir (□↑) → "Agregar a pantalla de inicio".',
      'La app funciona offline y sincroniza cuando volvés a conectarte.',
      'Recibís notificaciones push igual que una app nativa.',
    ],
  },
];

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: '¿Teko Cash es realmente gratis?',
    a: 'Sí, 100% gratuito y open source. No hay plan de pago, no hay funciones bloqueadas, no hay publicidad. El código fuente es público en GitHub.',
  },
  {
    q: '¿Mis datos financieros están seguros?',
    a: 'Si decidiste usar nuestra opción gratuita publicada en lugar de instalación local, guardamos tus datos en nuestra cuenta de Supabase con Row Level Security. Recomendamos instalación propia para un control inclusive mayor.',
  },
  {
    q: '¿Puedo usar Teko Cash sin conexión a internet?',
    a: 'La app es una PWA que funciona parcialmente offline. Podés ver tus datos ya cargados, pero para guardar nuevos movimientos o sincronizar necesitás conexión.',
  },
  {
    q: '¿Cómo conecto mi cuenta bancaria?',
    a: 'Teko Cash no se conecta directamente a cuentas bancarias (eso requeriría compartir credenciales). En cambio, podés importar extractos en PDF, XLS o CSV desde tu banco — sin compartir contraseñas.',
  },
  {
    q: '¿Puedo exportar mis datos?',
    a: 'Sí. Desde Configuración → Mis datos podés exportar todas tus transacciones en formato JSON o Excel en cualquier momento. Tus datos son tuyos.',
  },
  {
    q: '¿Qué hago si un presupuesto no me funciona?',
    a: 'Podés editarlo o eliminarlo en cualquier momento desde la pantalla de Presupuestos. Si configuraste repetición automática, podés desactivarla cambiando "Repetir" a "No repetir".',
  },
  {
    q: '¿Las notificaciones push funcionan en iOS?',
    a: 'Sí, desde iOS 16.4+ con Safari. Tenés que instalar la app en la pantalla de inicio primero. En iPhones más viejos o navegadores diferentes puede no funcionar.',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function TutorialPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <ArrowLeft size={16} />
            Teko Cash
          </Link>
          <Link
            to="/register"
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            Empezar gratis
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-12 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Smartphone size={12} />
            Guía de inicio rápido
          </span>
          <h1 className="text-3xl font-bold">Cómo usar Teko Cash</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            En menos de 10 minutos tenés tu app de finanzas configurada y funcionando.
          </p>
        </div>

        {/* Steps layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">

          {/* Step list sidebar */}
          <div className="space-y-1">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  activeStep === i
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  activeStep === i
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {i + 1}
                </span>
                <span className="text-sm font-medium truncate">{s.title}</span>
              </button>
            ))}
          </div>

          {/* Step detail */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5">
              {/* Step header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm shrink-0">
                  {STEPS[activeStep].icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    Paso {activeStep + 1} de {STEPS.length}
                  </p>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{STEPS[activeStep].title}</h2>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{STEPS[activeStep].description}</p>

              {/* Tips */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Consejos</p>
                <ul className="space-y-2">
                  {STEPS[activeStep].tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between pt-2">
                {STEPS[activeStep].action ? (
                  <Link
                    to={STEPS[activeStep].action!.to}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                  >
                    {STEPS[activeStep].action!.label}
                    <ArrowRight size={14} />
                  </Link>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveStep(i => Math.max(0, i - 1))}
                    disabled={activeStep === 0}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setActiveStep(i => Math.min(STEPS.length - 1, i + 1))}
                    disabled={activeStep === STEPS.length - 1}
                    className="px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === activeStep ? 'bg-indigo-600 w-5' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">Preguntas frecuentes</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-50 dark:border-gray-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center space-y-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">¿Listo para empezar?</h3>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
          >
            Crear mi cuenta
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 mt-8 flex flex-wrap gap-4 text-sm text-gray-400 justify-center">
          <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Inicio</Link>
          <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacidad</Link>
          <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Términos</Link>
        </div>
      </main>
    </div>
  );
}
