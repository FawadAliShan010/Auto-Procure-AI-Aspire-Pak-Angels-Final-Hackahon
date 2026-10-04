import React, { useState, useMemo } from 'react';
import { useProcure } from '../context/ProcurementContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  DollarSign,
  Building2,
  Package,
  Layers,
  Calendar,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '../components/common/Button';

// Enterprise historical dataset (Q1 - Q3) augmented with live session data
const MONTHLY_SAVINGS_DATA = [
  { month: 'Apr', transferSavings: 28400, curtailmentSavings: 12200, totalSavings: 40600 },
  { month: 'May', transferSavings: 34100, curtailmentSavings: 15600, totalSavings: 49700 },
  { month: 'Jun', transferSavings: 31500, curtailmentSavings: 18900, totalSavings: 50400 },
  { month: 'Jul', transferSavings: 42800, curtailmentSavings: 21300, totalSavings: 64100 },
  { month: 'Aug', transferSavings: 49200, curtailmentSavings: 24700, totalSavings: 73900 },
  { month: 'Sep (Current)', transferSavings: 68500, curtailmentSavings: 35250, totalSavings: 103750 },
];

const BUDGET_EXCEPTIONS_DATA = [
  { department: 'Operations', withinBudget: 242, budgetExceeded: 38, avgExceedPercent: 24 },
  { department: 'Maintenance', withinBudget: 185, budgetExceeded: 46, avgExceedPercent: 32 },
  { department: 'Production', withinBudget: 310, budgetExceeded: 52, avgExceedPercent: 19 },
  { department: 'IT & Logistics', withinBudget: 140, budgetExceeded: 18, avgExceedPercent: 15 },
  { department: 'Safety & HR', withinBudget: 112, budgetExceeded: 9, avgExceedPercent: 11 },
];

const INVENTORY_TRANSFERS_DATA = [
  { site: 'Austin Logistics', unitsTransferred: 1420, capitalSaved: 128500, leadTimeDays: 1.2 },
  { site: 'Dallas Depot', unitsTransferred: 980, capitalSaved: 89400, leadTimeDays: 2.1 },
  { site: 'Chicago Central', unitsTransferred: 740, capitalSaved: 72100, leadTimeDays: 2.8 },
  { site: 'Atlanta Node', unitsTransferred: 510, capitalSaved: 46800, leadTimeDays: 3.0 },
  { site: 'Denver Storage', unitsTransferred: 390, capitalSaved: 35650, leadTimeDays: 3.4 },
];

const USAGE_ANOMALIES_DATA = [
  { category: 'Safety Helmets', requestedMonths: 16.7, policyLimit: 3.0, runRateMonthly: 30, risk: 'Critical' },
  { category: 'Flange Gaskets', requestedMonths: 12.4, policyLimit: 3.0, runRateMonthly: 50, risk: 'High' },
  { category: 'Hydraulic Seals', requestedMonths: 9.8, policyLimit: 3.0, runRateMonthly: 40, risk: 'High' },
  { category: 'Welding Electrodes', requestedMonths: 6.5, policyLimit: 3.0, runRateMonthly: 120, risk: 'Moderate' },
  { category: 'Heavy Nitrile Gloves', requestedMonths: 4.8, policyLimit: 3.0, runRateMonthly: 250, risk: 'Moderate' },
  { category: 'Standard Fasteners', requestedMonths: 2.2, policyLimit: 3.0, runRateMonthly: 400, risk: 'Optimal' },
];

const DECISION_PALETTE = {
  APPROVE: '#10B981', // Emerald
  REDUCE: '#F59E0B', // Amber
  HOLD: '#F97316', // Orange
  INVESTIGATE: '#8B5CF6', // Purple
  EXPEDITE: '#3B82F6', // Blue
  REJECT: '#EF4444', // Rose
};

export const AnalyticsView: React.FC = () => {
  const { requests, navigateTo } = useProcure();
  const [timeRange, setTimeRange] = useState<'30D' | '90D' | 'YTD'>('90D');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GOVERNANCE' | 'INVENTORY'>('OVERVIEW');

  // Compute live additions from current user session
  const liveSavings = useMemo(() => {
    return requests.reduce((acc, r) => acc + (r.decisionResult?.estimatedSavings || 0), 0);
  }, [requests]);

  // Aggregate Requests by Decision (incorporating actual session requests into baseline)
  const decisionDistribution = useMemo(() => {
    const counts = {
      APPROVE: 824,
      REDUCE: 215,
      HOLD: 104,
      INVESTIGATE: 76,
      EXPEDITE: 42,
      REJECT: 23,
    };

    // Increment with live session PR decisions
    requests.forEach((r) => {
      const dec = r.decisionResult?.decision || r.status;
      if (dec === 'APPROVE') counts.APPROVE += 1;
      else if (dec === 'REDUCE') counts.REDUCE += 1;
      else if (dec === 'ON_HOLD' || dec === 'HOLD') counts.HOLD += 1;
      else if (dec === 'INVESTIGATE') counts.INVESTIGATE += 1;
      else if (dec === 'EXPEDITE' || dec === 'EXPEDITED') counts.EXPEDITE += 1;
      else if (dec === 'REJECTED' || dec === 'REJECT') counts.REJECT += 1;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return [
      { name: 'Approve', value: counts.APPROVE, color: DECISION_PALETTE.APPROVE, pct: ((counts.APPROVE / total) * 100).toFixed(1) },
      { name: 'Reduce', value: counts.REDUCE, color: DECISION_PALETTE.REDUCE, pct: ((counts.REDUCE / total) * 100).toFixed(1) },
      { name: 'Hold', value: counts.HOLD, color: DECISION_PALETTE.HOLD, pct: ((counts.HOLD / total) * 100).toFixed(1) },
      { name: 'Investigate', value: counts.INVESTIGATE, color: DECISION_PALETTE.INVESTIGATE, pct: ((counts.INVESTIGATE / total) * 100).toFixed(1) },
      { name: 'Expedite', value: counts.EXPEDITE, color: DECISION_PALETTE.EXPEDITE, pct: ((counts.EXPEDITE / total) * 100).toFixed(1) },
      { name: 'Reject', value: counts.REJECT, color: DECISION_PALETTE.REJECT, pct: ((counts.REJECT / total) * 100).toFixed(1) },
    ];
  }, [requests]);

  // Aggregate KPI Calculations
  const totalRequestsCount = useMemo(() => {
    return 1284 + requests.length;
  }, [requests.length]);

  const totalEstimatedSavings = useMemo(() => {
    return 382450 + liveSavings;
  }, [liveSavings]);

  const approvalRatePercent = 64.2;
  const requestsFlaggedPercent = 35.8;
  const requestsFlaggedCount = Math.round(totalRequestsCount * (requestsFlaggedPercent / 100));
  const avgProcessingTime = '1.8s';
  const dataErrorReductionPercent = 78.4;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
              Enterprise Executive Dashboard
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Q3 Performance & Spend Intelligence
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Live Gateway Synced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Procurement Analytics & Impact
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Holistic telemetry across policy decisions, capital avoidance, cross-depot stock discovery, and consumption health.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Range Pills */}
          <div className="p-1 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center gap-1 text-xs">
            {(['30D', '90D', 'YTD'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTo('/requests')}
          >
            Inspect Requisitions
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP METRICS ROW (All 6 Required Metrics)                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Total Requests */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            Total Requests
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight block">
              {totalRequestsCount.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+18.4% YoY</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-100 pt-1.5 font-mono">
            Demo + Live ({requests.length})
          </span>
        </div>

        {/* Metric 2: Approval Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 font-mono block">
            Approval Rate
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight block">
              {approvalRatePercent}%
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold mt-1">
              <span>824 clean releases</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-100 pt-1.5 font-mono">
            Direct ERP dispatch
          </span>
        </div>

        {/* Metric 3: Requests Flagged */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 font-mono block">
            Requests Flagged
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-amber-700 tracking-tight block">
              {requestsFlaggedPercent}%
            </span>
            <div className="flex items-center gap-1 text-[11px] text-amber-800 font-semibold mt-1">
              <span>{requestsFlaggedCount} policy interventions</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-100 pt-1.5 font-mono">
            Intercepted pre-PO
          </span>
        </div>

        {/* Metric 4: Estimated Savings */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-mono block flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            Estimated Savings
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight block">
              ${(totalEstimatedSavings / 1000).toFixed(1)}k
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold mt-1">
              <span>+${liveSavings.toLocaleString()} this session</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-100 pt-1.5 font-mono">
            Capital preserved
          </span>
        </div>

        {/* Metric 5: Average Processing Time */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 font-mono block flex items-center gap-1">
            <Zap className="w-3 h-3 text-indigo-500" />
            Avg Process Time
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-indigo-700 tracking-tight block">
              {avgProcessingTime}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-indigo-800 font-semibold mt-1">
              <span>vs 4.5 days legacy</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-100 pt-1.5 font-mono">
            99.2% turnaround drop
          </span>
        </div>

        {/* Metric 6: Data Error Reduction */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 font-mono block flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-sky-500" />
            Data Error Reduction
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-sky-700 tracking-tight block">
              {dataErrorReductionPercent}%
            </span>
            <div className="flex items-center gap-1 text-[11px] text-sky-800 font-semibold mt-1">
              <span>Typos & SKUs resolved</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-100 pt-1.5 font-mono">
            Point-of-origin gate 1
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CHARTS SECTION (All 5 Required Visualizations)                         */}
      {/* ========================================================================= */}
      
      {/* ROW 1: Chart 1 (Requests by Decision) & Chart 2 (Procurement Savings) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Requests by Decision (Donut Breakdown) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  1. Requests by Decision
                </h2>
                <p className="text-[11px] text-slate-500">
                  Distribution across all 6 autonomous policy resolutions
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                POLICY DISTRIBUTION
              </span>
            </div>

            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {decisionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      `${val} requests`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center donut label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black font-mono text-slate-900">
                  {totalRequestsCount}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  Decisions
                </span>
              </div>
            </div>
          </div>

          {/* Decision Legend Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px]">
            {decisionDistribution.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-slate-600 font-medium truncate">{d.name}</span>
                <span className="font-mono font-bold text-slate-900 ml-auto">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 2: Procurement Savings (Stacked Area Growth) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  2. Procurement Savings & Cost Avoidance
                </h2>
                <p className="text-[11px] text-slate-500">
                  Monthly progression: internal transfers vs holding volume curtailment
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                +$382.4k PRESERVED
              </span>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_SAVINGS_DATA} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTransfer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCurtailment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    formatter={(val: number) => [`$${val.toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="transferSavings"
                    name="Sister Stock Transfer"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTransfer)"
                  />
                  <Area
                    type="monotone"
                    dataKey="curtailmentSavings"
                    name="Excess Volume Curtailment"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCurtailment)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-600" />
                <span>Depot Transfer Avoidance</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span>Volume Reduction Avoidance</span>
              </span>
            </div>
            <span className="font-mono font-bold text-slate-700">Q3 Total: $382,450</span>
          </div>
        </div>
      </div>

      {/* ROW 2: Chart 3 (Budget Exceptions) & Chart 4 (Inventory Transfers) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 3: Budget Exceptions by Department */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  3. Budget Exceptions by Department
                </h2>
                <p className="text-[11px] text-slate-500">
                  Requisitions cleared within budget vs exceeded before optimization
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                GATE 2 AUDIT
              </span>
            </div>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={BUDGET_EXCEPTIONS_DATA} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="withinBudget" name="Within Budget" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budgetExceeded" name="Budget Exceeded" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Highest exceedance rate: Maintenance (32% variance)</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">163 Total Over-Cap PRs Intercepted</span>
          </div>
        </div>

        {/* CHART 4: Inventory Transfers from Sister Depots */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  4. Inventory Transfers by Sister Site
                </h2>
                <p className="text-[11px] text-slate-500">
                  Surplus units reallocated across facilities to avert external PO releases
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                GATE 3 DISCOVERY
              </span>
            </div>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={INVENTORY_TRANSFERS_DATA}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis dataKey="site" type="category" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      name === 'unitsTransferred' ? `${val.toLocaleString()} units` : `$${val.toLocaleString()}`,
                      name === 'unitsTransferred' ? 'Transferred Volume' : 'Capital Preserved',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="unitsTransferred" name="Units Transferred" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
              <Package className="w-3.5 h-3.5" />
              <span>4,040 Total Sister Units Transferred (Avg lead time: 2.1 days)</span>
            </span>
            <span className="font-mono text-emerald-700 font-bold">$372,450 Preserved</span>
          </div>
        </div>
      </div>

      {/* ROW 3: Chart 5 (Usage Anomalies & Excessive Coverage Checks) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                5. Usage Anomalies & Excessive Supply Flagging
              </h2>
              <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                GATE 4 VELOCITY AUDIT
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Comparison of requested coverage duration against enterprise 3-month policy threshold
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>&gt;10 Mos (Critical)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>4-10 Mos (High)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>&le;3 Mos (Policy Aligned)</span>
            </span>
          </div>
        </div>

        {/* Interactive Comparison Bar Chart for Usage Anomalies */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={USAGE_ANOMALIES_DATA} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                unit=" mos"
                domain={[0, 20]}
              />
              <Tooltip
                formatter={(val: number, name: string) => [
                  `${val} months`,
                  name === 'requestedMonths' ? 'Requested Coverage' : 'Policy Threshold',
                ]}
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  border: 'none',
                }}
              />
              <Bar dataKey="requestedMonths" name="Requested Coverage (Months)" fill="#F59E0B" radius={[4, 4, 0, 0]}>
                {USAGE_ANOMALIES_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-usage-${index}`}
                    fill={
                      entry.requestedMonths > 12
                        ? '#EF4444'
                        : entry.requestedMonths > entry.policyLimit
                        ? '#F59E0B'
                        : '#10B981'
                    }
                  />
                ))}
              </Bar>
              <Bar dataKey="policyLimit" name="Policy Ceiling (3 Mos)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Granular Table for Usage Anomaly Highlights */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3">Item Category</th>
                <th className="py-2.5 px-3 text-right">Monthly Run Rate</th>
                <th className="py-2.5 px-3 text-right">Requested Coverage</th>
                <th className="py-2.5 px-3 text-right">Policy Limit</th>
                <th className="py-2.5 px-3">Anomaly Severity</th>
                <th className="py-2.5 px-3">Automated Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {USAGE_ANOMALIES_DATA.map((row) => (
                <tr key={row.category} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{row.category}</td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-600">
                    {row.runRateMonthly} units/mo
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-amber-700">
                    {row.requestedMonths} months
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-500">
                    {row.policyLimit} months
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        row.risk === 'Critical'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : row.risk === 'High'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : row.risk === 'Moderate'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {row.risk}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.requestedMonths > row.policyLimit
                      ? `PO volume automatically trimmed to 2.0-month target buffer.`
                      : 'Volume within normal consumption boundaries.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info Strip */}
      <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            Telemetry refreshed in real-time. Combines Q1-Q3 enterprise audit logs with active user session requisitions.
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
          <span>Enterprise S/4HANA Gateway: CONNECTED</span>
          <span>•</span>
          <span>Sampling Interval: Continuous</span>
        </div>
      </div>
    </div>
  );
};
