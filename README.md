# Teko Cash

> **[English](#english) | [Español](#español)**

---

<a name="english"></a>
## English

A personal finance web application built for Paraguay — track income and expenses, manage budgets, import bank statements (Excel or PDF), and analyze your finances with interactive charts.

**Stack:** React 18 · Vite 6 · TypeScript · Supabase · Tailwind CSS · Chart.js

### Features

- **Transactions** — record income and expenses, filter by period or custom date range, paginated list and analytics view
- **Budgets** — set monthly limits per category with visual progress bars
- **Categories** — full CRUD with type (income/expense)
- **Credit cards** — register cards, link PDF statements (Ueno Bank, Itaú, Atlas Bank), track balance, due dates, interest rates
- **Bank statement importer** — upload XLS/XLSX from Atlas Bank, Itaú, or generic format; intelligent duplicate detection, auto-categorization, bulk insert
- **PDF extractor** — parse credit card PDF statements, preview transactions with editable categories/budgets before importing
- **Evolution charts** — stacked bar by category, income vs expenses, savings/balance trend
- **Family accounts** — link family members and view shared finances
- **Backup & restore** — export/import your data as JSON
- **Multi-currency** — PYG and USD support with thousands separator formatting
- **Dark mode** — full dark/light theme

### Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 6 + TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password) |
| Charts | Chart.js + react-chartjs-2 |
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

Edit `.env` and fill in your Supabase credentials (found in **Supabase dashboard → Settings → API**):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### 3. Set up the database

Run the SQL files in **Supabase SQL Editor** in this order:

```
supabase/schema.sql
supabase/migrations/rls_policies.sql
supabase/migrations/20260326_credit_cards.sql
```

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

> For Netlify: also accepts `VITE_PUBLIC_SUPABASE_URL` / `VITE_PUBLIC_SUPABASE_ANON_KEY`.

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

Aplicación web de finanzas personales pensada para Paraguay — registrá ingresos y gastos, gestioná presupuestos, importá extractos bancarios (Excel o PDF) y analizá tus finanzas con gráficas interactivas.

**Stack:** React 18 · Vite 6 · TypeScript · Supabase · Tailwind CSS · Chart.js

### Funcionalidades

- **Transacciones** — registrá ingresos y gastos, filtrá por período o rango de fechas, vista de lista y de análisis con paginado
- **Presupuestos** — establecé límites mensuales por categoría con barras de progreso visuales
- **Categorías** — CRUD completo con tipo (ingreso/gasto)
- **Tarjetas de crédito** — registrá tus tarjetas, vinculá extractos PDF (Ueno Bank, Itaú, Atlas Bank), seguí saldo, vencimiento y tasas de interés
- **Importador de extractos bancarios** — cargá XLS/XLSX de Atlas Bank, Itaú o formato genérico; detección inteligente de duplicados, auto-categorización, inserción en lotes
- **Extractor PDF** — parseá extractos PDF de tarjetas de crédito, revisá las transacciones con categorías y presupuestos editables antes de importar
- **Gráficas de evolución** — barra apilada por categoría, ingresos vs gastos, tendencia de ahorro/saldo
- **Cuentas familiares** — vinculá integrantes del hogar y visualizá finanzas compartidas
- **Backup y restauración** — exportá e importá tus datos como JSON
- **Multimoneda** — soporte para PYG y USD con separador de miles
- **Modo oscuro** — tema claro/oscuro completo

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 6 + TypeScript |
| Routing | React Router v7 |
| Estilos | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Row Level Security) |
| Autenticación | Supabase Auth (email/contraseña) |
| Gráficas | Chart.js + react-chartjs-2 |
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

Editá `.env` con tus credenciales de Supabase (las encontrás en **Supabase dashboard → Settings → API**):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

#### 3. Configurar la base de datos

Ejecutá los SQL en el **Editor SQL de Supabase** en este orden:

```
supabase/schema.sql
supabase/migrations/rls_policies.sql
supabase/migrations/20260326_credit_cards.sql
```

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

> En Netlify también se aceptan `VITE_PUBLIC_SUPABASE_URL` / `VITE_PUBLIC_SUPABASE_ANON_KEY`.

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
      settings/         # importación/exportación de datos
      transactions/     # lista y análisis de transacciones
  features/
    budgets/
    categories/
    dashboard/          # gráficas y análisis financiero
    transactions/
      service/
        bank-importer.ts  # parser Excel/CSV + preview + inserción en lotes
        pdf-parser.ts     # extracción de texto PDF + parsers por banco
  lib/
    supabase/           # cliente Supabase + tipos
supabase/
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
