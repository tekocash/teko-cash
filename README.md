# Teko Cash

> **[English](#english) | [Español](#español)**

---

<a name="english"></a>
## English

A personal finance web app built for Paraguay — track income and expenses, manage budgets, import bank statements (Excel or PDF), get browser push notifications, and analyze your finances with interactive charts.

**Stack:** React 18 · Vite 6 · TypeScript · Supabase · Tailwind CSS · Chart.js

### Features

- **Transactions** — record income and expenses, filter by period or custom date range, paginated list and analytics view
- **Budgets** — set monthly limits per category with visual progress bars
- **Categories** — full CRUD with type (income/expense)
- **Credit cards** — register cards, link PDF statements (Ueno Bank, Itaú, Atlas Bank), track balance, due dates, interest rates
- **Bank statement importer** — upload XLS/XLSX from Atlas Bank, Itaú, or generic format; intelligent duplicate detection, auto-categorization, bulk insert
- **PDF extractor** — parse credit card PDF statements, preview transactions with editable categories/budgets before importing
- **Evolution charts** — stacked bar by category, income vs expenses, savings/balance trend
- **Calendar view** — `/calendar` route shows all transactions per day with color-coded dots and a monthly summary panel
- **Push notifications** — real Web Push API notifications; alerts fire even when the app is closed; activate from Settings → Notifications
- **Family accounts** — link family members and view shared finances
- **Backup & restore** — export/import your data as JSON
- **Multi-currency** — PYG, USD, BRL, ARS and more, with thousands-separator formatting
- **Dark mode** — full dark/light theme
- **PWA** — installable on mobile and desktop, full offline-ready Progressive Web App
- **Landing page** — public marketing page at `/`, no login required
- **Privacy Policy** — `/privacy` with ES/EN toggle
- **Terms of Service** — `/terms` with ES/EN toggle
- **Tutorial** — `/tutorial` step-by-step guide (9 steps + FAQ)

### Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 6 + TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password) |
| Charts | Chart.js + react-chartjs-2 |
| Push notifications | Web Push API + VAPID |
| PDF parsing | pdfjs-dist v5 (local worker via Vite `?url`) |
| Excel parsing | xlsx (SheetJS) |
| Notifications | react-hot-toast |

### Getting started

#### Prerequisites

- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) project

#### 1. Clone

```bash
git clone https://github.com/tekocash/teko-cash.git
cd teko-cash
npm install
```

#### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials (Supabase keys are in **Supabase dashboard → Settings → API**):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key-here
```

#### 3. Set up the database

Run `supabase/INSTALL.sql` in the **Supabase SQL Editor** — it is a single file that sets up everything (tables, RLS policies, triggers, seed data).

#### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

#### 5. Build for production

```bash
npm run build
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for Web Push notifications |

> For Netlify: also accepts `VITE_PUBLIC_SUPABASE_URL` / `VITE_PUBLIC_SUPABASE_ANON_KEY`.

### VAPID keys setup (push notifications)

Push notifications require a VAPID key pair. Generate one with:

```bash
npx web-push generate-vapid-keys
```

This outputs a public key and a private key. Set the **public key** as `VITE_VAPID_PUBLIC_KEY` in your `.env` (and in your Netlify/hosting environment variables). The **private key** goes in your Supabase Edge Function secrets — it is never exposed to the browser.

If you do not configure VAPID keys, the app works fine but push notifications will be unavailable.

### Self-hosted / Bring Your Own Supabase

By default, Teko Cash connects to the shared Supabase backend maintained by the Teko Cash team.

Users who want **full data ownership** can connect the app to their own Supabase project:

1. Create a free project at [supabase.com](https://supabase.com).
2. Run `supabase/INSTALL.sql` in your project's SQL Editor.
3. Generate VAPID keys (see above) if you want push notifications.
4. In the app, go to **Settings → Data Connection** and enter your Supabase project URL and anon key.

The app will immediately switch to your personal database. This is ideal for privacy-conscious users who want their financial data to live exclusively in their own infrastructure.

### Supported bank statement formats

| Bank | Format | Import type |
|------|--------|-------------|
| Atlas Bank | XLS (savings account) | Bank importer |
| Itaú Paraguay | XLS (savings/checking) | Bank importer |
| Ueno Bank Mastercard | PDF (credit card statement) | PDF importer |
| Itaú | PDF (credit card statement) | PDF importer |
| Atlas Bank | PDF (credit card statement) | PDF importer |

### Contributing

Pull requests are welcome. For major changes please open an issue first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit your changes
4. Open a pull request against `main`

### License

[MIT](LICENSE)

---

<a name="español"></a>
## Español

Aplicación web de finanzas personales pensada para Paraguay — registrá ingresos y gastos, gestioná presupuestos, importá extractos bancarios (Excel o PDF), recibí notificaciones push en el navegador y analizá tus finanzas con gráficas interactivas.

**Stack:** React 18 · Vite 6 · TypeScript · Supabase · Tailwind CSS · Chart.js

### Funcionalidades

- **Transacciones** — registrá ingresos y gastos, filtrá por período o rango de fechas, vista de lista y de análisis con paginado
- **Presupuestos** — establecé límites mensuales por categoría con barras de progreso visuales
- **Categorías** — CRUD completo con tipo (ingreso/gasto)
- **Tarjetas de crédito** — registrá tus tarjetas, vinculá extractos PDF (Ueno Bank, Itaú, Atlas Bank), seguí saldo, vencimiento y tasas de interés
- **Importador de extractos bancarios** — cargá XLS/XLSX de Atlas Bank, Itaú o formato genérico; detección inteligente de duplicados, auto-categorización, inserción en lotes
- **Extractor PDF** — parseá extractos PDF de tarjetas de crédito, revisá las transacciones con categorías y presupuestos editables antes de importar
- **Gráficas de evolución** — barra apilada por categoría, ingresos vs gastos, tendencia de ahorro/saldo
- **Vista de calendario** — ruta `/calendar`, muestra todas las transacciones del día con puntos de colores y un panel de resumen mensual
- **Notificaciones push** — notificaciones reales vía Web Push API; las alertas llegan aunque la app esté cerrada; activalas desde Configuración → Notificaciones
- **Cuentas familiares** — vinculá integrantes del hogar y visualizá finanzas compartidas
- **Backup y restauración** — exportá e importá tus datos como JSON
- **Multimoneda** — PYG, USD, BRL, ARS y más, con separador de miles
- **Modo oscuro** — tema claro/oscuro completo
- **PWA** — instalable en móvil y escritorio, Progressive Web App con soporte offline
- **Landing page** — página pública de marketing en `/`, sin necesidad de login
- **Política de Privacidad** — `/privacy` con toggle ES/EN
- **Términos de Servicio** — `/terms` con toggle ES/EN
- **Tutorial** — `/tutorial` guía paso a paso (9 pasos + FAQ)

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 6 + TypeScript |
| Routing | React Router v7 |
| Estilos | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Row Level Security) |
| Autenticación | Supabase Auth (email/contraseña) |
| Gráficas | Chart.js + react-chartjs-2 |
| Notificaciones push | Web Push API + VAPID |
| Parsing PDF | pdfjs-dist v5 (worker local vía Vite `?url`) |
| Parsing Excel | xlsx (SheetJS) |
| Notificaciones | react-hot-toast |

### Cómo empezar

#### Requisitos previos

- Node.js 20+ y npm
- Un proyecto gratuito en [Supabase](https://supabase.com)

#### 1. Clonar el repositorio

```bash
git clone https://github.com/tekocash/teko-cash.git
cd teko-cash
npm install
```

#### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá `.env` con tus credenciales (las claves de Supabase están en **Supabase dashboard → Settings → API**):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
VITE_VAPID_PUBLIC_KEY=tu-clave-publica-vapid-aqui
```

#### 3. Configurar la base de datos

Ejecutá `supabase/INSTALL.sql` en el **Editor SQL de Supabase** — es un único archivo que configura todo (tablas, políticas RLS, triggers y datos iniciales).

#### 4. Ejecutar en local

```bash
npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173).

#### 5. Build de producción

```bash
npm run build
```

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anon/pública de Supabase |
| `VITE_VAPID_PUBLIC_KEY` | Clave pública VAPID para notificaciones push |

> En Netlify también se aceptan `VITE_PUBLIC_SUPABASE_URL` / `VITE_PUBLIC_SUPABASE_ANON_KEY`.

### Configuración de claves VAPID (notificaciones push)

Las notificaciones push requieren un par de claves VAPID. Generalas con:

```bash
npx web-push generate-vapid-keys
```

Esto devuelve una clave pública y una privada. Configurá la **clave pública** como `VITE_VAPID_PUBLIC_KEY` en tu `.env` (y en las variables de entorno de Netlify u otro hosting). La **clave privada** va en los secrets de tu Edge Function de Supabase — nunca se expone al navegador.

Si no configurás claves VAPID, la app funciona normalmente pero las notificaciones push no estarán disponibles.

### Self-hosted / Traé tu propio Supabase

Por defecto, Teko Cash se conecta al backend Supabase compartido administrado por el equipo de Teko Cash.

Los usuarios que quieran **control total de sus datos** pueden conectar la app a su propio proyecto Supabase:

1. Creá un proyecto gratuito en [supabase.com](https://supabase.com).
2. Ejecutá `supabase/INSTALL.sql` en el Editor SQL de tu proyecto.
3. Generá las claves VAPID (ver arriba) si querés notificaciones push.
4. En la app, andá a **Configuración → Conexión de datos** e ingresá la URL y la anon key de tu proyecto.

La app cambia de base de datos de inmediato. Ideal para usuarios que quieren que sus datos financieros vivan exclusivamente en su propia infraestructura.

### Extractos bancarios soportados

| Banco | Formato | Tipo de importación |
|-------|---------|---------------------|
| Atlas Bank | XLS (cuenta corriente/ahorro) | Importador bancario |
| Itaú Paraguay | XLS (cuenta corriente/ahorro) | Importador bancario |
| Ueno Bank Mastercard | PDF (extracto tarjeta de crédito) | Importador PDF |
| Itaú | PDF (extracto tarjeta de crédito) | Importador PDF |
| Atlas Bank | PDF (extracto tarjeta de crédito) | Importador PDF |

### Estructura del proyecto

```
src/
  app/
    protected/          # páginas autenticadas
      cards/            # tarjetas de crédito
      calendar/         # vista de calendario
      settings/         # importación/exportación y configuración
      transactions/     # lista y análisis de transacciones
  features/
    budgets/
    categories/
    dashboard/          # gráficas y análisis financiero
    notifications/      # push subscriptions + notification log
    transactions/
      service/
        bank-importer.ts  # parser Excel/CSV + preview + inserción en lotes
        pdf-parser.ts     # extracción de texto PDF + parsers por banco
  lib/
    supabase/           # cliente Supabase + tipos
supabase/
  INSTALL.sql           # instalador único (ejecutar este)
  schema.sql
  migrations/
```

### Contribuir

Los pull requests son bienvenidos. Para cambios importantes, abrí un issue primero.

1. Hacé fork del repo
2. Creá una rama: `git checkout -b feature/mi-feature`
3. Hacé commit de tus cambios
4. Abrí un pull request hacia `main`

### Licencia

[MIT](LICENSE)
