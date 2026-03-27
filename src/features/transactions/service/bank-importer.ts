import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase/client';
import { createCategory } from '@/features/categories/services/category-service';
import type { ParsedCardTransaction } from './pdf-parser';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BankFormat =
  | 'atlas-bank'
  | 'itau-credit-card'
  | 'itau-savings-usd'
  | 'generic';

export interface ParsedTransaction {
  date: string;
  amount: number;
  direction: 'income' | 'expense';
  description: string;
  reference: string;
  currency: 'PYG' | 'USD';
  section?: string;
}

/** Row shown in the pre-import preview table */
export interface PreviewRow extends ParsedTransaction {
  previewId: string;          // local id for checkbox state
  isDuplicate: boolean;
  suggestedCategory: string | null;
  suggestedCategoryType: 'income' | 'expense' | null;
  selected: boolean;
  budgetId?: string | null;   // user-assigned budget override
}

export interface ImportLookups {
  catMap: Map<string, string>;
  pmMap: Map<string, string>;
  curMap: Map<string, string>;
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
  { keywords: ['transferencia recibida', 'credito recibido', 'acreditacion', 'dep. salario', 'transfer.internet banking'], name: 'Transferencias recibidas', type: 'income' },
  { keywords: ['deposito en efectivo', 'deposito en cheque', 'deposito'], name: 'Depósitos', type: 'income' },
  { keywords: ['su pago, gracias', 'su pago gracias', 'pago tarjeta'], name: 'Pago de tarjeta', type: 'income' },
  // Streaming / digital
  { keywords: ['netflix', 'spotify', 'hbo', 'disney', 'youtube premium', 'youtube', 'amazon prime', 'crunchyroll', 'crunchy', 'paramount', 'apple.com/bill', 'deezer', 'flow+disney', 'internet + flow'], name: 'Entretenimiento digital', type: 'expense' },
  // Transport
  { keywords: ['uber', 'taxi', 'cabify', 'remise', 'dlocal *bolt', 'bolt', 'transporte'], name: 'Transporte', type: 'expense' },
  // Food delivery
  { keywords: ['pedidosya', 'pedidos ya', 'pedidos_ya', 'rappi', 'uber eats', 'delivery', 'deliverys', 'deliveries'], name: 'Delivery / Comida', type: 'expense' },
  // Restaurants
  { keywords: ['mcdonald', 'burger king', 'pizza', 'kfc', 'subway', 'sushi', 'restaurant', 'resto ', 'mc ', 'biggie', 'hamburguesa'], name: 'Restaurante / Comida', type: 'expense' },
  // Fuel
  { keywords: ['petrobras', 'copetrol', 'shell', 'esso', 'primax', 'nafta', 'diesel', 'combustible', 'estacion de serv'], name: 'Combustible', type: 'expense' },
  // Supermarket / groceries
  { keywords: ['stock center', 'superseis', 'gran via', 'supermercado', 'casa rica', 'el dorado', 'hipermaxi', 'shopping', 'compras casa', 'compras mello', 'compras compartidas'], name: 'Supermercado / Compras', type: 'expense' },
  // Pharmacy
  { keywords: ['farmacia', 'farmatodo', 'estrella', 'parana farma', 'disafarma', 'botica', 'farmacenter'], name: 'Farmacia', type: 'expense' },
  // Medical
  { keywords: ['hospital', 'clinica', 'medico', 'laboratorio', 'analisis', 'consulta medica', 'sanatorio', 'doctor'], name: 'Salud', type: 'expense' },
  // Loans / installments
  { keywords: ['prestamo', 'cuota', 'financiamiento', 'cobro automatico de prestamo', 'cobro de tarjetas de credito', 'interes', 'mora', 'pagare', 'provision ley'], name: 'Préstamos / Cuotas', type: 'expense' },
  // Rent
  { keywords: ['alquiler', 'arriendo', 'renta'], name: 'Alquiler', type: 'expense' },
  // Basic services
  { keywords: ['ande ', 'essap', 'copaco', 'claro ', 'tigo ', 'personal ', 'telefonia', 'internet', 'prosegur', 'expensas'], name: 'Servicios básicos', type: 'expense' },
  // Cleaning / home
  { keywords: ['limpieza', 'detergente', 'cif', 'papel higienico', 'servilleta', 'bolsa basura', 'escoba', 'ayudin', 'suavizante'], name: 'Hogar / Limpieza', type: 'expense' },
  // Pet
  { keywords: ['purina', 'arena gatos', 'arena cat', 'gatitos', 'veterinaria', 'petshop', 'mascotas'], name: 'Mascotas', type: 'expense' },
  // Education
  { keywords: ['colegio', 'universidad', 'escuela', 'matricula', 'colegiatura', 'capacitacion', 'codas thompson', 'inst.codas'], name: 'Educación', type: 'expense' },
  // Insurance
  { keywords: ['seguro', 'aseguradora', 'prima', 'poliza', 'mapfre', 'panal', 'rio seguros'], name: 'Seguros', type: 'expense' },
  // ATM
  { keywords: ['cajero', 'atm', 'extraccion', 'retiro efectivo', 'withdrawal'], name: 'Retiro de efectivo', type: 'expense' },
  // Taxes
  { keywords: ['set ', 'municipalidad', 'impuesto', 'patente', 'inmueble', 'iva ley', 'tributo', 'iva ley 6380'], name: 'Impuestos / IVA', type: 'expense' },
  // Entertainment
  { keywords: ['cine', 'teatro', 'evento', 'ticket', 'entrada', 'cinemark'], name: 'Entretenimiento', type: 'expense' },
  // Transfers out
  { keywords: ['transferencia enviada', 'transferencias entre cuentas', 'transferencia enviada cta'], name: 'Transferencias enviadas', type: 'expense' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function autoCategorize(description: string): CategoryRule | null {
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

/** Fingerprint includes date+amount+direction+currency+first 30 chars of description */
function fingerprint(tx: { date: string; amount: number; direction: string; currency: string; description: string }): string {
  const desc = normalize(tx.description).slice(0, 30);
  return `${tx.date}_${Math.round(tx.amount)}_${tx.direction}_${tx.currency}_${desc}`;
}

let _previewCounter = 0;
function newPreviewId() { return `prev_${++_previewCounter}`; }

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

  if (h.includes('debito') && h.includes('credito') && h.includes('remitente')) return 'atlas-bank';
  if (h.includes('debitos') && h.includes('creditos') && h.includes('saldo')) return 'itau-savings-usd';

  // Itaú CC: detect HTML signature in raw bytes
  try {
    const sample = new TextDecoder('iso-8859-1').decode(rawBuffer.slice(0, 1000));
    const sn = sample.toLowerCase();
    if (sn.includes('<html') || sn.includes('cupon') || sn.includes('fec. operaci') || sn.includes('n\u00ba cup')) {
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
      // Detect section from preceding sibling headings
      let section = 'paraguay';
      let prev = table.previousElementSibling;
      while (prev) {
        const text = normalize(prev.textContent || '');
        if (text.includes('exterior')) { section = 'exterior'; break; }
        if (text.includes('pago')) { section = 'pagos'; break; }
        prev = prev.previousElementSibling;
      }

      const rows = Array.from(table.querySelectorAll('tr'));
      let headerFound = false;

      for (const tr of rows) {
        const isHeader = tr.querySelector('th') !== null;
        if (isHeader) { headerFound = true; continue; }
        if (!headerFound) continue;

        const cells = Array.from(tr.querySelectorAll('td'));
        if (cells.length < 4) continue;

        const fechaText = cells[0]?.textContent?.trim() || '';
        const detalle = cells[3]?.textContent?.trim() || '';
        const montoText = (cells[4] ?? cells[cells.length - 1])?.textContent?.trim() || '';
        const cupon = cells[2]?.textContent?.trim() || '';

        const date = parseDDMMYYYY(fechaText);
        if (!date || !detalle || detalle.length < 2) continue;

        // Parse monto: period = thousands separator, parentheses or minus = credit
        const cleanMonto = montoText.replace(/\./g, '').trim();
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
        result.push({ date, amount, direction, description: detalle, reference: cupon, currency: 'PYG', section });
      }
    }
  } catch {
    // Fallback: read with XLSX (loses section info)
    try {
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
    } catch {}
  }
  return result;
}

function parseItauSavingsUSD(ws: XLSX.WorkSheet): ParsedTransaction[] {
  const result: ParsedTransaction[] = [];
  const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i].map(v => normalize(String(v)));
    if (row.some(v => v === 'fecha' || v === 'descripcion')) { headerIdx = i; break; }
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
    if (rawDate instanceof Date) date = rawDate.toLocaleDateString('en-CA');
    else if (typeof rawDate === 'number') date = excelSerialToDate(rawDate);
    else date = parseDDMMYYYY(String(rawDate));
    if (!date) continue;

    const deb = debCol >= 0 ? parseUSDAmount(row[debCol]) : 0;
    const cred = credCol >= 0 ? parseUSDAmount(row[credCol]) : 0;
    const ref = movCol >= 0 ? String(row[movCol] || '').trim() : '';

    if (deb > 0) result.push({ date, amount: deb, direction: 'expense', description: desc, reference: ref, currency: 'USD' });
    if (cred > 0) result.push({ date, amount: cred, direction: 'income', description: desc, reference: ref, currency: 'USD' });
  }
  return result;
}

function parseGeneric(ws: XLSX.WorkSheet): ParsedTransaction[] {
  const result: ParsedTransaction[] = [];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
  for (const row of rows) {
    const entries = Object.entries(row);
    const amtEntry = entries.find(([k]) => /monto|amount|importe|debito|credito/i.test(k));
    const dateEntry = entries.find(([k]) => /fecha|date|dia/i.test(k));
    const descEntry = entries.find(([k]) => /descripcion|detalle|concepto|description/i.test(k));
    if (!amtEntry || !dateEntry) continue;
    const rawDate = dateEntry[1];
    let date: string | null;
    if (rawDate instanceof Date) date = rawDate.toLocaleDateString('en-CA');
    else date = parseDDMMYYYY(String(rawDate));
    if (!date) continue;
    const amount = parsePYGAmount(amtEntry[1]);
    if (amount === 0) continue;
    result.push({ date, amount, direction: 'expense', description: String(descEntry?.[1] || ''), reference: '', currency: 'PYG' });
  }
  return result;
}

// ── Parse file into raw transactions ─────────────────────────────────────────

function parseFile(wb: XLSX.WorkBook, buffer: ArrayBuffer, format: BankFormat): ParsedTransaction[] {
  if (format === 'atlas-bank') return parseAtlasBank(wb.Sheets[wb.SheetNames[0]]);
  if (format === 'itau-credit-card') return parseItauCreditCard(buffer);
  if (format === 'itau-savings-usd') return parseItauSavingsUSD(wb.Sheets[wb.SheetNames[0]]);
  return parseGeneric(wb.Sheets[wb.SheetNames[0]]);
}

// ── Deduplication (DB check) ─────────────────────────────────────────────────

async function buildFingerprintSet(userId: string, dateFrom: string, dateTo: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('transactions')
    .select('date, amount, direction, concepto, currency:currency_id(code)')
    .eq('user_id', userId)
    .gte('date', dateFrom)
    .lte('date', dateTo);

  const set = new Set<string>();
  for (const row of data || []) {
    const cur = (row as any).currency?.code || 'PYG';
    const fp = fingerprint({
      date: row.date,
      amount: row.amount,
      direction: row.direction,
      currency: cur,
      description: row.concepto || '',
    });
    set.add(fp);
  }
  return set;
}

// ── PDF transactions → PreviewRow[] ──────────────────────────────────────────

/**
 * Convert parsed PDF credit-card transactions into the standard PreviewRow[]
 * format (with duplicate check + auto-categorisation) so they can be reviewed
 * and imported through the same preview flow as bank-XLSX imports.
 */
export async function pdfTxsToPreviewRows(
  txs: ParsedCardTransaction[],
  userId: string
): Promise<PreviewRow[]> {
  if (txs.length === 0) return [];

  const dates = txs.map(t => t.opDate).filter(Boolean).sort();
  const dbFingerprints = await buildFingerprintSet(userId, dates[0], dates[dates.length - 1]);
  const withinFileSet = new Set<string>();

  return txs.map(tx => {
    const direction: 'income' | 'expense' = tx.section === 'pagos' ? 'income' : 'expense';
    const fp = fingerprint({ date: tx.opDate, amount: tx.amount, direction, currency: tx.currency, description: tx.description });
    const isDuplicate = dbFingerprints.has(fp) || withinFileSet.has(fp);
    if (!isDuplicate) withinFileSet.add(fp);
    const rule = autoCategorize(tx.description);
    return {
      date: tx.opDate,
      amount: tx.amount,
      direction,
      description: tx.description,
      reference: tx.coupon,
      currency: tx.currency,
      previewId: newPreviewId(),
      isDuplicate,
      suggestedCategory: rule?.name ?? null,
      suggestedCategoryType: rule?.type ?? null,
      selected: !isDuplicate,
      budgetId: null,
    } satisfies PreviewRow;
  });
}

// ── STEP 1: Parse + preview (NO DB insert) ────────────────────────────────────

export async function parseForPreview(
  file: File,
  userId: string,
  onProgress?: (pct: number, msg: string) => void
): Promise<{ format: BankFormat; rows: PreviewRow[] }> {
  onProgress?.(5, 'Leyendo archivo...');
  const buffer = await file.arrayBuffer();

  onProgress?.(15, 'Detectando formato...');
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const format = detectFormat(wb, buffer);
  onProgress?.(20, `Formato: ${formatLabel(format)}`);

  const parsed = parseFile(wb, buffer, format);
  onProgress?.(45, `${parsed.length} transacciones encontradas`);

  if (parsed.length === 0) {
    return { format, rows: [] };
  }

  // Check DB for duplicates
  onProgress?.(55, 'Verificando duplicados en base de datos...');
  const dates = parsed.map(p => p.date).sort();
  const dbFingerprints = await buildFingerprintSet(userId, dates[0], dates[dates.length - 1]);

  // Build preview rows (also track within-file duplicates)
  const withinFileSet = new Set<string>();
  const rows: PreviewRow[] = parsed.map(tx => {
    const fp = fingerprint(tx);
    const isDbDup = dbFingerprints.has(fp);
    const isFileDup = withinFileSet.has(fp);
    const isDuplicate = isDbDup || isFileDup;
    if (!isDuplicate) withinFileSet.add(fp);

    const rule = autoCategorize(tx.description);
    return {
      ...tx,
      previewId: newPreviewId(),
      isDuplicate,
      suggestedCategory: rule?.name ?? null,
      suggestedCategoryType: rule?.type ?? null,
      selected: !isDuplicate,  // duplicates pre-deselected
    };
  });

  onProgress?.(100, 'Listo para revisar');
  return { format, rows };
}

// ── STEP 2: Import selected rows ──────────────────────────────────────────────

export async function importSelected(
  rows: PreviewRow[],
  userId: string,
  lookups: ImportLookups,
  format: BankFormat,
  onProgress?: (pct: number, msg: string) => void
): Promise<ImportResult> {
  const { catMap, pmMap, curMap } = lookups;
  const newCats: string[] = [];
  const newPMs: string[] = [];
  const categoryAssignments = new Map<string, string>();

  onProgress?.(5, 'Preparando importación...');

  // Auto-create payment method for this bank
  const pmName = format === 'atlas-bank' ? 'Atlas Bank'
    : format === 'itau-credit-card' ? 'Itaú Tarjeta de Crédito'
    : format === 'itau-savings-usd' ? 'Itaú Ahorro USD'
    : null;

  let pmId: string | null = null;
  if (pmName) {
    pmId = await resolveOrCreatePaymentMethod(pmName, userId, pmMap, newPMs);
  }

  const defaultCurId = curMap.get('pyg') ?? null;
  const usdCurId = curMap.get('usd') ?? null;

  onProgress?.(15, 'Creando categorías...');
  const toInsert: object[] = [];

  for (let i = 0; i < rows.length; i++) {
    const tx = rows[i];
    let categoryId: string | null = null;

    if (tx.suggestedCategory && tx.suggestedCategoryType) {
      categoryId = await resolveOrCreateCategory(
        tx.suggestedCategory, tx.suggestedCategoryType, userId, catMap, newCats
      );
      categoryAssignments.set(tx.description, tx.suggestedCategory);
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
      budget_id: tx.budgetId ?? null,
      concepto: tx.description || null,
      nro_operacion: tx.reference || null,
      additional_info: tx.section ? `sección: ${tx.section}` : null,
    });

    if (i % 50 === 0) onProgress?.(15 + Math.round((i / rows.length) * 40), `Preparando fila ${i + 1}/${rows.length}...`);
  }

  onProgress?.(55, 'Insertando transacciones...');
  const { ok, failed, errors } = await insertBatch(toInsert, onProgress, 55, 35);

  onProgress?.(92, 'Generando análisis...');
  const analysis = computeAnalysis(rows, categoryAssignments);

  onProgress?.(100, '¡Importación completada!');
  return { ok, duplicatesSkipped: 0, failed, errors, newCategoriesCreated: newCats, newPaymentMethodsCreated: newPMs, format, analysis };
}

// ── Category/PM resolution ────────────────────────────────────────────────────

async function resolveOrCreateCategory(
  name: string,
  type: 'income' | 'expense',
  userId: string,
  catMap: Map<string, string>,
  created: string[]
): Promise<string | null> {
  const key = name.toLowerCase();
  if (catMap.has(key)) return catMap.get(key)!;
  const { data } = await createCategory({ name, category_type: type, user_id: userId, family_group_id: null, parent_id: null });
  if (data?.id) { catMap.set(key, data.id); if (!created.includes(name)) created.push(name); return data.id; }
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
  const { data, error } = await supabase
    .from('user_payment_methods')
    .insert({ user_id: userId, name: bankName, details: 'transfer' })
    .select('id')
    .single();
  if (!error && data?.id) { pmMap.set(key, data.id); if (!created.includes(bankName)) created.push(bankName); return data.id; }
  return null;
}

// ── Batch insert ──────────────────────────────────────────────────────────────

async function insertBatch(
  rows: object[],
  onProgress?: (pct: number, msg: string) => void,
  progressBase = 55,
  progressRange = 35
): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0; let failed = 0; const errors: string[] = [];
  const total = Math.ceil(rows.length / 50);
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from('transactions').insert(batch);
    const batchIdx = Math.floor(i / 50) + 1;
    if (error) { failed += batch.length; errors.push(`Lote ${batchIdx}: ${error.message}`); }
    else ok += batch.length;
    onProgress?.(progressBase + Math.round((batchIdx / total) * progressRange), `Insertando lote ${batchIdx}/${total}...`);
  }
  return { ok, failed, errors };
}

// ── Financial analysis ────────────────────────────────────────────────────────

function computeAnalysis(
  rows: (ParsedTransaction | PreviewRow)[],
  categoryAssignments: Map<string, string>
): ImportAnalysis {
  if (rows.length === 0) return {
    totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0,
    dateRange: { from: '', to: '' }, topCategories: [], recurringExpenses: [],
    detectedDebts: [], foreignExpenses: [], monthlyTrend: [],
  };

  let totalIncome = 0;
  let totalExpenses = 0;
  const catTotals = new Map<string, { total: number; count: number }>();
  const monthMap = new Map<string, { incomes: number; expenses: number }>();
  const descMap = new Map<string, { total: number; count: number; months: Set<string> }>();
  const debts: ParsedTransaction[] = [];
  const foreign: ParsedTransaction[] = [];
  const dates: string[] = [];

  for (const tx of rows) {
    dates.push(tx.date);
    if (tx.direction === 'income') totalIncome += tx.amount;
    else totalExpenses += tx.amount;

    const month = tx.date.slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { incomes: 0, expenses: 0 });
    const m = monthMap.get(month)!;
    if (tx.direction === 'income') m.incomes += tx.amount;
    else m.expenses += tx.amount;

    const cat = categoryAssignments.get(tx.description) ?? autoCategorize(tx.description)?.name ?? 'Sin categoría';
    if (tx.direction === 'expense') {
      if (!catTotals.has(cat)) catTotals.set(cat, { total: 0, count: 0 });
      const c = catTotals.get(cat)!;
      c.total += tx.amount; c.count++;
    }

    const normDesc = normalize(tx.description).slice(0, 40);
    if (!descMap.has(normDesc)) descMap.set(normDesc, { total: 0, count: 0, months: new Set() });
    const d = descMap.get(normDesc)!;
    d.total += tx.amount; d.count++; d.months.add(month);

    if (autoCategorize(tx.description)?.name === 'Préstamos / Cuotas') debts.push(tx as ParsedTransaction);
    if (tx.currency === 'USD' || (tx as any).section === 'exterior') foreign.push(tx as ParsedTransaction);
  }

  dates.sort();
  const topCategories = [...catTotals.entries()]
    .map(([name, v]) => ({ name, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total).slice(0, 6);

  const recurringExpenses = [...descMap.entries()]
    .filter(([, v]) => v.count >= 2 && v.months.size >= 2)
    .map(([description, v]) => ({ description, occurrences: v.count, totalAmount: v.total, avgAmount: Math.round(v.total / v.count) }))
    .sort((a, b) => b.occurrences - a.occurrences).slice(0, 8);

  const monthlyTrend = [...monthMap.entries()]
    .map(([month, v]) => ({ month, incomes: v.incomes, expenses: v.expenses }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses,
    transactionCount: rows.length,
    dateRange: { from: dates[0] || '', to: dates[dates.length - 1] || '' },
    topCategories, recurringExpenses,
    detectedDebts: debts.map(d => ({ description: d.description, amount: d.amount })).slice(0, 10),
    foreignExpenses: foreign.map(f => ({ description: f.description, amount: f.amount, currency: f.currency })).slice(0, 10),
    monthlyTrend,
  };
}
