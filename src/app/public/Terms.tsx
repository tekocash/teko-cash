import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

const ES = {
  title: 'Términos y Condiciones',
  updated: 'Última actualización: abril 2026',
  sections: [
    {
      heading: '1. Aceptación de los términos',
      body: `Al crear una cuenta o usar Teko Cash, aceptás estos términos. Si no estás de acuerdo, no uses la aplicación.`,
    },
    {
      heading: '2. Descripción del servicio',
      body: `Teko Cash es una aplicación gratuita y de código abierto para gestión financiera personal y familiar. Proporcionamos herramientas para:
• Registrar transacciones financieras.
• Gestionar presupuestos.
• Visualizar informes financieros.
• Compartir finanzas en grupos familiares.
• Importar extractos bancarios.`,
    },
    {
      heading: '3. Cuentas de usuario',
      body: `Sos responsable de:
• Mantener la confidencialidad de tu contraseña.
• Toda actividad que ocurra bajo tu cuenta.
• Usar una dirección de email válida y activa.
• No compartir tu cuenta con terceros.

Podemos suspender cuentas que violen estos términos sin previo aviso.`,
    },
    {
      heading: '4. Uso aceptable',
      body: `Queda prohibido:
• Usar la app para actividades ilegales o fraudulentas.
• Intentar acceder a datos de otros usuarios.
• Realizar ataques de denegación de servicio o exploits.
• Usar la app para almacenar datos de terceros sin su consentimiento.
• Hacer ingeniería inversa con fines maliciosos (el código es open source, el reverse engineering para contribuir está permitido).`,
    },
    {
      heading: '5. Propiedad intelectual',
      body: `Teko Cash se distribuye bajo licencia MIT. Eso significa:
• Podés usar, copiar, modificar y distribuir el código libremente.
• Debés mantener el aviso de copyright original.
• Podés usarlo para fines comerciales.
• No existe garantía de ningún tipo.

Tus datos financieros son de tu exclusiva propiedad. No reclamamos derechos sobre ellos.`,
    },
    {
      heading: '6. Disponibilidad del servicio',
      body: `Proveemos el servicio "tal cual" (as-is). No garantizamos:
• Disponibilidad continua del servicio (puede haber mantenimientos).
• Ausencia de errores o bugs.
• Que el servicio estará disponible indefinidamente.

Te recomendamos exportar tus datos regularmente como medida de precaución.`,
    },
    {
      heading: '7. Limitación de responsabilidad',
      body: `Hasta el máximo permitido por la ley:
• No somos responsables por pérdidas financieras derivadas del uso de la app.
• No somos responsables por decisiones financieras tomadas basadas en los datos mostrados.
• No somos responsables por interrupciones del servicio.
• La responsabilidad total no puede exceder lo que pagaste por el servicio (que es $0).`,
    },
    {
      heading: '8. Modificaciones',
      body: `Podemos modificar estos términos en cualquier momento. Los cambios significativos serán comunicados dentro de la app. El uso continuado después de la notificación implica aceptación.`,
    },
    {
      heading: '9. Terminación',
      body: `Podés eliminar tu cuenta en cualquier momento contactándonos por GitHub Issues. Al eliminar tu cuenta, todos tus datos serán eliminados de nuestros servidores dentro de los 30 días.`,
    },
    {
      heading: '10. Ley aplicable',
      body: `Estos términos se rigen por las leyes de la República del Paraguay. Cualquier disputa se resolverá en los tribunales competentes de Asunción, Paraguay.`,
    },
    {
      heading: '11. Contacto',
      body: `Para consultas sobre estos términos: https://github.com/tekocash/teko-cash (Issues)`,
    },
  ],
};

const EN = {
  title: 'Terms of Service',
  updated: 'Last updated: April 2026',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      body: `By creating an account or using Teko Cash, you agree to these terms. If you do not agree, please do not use the application.`,
    },
    {
      heading: '2. Service Description',
      body: `Teko Cash is a free, open-source application for personal and family financial management. We provide tools to:
• Record financial transactions.
• Manage budgets.
• View financial reports.
• Share finances in family groups.
• Import bank statements.`,
    },
    {
      heading: '3. User Accounts',
      body: `You are responsible for:
• Maintaining the confidentiality of your password.
• All activity that occurs under your account.
• Using a valid and active email address.
• Not sharing your account with third parties.

We may suspend accounts that violate these terms without prior notice.`,
    },
    {
      heading: '4. Acceptable Use',
      body: `The following are prohibited:
• Using the app for illegal or fraudulent activities.
• Attempting to access other users' data.
• Conducting denial-of-service attacks or exploits.
• Using the app to store third-party data without their consent.
• Reverse engineering for malicious purposes (the code is open source; reverse engineering to contribute is permitted).`,
    },
    {
      heading: '5. Intellectual Property',
      body: `Teko Cash is distributed under the MIT license. This means:
• You can freely use, copy, modify, and distribute the code.
• You must retain the original copyright notice.
• You can use it for commercial purposes.
• There is no warranty of any kind.

Your financial data is your exclusive property. We make no claims on it.`,
    },
    {
      heading: '6. Service Availability',
      body: `We provide the service "as-is." We do not guarantee:
• Continuous availability of the service (maintenance may occur).
• Absence of errors or bugs.
• That the service will be available indefinitely.

We recommend exporting your data regularly as a precaution.`,
    },
    {
      heading: '7. Limitation of Liability',
      body: `To the maximum extent permitted by law:
• We are not responsible for financial losses resulting from use of the app.
• We are not responsible for financial decisions made based on the data displayed.
• We are not responsible for service interruptions.
• Total liability cannot exceed what you paid for the service (which is $0).`,
    },
    {
      heading: '8. Modifications',
      body: `We may modify these terms at any time. Significant changes will be communicated within the app. Continued use after notification implies acceptance.`,
    },
    {
      heading: '9. Termination',
      body: `You can delete your account at any time by contacting us via GitHub Issues. Upon account deletion, all your data will be removed from our servers within 30 days.`,
    },
    {
      heading: '10. Governing Law',
      body: `These terms are governed by the laws of the Republic of Paraguay. Any disputes shall be resolved in the competent courts of Asunción, Paraguay.`,
    },
    {
      heading: '11. Contact',
      body: `For inquiries about these terms: https://github.com/tekocash/teko-cash (Issues)`,
    },
  ],
};

export default function TermsPage() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const content = lang === 'es' ? ES : EN;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
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
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <FileText size={20} className="text-blue-600 dark:text-blue-400" />
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
          <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {lang === 'es' ? 'Política de privacidad' : 'Privacy Policy'}
          </Link>
        </div>
      </main>
    </div>
  );
}
