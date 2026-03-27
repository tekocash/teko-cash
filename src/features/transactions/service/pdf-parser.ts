/**
 * PDF Credit Card Statement Parser
 * Supports: Ueno Bank Mastercard, Itaú CC, Atlas Bank
 *
 * Uses pdfjs-dist to extract text, then pattern-matches known statement layouts.
 */

import type { TextItem } from 'pdfjs-dist/types/src/display/api';
// Vite bundles the worker as a local asset — avoids CDN fetch errors
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PdfCardFormat = 'ueno-mastercard' | 'itau-credit-card' | 'atlas-bank' | 'unknown';

export interface ParsedCardTransaction {
  opDate: string;      // 'yyyy-MM-dd'
  processDate: string; // 'yyyy-MM-dd'
  coupon: string;
  description: string;
  amount: number;
  currency: 'PYG' | 'USD';
  isFinanceable: boolean;  // FIN. column
  hasIva: boolean;         // IVA column
  section?: string;        // 'paraguay' | 'exterior' | 'pagos'
}

export interface CardFinancialSummary {
  // Header data
  cardHolder: string;
  cardNumberMasked: string;
  bank: string;
  format: PdfCardFormat;
  statementDate: string;   // closing date of statement
  dueDate: string;         // payment due date
  // Credit line info
  creditLimit: number;
  availableCredit: number;
  currency: 'PYG' | 'USD';
  // Balance breakdown
  previousDebt: number;
  payments: number;
  financedBalance: number;   // Saldo financiado = previousDebt - payments
  purchasesAndCharges: number;
  periodTotalDebt: number;
  installmentDebt: number;
  totalDebt: number;
  // Financial charges
  interest: number;
  punitory: number;           // Punitorio (mora)
  ivaOnCharges: number;
  totalFinancialCharges: number;
  // Payment info
  minimumPayment: number;
  daysInDefault: number;     // días mora
  // Rates
  tan: number;               // TAN %
  tae: number;               // TAE %
}

export interface ParsedCardStatement {
  format: PdfCardFormat;
  summary: CardFinancialSummary;
  transactions: ParsedCardTransaction[];
  rawText: string;
}

// ── PDF text extraction ────────────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  // Dynamic import to keep bundle lean
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker from local Vite-bundled asset (avoids CDN fetch failures)
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Join items preserving approximate layout with newlines at Y breaks
    let lastY: number | null = null;
    const lineBuffer: string[] = [];
    const lines: string[] = [];
    for (const item of content.items as TextItem[]) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(lineBuffer.join(' '));
        lineBuffer.length = 0;
      }
      lineBuffer.push(item.str);
      lastY = y;
    }
    if (lineBuffer.length) lines.push(lineBuffer.join(' '));
    pages.push(lines.join('\n'));
  }
  return pages.join('\n--- PAGE BREAK ---\n');
}

// ── Format detection ───────────────────────────────────────────────────────────

function detectPdfFormat(text: string): PdfCardFormat {
  const t = text.toLowerCase();
  if (t.includes('ueno') || t.includes('banco ueno')) return 'ueno-mastercard';
  if (t.includes('itaú') || t.includes('itau') || (t.includes('banco itau') || t.includes('itaucred'))) return 'itau-credit-card';
  if (t.includes('atlas bank') || t.includes('banco atlas')) return 'atlas-bank';
  return 'unknown';
}

// ── Common helpers ─────────────────────────────────────────────────────────────

/** Parse "dd/mm/yyyy" or "dd/mm/yy" → "yyyy-MM-dd" */
function parseDateDDMMYYYY(s: string): string {
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return '';
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${month}-${day}`;
}

/** Parse Paraguayan number strings: "1.234.567" or "1,234,567" → number */
function parsePYGAmount(s: string): number {
  // Remove all dots and commas except the last separator
  // PYG format uses dots as thousands separator, no decimal
  const clean = s.replace(/\./g, '').replace(/,/g, '').trim();
  return parseInt(clean, 10) || 0;
}

function parseAmount(s: string, currency: 'PYG' | 'USD'): number {
  if (currency === 'USD') {
    return parseFloat(s.replace(/,/g, '').trim()) || 0;
  }
  return parsePYGAmount(s);
}

/** Extract a labelled value: e.g. "TAN 14,41%" → 14.41 */
function extractPercentage(text: string, label: string): number {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped + '[:\\s]*(\\d+[,.]\\d+)\\s*%', 'i');
  const m = text.match(re);
  if (!m) return 0;
  return parseFloat(m[1].replace(',', '.'));
}

/** Extract a labelled PYG amount: e.g. "Pago Mínimo 60.005" */
function extractPYGLabel(text: string, label: string): number {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Handle multiline/spaces between label and value
  const re = new RegExp(escaped + '[:\\s]+([\\d\\.]+)', 'i');
  const m = text.match(re);
  return m ? parsePYGAmount(m[1]) : 0;
}

// ── Ueno Bank Mastercard Parser ────────────────────────────────────────────────

function parseUenoSummary(text: string): CardFinancialSummary {
  // Card holder — appears near top
  const holderMatch = text.match(/(?:titular|nombre)[:\s]+([A-ZÁÉÍÓÚÑ\s]+)/i)
    || text.match(/([A-ZÁÉÍÓÚÑ]{3,}\s+[A-ZÁÉÍÓÚÑ]{3,}(?:\s+[A-ZÁÉÍÓÚÑ]{3,})*)\s*\n/);
  const cardHolder = holderMatch ? holderMatch[1].trim() : '';

  // Card number masked
  const cardNumMatch = text.match(/\d{4}\s+\d{4}\s+\d{4}\s+\d{4}|\d{16}|\*{4}\s*\d{4}/);
  const cardNumberMasked = cardNumMatch ? cardNumMatch[0].replace(/\s/g, '') : '';

  // Statement date / due date
  const dueDateMatch = text.match(/(?:fecha\s+de\s+vencimiento|vencimiento|vto\.?)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const stmtDateMatch = text.match(/(?:fecha\s+de\s+cierre|cierre|extracto)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const dueDate = dueDateMatch ? parseDateDDMMYYYY(dueDateMatch[1]) : '';
  const statementDate = stmtDateMatch ? parseDateDDMMYYYY(stmtDateMatch[1]) : '';

  // Credit line
  const limitMatch = text.match(/(?:l[íi]nea\s+de\s+cr[eé]dito|cr[eé]dito\s+total)[:\s]+([\d\.]+)/i);
  const availMatch = text.match(/(?:cr[eé]dito\s+disponible|disponible)[:\s]+([\d\.]+)/i);
  const creditLimit = limitMatch ? parsePYGAmount(limitMatch[1]) : 0;
  const availableCredit = availMatch ? parsePYGAmount(availMatch[1]) : 0;

  // Balance items
  const previousDebt = extractPYGLabel(text, 'Deuda anterior');
  const payments = extractPYGLabel(text, 'Pagos');
  const financedBalance = extractPYGLabel(text, 'Saldo financiado');
  const purchasesAndCharges = extractPYGLabel(text, 'Compras y cargos');
  const periodTotalDebt = extractPYGLabel(text, 'Deuda total del per');
  const installmentDebt = extractPYGLabel(text, 'Deuda en cuotas');
  const totalDebt = extractPYGLabel(text, 'Deuda total');

  // Financial charges
  const interest = extractPYGLabel(text, 'Inter[eé]s') || extractPYGLabel(text, 'Interes');
  const punitory = extractPYGLabel(text, 'Punitorio');
  const ivaOnCharges = extractPYGLabel(text, 'IVA s/Cgos') || extractPYGLabel(text, 'IVA');
  const totalFinancialCharges = extractPYGLabel(text, 'Total');

  // Rates
  const tan = extractPercentage(text, 'TAN');
  const tae = extractPercentage(text, 'TAE');

  // Minimum payment
  const minimumPayment = extractPYGLabel(text, 'Pago M[íi]nimo') || extractPYGLabel(text, 'Pago Minimo');

  // Days in default
  const moraMatch = text.match(/(?:d[íi]as\s+mora|mora)[:\s]+(\d+)/i);
  const daysInDefault = moraMatch ? parseInt(moraMatch[1], 10) : 0;

  return {
    cardHolder,
    cardNumberMasked,
    bank: 'Ueno Bank',
    format: 'ueno-mastercard',
    statementDate,
    dueDate,
    creditLimit,
    availableCredit,
    currency: 'PYG',
    previousDebt,
    payments,
    financedBalance,
    purchasesAndCharges,
    periodTotalDebt,
    installmentDebt,
    totalDebt,
    interest,
    punitory,
    ivaOnCharges,
    totalFinancialCharges,
    minimumPayment,
    daysInDefault,
    tan,
    tae,
  };
}

/**
 * Parse Ueno transaction rows.
 * Columns (based on known statement layout):
 *   Fec.Operación | Fec.Proceso | N°Cupón | Detalle | FIN.(S/N) | IVA | Monto
 */
function parseUenoTransactions(text: string): ParsedCardTransaction[] {
  const rows: ParsedCardTransaction[] = [];

  // Split into lines and find transaction section
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Heuristic: transaction rows look like: DD/MM/YY DD/MM/YY <coupon> <desc...> S/N S/N <amount>
  const txLineRe = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\S+)\s+(.+?)\s+(S|N)\s+(S|N)\s+([\d\.]+)\s*$/;

  for (const line of lines) {
    const m = line.match(txLineRe);
    if (!m) continue;
    const [, opDateRaw, procDateRaw, coupon, description, fin, iva, amtRaw] = m;
    rows.push({
      opDate: parseDateDDMMYYYY(opDateRaw),
      processDate: parseDateDDMMYYYY(procDateRaw),
      coupon,
      description: description.trim(),
      amount: parsePYGAmount(amtRaw),
      currency: 'PYG',
      isFinanceable: fin === 'S',
      hasIva: iva === 'S',
    });
  }

  // Fallback: looser pattern — just two dates followed by description and amount at end
  if (rows.length === 0) {
    const looseTxRe = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d\.]{4,})\s*$/;
    for (const line of lines) {
      const m = line.match(looseTxRe);
      if (!m) continue;
      const [, opDateRaw, procDateRaw, description, amtRaw] = m;
      // Skip header-like lines
      if (/fec|detalle|cupon|fecha/i.test(description)) continue;
      rows.push({
        opDate: parseDateDDMMYYYY(opDateRaw),
        processDate: parseDateDDMMYYYY(procDateRaw),
        coupon: '',
        description: description.trim(),
        amount: parsePYGAmount(amtRaw),
        currency: 'PYG',
        isFinanceable: false,
        hasIva: false,
      });
    }
  }

  return rows;
}

// ── Itaú CC Parser ─────────────────────────────────────────────────────────────

function parseItauCCSummary(text: string): CardFinancialSummary {
  const holderMatch = text.match(/(?:titular|nombre)[:\s]+([A-ZÁÉÍÓÚÑ\s]+)/i);
  const cardHolder = holderMatch ? holderMatch[1].trim() : '';

  const cardNumMatch = text.match(/\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}|\*+\d{4}/);
  const cardNumberMasked = cardNumMatch ? cardNumMatch[0] : '';

  const dueDateMatch = text.match(/(?:vencimiento|vto\.?)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const stmtDateMatch = text.match(/(?:cierre|extracto)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const dueDate = dueDateMatch ? parseDateDDMMYYYY(dueDateMatch[1]) : '';
  const statementDate = stmtDateMatch ? parseDateDDMMYYYY(stmtDateMatch[1]) : '';

  const limitMatch = text.match(/(?:l[íi]nea\s+de\s+cr[eé]dito)[:\s]+([\d\.]+)/i);
  const availMatch = text.match(/(?:cr[eé]dito\s+disponible)[:\s]+([\d\.]+)/i);

  return {
    cardHolder,
    cardNumberMasked,
    bank: 'Itaú',
    format: 'itau-credit-card',
    statementDate,
    dueDate,
    creditLimit: limitMatch ? parsePYGAmount(limitMatch[1]) : 0,
    availableCredit: availMatch ? parsePYGAmount(availMatch[1]) : 0,
    currency: 'PYG',
    previousDebt: extractPYGLabel(text, 'Deuda anterior'),
    payments: extractPYGLabel(text, 'Pagos'),
    financedBalance: extractPYGLabel(text, 'Saldo financiado'),
    purchasesAndCharges: extractPYGLabel(text, 'Compras y cargos'),
    periodTotalDebt: extractPYGLabel(text, 'Deuda total del per'),
    installmentDebt: extractPYGLabel(text, 'Deuda en cuotas'),
    totalDebt: extractPYGLabel(text, 'Deuda total'),
    interest: extractPYGLabel(text, 'Inter[eé]s') || extractPYGLabel(text, 'Interes'),
    punitory: extractPYGLabel(text, 'Punitorio'),
    ivaOnCharges: extractPYGLabel(text, 'IVA s/Cgos') || extractPYGLabel(text, 'IVA'),
    totalFinancialCharges: extractPYGLabel(text, 'Total gastos financieros') || extractPYGLabel(text, 'Gastos financieros'),
    minimumPayment: extractPYGLabel(text, 'Pago M[íi]nimo') || extractPYGLabel(text, 'Pago Minimo'),
    daysInDefault: 0,
    tan: extractPercentage(text, 'TAN'),
    tae: extractPercentage(text, 'TAE'),
  };
}

function parseItauCCTransactions(text: string): ParsedCardTransaction[] {
  // Same structure as Ueno — dd/mm/yy dd/mm/yy coupon desc fin iva amount
  return parseUenoTransactions(text); // reuse same regex patterns
}

// ── Atlas Bank PDF Parser ──────────────────────────────────────────────────────

function parseAtlasBankPdfSummary(text: string): CardFinancialSummary {
  const holderMatch = text.match(/(?:titular)[:\s]+([A-ZÁÉÍÓÚÑ\s]+)/i);
  const cardHolder = holderMatch ? holderMatch[1].trim() : '';
  const dueDateMatch = text.match(/(?:vencimiento)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  return {
    cardHolder,
    cardNumberMasked: '',
    bank: 'Atlas Bank',
    format: 'atlas-bank',
    statementDate: '',
    dueDate: dueDateMatch ? parseDateDDMMYYYY(dueDateMatch[1]) : '',
    creditLimit: 0,
    availableCredit: 0,
    currency: 'PYG',
    previousDebt: 0,
    payments: 0,
    financedBalance: 0,
    purchasesAndCharges: 0,
    periodTotalDebt: 0,
    installmentDebt: 0,
    totalDebt: 0,
    interest: 0,
    punitory: 0,
    ivaOnCharges: 0,
    totalFinancialCharges: 0,
    minimumPayment: 0,
    daysInDefault: 0,
    tan: 0,
    tae: 0,
  };
}

function parseAtlasBankPdfTransactions(text: string): ParsedCardTransaction[] {
  return parseUenoTransactions(text);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function parsePdfStatement(file: File): Promise<ParsedCardStatement> {
  const rawText = await extractPdfText(file);
  const format = detectPdfFormat(rawText);

  let summary: CardFinancialSummary;
  let transactions: ParsedCardTransaction[];

  switch (format) {
    case 'ueno-mastercard':
      summary = parseUenoSummary(rawText);
      transactions = parseUenoTransactions(rawText);
      break;
    case 'itau-credit-card':
      summary = parseItauCCSummary(rawText);
      transactions = parseItauCCTransactions(rawText);
      break;
    case 'atlas-bank':
      summary = parseAtlasBankPdfSummary(rawText);
      transactions = parseAtlasBankPdfTransactions(rawText);
      break;
    default:
      // Try generic parse
      summary = parseUenoSummary(rawText);
      summary.bank = 'Desconocido';
      transactions = parseUenoTransactions(rawText);
  }

  return { format, summary, transactions, rawText };
}

export function pdfFormatLabel(format: PdfCardFormat): string {
  const labels: Record<PdfCardFormat, string> = {
    'ueno-mastercard': 'Ueno Bank Mastercard',
    'itau-credit-card': 'Itaú Tarjeta de Crédito',
    'atlas-bank': 'Atlas Bank',
    'unknown': 'Formato desconocido',
  };
  return labels[format];
}
