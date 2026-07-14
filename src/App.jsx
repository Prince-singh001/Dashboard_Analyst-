import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart2,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  FolderOpen,
  Home,
  Layers,
  Loader2,
  Menu,
  MessageSquare,
  Moon,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Table,
  Terminal,
  Trash2,
  TrendingUp,
  UploadCloud,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as ChartTooltip,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const CHART_COLORS = ['#14b8a6','#06b6d4','#8b5cf6','#f59e0b','#f43f5e','#10b981','#3b82f6','#ec4899'];

const QUICK_ANALYSIS_PROMPTS = [
  { label: 'Dataset Summary',    prompt: 'Give me a complete summary of this dataset including key statistics, data types, and notable patterns.' },
  { label: 'Missing Values',     prompt: 'Find all columns with missing values, show the count and percentage of nulls per column.' },
  { label: 'Duplicate Rows',     prompt: 'Find and count duplicate rows in the dataset.' },
  { label: 'Numeric Statistics', prompt: 'Show detailed statistical summary (mean, median, std, min, max, quartiles) for all numeric columns.' },
  { label: 'Categorical Summary',prompt: 'List all categorical columns with their top 5 most frequent values and their counts.' },
  { label: 'Correlation Analysis',prompt: 'Show correlation analysis between all numeric columns and identify the strongest correlations.' },
  { label: 'Detect Outliers',    prompt: 'Detect outliers in numeric columns using IQR method and report which rows/values are outliers.' },
  { label: 'Top Records',        prompt: 'Show the top 10 performing records based on the most relevant numeric column.' },
  { label: 'Lowest Records',     prompt: 'Show the bottom 10 lowest performing records based on the most relevant numeric column.' },
];

const SAMPLE_DATASETS = [
  {
    key: 'sales', label: 'Company Sales', icon: TrendingUp, color: 'teal',
    filename: 'company_sales_sample.csv',
    csv: `Date,Product,Category,Sales,Quantity,Region\n2026-01-01,Wireless Mouse,Electronics,450.0,15,North\n2026-01-02,Mechanical Keyboard,Electronics,899.0,10,East\n2026-01-03,Leather Journal,Office Supplies,120.0,8,South\n2026-01-04,Wireless Mouse,Electronics,300.0,10,West\n2026-01-05,Gel Pens 12-Pack,Office Supplies,75.0,25,North\n2026-01-06,Mechanical Keyboard,Electronics,1348.5,15,West\n2026-01-07,Ergonomic Chair,Furniture,2450.0,5,East\n2026-01-08,Leather Journal,Office Supplies,150.0,10,North\n2026-01-09,Ergonomic Chair,Furniture,1960.0,4,South\n2026-01-10,Gel Pens 12-Pack,Office Supplies,90.0,30,East\n2026-01-11,Wireless Mouse,Electronics,600.0,20,South\n2026-01-12,Mechanical Keyboard,Electronics,1798.0,20,North\n2026-01-13,Ergonomic Chair,Furniture,1470.0,3,West\n2026-01-14,Leather Journal,Office Supplies,225.0,15,East`,
  },
  {
    key: 'reviews', label: 'Tech Reviews', icon: BarChart2, color: 'cyan',
    filename: 'gadget_reviews_sample.csv',
    csv: `Gadget,Rating,Review_Length,Recommend,Price\nVaporSmart Watch,4.5,120,Yes,199.99\nEchoBuds Pro,3.8,85,No,79.99\nTitanTablet 10,4.2,210,Yes,349.99\nVaporSmart Watch,4.8,150,Yes,199.99\nLuminaProjector,4.0,95,Yes,129.99\nEchoBuds Pro,4.1,65,Yes,79.99\nTitanTablet 10,3.5,180,No,349.99\nLuminaProjector,4.7,240,Yes,129.99\nSolarPowerBank,4.9,75,Yes,39.99\nSolarPowerBank,4.3,110,Yes,39.99\nVaporSmart Watch,4.2,130,Yes,199.99\nEchoBuds Pro,4.5,100,Yes,79.99`,
  },
  {
    key: 'employees', label: 'HR Engagement', icon: Activity, color: 'violet',
    filename: 'employee_engagement_sample.csv',
    csv: `Employee_ID,Department,Tenure_Years,Satisfaction_Score,Performance_Rating\nEMP001,Engineering,3,4.2,Exceeds\nEMP002,Sales,1,3.5,Meets\nEMP003,Marketing,5,4.8,Exceeds\nEMP004,Engineering,2,3.9,Meets\nEMP005,HR,4,4.5,Exceeds\nEMP006,Sales,2,2.8,Meets\nEMP007,Engineering,6,4.9,Exceeds\nEMP008,Marketing,3,3.8,Meets\nEMP009,HR,1,4.0,Meets\nEMP010,Engineering,4,4.1,Meets\nEMP011,Sales,3,3.9,Meets\nEMP012,Engineering,5,4.6,Exceeds`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v, dec = 2) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(dec);
  return String(v);
};

const downloadCSV = (data, filename = 'export.csv') => {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const rows = [headers.join(','), ...data.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
};

const parseMarkdown = (text = '') => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    return (
      <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
        {parts.map((p, j) => j % 2 === 1
          ? <strong key={j} className="font-semibold text-white dark-text-override">{p}</strong>
          : p
        )}
      </p>
    );
  });
};

const timeAgo = (ts) => {
  if (!ts) return '';
  const now = new Date();
  const d = new Date(ts);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md text-sm font-medium animate-slideInRight min-w-[280px] max-w-[380px] ${
          t.type === 'success' ? 'bg-emerald-950/90 border-emerald-700/60 text-emerald-100' :
          t.type === 'error'   ? 'bg-rose-950/90 border-rose-700/60 text-rose-100' :
          t.type === 'warning' ? 'bg-amber-950/90 border-amber-700/60 text-amber-100' :
                                 'bg-slate-900/95 border-teal-700/40 text-slate-100'
        }`}>
          <span className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle   className="w-4 h-4 text-emerald-400" />}
            {t.type === 'error'   && <AlertCircle   className="w-4 h-4 text-rose-400"    />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400"   />}
            {t.type === 'info'    && <Sparkles      className="w-4 h-4 text-teal-400"    />}
          </span>
          <span className="flex-1 text-xs leading-relaxed">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ modal, onConfirm, onCancel }) {
  if (!modal) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-6 animate-slideDown">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/20 shrink-0">
            <Trash2 className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{modal.title || 'Confirm Delete'}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{modal.message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    online:   { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', label: 'Online'   },
    offline:  { dot: 'bg-rose-400',                  text: 'text-rose-400',    label: 'Offline'  },
    checking: { dot: 'bg-amber-400 animate-pulse',   text: 'text-amber-400',   label: 'Checking' },
  }[status] || { dot: 'bg-slate-500', text: 'text-slate-400', label: 'Unknown' };
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50">
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, color = 'teal' }) {
  const colors = {
    teal:    { bg: 'bg-teal-500/10',    border: 'border-teal-500/20',    icon: 'text-teal-400',    val: 'text-teal-400'    },
    cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    icon: 'text-cyan-400',    val: 'text-cyan-400'    },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', val: 'text-emerald-400' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400',   val: 'text-amber-400'   },
    rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: 'text-rose-400',    val: 'text-rose-400'    },
    violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  icon: 'text-violet-400',  val: 'text-violet-400'  },
    sky:     { bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     icon: 'text-sky-400',     val: 'text-sky-400'     },
  };
  const c = colors[color] || colors.teal;
  return (
    <div className="kpi-card rounded-xl p-4 border flex items-start gap-3 transition-all duration-200">
      <div className={`p-2.5 rounded-lg ${c.bg} border ${c.border} shrink-0`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold truncate">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${c.val} truncate`} title={String(value ?? '—')}>{fmt(value) ?? '—'}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Chart Renderer ───────────────────────────────────────────────────────────
function ChartRenderer({ suggestion, data, height = 300 }) {
  if (!suggestion || suggestion.type === 'none' || !data?.length) return null;
  const { type, x_key, y_keys } = suggestion;
  const firstY = y_keys?.[0];
  if (!firstY) return null;

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', fontSize: '11px' },
    labelStyle: { color: '#e2e8f0', fontWeight: 600 },
    itemStyle: { color: '#94a3b8' },
  };
  const axisProps = { stroke: '#475569', fontSize: 10, tickLine: false, axisLine: { stroke: '#1e293b' } };
  const gridProps = { strokeDasharray: '3 3', stroke: '#1e293b', opacity: 0.8 };
  const shared = { margin: { top: 10, right: 20, left: 0, bottom: 5 } };

  if (type === 'bar') return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} {...shared}>
        <CartesianGrid {...gridProps} /><XAxis dataKey={x_key} {...axisProps} /><YAxis {...axisProps} />
        <ChartTooltip {...tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        {y_keys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4,4,0,0]} maxBarSize={60} />)}
      </BarChart>
    </ResponsiveContainer>
  );
  if (type === 'line') return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} {...shared}>
        <CartesianGrid {...gridProps} /><XAxis dataKey={x_key} {...axisProps} /><YAxis {...axisProps} />
        <ChartTooltip {...tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        {y_keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
  if (type === 'area') return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} {...shared}>
        <defs>{y_keys.map((k, i) => (<linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} /><stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} /></linearGradient>))}</defs>
        <CartesianGrid {...gridProps} /><XAxis dataKey={x_key} {...axisProps} /><YAxis {...axisProps} />
        <ChartTooltip {...tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        {y_keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} fillOpacity={1} fill={`url(#g-${k})`} />)}
      </AreaChart>
    </ResponsiveContainer>
  );
  if (type === 'pie') return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={firstY} nameKey={x_key} cx="50%" cy="50%" outerRadius={Math.min(height/2.5,110)} label={({ name, percent }) => `${String(name).slice(0,12)}: ${(percent*100).toFixed(0)}%`} labelLine={false}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <ChartTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', fontSize: '11px' }} />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
  if (type === 'scatter') return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart {...shared}>
        <CartesianGrid {...gridProps} /><XAxis type="number" dataKey={x_key} name={x_key} {...axisProps} /><YAxis type="number" dataKey={firstY} name={firstY} {...axisProps} />
        <ChartTooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name={`${firstY} vs ${x_key}`} data={data} fill={CHART_COLORS[0]} opacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  );
  return null;
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon = Database, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="p-4 rounded-full bg-slate-800/60 border border-slate-700/40 mb-4">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-300 mb-2">{title}</h3>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">{description}</p>
      {action}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: REPORTS
// ═════════════════════════════════════════════════════════════════════════════
function ReportsPage({ files, chatHistories, downloadCSV, addToast }) {
  const [filterFile, setFilterFile] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  // Flatten all AI responses into one list
  const allReports = [];
  Object.entries(chatHistories).forEach(([fileId, msgs]) => {
    const file = files.find(f => f.file_id === fileId);
    msgs.forEach((msg, idx) => {
      if (msg.sender === 'ai' && !msg.error && msg.explanation && idx > 0) {
        allReports.push({
          id: `${fileId}-${idx}`,
          fileId,
          filename: file?.filename || 'Unknown',
          explanation: msg.explanation,
          hasChart: msg.chart_suggestion?.type !== 'none' && msg.data?.length > 0,
          hasTable: msg.data?.length > 0,
          data: msg.data,
          columns: msg.columns,
          chartType: msg.chart_suggestion?.type,
          chartTitle: msg.chart_suggestion?.title,
          timestamp: msg.timestamp,
          userQuery: msgs[idx - 1]?.explanation || '',
        });
      }
    });
  });

  const filtered = allReports.filter(r => {
    const matchFile = filterFile === 'all' || r.fileId === filterFile;
    const matchSearch = !searchQ || r.explanation.toLowerCase().includes(searchQ.toLowerCase()) || r.userQuery.toLowerCase().includes(searchQ.toLowerCase());
    return matchFile && matchSearch;
  });

  const totalCharts = allReports.filter(r => r.hasChart).length;
  const totalTables = allReports.filter(r => r.hasTable).length;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-teal-400" /> Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">All saved AI analysis results across your datasets.</p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={() => {
              const allData = filtered.map(r => ({ File: r.filename, Query: r.userQuery, Summary: r.explanation.slice(0, 200), Timestamp: r.timestamp }));
              downloadCSV(allData, 'all_reports.csv');
              addToast('Reports exported as CSV', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Export All
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard icon={Archive}      label="Total Reports"  value={allReports.length}  color="teal"    />
        <KPICard icon={BarChart2}    label="With Charts"    value={totalCharts}         color="cyan"    />
        <KPICard icon={Table}        label="With Tables"    value={totalTables}         color="violet"  />
        <KPICard icon={FileSpreadsheet} label="Datasets"   value={files.length}        color="emerald" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input type="text" placeholder="Search reports…" value={searchQ} onChange={e => setSearchQ(e.target.value)} className="form-input w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg" />
        </div>
        <select value={filterFile} onChange={e => setFilterFile(e.target.value)} className="form-input text-[11px] px-2.5 py-1.5 rounded-lg">
          <option value="all">All datasets</option>
          {files.map(f => <option key={f.file_id} value={f.file_id}>{f.filename}</option>)}
        </select>
        {(searchQ || filterFile !== 'all') && (
          <button onClick={() => { setSearchQ(''); setFilterFile('all'); }} className="text-xs text-slate-500 hover:text-teal-400 transition-colors flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Report cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No reports yet"
          description="Run AI analysis queries on your datasets — results will appear here as saved reports."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div key={report.id} className="rounded-xl border border-white/6 bg-slate-900/40 hover:border-teal-500/20 transition-all duration-200 overflow-hidden">
              <div className="p-4">
                {/* Report header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-medium">
                        {report.filename}
                      </span>
                      {report.hasChart && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono capitalize">
                          {report.chartType} chart
                        </span>
                      )}
                      {report.hasTable && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                          table data
                        </span>
                      )}
                    </div>
                    {report.userQuery && (
                      <p className="text-[11px] text-slate-500 italic mb-1.5">
                        <span className="text-teal-500 not-italic font-medium">Q:</span> {report.userQuery.slice(0, 120)}{report.userQuery.length > 120 ? '…' : ''}
                      </p>
                    )}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {report.explanation.replace(/\*\*/g, '')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[10px] text-slate-600 font-mono">{report.timestamp}</span>
                    {report.hasTable && (
                      <button
                        onClick={() => { downloadCSV(report.data, `report_${report.id}.csv`); addToast('Report exported', 'success'); }}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-teal-700/40 bg-teal-500/5 text-teal-400 hover:bg-teal-500/10 transition-colors"
                      >
                        <Download className="w-2.5 h-2.5" /> CSV
                      </button>
                    )}
                  </div>
                </div>

                {/* Mini data preview */}
                {report.hasTable && report.data.length > 0 && (
                  <div className="rounded-lg bg-slate-950/40 border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto max-h-28">
                      <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-slate-950/60 text-slate-500 border-b border-white/5">
                            {(report.columns || []).slice(0, 5).map(col => <th key={col} className="px-2.5 py-1.5 font-medium">{col}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                          {report.data.slice(0, 3).map((row, i) => (
                            <tr key={i} className="text-slate-400">
                              {(report.columns || []).slice(0, 5).map(col => (
                                <td key={col} className="px-2.5 py-1.5 truncate max-w-[120px]">{row[col] == null ? '—' : String(row[col])}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {report.data.length > 3 && (
                      <p className="text-[9px] text-slate-600 text-center py-1.5">+{report.data.length - 3} more rows</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: DATA LIBRARY
// ═════════════════════════════════════════════════════════════════════════════
function DataLibraryPage({ files, chatHistories, onSelectFile, onDeleteFile, onUploadClick, uploading, backendStatus }) {
  const [libSearch, setLibSearch] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name | rows | cols

  const enriched = files
    .filter(f => !libSearch || f.filename.toLowerCase().includes(libSearch.toLowerCase()))
    .map(f => {
      const queries = (chatHistories[f.file_id] || []).filter(m => m.sender === 'user').length;
      return { ...f, queries };
    })
    .sort((a, b) => {
      if (sortBy === 'rows') return (b.rows || 0) - (a.rows || 0);
      if (sortBy === 'cols') return (b.columns_count || 0) - (a.columns_count || 0);
      return a.filename.localeCompare(b.filename);
    });

  const totalRows = files.reduce((s, f) => s + (f.rows || 0), 0);
  const totalCols = files.reduce((s, f) => s + (f.columns_count || 0), 0);
  const totalQueries = Object.values(chatHistories).reduce((s, msgs) => s + msgs.filter(m => m.sender === 'user').length, 0);

  const colorMap = ['teal','cyan','violet','emerald','amber','sky'];

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-cyan-400" /> Data Library
          </h2>
          <p className="text-xs text-slate-500 mt-1">All your uploaded datasets in one place.</p>
        </div>
        <button
          onClick={onUploadClick}
          disabled={uploading || backendStatus === 'offline'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shrink-0"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
          Upload CSV
        </button>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard icon={FolderOpen}    label="Total Datasets"   value={files.length}   color="cyan"    />
        <KPICard icon={Database}      label="Total Rows"        value={totalRows}      color="teal"    />
        <KPICard icon={Layers}        label="Total Columns"     value={totalCols}      color="violet"  />
        <KPICard icon={MessageSquare} label="Queries Run"       value={totalQueries}   color="emerald" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input type="text" placeholder="Search datasets…" value={libSearch} onChange={e => setLibSearch(e.target.value)} className="form-input w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="form-input text-[11px] px-2.5 py-1.5 rounded-lg">
          <option value="name">Sort: Name</option>
          <option value="rows">Sort: Rows</option>
          <option value="cols">Sort: Columns</option>
        </select>
      </div>

      {/* Dataset cards */}
      {enriched.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={files.length === 0 ? 'No datasets uploaded' : 'No results found'}
          description={files.length === 0 ? 'Upload your first CSV to get started.' : 'Try a different search term.'}
          action={files.length === 0 && (
            <button onClick={onUploadClick} disabled={backendStatus === 'offline'} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors">
              <UploadCloud className="w-3.5 h-3.5" /> Upload CSV
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enriched.map((file, idx) => {
            const color = colorMap[idx % colorMap.length];
            const colorStyles = {
              teal:    { ring: 'border-teal-500/25 hover:border-teal-500/40',   badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',   btn: 'bg-teal-600 hover:bg-teal-500',   icon: 'text-teal-400'    },
              cyan:    { ring: 'border-cyan-500/25 hover:border-cyan-500/40',   badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',   btn: 'bg-cyan-600 hover:bg-cyan-500',   icon: 'text-cyan-400'    },
              violet:  { ring: 'border-violet-500/25 hover:border-violet-500/40', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20', btn: 'bg-violet-600 hover:bg-violet-500', icon: 'text-violet-400' },
              emerald: { ring: 'border-emerald-500/25 hover:border-emerald-500/40', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', btn: 'bg-emerald-600 hover:bg-emerald-500', icon: 'text-emerald-400' },
              amber:   { ring: 'border-amber-500/25 hover:border-amber-500/40',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   btn: 'bg-amber-600 hover:bg-amber-500',   icon: 'text-amber-400'   },
              sky:     { ring: 'border-sky-500/25 hover:border-sky-500/40',     badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',       btn: 'bg-sky-600 hover:bg-sky-500',       icon: 'text-sky-400'     },
            }[color] || { ring: 'border-teal-500/25', badge: 'bg-teal-500/10 text-teal-400', btn: 'bg-teal-600', icon: 'text-teal-400' };

            return (
              <div key={file.file_id} className={`rounded-xl border bg-slate-900/50 p-4 flex flex-col gap-3 transition-all duration-200 ${colorStyles.ring}`}>
                {/* File icon + name */}
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-slate-800/60 border border-white/6 shrink-0`}>
                    <FileSpreadsheet className={`w-5 h-5 ${colorStyles.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-200 truncate" title={file.filename}>{file.filename}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(file.rows || 0).toLocaleString()} rows · {file.columns_count || 0} cols</p>
                  </div>
                </div>

                {/* Stats chips */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colorStyles.badge}`}>
                    {(file.rows || 0).toLocaleString()} rows
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-800/50 border-slate-700/40 text-slate-400">
                    {file.columns_count || 0} columns
                  </span>
                  {file.queries > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-violet-500/10 border-violet-500/20 text-violet-400">
                      {file.queries} {file.queries === 1 ? 'query' : 'queries'}
                    </span>
                  )}
                </div>

                {/* Column list preview */}
                {file.columns?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-600 mb-1.5 font-semibold uppercase tracking-wider">Columns</p>
                    <div className="flex flex-wrap gap-1">
                      {file.columns.slice(0, 5).map(c => (
                        <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500 font-mono">{c}</span>
                      ))}
                      {file.columns.length > 5 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-600 font-mono">+{file.columns.length - 5}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-1">
                  <button
                    onClick={() => onSelectFile(file.file_id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-white text-[11px] font-semibold transition-all ${colorStyles.btn}`}
                  >
                    <Zap className="w-3 h-3" /> Analyze
                  </button>
                  <button
                    onClick={() => onDeleteFile(null, file.file_id, file.filename)}
                    className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 transition-colors"
                    title="Delete dataset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  // Theme
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) { root.classList.add('dark'); root.classList.remove('light-mode'); }
    else           { root.classList.remove('dark'); root.classList.add('light-mode'); }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Backend
  const [backendStatus, setBackendStatus] = useState('checking');
  const checkBackend = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      setBackendStatus(r.ok ? 'online' : 'offline');
    } catch { setBackendStatus('offline'); }
  }, []);
  useEffect(() => { checkBackend(); const id = setInterval(checkBackend, 30000); return () => clearInterval(id); }, [checkBackend]);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState(null);

  // Navigation: 'workspace' | 'reports' | 'library'
  const [currentPage, setCurrentPage] = useState('workspace');

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Files
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [activeFileMetadata, setActiveFileMetadata] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState('');
  const fileInputRef = useRef(null);

  // Workspace tabs
  const [activeTab, setActiveTab] = useState('overview');

  // AI Analyst
  const [queryText, setQueryText] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState({});
  const [expandedCodes, setExpandedCodes] = useState({});
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [model, setModel] = useState('gpt-4o-mini');
  const chatEndRef = useRef(null);

  // Data Preview
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(25);
  const [previewSortCol, setPreviewSortCol] = useState(null);
  const [previewSortDir, setPreviewSortDir] = useState('asc');
  const [selectedColumn, setSelectedColumn] = useState(null);

  // Visualize
  const [vizConfig, setVizConfig] = useState({ type: 'bar', xCol: '', yCol: '', agg: 'sum', topN: 10, sort: 'desc' });
  const [vizData, setVizData] = useState(null);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizError, setVizError] = useState('');

  const activeFile = files.find(f => f.file_id === activeFileId);
  const activeChat = chatHistories[activeFileId] || [];

  useEffect(() => { fetchFiles(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeChat, activeFileId]);
  useEffect(() => {
    setPreviewPage(1); setPreviewSearch(''); setPreviewSortCol(null);
    setSelectedColumn(null); setVizData(null); setVizError('');
  }, [activeFileId]);

  // ── API ────────────────────────────────────────────────────────────────────
  const fetchFiles = async () => {
    try { const r = await fetch(`${BACKEND_URL}/api/files`); if (r.ok) setFiles(await r.json()); } catch {}
  };

  const fetchFilePreview = async (fileId) => {
    setFileLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/files/${fileId}/preview`);
      if (r.ok) {
        const data = await r.json();
        setActiveFileMetadata(data.metadata);
        if (!chatHistories[fileId]) {
          setChatHistories(prev => ({ ...prev, [fileId]: [{
            sender: 'ai',
            explanation: `Hello! I've analyzed **${data.filename}** — ${data.metadata.rows} rows, ${data.metadata.columns_count} columns. What would you like to explore?`,
            timestamp: new Date().toLocaleTimeString(),
            chart_suggestion: { type: 'none' },
          }] }));
        }
      } else { addToast('Failed to load dataset preview.', 'error'); }
    } catch { addToast('Cannot connect to backend. Make sure it is running.', 'error'); }
    finally { setFileLoading(false); }
  };

  const handleFileSelect = (fileId) => {
    setActiveFileId(fileId);
    fetchFilePreview(fileId);
    setActiveTab('overview');
    setCurrentPage('workspace');
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (backendStatus === 'offline') { addToast('Backend is offline.', 'error'); return; }
    if (!file.name.toLowerCase().endsWith('.csv')) { addToast('Only CSV files are supported.', 'error'); return; }
    if (file.size > 20 * 1024 * 1024) { addToast('File exceeds 20 MB limit.', 'error'); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        await fetchFiles();
        setActiveFileId(data.file_id);
        setActiveFileMetadata(data.metadata);
        setChatHistories(prev => ({ ...prev, [data.file_id]: [{
          sender: 'ai',
          explanation: `**${data.filename}** uploaded! ${data.metadata.rows} rows, ${data.metadata.columns_count} columns. What would you like to explore?`,
          timestamp: new Date().toLocaleTimeString(),
          chart_suggestion: { type: 'none' },
        }] }));
        setActiveTab('overview');
        setCurrentPage('workspace');
        addToast(`${data.filename} uploaded successfully!`, 'success');
      } else { addToast(data.detail || 'Upload failed.', 'error'); }
    } catch { addToast('Network error. Verify the backend is running.', 'error'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteFile = (e, fileId, filename) => {
    e?.stopPropagation();
    setConfirmModal({
      title: 'Delete Dataset',
      message: `Are you sure you want to delete "${filename}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const r = await fetch(`${BACKEND_URL}/api/files/${fileId}`, { method: 'DELETE' });
          if (r.ok) {
            setFiles(prev => prev.filter(f => f.file_id !== fileId));
            if (activeFileId === fileId) { setActiveFileId(null); setActiveFileMetadata(null); }
            setChatHistories(prev => { const u = { ...prev }; delete u[fileId]; return u; });
            addToast(`${filename} deleted.`, 'success');
          } else { addToast('Failed to delete file.', 'error'); }
        } catch { addToast('Network error during deletion.', 'error'); }
      },
    });
  };

  const handleDrag = e => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = e => { e.preventDefault(); e.stopPropagation(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f); };

  const handleSendQuery = async (queryOverride) => {
    const query = typeof queryOverride === 'string' ? queryOverride : queryText;
    if (!query.trim() || !activeFileId || queryLoading) return;
    if (backendStatus === 'offline') { addToast('Backend is offline.', 'error'); return; }
    setQueryText(''); setQueryLoading(true);
    setChatHistories(prev => ({ ...prev, [activeFileId]: [...(prev[activeFileId] || []), { sender: 'user', explanation: query, timestamp: new Date().toLocaleTimeString() }] }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: activeFileId, query, openai_api_key: apiKey.trim() || null, model }),
      });
      const result = await res.json();
      setChatHistories(prev => ({
        ...prev,
        [activeFileId]: [...(prev[activeFileId] || []), res.ok
          ? { sender: 'ai', explanation: result.explanation, code: result.code, chart_suggestion: result.chart_suggestion, data: result.data, columns: result.columns, timestamp: new Date().toLocaleTimeString() }
          : { sender: 'ai', error: true, explanation: `**Analysis Failed:** ${result.detail || 'Unknown error.'}`, timestamp: new Date().toLocaleTimeString() }
        ],
      }));
      if (!res.ok) addToast(result.detail || 'Query failed.', 'error');
    } catch {
      setChatHistories(prev => ({ ...prev, [activeFileId]: [...(prev[activeFileId] || []), { sender: 'ai', error: true, explanation: '**Connection Error:** Could not reach the server.', timestamp: new Date().toLocaleTimeString() }] }));
      addToast('Connection error.', 'error');
    }
    finally { setQueryLoading(false); }
  };

  const runQuickPrompt = (prompt) => { setActiveTab('analyst'); setTimeout(() => handleSendQuery(prompt), 150); };
  const loadSampleDataset = async (sample) => { const blob = new Blob([sample.csv], { type: 'text/csv' }); await handleUpload(new File([blob], sample.filename, { type: 'text/csv' })); };

  // ── Metadata helpers ───────────────────────────────────────────────────────
  const getDatasetStats = () => {
    if (!activeFileMetadata) return {};
    const cols = activeFileMetadata.columns || [];
    const totalNulls = cols.reduce((s, c) => s + (c.nulls || 0), 0);
    const numericCols = cols.filter(c => ['int64','float64','int32','float32'].some(t => c.type?.includes(t))).length;
    const catCols = cols.filter(c => c.type === 'object' || c.type === 'bool').length;
    const totalCells = (activeFileMetadata.rows || 0) * (activeFileMetadata.columns_count || 0);
    const completeness = totalCells > 0 ? ((totalCells - totalNulls) / totalCells * 100) : 100;
    const health = completeness >= 90 ? 'Excellent' : completeness >= 75 ? 'Good' : 'Needs Attention';
    const healthColor = completeness >= 90 ? 'emerald' : completeness >= 75 ? 'amber' : 'rose';
    return { totalNulls, numericCols, catCols, completeness, health, healthColor };
  };
  const stats = getDatasetStats();

  // ── Preview helpers ────────────────────────────────────────────────────────
  const previewRows = activeFileMetadata?.preview || [];
  const visibleCols = activeFileMetadata?.columns || [];
  const filteredRows = previewRows.filter(r => !previewSearch || Object.values(r).some(v => String(v ?? '').toLowerCase().includes(previewSearch.toLowerCase())));
  const sortedRows = previewSortCol ? [...filteredRows].sort((a, b) => {
    const av = a[previewSortCol], bv = b[previewSortCol];
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return previewSortDir === 'asc' ? cmp : -cmp;
  }) : filteredRows;
  const totalPreviewPages = Math.max(1, Math.ceil(sortedRows.length / previewRowsPerPage));
  const pagedRows = sortedRows.slice((previewPage - 1) * previewRowsPerPage, previewPage * previewRowsPerPage);

  // ── Visualize ──────────────────────────────────────────────────────────────
  const numericColList = (activeFileMetadata?.columns || []).filter(c => ['int64','float64','int32','float32'].some(t => c.type?.includes(t)));
  const allColList = activeFileMetadata?.columns || [];

  const handleGenerateChart = async () => {
    if (!vizConfig.xCol || !vizConfig.yCol) { setVizError('Please select both X-axis and Y-axis columns.'); return; }
    if (backendStatus === 'offline') { addToast('Backend is offline.', 'error'); return; }
    setVizError(''); setVizLoading(true);
    const aggLabels = { sum: 'total', average: 'average', count: 'count', min: 'minimum', max: 'maximum' };
    const prompt = `Calculate the ${aggLabels[vizConfig.agg]} of "${vizConfig.yCol}" grouped by "${vizConfig.xCol}". Sort by value ${vizConfig.sort === 'desc' ? 'descending' : 'ascending'} and show the top ${vizConfig.topN === 'all' ? 'all' : vizConfig.topN} results. Use a ${vizConfig.type} chart.`;
    try {
      const res = await fetch(`${BACKEND_URL}/api/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: activeFileId, query: prompt, openai_api_key: apiKey.trim() || null, model }) });
      const result = await res.json();
      if (res.ok && result.data?.length) { setVizData({ data: result.data, suggestion: { ...result.chart_suggestion, type: vizConfig.type } }); }
      else { setVizError(result.detail || 'No chart data returned. Try different columns.'); }
    } catch { setVizError('Network error.'); }
    finally { setVizLoading(false); }
  };

  const getColInfo = (colName) => {
    if (!activeFileMetadata) return null;
    const colMeta = activeFileMetadata.columns?.find(c => c.name === colName);
    const summary = activeFileMetadata.summary?.[colName];
    return { ...colMeta, ...summary };
  };

  // ── Sidebar nav items ──────────────────────────────────────────────────────
  const navItems = [
    { key: 'workspace', icon: Home,       label: 'Workspace'    },
    { key: 'library',   icon: FolderOpen, label: 'Data Library' },
    { key: 'reports',   icon: Archive,    label: 'Reports'      },
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="app-root flex flex-col h-screen overflow-hidden">
      <input type="file" accept=".csv" ref={fileInputRef} onChange={e => { handleUpload(e.target.files[0]); e.target.value = ''; }} className="hidden" id="csv-file-input" />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmModal modal={confirmModal} onConfirm={() => confirmModal?.onConfirm?.()} onCancel={() => setConfirmModal(null)} />

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="navbar shrink-0 h-14 flex items-center px-4 gap-3 z-50">
        <button onClick={() => setSidebarOpen(o => !o)} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors" aria-label="Toggle sidebar">
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none hidden sm:block">
            <h1 className="text-sm font-bold gradient-text">AI Data Analyst</h1>
            <p className="text-[9px] text-slate-500 font-mono">Flask · Pandas · React</p>
          </div>
        </div>

        {/* Top-navbar page navigation */}
        <div className="hidden sm:flex items-center gap-1 ml-3 p-1 rounded-xl bg-slate-800/50 border border-white/6">
          {navItems.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setCurrentPage(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                currentPage === key
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {activeFile && currentPage === 'workspace' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] font-mono max-w-[180px]">
            <FileSpreadsheet className="w-3 h-3 text-teal-400 shrink-0" />
            <span className="text-teal-300 truncate">{activeFile.filename}</span>
          </div>
        )}

        <StatusBadge status={backendStatus} />

        <button onClick={() => fileInputRef.current?.click()} disabled={backendStatus === 'offline' || uploading}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-teal-500/20">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
          Upload CSV
        </button>

        <button onClick={() => setDarkMode(p => !p)} className="p-2 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors" title={darkMode ? 'Light Mode' : 'Dark Mode'}>
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button onClick={() => setShowSettings(o => !o)} className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-teal-500/15 text-teal-300 border-teal-500/30' : 'border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`} title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </nav>

      {/* Settings panel */}
      {showSettings && (
        <div className="shrink-0 px-4 py-4 border-b border-white/5 bg-slate-900/95 backdrop-blur-xl z-40 animate-slideDown">
          <div className="max-w-lg mx-auto">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">AI Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">OpenAI API Key</label>
                <input type="password" placeholder="sk-… (or use server env)" value={apiKey} onChange={e => { setApiKey(e.target.value); localStorage.setItem('openai_api_key', e.target.value); }} className="form-input w-full text-xs px-3 py-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">Model</label>
                <select value={model} onChange={e => setModel(e.target.value)} className="form-input w-full text-xs px-3 py-2 rounded-lg">
                  <option value="gpt-4o-mini">gpt-4o-mini (Fast)</option>
                  <option value="gpt-4o">gpt-4o (Intelligent)</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">If no key is provided, the backend uses its OPENAI_API_KEY env variable.</p>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
        <aside className={`sidebar-panel shrink-0 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-0'}`}>
          <div className="flex-1 flex flex-col overflow-hidden min-w-[256px]">

            {/* Upload zone */}
            <div className="p-3 border-b border-white/5">
              <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 ${dragActive ? 'border-teal-500 bg-teal-500/8' : 'border-slate-700/60 hover:border-teal-500/40 hover:bg-slate-800/30'}`}>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
                    <p className="text-[11px] text-slate-400">Uploading…</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
                    <p className="text-[11px] font-semibold text-slate-300">Drop CSV here</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">or click · max 20 MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Sample datasets */}
            <div className="px-3 py-3 border-b border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Sample Datasets</p>
              <div className="space-y-1">
                {SAMPLE_DATASETS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button key={s.key} onClick={() => loadSampleDataset(s)} disabled={uploading || backendStatus === 'offline'}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors disabled:opacity-50">
                      <Icon className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dataset list */}
            <div className="flex-1 flex flex-col overflow-hidden px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Datasets ({files.length})</p>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                <input type="text" placeholder="Search…" value={datasetSearch} onChange={e => setDatasetSearch(e.target.value)} className="form-input w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
                {files.length === 0 ? (
                  <p className="text-[11px] text-slate-600 text-center py-4">No datasets uploaded yet.</p>
                ) : (
                  files.filter(f => !datasetSearch || f.filename.toLowerCase().includes(datasetSearch.toLowerCase())).map(f => (
                    <div key={f.file_id} onClick={() => handleFileSelect(f.file_id)}
                      className={`group flex items-start gap-2 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${activeFileId === f.file_id && currentPage === 'workspace' ? 'bg-teal-500/15 border border-teal-500/25' : 'hover:bg-slate-800/50 border border-transparent'}`}>
                      <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${activeFileId === f.file_id && currentPage === 'workspace' ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium truncate ${activeFileId === f.file_id && currentPage === 'workspace' ? 'text-teal-300' : 'text-slate-300'}`}>{f.filename}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{(f.rows || 0).toLocaleString()} rows · {f.columns_count || 0} cols</p>
                      </div>
                      <button onClick={e => handleDeleteFile(e, f.file_id, f.filename)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all" title="Delete">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Offline banner */}
            {backendStatus === 'offline' && (
              <div className="mx-3 mb-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800/50 text-center">
                <WifiOff className="w-4 h-4 text-rose-400 mx-auto mb-1.5" />
                <p className="text-[11px] text-rose-300 font-medium">Backend Offline</p>
                <button onClick={checkBackend} className="mt-2 flex items-center gap-1 mx-auto text-[10px] text-rose-400 hover:text-rose-300 transition-colors">
                  <RefreshCw className="w-2.5 h-2.5" /> Retry
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* ── REPORTS PAGE ── */}
          {currentPage === 'reports' && (
            <ReportsPage files={files} chatHistories={chatHistories} downloadCSV={downloadCSV} addToast={addToast} />
          )}

          {/* ── DATA LIBRARY PAGE ── */}
          {currentPage === 'library' && (
            <DataLibraryPage
              files={files} chatHistories={chatHistories}
              onSelectFile={handleFileSelect} onDeleteFile={handleDeleteFile}
              onUploadClick={() => fileInputRef.current?.click()}
              uploading={uploading} backendStatus={backendStatus}
            />
          )}

          {/* ── WORKSPACE ── */}
          {currentPage === 'workspace' && (
            <>
              {!activeFileId ? (
                /* Hero */
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
                  <div className="max-w-xl w-full text-center">
                    <div className="relative inline-block mb-8">
                      <div className="absolute inset-0 rounded-full bg-teal-500/15 blur-3xl scale-150 pointer-events-none" />
                      <div className="relative inline-flex p-5 rounded-full bg-teal-500/10 border border-teal-500/20 animate-float">
                        <Database className="w-12 h-12 text-teal-400" />
                      </div>
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight gradient-text mb-3">AI-Powered Analytics</h2>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-8">
                      Upload your CSV or choose a sample dataset. Ask questions in natural language — get charts, summaries, and insights instantly.
                    </p>
                    <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 mb-6 transition-all duration-300 ${dragActive ? 'border-teal-500 bg-teal-500/5' : 'border-slate-700/60 hover:border-teal-500/40 hover:bg-slate-800/20'}`}>
                      {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                          <p className="text-sm text-slate-300 font-medium">Processing CSV…</p>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-slate-300">Drag &amp; drop your CSV file here</p>
                          <p className="text-xs text-slate-500 mt-1">or click to browse · max 20 MB</p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Or try a sample dataset:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SAMPLE_DATASETS.map(s => {
                        const Icon = s.icon;
                        return (
                          <button key={s.key} onClick={() => loadSampleDataset(s)} disabled={uploading || backendStatus === 'offline'}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600/80 hover:bg-teal-600 text-white transition-all disabled:opacity-50">
                            <Icon className="w-3.5 h-3.5" />{s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Active dataset workspace */
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Workspace header + tabs */}
                  <div className="shrink-0 px-4 sm:px-5 py-2.5 border-b border-white/5 bg-slate-900/30 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 shrink-0">
                        <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-white truncate max-w-[240px] sm:max-w-md">{activeFile?.filename}</h2>
                        <p className="text-[10px] text-slate-500 font-mono">{(activeFileMetadata?.rows || 0).toLocaleString()} rows · {activeFileMetadata?.columns_count || 0} cols</p>
                      </div>
                    </div>
                    <div className="flex items-center rounded-lg bg-slate-950/60 p-0.5 border border-white/6 shrink-0">
                      {[['overview', Zap, 'Overview'], ['preview', Table, 'Data'], ['visualize', BarChart2, 'Visualize'], ['analyst', MessageSquare, 'AI Analyst']].map(([tab, Icon, label]) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === tab ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/30' : 'text-slate-400 hover:text-slate-200'}`}>
                          <Icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-hidden">
                    {fileLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* ── OVERVIEW ── */}
                        {activeTab === 'overview' && (
                          <div className="h-full overflow-y-auto p-4 sm:p-5 space-y-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <KPICard icon={Database}      label="Total Rows"        value={activeFileMetadata?.rows}            color="teal"    />
                              <KPICard icon={Table}         label="Total Columns"     value={activeFileMetadata?.columns_count}   color="cyan"    />
                              <KPICard icon={AlertTriangle} label="Missing Values"    value={stats.totalNulls}                    color={stats.totalNulls > 0 ? 'amber' : 'emerald'} />
                              <KPICard icon={Filter}        label="Numeric Columns"   value={stats.numericCols}                   color="violet"  />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <KPICard icon={MessageSquare} label="Categorical Cols"  value={stats.catCols}                       color="sky"     />
                              <KPICard icon={CheckCircle}   label="Completeness"      value={`${(stats.completeness || 100).toFixed(1)}%`} color="emerald" />
                              <KPICard icon={Activity}      label="Dataset Health"    value={stats.health || 'Excellent'}         color={stats.healthColor || 'emerald'} />
                              <KPICard icon={FileSpreadsheet} label="Source"          value="CSV Database"                        color="teal"    />
                            </div>

                            {/* Summary + Health */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-white/6 bg-slate-900/40 p-4">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Dataset Summary</h3>
                                <div className="space-y-2">
                                  {[['File Name', activeFile?.filename], ['Rows', (activeFileMetadata?.rows || 0).toLocaleString()], ['Columns', activeFileMetadata?.columns_count], ['Missing Values', stats.totalNulls], ['Numeric Cols', stats.numericCols], ['Categorical Cols', stats.catCols]].map(([k, v]) => (
                                    <div key={k} className="flex items-center justify-between py-1 border-b border-white/4 last:border-0">
                                      <span className="text-[11px] text-slate-500">{k}</span>
                                      <span className="text-[11px] text-slate-200 font-medium truncate max-w-[180px] text-right">{String(v ?? '—')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-xl border border-white/6 bg-slate-900/40 p-4">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Dataset Quality</h3>
                                <div className="flex flex-col items-center py-2">
                                  <div className="relative w-28 h-28 mb-3">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-800" />
                                      <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke={stats.completeness >= 90 ? '#10b981' : stats.completeness >= 75 ? '#f59e0b' : '#f43f5e'}
                                        strokeWidth="2.5" strokeDasharray={`${(stats.completeness || 100)} 100`} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className={`text-2xl font-extrabold ${stats.completeness >= 90 ? 'text-emerald-400' : stats.completeness >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>{(stats.completeness || 100).toFixed(0)}%</span>
                                      <span className="text-[10px] text-slate-500">complete</span>
                                    </div>
                                  </div>
                                  <p className={`text-sm font-bold ${stats.completeness >= 90 ? 'text-emerald-400' : stats.completeness >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>{stats.health || 'Excellent'}</p>
                                  <p className="text-[11px] text-slate-500 mt-1 text-center max-w-[180px]">{stats.completeness >= 90 ? 'Dataset is clean and ready' : stats.completeness >= 75 ? 'Minor missing values detected' : 'Significant gaps — consider cleaning'}</p>
                                </div>
                                <div className="mt-2 space-y-1.5">
                                  <div className="flex justify-between text-[11px] text-slate-500"><span>Filled cells</span><span className="text-slate-300">{(stats.completeness || 100).toFixed(1)}%</span></div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-800">
                                    <div className={`h-full rounded-full transition-all duration-500 ${stats.completeness >= 90 ? 'bg-emerald-500' : stats.completeness >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${stats.completeness || 100}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Column overview */}
                            <div className="rounded-xl border border-white/6 bg-slate-900/40 p-4">
                              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Column Overview</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                                {(activeFileMetadata?.columns || []).map(col => (
                                  <div key={col.name} onClick={() => { setActiveTab('preview'); setSelectedColumn(col.name); }}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/40 border border-white/4 hover:border-teal-500/20 transition-colors cursor-pointer">
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-semibold text-slate-300 truncate">{col.name}</p>
                                      <p className="text-[10px] font-mono text-teal-400">{col.type}</p>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-2 ${col.nulls > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                      {col.nulls > 0 ? `${col.nulls}↯` : 'Full'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Quick Analysis */}
                            <div className="rounded-xl border border-white/6 bg-slate-900/40 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-4 h-4 text-amber-400" />
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Analysis</h3>
                              </div>
                              <p className="text-[11px] text-slate-500 mb-3">Click a prompt to instantly run AI analysis.</p>
                              <div className="flex flex-wrap gap-2">
                                {QUICK_ANALYSIS_PROMPTS.map(qp => (
                                  <button key={qp.label} onClick={() => runQuickPrompt(qp.prompt)} disabled={backendStatus === 'offline' || queryLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 hover:bg-teal-500/10 hover:border-teal-500/30 text-[11px] text-slate-300 hover:text-teal-300 transition-all disabled:opacity-50">
                                    <Sparkles className="w-2.5 h-2.5 text-teal-400" />{qp.label}
                                  </button>
                                ))}
                              </div>
                              {/* Context-aware prompts */}
                              {(() => {
                                const colNames = (activeFileMetadata?.columns || []).map(c => c.name.toLowerCase());
                                const ctx = [];
                                if (colNames.some(c => c.includes('rating') || c.includes('score'))) ctx.push({ label: 'Top by Rating', prompt: 'Show top 10 records sorted by rating or score column descending.' });
                                if (colNames.some(c => c.includes('goal'))) ctx.push({ label: 'Top Goal Scorers', prompt: 'Show top 10 records with the most goals.' });
                                if (colNames.some(c => c.includes('sales') || c.includes('revenue'))) ctx.push({ label: 'Top Revenue', prompt: 'Show the top 10 highest sales or revenue records.' });
                                if (colNames.some(c => c.includes('department') || c.includes('dept'))) ctx.push({ label: 'By Department', prompt: 'Show average score or performance grouped by department.' });
                                if (colNames.some(c => c.includes('category'))) ctx.push({ label: 'By Category', prompt: 'Show total counts or sales grouped by category.' });
                                if (ctx.length === 0) return null;
                                return (
                                  <div className="mt-3 pt-3 border-t border-white/5">
                                    <p className="text-[10px] text-slate-600 mb-2 font-medium">Dataset-specific:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {ctx.map(qp => (
                                        <button key={qp.label} onClick={() => runQuickPrompt(qp.prompt)} disabled={backendStatus === 'offline' || queryLoading}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-[11px] text-cyan-300 transition-all disabled:opacity-50">
                                          <TrendingUp className="w-2.5 h-2.5" />{qp.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Stats summary */}
                            {Object.keys(activeFileMetadata?.summary || {}).length > 0 && (
                              <div className="rounded-xl border border-white/6 bg-slate-900/40 p-4">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Statistical Summary</h3>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-white/6 text-slate-500">
                                        <th className="py-2 pr-4 font-medium text-[11px]">Metric</th>
                                        {Object.keys(activeFileMetadata.summary).slice(0, 4).map(col => (
                                          <th key={col} className="py-2 px-3 font-semibold text-slate-300 text-[11px] truncate max-w-[120px]">{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/4 font-mono text-slate-400">
                                      {['count','mean','std','min','50%','max'].map(metric => (
                                        <tr key={metric} className="hover:bg-slate-800/10">
                                          <td className="py-1.5 pr-4 text-[11px] font-sans text-slate-500 font-medium capitalize">{metric}</td>
                                          {Object.keys(activeFileMetadata.summary).slice(0, 4).map(col => {
                                            const val = activeFileMetadata.summary[col][metric];
                                            return <td key={col} className="py-1.5 px-3 text-[11px]">{val === '' || val == null ? '—' : typeof val === 'number' ? val.toFixed(2) : String(val)}</td>;
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── DATA PREVIEW ── */}
                        {activeTab === 'preview' && (
                          <div className="h-full flex flex-col overflow-hidden">
                            <div className="shrink-0 px-4 py-2.5 border-b border-white/5 bg-slate-900/20 flex flex-wrap items-center gap-2">
                              <div className="relative flex-1 min-w-[160px] max-w-[260px]">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                <input type="text" placeholder="Search records…" value={previewSearch} onChange={e => { setPreviewSearch(e.target.value); setPreviewPage(1); }} className="form-input w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg" />
                              </div>
                              <select value={previewRowsPerPage} onChange={e => { setPreviewRowsPerPage(Number(e.target.value)); setPreviewPage(1); }} className="form-input text-[11px] px-2.5 py-1.5 rounded-lg">
                                {[10,25,50,100].map(n => <option key={n} value={n}>{n} per page</option>)}
                              </select>
                              <span className="text-[11px] text-slate-500 ml-auto">{pagedRows.length === 0 ? 'No records' : `${(previewPage-1)*previewRowsPerPage+1}–${Math.min(previewPage*previewRowsPerPage, sortedRows.length)} of ${sortedRows.length}`}</span>
                              <button onClick={() => downloadCSV(activeFileMetadata?.preview || [], activeFile?.filename || 'preview.csv')} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors">
                                <Download className="w-3 h-3" /> CSV
                              </button>
                            </div>
                            <div className="flex-1 flex overflow-hidden">
                              <div className="flex-1 overflow-auto">
                                {pagedRows.length === 0 ? (
                                  <EmptyState icon={Search} title="No matching records" description="Try adjusting your search." />
                                ) : (
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 z-10">
                                      <tr className="table-header text-slate-400 border-b border-white/6">
                                        <th className="p-2.5 font-semibold text-[10px]">#</th>
                                        {visibleCols.map(col => (
                                          <th key={col.name} onClick={() => { if (previewSortCol === col.name) setPreviewSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setPreviewSortCol(col.name); setPreviewSortDir('asc'); } setPreviewPage(1); }}
                                            className="p-2.5 font-semibold text-[10px] cursor-pointer hover:text-teal-300 transition-colors whitespace-nowrap">
                                            <span className="flex items-center gap-1">{col.name}
                                              {previewSortCol === col.name ? (previewSortDir === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-teal-400" /> : <ArrowDown className="w-2.5 h-2.5 text-teal-400" />) : <ChevronDown className="w-2.5 h-2.5 opacity-30" />}
                                            </span>
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/4">
                                      {pagedRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-800/20 text-slate-300 transition-colors">
                                          <td className="p-2.5 font-mono text-slate-600 text-[10px]">{(previewPage-1)*previewRowsPerPage+i+1}</td>
                                          {visibleCols.map(col => {
                                            const v = row[col.name];
                                            const isNull = v == null || v === '';
                                            const isNum = !isNull && !isNaN(Number(v));
                                            return (
                                              <td key={col.name} className={`p-2.5 truncate max-w-[180px] text-[11px] ${isNull ? 'text-slate-700 italic font-mono' : isNum ? 'text-teal-300 font-mono' : ''}`} title={isNull ? 'null' : String(v)}>
                                                {isNull ? 'null' : String(v)}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                              {/* Column Explorer */}
                              {selectedColumn && (() => {
                                const info = getColInfo(selectedColumn);
                                return (
                                  <div className="w-56 shrink-0 border-l border-white/5 bg-slate-900/40 flex flex-col overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
                                      <p className="text-[11px] font-bold text-slate-300 truncate">{selectedColumn}</p>
                                      <button onClick={() => setSelectedColumn(null)} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                      <div className="px-2 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-center">
                                        <span className="text-[10px] font-mono text-teal-400">{info?.type || 'unknown'}</span>
                                      </div>
                                      {[['Nulls', info?.nulls], ['Uniques', info?.uniques], ['Min', info?.min], ['Max', info?.max], ['Mean', typeof info?.mean === 'number' ? info.mean.toFixed(2) : info?.mean], ['Std Dev', typeof info?.std === 'number' ? info.std.toFixed(2) : info?.std]].map(([k, v]) => v != null && v !== '' && (
                                        <div key={k} className="flex justify-between text-[11px] border-b border-white/4 pb-1.5">
                                          <span className="text-slate-500">{k}</span>
                                          <span className="text-slate-200 font-medium">{String(v)}</span>
                                        </div>
                                      ))}
                                      {info?.samples && <div><p className="text-[10px] text-slate-500 mb-1">Samples</p><p className="text-[11px] text-slate-400 break-words">{info.samples}</p></div>}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            {/* Pagination */}
                            <div className="shrink-0 px-4 py-2 border-t border-white/5 flex items-center justify-between bg-slate-900/20">
                              <div className="flex items-center gap-1">
                                {(activeFileMetadata?.columns || []).slice(0, 6).map(col => (
                                  <button key={col.name} onClick={() => setSelectedColumn(selectedColumn === col.name ? null : col.name)} title={col.name}
                                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${selectedColumn === col.name ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-600 hover:text-slate-400'}`}>
                                    {col.name.slice(0, 8)}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setPreviewPage(1)} disabled={previewPage === 1} className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                                <span className="text-[11px] text-slate-400 px-2">{previewPage} / {totalPreviewPages}</span>
                                <button onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))} disabled={previewPage >= totalPreviewPages} className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── VISUALIZE ── */}
                        {activeTab === 'visualize' && (
                          <div className="h-full overflow-y-auto p-4 sm:p-5 space-y-4">
                            <div className="rounded-xl border border-white/6 bg-slate-900/40 p-4">
                              <div className="flex items-center gap-2 mb-4">
                                <BarChart2 className="w-4 h-4 text-teal-400" />
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chart Builder</h3>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[['Chart Type', 'type', ['bar','line','area','pie','scatter'].map(v => ({ v, l: v.charAt(0).toUpperCase()+v.slice(1) }))],
                                  ['X-Axis', 'xCol', [{ v: '', l: 'Select column…' }, ...allColList.map(c => ({ v: c.name, l: c.name }))]],
                                  ['Y-Axis', 'yCol', [{ v: '', l: 'Select column…' }, ...numericColList.map(c => ({ v: c.name, l: c.name }))]],
                                  ['Aggregation', 'agg', [{v:'sum',l:'Sum'},{v:'average',l:'Average'},{v:'count',l:'Count'},{v:'min',l:'Minimum'},{v:'max',l:'Maximum'}]],
                                  ['Show Top', 'topN', [{v:5,l:'Top 5'},{v:10,l:'Top 10'},{v:20,l:'Top 20'},{v:'all',l:'All'}]],
                                  ['Sort', 'sort', [{v:'desc',l:'Descending'},{v:'asc',l:'Ascending'}]],
                                ].map(([label, key, opts]) => (
                                  <div key={key}>
                                    <label className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">{label}</label>
                                    <select value={vizConfig[key]} onChange={e => setVizConfig(c => ({ ...c, [key]: e.target.value }))} className="form-input w-full text-xs px-2.5 py-2 rounded-lg">
                                      {opts.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                  </div>
                                ))}
                              </div>
                              {vizError && <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-3 py-2 rounded-lg"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{vizError}</div>}
                              <div className="flex gap-2 mt-4">
                                <button onClick={handleGenerateChart} disabled={vizLoading || backendStatus === 'offline' || !vizConfig.xCol || !vizConfig.yCol}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-teal-500/20">
                                  {vizLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart2 className="w-3.5 h-3.5" />}{vizLoading ? 'Generating…' : 'Generate Chart'}
                                </button>
                                {vizData && <button onClick={() => { setVizData(null); setVizError(''); }} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs transition-colors"><RotateCcw className="w-3 h-3" /> Reset</button>}
                                {vizData?.data?.length > 0 && <button onClick={() => { downloadCSV(vizData.data, 'chart_data.csv'); addToast('Data exported', 'success'); }} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs transition-colors ml-auto"><Download className="w-3 h-3" /> Export CSV</button>}
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/6 bg-slate-900/40 p-4">
                              {!vizData && !vizLoading ? (
                                <EmptyState icon={BarChart2} title="No chart generated yet" description="Select your columns and click Generate Chart." />
                              ) : vizLoading ? (
                                <div className="flex flex-col items-center justify-center py-16"><Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" /><p className="text-xs text-slate-400">Generating chart…</p></div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-300">{vizData?.suggestion?.title || `${vizConfig.agg} of ${vizConfig.yCol} by ${vizConfig.xCol}`}</h3>
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono capitalize">{vizConfig.type} chart</span>
                                  </div>
                                  <div className="bg-slate-950/30 rounded-xl p-3">
                                    <ChartRenderer suggestion={vizData?.suggestion} data={vizData?.data} height={320} />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ── AI ANALYST ── */}
                        {activeTab === 'analyst' && (
                          <div className="h-full flex flex-col">
                            {/* Quick chips */}
                            <div className="shrink-0 px-4 py-2.5 border-b border-white/5 bg-slate-900/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                              {QUICK_ANALYSIS_PROMPTS.slice(0, 6).map(qp => (
                                <button key={qp.label} onClick={() => runQuickPrompt(qp.prompt)} disabled={queryLoading || backendStatus === 'offline'}
                                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-700/60 bg-slate-800/40 hover:border-teal-500/30 hover:bg-teal-500/8 text-[10px] text-slate-400 hover:text-teal-300 transition-all disabled:opacity-40">
                                  <Sparkles className="w-2.5 h-2.5 text-teal-400" />{qp.label}
                                </button>
                              ))}
                            </div>

                            {/* Chat */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                              {activeChat.map((msg, idx) => {
                                const isAi = msg.sender === 'ai';
                                const hasChart = isAi && msg.chart_suggestion?.type !== 'none' && msg.data?.length > 0;
                                const hasTable = isAi && msg.data?.length > 0;
                                return (
                                  <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {isAi && (
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 mt-0.5 ${msg.error ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'}`}>
                                        {msg.error ? '!' : <Sparkles className="w-3.5 h-3.5" />}
                                      </div>
                                    )}
                                    <div className={`space-y-2.5 min-w-0 ${msg.sender === 'user' ? 'max-w-[80%]' : 'max-w-[90%] flex-1'}`}>
                                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user' ? 'bg-teal-600 text-white rounded-tr-sm ml-auto' : msg.error ? 'bg-rose-950/50 border border-rose-900/60 text-rose-200 rounded-tl-sm' : 'chat-bubble border border-white/8 text-slate-300 rounded-tl-sm'}`}>
                                        {isAi ? parseMarkdown(msg.explanation) : <p>{msg.explanation}</p>}
                                        <div className="flex items-center justify-between mt-2">
                                          <span className="text-[9px] text-slate-500 font-mono">{msg.timestamp}</span>
                                          {isAi && !msg.error && (
                                            <button onClick={() => { navigator.clipboard.writeText(msg.explanation || ''); addToast('Copied!', 'info'); }} className="flex items-center gap-1 text-[9px] text-slate-500 hover:text-slate-300 transition-colors">
                                              <Copy className="w-2.5 h-2.5" /> Copy
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {isAi && !msg.error && (
                                        <div className="space-y-2.5">
                                          {hasChart && (
                                            <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4">
                                              <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5"><BarChart2 className="w-3 h-3 text-teal-400" />{msg.chart_suggestion?.title || 'Visualization'}</h4>
                                                <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded capitalize font-mono">{msg.chart_suggestion?.type}</span>
                                              </div>
                                              <div className="bg-slate-950/40 rounded-lg p-2">
                                                <ChartRenderer suggestion={msg.chart_suggestion} data={msg.data} height={260} />
                                              </div>
                                            </div>
                                          )}
                                          {hasTable && (
                                            <div className="rounded-xl border border-white/8 bg-slate-900/50 overflow-hidden">
                                              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Computed Output</h4>
                                                <button onClick={() => { downloadCSV(msg.data, `analysis_${idx}.csv`); addToast('CSV downloaded', 'success'); }} className="flex items-center gap-1 text-[9px] px-2 py-1 border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white rounded transition-colors">
                                                  <Download className="w-2.5 h-2.5" /> CSV
                                                </button>
                                              </div>
                                              <div className="max-h-48 overflow-auto">
                                                <table className="w-full text-left text-[11px] border-collapse">
                                                  <thead><tr className="bg-slate-950/40 text-slate-500 border-b border-white/5">{(msg.columns || []).map(col => <th key={col} className="p-2 font-medium">{col}</th>)}</tr></thead>
                                                  <tbody className="divide-y divide-white/4">
                                                    {(msg.data || []).slice(0, 10).map((row, rIdx) => (
                                                      <tr key={rIdx} className="hover:bg-slate-900/30 text-slate-300">
                                                        {(msg.columns || []).map(col => <td key={col} className="p-2 truncate max-w-[160px]">{row[col] == null ? '—' : String(row[col])}</td>)}
                                                      </tr>
                                                    ))}
                                                    {(msg.data?.length || 0) > 10 && <tr className="bg-slate-900/20"><td colSpan={(msg.columns || []).length} className="p-1.5 text-center text-[10px] text-slate-500 italic">Showing 10 of {msg.data.length}. Download CSV for all.</td></tr>}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}
                                          {msg.code && (
                                            <div className="rounded-xl border border-white/8 overflow-hidden">
                                              <button onClick={() => setExpandedCodes(prev => ({ ...prev, [idx]: !prev[idx] }))} className="w-full px-4 py-2.5 bg-slate-900/40 text-left flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors">
                                                <span className="flex items-center gap-1.5 font-mono text-[11px]"><Terminal className="w-3.5 h-3.5 text-teal-400" />{expandedCodes[idx] ? 'Hide Python Code' : 'Inspect Python Code'}</span>
                                                {expandedCodes[idx] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                              </button>
                                              {expandedCodes[idx] && (
                                                <div className="p-4 bg-slate-950 border-t border-white/5">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Safe AST Sandbox</span>
                                                    <button onClick={() => { navigator.clipboard.writeText(msg.code); addToast('Code copied', 'info'); }} className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded transition-colors"><Copy className="w-2.5 h-2.5" /> Copy</button>
                                                  </div>
                                                  <pre className="text-[11px] font-mono text-teal-300/90 overflow-x-auto p-3 bg-slate-900 rounded-lg leading-relaxed border border-white/5 whitespace-pre-wrap">{msg.code}</pre>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {msg.sender === 'user' && (
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 mt-0.5 bg-violet-500/10 text-violet-400 border-violet-500/20">U</div>
                                    )}
                                  </div>
                                );
                              })}
                              {queryLoading && (
                                <div className="flex gap-3">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-teal-500/10 text-teal-400 border-teal-500/20 shrink-0 mt-0.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /></div>
                                  <div className="chat-bubble border border-white/8 px-4 py-3 rounded-2xl rounded-tl-sm text-xs flex items-center gap-2 text-slate-400">
                                    <span className="flex gap-1">
                                      {[0,150,300].map(delay => <span key={delay} className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />)}
                                    </span>
                                    AI is analyzing your data…
                                  </div>
                                </div>
                              )}
                              <div ref={chatEndRef} />
                            </div>

                            {/* Input bar */}
                            <div className="shrink-0 p-3 sm:p-4 border-t border-white/5 bg-slate-900/30">
                              <form onSubmit={e => { e.preventDefault(); handleSendQuery(queryText); }} className="flex gap-2">
                                <textarea
                                  value={queryText} onChange={e => setQueryText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendQuery(queryText); } }}
                                  placeholder={activeFile ? `Ask about ${activeFile.filename}… (Shift+Enter for new line)` : 'Select a dataset first…'}
                                  disabled={queryLoading || !activeFileId} rows={2}
                                  className="form-input flex-1 px-3 py-2.5 text-xs rounded-xl resize-none disabled:opacity-50"
                                />
                                <button type="submit" disabled={!queryText.trim() || queryLoading || !activeFileId || backendStatus === 'offline'}
                                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 self-end shadow-md shadow-teal-500/20">
                                  {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Analyze</span><ArrowRight className="w-3.5 h-3.5" /></>}
                                </button>
                              </form>
                              <div className="flex items-center justify-between mt-1.5 px-1">
                                <p className="text-[10px] text-slate-600">Sandboxed AST Python environment.</p>
                                {activeChat.length > 1 && (
                                  <button onClick={() => setChatHistories(prev => ({ ...prev, [activeFileId]: [activeChat[0]] }))} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
                                    <RotateCcw className="w-2.5 h-2.5" /> Clear chat
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV (sm and below) ─────────────────────────── */}
      <nav className="sm:hidden shrink-0 flex items-center justify-around border-t border-white/6 bg-slate-900/95 backdrop-blur-xl h-14 px-2">
        {navItems.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setCurrentPage(key)}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
              currentPage === key ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{label}</span>
            {currentPage === key && <div className="w-1 h-1 rounded-full bg-teal-400" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
