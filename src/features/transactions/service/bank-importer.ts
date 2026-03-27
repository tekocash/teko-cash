import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase/client';
import { createCategory } from '@/features/categories/services/category-service';

// ── Types ────────────────────────────────────────────────────────────────────

export type BankFormat =
  | 'atlas-bank'
  | 'itau-credit-card'
  | 'itau-savings-usd'
  | 'generic';

export interface ParsedTransaction {
  date: string;           // yyyy-MM-dd
  amount: number;         // always positive
  direction: 'income' | 'expense';
  description: string;
  reference: string;
  currency: 'PYG' | 'USD';
  section?: string;       // itau-cc: 'pagos' | 'exterior' | 'paraguay'
}

export interface ImportLookups {
  catMap: Map<string, string>;   // lowercase name → category_id
  pmMap: Map<string, string>;    // lowercase name → payment_method_id
  curMap: Map<string, string>;   // lowercase code  → currency_id
}

export interface MonthlyTrend {
  month: string;
  incomes: number;
  expenses: number;
}

export interface ImportAnalysis {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  dateRange: { from: string; to: string };
  topCategories: { name: string; total: number; count: number }[];
  recurringExpenses: { description: string; occurrences: number; totalAmount: number; avgAmount: number }[];
  detectedDebts: { description: string; amount: number }[];
  foreignExpenses: { description: string; amount: number; currency: string }[];
  monthlyTrend: MonthlyTrend[];
}

export interface ImportResult {
  ok: number;
  duplicatesSkipped: number;
  failed: number;
  errors: string[];
  newCategoriesCreated: string[];
  newPaymentMethodsCreated: string[];
  format: BankFormat;
  analysis: ImportAnalysis;
}

// ── Auto-categorization rules ─────────────────────────────────────────────────

interface CategoryRule {
  keywords: string[];
  name: string;
  type: 'income' | 'expense';
}

const CATEGORY_RULES: CategoryRule[] = [
  // Income
  { keywords: ['pago de haberes', 'salario', 'sueldo', 'haberes', 'remuneracion', 'honorarios', 'pago nomina'], name: 'Salario', type: 'income' },
  { keywords: ['transferencia recibida', 'credito recibido', 'acreditacion', 'dep. salario'], name: 'Transferencias recibidas', type: 'income' },
  { keywords: ['deposito en efectivo', 'deposito en cheque'], name: 'Depósitos', type: 'income' },
  // Streaming
  { keywords: ['netflix', 'spotify', 'hbo', 'disney', 'youtube premium', 'amazon prime', 'streaming', 'crunchyroll', 'crunchy', 'paramount', 'apple.com/bill'], name: 'Entretenimiento', type: 'expense' },
  // Transport
  { keywords: ['uber', 'taxi', 'cabify', 'remise', 'dlocal *bolt', 'bolt'], name: 'Transporte', type: 'expense' },
  // Food delivery
  { keywords: ['pedidosya', 'pedidos ya', 'rappi', 'uber eats', 'delivery'], name: 'Delivery / Comida', type: 'expense' },
  // Restaurants
  { keywords: ['mcdonald', 'burger king', 'pizza', 'kfc', 'subway', 'sushi', 'restaurant', 'resto ', 'comida', 'mc donald'], name: 'Restaurante / Comida', type: 'expense' },
  // Fuel
  { keywords: ['petrobras', 'copetrol', 'shell', 'esso', 'primax', 'nafta', 'diesel', 'combustible', 'estacion de serv'], name: 'Combustible', type: 'expense' },
  // Supermarket
  { keywords: ['stock center', 'superseis', 'gran via', 'supermercado', 'casa rica', 'el dorado', 'hipermaxi', 'disco ', 'shopping'], name: 'Supermercado', type: 'expense' },
  // Pharmacy / Health
  { keywords: ['farmacia', 'farmatodo', 'estrella', 'parana farma', 'disafarma', 'botica', 'farmacenter'], name: 'Farmacia', type: 'expense' },
  // Medical
  { keywords: ['hospital', 'clinica', 'medico', 'laboratorio', 'analisis', 'consulta medica', 'sanatorio', 'doctor'], name: 'Salud', type: 'expense' },
  // Loans / installments
  { keywords: ['prestamo', 'cuota', 'financiamiento', 'cobro automatico de prestamo', 'interes', 'mora', 'pagare', 'provision ley'], name: 'Préstamos / Cuotas', type: 'expense' },
  // Basic services
  { keywords: ['ande ', 'essap', 'copaco', 'claro ', 'tigo ', 'personal ', 'telefonia', 'internet', 'prosegur', 'alquiler'], name: 'Servicios básicos', type: 'expense' },
  // Education
  { keywords: ['colegio', 'universidad', 'escuela', 'matricula', 'colegiatura', 'capacitacion', 'codas thompson', 'inst.codas'], name: 'Educación', type: 'expense' },
  // Insurance
  { keywords: ['seguro', 'aseguradora', 'prima', 'poliza', 'mapfre', 'panal', 'rio seguros'], name: 'Seguros', type: 'expense' },
  // ATM
  { keywords: ['cajero', 'atm', 'extraccion', 'retiro efectivo', 'withdrawal'], name: 'Retiro de efectivo', type: 'expense' },
  // Taxes
  { keywords: ['set ', 'municipalidad', 'impuesto', 'patente', 'inmueble', 'iva ley', 'tributo'], name: 'Impuestos', type: 'expense' },
  // Entertainment
  { keywords: ['cine', 'teatro', 'evento', 'ticket', 'entrada', 'cinemark', 'entretenimiento'], name: 'Entretenimiento', type: 'expense' },
  // Transfers out
  { keywords: ['transferencia enviada', 'transferencias entre cuentas', 'cobro de tarjetas'], name: 'Transferencias enviadas', type: 'expense' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function autoCategorize(description: string): CategoryRule | null {
  const n = normalize(description);
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (n.includes(normalize(kw))) return rule;
    }
  }
  return null;
}

function excelSerialToDate(serial: number): string {
  const d = XLSX.SSF.parse_date_code(Math.floor(serial));
  return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
}

function parseDDMMYYYY(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return s.trim();
  return null;
}

function parsePYGAmount(raw: unknown): number {
  if (!raw && raw !== 0) return 0;
  return parseInt(String(raw).replace(/\./g, '').replace(',', ''), 10) || 0;
}

function parseUSDAmount(raw: unknown): number {
  if (!raw && raw !== 0) return 0;
  return parseFloat(String(raw).replace(/\./g, '').replace(',', '.')) || 0;
}

function fingerprint(tx: ParsedTransaction): string {
  return `${tx.date}_${Math.round(tx.amount)}_${tx.direction}_${tx.currency}`;
}

// ── Format detection ──────────────────────────────────────────────────────────

export function detectFormat(workbook: XLSX.WorkBook, rawBuffer: ArrayBuffer): BankFormat {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const headers: string[] = [];
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let c = range.s.c; c <= Math.min(range.e.c, 15); c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })];
      if (cell?.v) headers.push(normalize(String(cell.v)));
    }
  }
  const h = headers.join(' ');

  // Atlas Bank: has "debito" AND "credito" AND "remitente"
  if (h.includes('debito') && h.includes('credito') && h.includes('remitente')) {
    return 'atlas-bank';
  }

  // Itaú USD savings: has "debitos" AND "creditos" AND "saldo"
  if (h.includes('debitos') && h.includes('creditos') && h.includes('saldo')) {
    return 'itau-savings-usd';
  }

  // Itaú CC: check raw bytes for HTML signature
  try {
    const sample = new TextDecoder('iso-8859-1').decode(rawBuffer.slice(0, 500));
    if (sample.toLowerCase().includes('<html') || sample.toLowerCase().includes('cupon') || sample.toLowerCase().includes('fec. operacion')) {
      return 'itau-credit-card';
    }
  } catch {}

  return 'generic';
}

export function formatLabel(fmt: BankFormat): string {
  const labels: Record<BankFormat, string> = {
    'atlas-bank': '🏦 Atlas Bank XLSX',
    'itau-credit-card': '💳 Itaú Tarjeta de Crédito',
    'itau-savings-usd': '💵 Itaú Ahorro USD',
    'generic': '📊 Formato genérico',
  };
  return labels[fmt];
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseAtlasBank(ws: XLSX.WorkSheet): ParsedTransaction[] {
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const result: ParsedTransaction[] = [];

  for (const row of rows) {
    // Find columns case-insensitively
    const getCol = (...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => normalize(rk) === normalize(k));
        if (found !== undefined) return row[found];
      }
      return '';
    };

    const rawDate = getCol('Fecha Movim.', 'Fecha Movim', 'fecha movim');
    const debito = getCol('Debito', 'Débito');
    const credito = getCol('Credito', 'Crédito');
    const descripcion = String(getCol('Descripcion', 'Descripción') || '').trim();
    const documento = String(getCol('Documento') || '').trim();

    let date: string;
    if (typeof rawDate === 'number') {
      date = excelSerialToDate(rawDate);
    } else if (rawDate instanceof Date) {
      date = rawDate.toLocaleDateString('en-CA');
    } else {
      date = parseDDMMYYYY(String(rawDate)) || '';
    }
    if (!date || !descripcion) continue;

    const debitoAmt = parsePYGAmount(debito);
    const creditoAmt = parsePYGAmount(credito);

    if (debitoAmt > 0) {
      result.push({ date, amount: debitoAmt, direction: 'expense', description: descripcion, reference: documento, currency: 'PYG' });
    }
    if (creditoAmt > 0) {
      result.push({ date, amount: creditoAmt, direction: 'income', description: descripcion, reference: documento, currency: 'PYG' });
    }
  }

  return result;
}

function parseItauCreditCard(rawBuffer: ArrayBuffer): ParsedTransaction[] {
  const result: ParsedTransaction[] = [];

  try {
    const html = new TextDecoder('iso-8859-1').decode(rawBuffer);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tables = Array.from(doc.querySelectorAll('table'));

    for (const table of tables) {
      // Detect section from preceding heading
      let section = 'paraguay';
      let prev = table.previousElementSibling;
      while (prev) {
        const text = prev.textContent?.toLowerCase() || '';
        if (text.includes('exterior')) { section = 'exterior'; break; }
        if (text.includes('pago')) { section = 'pagos'; break; }
        prev = prev.previousElementSibling;
      }

      const rows = Array.from(table.querySelectorAll('tr'));
      let headerSkipped = false;

      for (const tr of rows) {
        const cells = Array.from(tr.querySelectorAll('td, th'));
        if (cells.length < 4) continue;
        if (!headerSkipped || tr.querySelector('th')) { headerSkipped = true; continue; }

        const fechaText = cells[0]?.textContent?.trim() || '';
        const detalle = cells[3]?.textContent?.trim() || '';
        const montoText = cells[4]?.textContent?.trim() || cells[cells.length - 1]?.textContent?.trim() || '';

        const date = parseDDMMYYYY(fechaText);
        if (!date || !detalle || detalle.length < 2) continue;

        // Parse monto: period = thousands sep, may have parentheses for credits
        const cleanMonto = montoText.replace(/\./g, '');
        let amount = 0;
        let direction: 'income' | 'expense' = 'expense';
        if (cleanMonto.startsWith('(') && cleanMonto.endsWith(')')) {
          amount = Math.abs(parseInt(cleanMonto.slice(1, -1), 10) || 0);
          direction = 'income';
        } else if (cleanMonto.startsWith('-')) {
          amount = Math.abs(parseInt(cleanMonto.slice(1), 10) || 0);
          direction = 'income';
        } else {
          amount = parseInt(cleanMonto, 10) || 0;
          direction = 'expense';
        }

        if (amount === 0) continue;
        const cupon = cells[2]?.textContent?.trim() || '';
        result.push({ date, amount, direction, description: detalle, reference: cupon, currency: 'PYG', section });
      }
    }
  } catch (e) {
    // Fallback: use XLSX to parse the tables
    const wb = XLSX.read(rawBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    for (const row of rows) {
      const vals = Object.values(row).map(v => String(v).trim());
      if (vals.length < 4) continue;
      const date = parseDDMMYYYY(vals[0]);
      if (!date) continue;
      const monto = parseInt(vals[vals.length - 1].replace(/\D/g, ''), 10) || 0;
      if (monto === 0) continue;
      result.push({ date, amount: monto, direction: 'expense', description: vals[3] || '', reference: vals[2] || '', currency: 'PYG' });
    }
  }

  return result;
}

function parseItauSavingsUSD(ws: XLSX.WorkSheet): ParsedTransaction[] {
  const result: ParsedTransaction[] = [];
  // Sheet has 5 metadata rows; find actual header row
  const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i].map(v => normalize(String(v)));
    if (row.some(v => v === 'fecha' || v === 'descripcion')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return result;

  const headers = allRows[headerIdx].map(v => normalize(String(v)));
  const colIdx = (name: string) => headers.findIndex(h => h.includes(name));
  const fechaCol = colIdx('fecha');
  const descCol = colIdx('descripcion');
  const debCol = colIdx('debito');
  const credCol = colIdx('credito');
  const movCol = colIdx('movimiento');

  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const rawDate = fechaCol >= 0 ? row[fechaCol] : '';
    const desc = String(descCol >= 0 ? row[descCol] : '').trim();
    if (!rawDate || !desc) continue;

    let date: string | null;
    if (rawDate instanceof Date) {
      date = rawDate.toLocaleDateString('en-CA');
    } else if (typeof rawDate === 'number') {
      date = excelSerialToDate(rawDate);
    } else {
      date = parseDDMMYYYY(String(rawDate));
    }
    if (!date) continue;

    const deb = debCol >= 0 ? parseUSDAmount(row[debCol]) : 0;
    const cred = credCol >= 0 ? parseUSDAmount(row[credCol]) : 0;
    const ref = movCol >= 0 ? String(row[movCol] || '').trim() : '';

    if (deb > 0) result.push({ date, amount: deb, direction: 'expense', description: desc, reference: ref, currency: 'USD' });
    if (cred > 0) result.push({ date, amount: cred, direction: 'income', description: desc, reference: ref, currency: 'USD' });
  }

  return result;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

async function buildFingerprintSet(userId: string, dateFrom: string, dateTo: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('transactions')
    .select('date, amount, direction, currency:currency_id(code)')
    .eq('user_id', userId)
    .gte('date', dateFrom)
    .lte('date', dateTo);

  const set = new Set<string>();
  for (const row of data || []) {
    const cur = (row as any).currency?.code || 'PYG';
    const fp = `${row.date}_${Math.round(row.amount)}_${row.direction}_${cur}`;
    set.add(fp);
  }
  return set;
}

// ── Category/PM auto-create ───────────────────────────────────────────────────

async function resolveOrCreateCategory(
  ruleName: string,
  ruleType: 'income' | 'expense',
  userId: string,
  catMap: Map<string, string>,
  created: string[]
): Promise<string | null> {
  const key = ruleName.toLowerCase();
  if (catMap.has(key)) return catMap.get(key)!;

  const { data } = await createCategory({
    name: ruleName,
    category_type: ruleType,
    user_id: userId,
    family_group_id: null,
    parent_id: null,
  });
  if (data?.id) {
    catMap.set(key, data.id);
    if (!created.includes(ruleName)) created.push(ruleName);
    return data.id;
  }
  return null;
}

async function resolveOrCreatePaymentMethod(
  bankName: string,
  userId: string,
  pmMap: Map<string, string>,
  created: string[]
): Promise<string | null> {
  const key = bankName.toLowerCase();
  if (pmMap.has(key)) return pmMap.get(key)!;

  const { error, data } = await supabase
    .from('user_payment_methods')
    .insert({ user_id: userId, name: bankName, details: 'transfer' })
    .select('id')
    .single();
  if (!error && data?.id) {
    pmMap.set(key, data.id);
    if (!created.includes(bankName)) created.push(bankName);
    return data.id;
  }
  return null;
}

// ── Budget matching ───────────────────────────────────────────────────────────

async function fetchBudgetCategoryMap(userId: string): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('budgets')
    .select('id, start_date, end_date')
    .eq('user_id', userId);

  const map = new Map<string, string>();
  // Simple strategy: if a budget name matches a category name, link them
  // Full budget_categories junction not used — match by name similarity
  for (const b of data || []) {
    map.set(b.id, b.id); // placeholder; enriched below by name
  }
  return map;
}

// ── Financial analysis ────────────────────────────────────────────────────────

function computeAnalysis(
  parsed: ParsedTransaction[],
  categoryAssignments: Map<string, string>
): ImportAnalysis {
  if (parsed.length === 0) {
    return {
      totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0,
      dateRange: { from: '', to: '' },
      topCategories: [], recurringExpenses: [], detectedDebts: [],
      foreignExpenses: [], monthlyTrend: [],
    };
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  const catTotals = new Map<string, { total: number; count: number }>();
  const monthMap = new Map<string, { incomes: number; expenses: number }>();
  const descMap = new Map<string, { total: number; count: number; months: Set<string> }>();
  const debts: ParsedTransaction[] = [];
  const foreign: ParsedTransaction[] = [];
  const dates: string[] = [];

  for (const tx of parsed) {
    dates.push(tx.date);
    if (tx.direction === 'income') totalIncome += tx.amount;
    else totalExpenses += tx.amount;

    // Monthly trend
    const month = tx.date.slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { incomes: 0, expenses: 0 });
    const m = monthMap.get(month)!;
    if (tx.direction === 'income') m.incomes += tx.amount;
    else m.expenses += tx.amount;

    // Category totals
    const cat = categoryAssignments.get(tx.description) || 'Sin categoría';
    if (tx.direction === 'expense') {
      if (!catTotals.has(cat)) catTotals.set(cat, { total: 0, count: 0 });
      const c = catTotals.get(cat)!;
      c.total += tx.amount;
      c.count++;
    }

    // Recurring detection
    const normDesc = normalize(tx.description).slice(0, 40);
    if (!descMap.has(normDesc)) descMap.set(normDesc, { total: 0, count: 0, months: new Set() });
    const d = descMap.get(normDesc)!;
    d.total += tx.amount;
    d.count++;
    d.months.add(month);

    // Debt detection
    const rule = autoCategorize(tx.description);
    if (rule?.name === 'Préstamos / Cuotas') debts.push(tx);

    // Foreign
    if (tx.currency === 'USD' || tx.section === 'exterior') foreign.push(tx);
  }

  dates.sort();

  const topCategories = [...catTotals.entries()]
    .map(([name, v]) => ({ name, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const recurringExpenses = [...descMap.entries()]
    .filter(([, v]) => v.count >= 2 && v.months.size >= 2)
    .map(([description, v]) => ({
      description,
      occurrences: v.count,
      totalAmount: v.total,
      avgAmount: Math.round(v.total / v.count),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 8);

  const monthlyTrend = [...monthMap.entries()]
    .map(([month, v]) => ({ month, incomes: v.incomes, expenses: v.expenses }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    transactionCount: parsed.length,
    dateRange: { from: dates[0] || '', to: dates[dates.length - 1] || '' },
    topCategories,
    recurringExpenses,
    detectedDebts: debts.map(d => ({ description: d.description, amount: d.amount })).slice(0, 10),
    foreignExpenses: foreign.map(f => ({ description: f.description, amount: f.amount, currency: f.currency })).slice(0, 10),
    monthlyTrend,
  };
}

// ── Batch insert ──────────────────────────────────────────────────────────────

async function insertBatch(
  rows: object[],
  onProgress?: (pct: number, msg: string) => void,
  progressBase = 60,
  progressRange = 25
): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0; let failed = 0; const errors: string[] = [];
  const total = Math.ceil(rows.length / 50);
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) {
      failed += batch.length;
      errors.push(`Lote ${Math.floor(i / 50) + 1}: ${error.message}`);
    } else {
      ok += batch.length;
    }
    const batchIdx = Math.floor(i / 50) + 1;
    onProgress?.(progressBase + Math.round((batchIdx / total) * progressRange), `Insertando lote ${batchIdx}/${total}...`);
  }
  return { ok, failed, errors };
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function importBankStatement(
  file: File,
  userId: string,
  lookups: ImportLookups,
  onProgress?: (pct: number, msg: string) => void
): Promise<ImportResult> {
  const { catMap, pmMap, curMap } = lookups;
  const newCats: string[] = [];
  const newPMs: string[] = [];
  const categoryAssignments = new Map<string, string>(); // description → category name

  // Step 1: Read file
  onProgress?.(5, 'Leyendo archivo...');
  const buffer = await file.arrayBuffer();

  // Step 2: Detect + parse
  onProgress?.(10, 'Detectando formato...');
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const format = detectFormat(wb, buffer);
  onProgress?.(15, `Formato detectado: ${formatLabel(format)}`);

  let parsed: ParsedTransaction[] = [];
  if (format === 'atlas-bank') {
    parsed = parseAtlasBank(wb.Sheets[wb.SheetNames[0]]);
  } else if (format === 'itau-credit-card') {
    parsed = parseItauCreditCard(buffer);
  } else if (format === 'itau-savings-usd') {
    parsed = parseItauSavingsUSD(wb.Sheets[wb.SheetNames[0]]);
  } else {
    // Generic: use first sheet, try flexible columns
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    for (const row of rows) {
      const vals = Object.entries(row);
      const amtEntry = vals.find(([k]) => /monto|amount|importe|debito|credito/i.test(k));
      const dateEntry = vals.find(([k]) => /fecha|date|dia/i.test(k));
      const descEntry = vals.find(([k]) => /descripcion|detalle|concepto|description/i.test(k));
      if (!amtEntry || !dateEntry) continue;
      const rawDate = dateEntry[1];
      let date: string | null;
      if (rawDate instanceof Date) date = rawDate.toLocaleDateString('en-CA');
      else date = parseDDMMYYYY(String(rawDate));
      if (!date) continue;
      const amount = parsePYGAmount(amtEntry[1]);
      if (amount === 0) continue;
      parsed.push({ date, amount, direction: 'expense', description: String(descEntry?.[1] || ''), reference: '', currency: 'PYG' });
    }
  }

  onProgress?.(25, `${parsed.length} transacciones encontradas`);
  if (parsed.length === 0) {
    return { ok: 0, duplicatesSkipped: 0, failed: 0, errors: ['No se encontraron transacciones en el archivo.'], newCategoriesCreated: [], newPaymentMethodsCreated: [], format, analysis: computeAnalysis([], new Map()) };
  }

  // Step 3: Date range for deduplication
  const dates = parsed.map(p => p.date).sort();
  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];

  // Step 4: Load existing fingerprints
  onProgress?.(30, 'Verificando duplicados...');
  const fingerprints = await buildFingerprintSet(userId, dateFrom, dateTo);

  // Step 5: Determine payment method name for this source
  const pmName = format === 'atlas-bank' ? 'Atlas Bank'
    : format === 'itau-credit-card' ? 'Itaú Tarjeta de Crédito'
    : format === 'itau-savings-usd' ? 'Itaú Ahorro USD'
    : null;

  let pmId: string | null = null;
  if (pmName) {
    pmId = await resolveOrCreatePaymentMethod(pmName, userId, pmMap, newPMs);
  }

  // Step 6: Enrich rows
  onProgress?.(40, 'Categorizando transacciones...');
  const defaultCurId = curMap.get('pyg') ?? null;
  const usdCurId = curMap.get('usd') ?? null;

  let duplicatesSkipped = 0;
  const toInsert: object[] = [];

  for (const tx of parsed) {
    const fp = fingerprint(tx);
    if (fingerprints.has(fp)) { duplicatesSkipped++; continue; }
    fingerprints.add(fp);

    // Categorize
    const rule = autoCategorize(tx.description);
    let categoryId: string | null = null;
    if (rule) {
      categoryId = await resolveOrCreateCategory(rule.name, rule.type, userId, catMap, newCats);
      categoryAssignments.set(tx.description, rule.name);
    }

    const currencyId = tx.currency === 'USD' ? usdCurId : defaultCurId;

    toInsert.push({
      user_id: userId,
      direction: tx.direction,
      amount: tx.amount,
      date: tx.date,
      category_id: categoryId,
      payment_method_id: pmId,
      currency_id: currencyId,
      concepto: tx.description || null,
      nro_operacion: tx.reference || null,
      additional_info: tx.section ? `sección: ${tx.section}` : null,
    });
  }

  onProgress?.(60, `${toInsert.length} nuevas, ${duplicatesSkipped} duplicadas omitidas`);

  // Step 7: Insert
  const { ok, failed, errors } = await insertBatch(toInsert, onProgress);

  // Step 8: Analysis
  onProgress?.(88, 'Generando análisis...');
  const analysis = computeAnalysis(parsed, categoryAssignments);

  onProgress?.(100, '¡Importación completada!');

  return { ok, duplicatesSkipped, failed, errors, newCategoriesCreated: newCats, newPaymentMethodsCreated: newPMs, format, analysis };
}
