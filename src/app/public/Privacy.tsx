import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const ES = {
  title: 'Política de Privacidad',
  updated: 'Última actualización: abril 2026',
  sections: [
    {
      heading: '1. Quiénes somos',
      body: `Teko Cash es una aplicación de gestión financiera personal y familiar, desarrollada como software de código abierto (open source) bajo licencia MIT.
El proyecto es mantenido de forma comunitaria. Podés revisar el código fuente completo en GitHub.`,
    },
    {
      heading: '2. Qué datos recopilamos',
      body: `Recopilamos únicamente los datos que vos ingresás:
• Correo electrónico y contraseña para autenticación (gestionados por Supabase Auth).
• Nombre de perfil (opcional).
• Transacciones financieras: monto, fecha, categoría, descripción, método de pago.
• Presupuestos y límites que configurés.
• Métodos de pago personalizados.
• Grupos familiares y sus miembros (cuando usás esa función).

No recopilamos: datos bancarios, números de tarjeta, documentos de identidad ni geolocalización.`,
    },
    {
      heading: '3. Cómo usamos tus datos',
      body: `Tus datos se usan exclusivamente para:
• Mostrar tus finanzas dentro de la app.
• Sincronizar entre dispositivos (cuando iniciás sesión).
• Enviar notificaciones push si las activás (solo alertas de presupuesto).
• Generar reportes y estadísticas visibles únicamente para vos.

No vendemos, alquilamos ni compartimos tus datos con terceros para fines publicitarios.`,
    },
    {
      heading: '4. Almacenamiento y seguridad',
      body: `Tus datos se almacenan en servidores de Supabase (PostgreSQL), con las siguientes medidas de seguridad:
• Row Level Security (RLS): cada usuario solo accede a sus propios datos, a nivel de base de datos.
• Conexiones HTTPS/TLS en tránsito.
• Contraseñas hasheadas con bcrypt (nunca almacenamos contraseñas en texto plano).
• Los archivos importados (PDFs/imágenes) son procesados localmente en tu dispositivo cuando es posible.`,
    },
    {
      heading: '5. Suscripciones push',
      body: `Si activás las notificaciones push, almacenamos el endpoint de suscripción de tu navegador en nuestra base de datos. Este dato es técnico (no contiene información personal) y se usa únicamente para enviar alertas de presupuesto. Podés desactivar las notificaciones en cualquier momento desde Configuración → Notificaciones.`,
    },
    {
      heading: '6. Tus derechos',
      body: `Tenés derecho a:
• Acceder a todos tus datos (exportación completa en JSON desde Configuración → Mis datos).
• Eliminar tu cuenta y todos tus datos asociados (contactanos por GitHub Issues).
• Corregir datos incorrectos.
• Portabilidad de datos (formato JSON estándar disponible).

Para ejercer estos derechos, abrí un issue en nuestro repositorio de GitHub.`,
    },
    {
      heading: '7. Cookies y almacenamiento local',
      body: `Usamos:
• localStorage del navegador para guardar preferencias de notificaciones y estado de sesión.
• Cookies de sesión de Supabase Auth (necesarias para el funcionamiento).
• No usamos cookies de seguimiento ni herramientas de analítica de terceros.`,
    },
    {
      heading: '8. Servicios de terceros',
      body: `Teko Cash usa:
• Supabase (base de datos y autenticación) — Política de privacidad: supabase.com/privacy
• Netlify (hosting) — Política de privacidad: netlify.com/privacy

No integramos Google Analytics, Facebook Pixel ni ningún servicio de publicidad.`,
    },
    {
      heading: '9. Cambios a esta política',
      body: `Si realizamos cambios materiales a esta política, lo notificaremos dentro de la app. La versión vigente siempre estará disponible en esta página.`,
    },
    {
      heading: '10. Contacto',
      body: `Para consultas sobre privacidad, abrí un issue en: https://github.com/tekocash/teko-cash`,
    },
  ],
};

const EN = {
  title: 'Privacy Policy',
  updated: 'Last updated: April 2026',
  sections: [
    {
      heading: '1. Who we are',
      body: `Teko Cash is a personal and family financial management app, developed as open-source software under the MIT license. The project is community-maintained. You can review the full source code on GitHub.`,
    },
    {
      heading: '2. What data we collect',
      body: `We collect only the data you enter:
• Email and password for authentication (managed by Supabase Auth).
• Profile name (optional).
• Financial transactions: amount, date, category, description, payment method.
• Budgets and limits you configure.
• Custom payment methods.
• Family groups and members (when you use that feature).

We do NOT collect: banking credentials, card numbers, identity documents, or geolocation.`,
    },
    {
      heading: '3. How we use your data',
      body: `Your data is used solely to:
• Display your finances within the app.
• Sync across devices (when you log in).
• Send push notifications if you enable them (budget alerts only).
• Generate reports and statistics visible only to you.

We do not sell, rent, or share your data with third parties for advertising purposes.`,
    },
    {
      heading: '4. Storage and security',
      body: `Your data is stored on Supabase servers (PostgreSQL) with the following security measures:
• Row Level Security (RLS): each user only accesses their own data at the database level.
• HTTPS/TLS connections in transit.
• Passwords hashed with bcrypt (we never store plaintext passwords).
• Imported files (PDFs/images) are processed locally on your device when possible.`,
    },
    {
      heading: '5. Push subscriptions',
      body: `If you enable push notifications, we store your browser's push subscription endpoint in our database. This is a technical identifier (not personal information) used only to deliver budget alerts. You can disable notifications at any time from Settings → Notifications.`,
    },
    {
      heading: '6. Your rights',
      body: `You have the right to:
• Access all your data (full JSON export from Settings → My data).
• Delete your account and all associated data (open a GitHub Issue).
• Correct inaccurate data.
• Data portability (standard JSON format available).

To exercise these rights, open an issue in our GitHub repository.`,
    },
    {
      heading: '7. Cookies and local storage',
      body: `We use:
• Browser localStorage to save notification preferences and session state.
• Supabase Auth session cookies (required for functionality).
• We do NOT use tracking cookies or third-party analytics tools.`,
    },
    {
      heading: '8. Third-party services',
      body: `Teko Cash uses:
• Supabase (database and authentication) — Privacy policy: supabase.com/privacy
• Netlify (hosting) — Privacy policy: netlify.com/privacy

We do not integrate Google Analytics, Facebook Pixel, or any advertising service.`,
    },
    {
      heading: '9. Changes to this policy',
      body: `If we make material changes to this policy, we will notify you within the app. The current version will always be available on this page.`,
    },
    {
      heading: '10. Contact',
      body: `For privacy inquiries, open an issue at: https://github.com/tekocash/teko-cash`,
    },
  ],
};

export default function PrivacyPage() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const content = lang === 'es' ? ES : EN;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <ArrowLeft size={16} />
            Teko Cash
          </Link>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setLang('es')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${lang === 'es' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              ES
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${lang === 'en' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <Shield size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{content.title}</h1>
            <p className="text-sm text-gray-400">{content.updated}</p>
          </div>
        </div>

        <div className="space-y-8">
          {content.sections.map((s, i) => (
            <section key={i} className="space-y-3">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">{s.heading}</h2>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{s.body}</div>
            </section>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-sm text-gray-400">
          <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Inicio</Link>
          <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {lang === 'es' ? 'Términos y condiciones' : 'Terms of Service'}
          </Link>
        </div>
      </main>
    </div>
  );
}
