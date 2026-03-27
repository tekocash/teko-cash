import React, { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
  LineElement, PointElement, Filler,
} from 'chart.js';
import {
  TrendingUp, TrendingDown, Repeat, AlertTriangle,
  Target, ChevronDown, RefreshCw, BarChart2, LineChart, BarChart3,
} from 'lucide-react';
import { useFinancialAnalysis } from '../hooks/useFinancialAnalysis';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, LineElement, PointElement, Filler);

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

const CAT_COLORS = [
  '#6366f1', '#f43f5e', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

type TrendChart = 'income-expense' | 'categories' | 'savings';

function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
          {icon}{title}
        </div>
        <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function FinancialBoard() {
  const { data, isLoading, error, reload } = useFinancialAnalysis();
  const [trendChart, setTrendChart] = useState<TrendChart>('income-expense');

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-400">Cargando análisis financiero...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center space-y-3">
        <p className="text-sm text-gray-400">{error || 'No hay datos disponibles aún.'}</p>
        <button onClick={reload} className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  const labels = data.trend.map(t => t.label);

  // Chart 1: Income vs Expense bar
  const incExpData = {
    labels,
    datasets: [
      { label: 'Ingresos', data: data.trend.map(t => t.incomes), backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Gastos',   data: data.trend.map(t => t.expenses), backgroundColor: '#f43f5e', borderRadius: 4 },
    ],
  };

  // Chart 2: Stacked categories bar
  const catStackedData = {
    labels,
    datasets: data.categoryNames.map((name, i) => ({
      label: name,
      data: data.categoryTrend.map(t => t.categories.find(c => c.name === name)?.amount || 0),
      backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
      borderRadius: 2,
      stack: 'categories',
    })),
  };
  const catStackedOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 10 }, boxWidth: 10 } } },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { stacked: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, callback: (v: any) => fmtShort(v) } },
    },
  };

  // Chart 3: Savings rate line
  const savingsData = {
    labels,
    datasets: [
      {
        label: 'Tasa de ahorro (%)',
        data: data.trend.map(t => t.savingsRate),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#6366f1',
      },
      {
        label: 'Balance (Gs.)',
        data: data.trend.map(t => t.balance),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 2,
        pointBackgroundColor: '#10b981',
      },
    ],
  };
  const savingsOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { font: { size: 11 }, boxWidth: 12 } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, callback: (v: any) => `${v}%` }, title: { display: true, text: 'Ahorro %', font: { size: 9 } } },
      y1: { position: 'right' as const, grid: { display: false }, ticks: { font: { size: 10 }, callback: (v: any) => fmtShort(v) }, title: { display: true, text: 'Balance', font: { size: 9 } } },
    },
  };

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { font: { size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, callback: (v: any) => fmtShort(v) } },
    },
  };

  const savingsRateColor = (sr: number) =>
    sr >= 20 ? 'text-emerald-600 dark:text-emerald-400'
    : sr >= 0 ? 'text-amber-500'
    : 'text-red-500';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Visión Financiera</h2>
          <p className="text-xs text-gray-400 mt-0.5">Análisis completo de tu historial financiero</p>
        </div>
        <button onClick={reload} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* All-time KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos totales', value: fmt(data.allTimeIncome), sub: 'Todo el tiempo', color: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', icon: <TrendingUp size={16} className="text-emerald-500" /> },
          { label: 'Gastos totales', value: fmt(data.allTimeExpenses), sub: 'Todo el tiempo', color: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', icon: <TrendingDown size={16} className="text-red-500" /> },
          { label: 'Balance acumulado', value: fmt(data.allTimeBalance), sub: 'Neto total', color: data.allTimeBalance >= 0 ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-red-50 dark:bg-red-900/20', text: data.allTimeBalance >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-600 dark:text-red-400', icon: <Target size={16} className="text-indigo-500" /> },
          { label: 'Ahorro promedio/mes', value: fmt(data.avgMonthlySavings), sub: `Tasa: ${data.trend.length > 0 ? Math.round(data.trend.slice(-3).reduce((s, t) => s + t.savingsRate, 0) / 3) : 0}%`, color: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-300', icon: <Target size={16} className="text-violet-500" /> },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl p-4 ${card.color}`}>
            <div className="flex items-center gap-1.5 mb-1">{card.icon}<p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p></div>
            <p className={`text-base font-bold ${card.text}`}>{card.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* 12-month trend charts */}
      <Section title="Evolución mensual (12 meses)" icon={<TrendingUp size={15} className="text-indigo-500" />}>
        {/* Chart type tabs */}
        <div className="flex gap-1.5 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
          {([
            { id: 'income-expense', label: 'Ingresos vs Gastos', icon: <BarChart2 size={13} /> },
            { id: 'categories',     label: 'Por categoría',       icon: <BarChart3 size={13} /> },
            { id: 'savings',        label: 'Ahorro / Balance',    icon: <LineChart size={13} /> },
          ] as { id: TrendChart; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setTrendChart(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                trendChart === tab.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="h-56">
          {trendChart === 'income-expense' && <Bar data={incExpData} options={barOpts} />}
          {trendChart === 'categories' && (
            data.categoryNames.length > 0
              ? <Bar data={catStackedData} options={catStackedOpts} />
              : <div className="flex items-center justify-center h-full text-xs text-gray-400">Sin datos de categorías</div>
          )}
          {trendChart === 'savings' && <Line data={savingsData} options={savingsOpts} />}
        </div>

        {/* Savings rate pills */}
        {trendChart !== 'savings' && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.trend.map(t => (
              <div key={t.month} className="flex flex-col items-center min-w-[38px]">
                <span className={`text-[10px] font-bold ${savingsRateColor(t.savingsRate)}`}>{t.savingsRate}%</span>
                <span className="text-[9px] text-gray-400">{t.label.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-1">
          {trendChart === 'categories' ? 'Gastos apilados por categoría (top 6)' : 'Tasa de ahorro mensual'}
        </p>
      </Section>

      {/* Projections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-4">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3">📅 Este mes</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Ingresos</span><span className="text-emerald-600 font-medium">{fmt(data.currentMonthIncome)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Gastos</span><span className="text-red-500 font-medium">{fmt(data.currentMonthExpenses)}</span></div>
            <div className="flex justify-between border-t border-blue-100 dark:border-blue-800 pt-1.5"><span className="text-gray-600 dark:text-gray-300 font-medium">Balance</span><span className={`font-bold ${data.currentMonthBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(data.currentMonthBalance)}</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-violet-100 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 p-4">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-3">🔮 Proyección próximo mes</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Gastos estimados</span><span className="text-red-500 font-medium">{fmt(data.projectedNextMonthExpenses)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Promedio mensual</span><span className="text-gray-600 dark:text-gray-300">{fmt(data.avgMonthlyExpenses)}</span></div>
            <div className="flex justify-between border-t border-violet-100 dark:border-violet-800 pt-1.5"><span className="text-gray-600 dark:text-gray-300 font-medium">Ahorro potencial</span><span className={`font-bold ${data.avgMonthlySavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(data.avgMonthlySavings)}</span></div>
          </div>
        </div>
      </div>

      {/* Top categories */}
      {data.topCategories.length > 0 && (
        <Section title="Distribución de gastos (últimos 3 meses)" icon={<Target size={15} className="text-violet-500" />}>
          <div className="space-y-2.5 mt-2">
            {data.topCategories.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 shrink-0">{fmt(cat.total)} · {cat.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${cat.pct}%`, backgroundColor: cat.color || `hsl(${i * 50}, 70%, 55%)` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recurring expenses */}
      {data.recurringItems.length > 0 && (
        <Section title="Gastos recurrentes detectados" icon={<Repeat size={15} className="text-amber-500" />} defaultOpen={false}>
          <div className="space-y-2 mt-2">
            {data.recurringItems.map(item => (
              <div key={item.concepto} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{item.concepto}</p>
                  <p className="text-[10px] text-gray-400">{item.occurrences} veces · último: {item.lastDate}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{fmt(item.avgAmount)}</p>
                  <p className="text-[10px] text-gray-400">promedio</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Total estimado recurrente/mes: <strong>{fmt(data.recurringItems.reduce((s, r) => s + r.avgAmount, 0))}</strong>
          </p>
        </Section>
      )}

      {/* Debt tracking */}
      {data.debtItems.length > 0 && (
        <Section title="Préstamos / Cuotas detectadas" icon={<AlertTriangle size={15} className="text-red-500" />} defaultOpen={false}>
          <div className="space-y-2 mt-2">
            {data.debtItems.map(item => (
              <div key={item.concepto} className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{item.concepto}</p>
                  <p className="text-[10px] text-gray-400">último pago: {item.lastDate}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">{fmt(item.totalPaid)}</p>
                  <p className="text-[10px] text-gray-400">total pagado</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Financial health tips */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">💡 Recomendaciones</p>
        {data.avgMonthlySavings > 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            ✅ Tu ahorro promedio es <strong>{fmt(data.avgMonthlySavings)}/mes</strong>. En 12 meses habrás ahorrado <strong>{fmt(data.avgMonthlySavings * 12)}</strong>.
          </p>
        )}
        {data.avgMonthlySavings < 0 && (
          <p className="text-xs text-red-600 dark:text-red-400">
            ⚠️ Estás gastando <strong>{fmt(Math.abs(data.avgMonthlySavings))}/mes más</strong> de lo que ingresás en promedio. Revisá los gastos recurrentes.
          </p>
        )}
        {data.recurringItems.length > 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            🔁 Tenés <strong>{data.recurringItems.length} gastos recurrentes</strong> que suman <strong>{fmt(data.recurringItems.reduce((s, r) => s + r.avgAmount, 0))}/mes</strong>.
          </p>
        )}
        {data.projectedNextMonthExpenses > data.avgMonthlyExpenses * 1.15 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            📈 Tu proyección para el próximo mes ({fmt(data.projectedNextMonthExpenses)}) es <strong>15%+ mayor</strong> que tu promedio habitual.
          </p>
        )}
        {data.debtItems.length > 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            💳 Detectamos <strong>{data.debtItems.length} compromisos de deuda/cuota</strong> activos. Total pagado hasta ahora: <strong>{fmt(data.debtItems.reduce((s, d) => s + d.totalPaid, 0))}</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
