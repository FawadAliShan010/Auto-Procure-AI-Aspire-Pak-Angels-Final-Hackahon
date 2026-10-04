import React, { useState } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { GateCard } from '../components/analysis/GateCard';
import { UsageChart } from '../components/analysis/UsageChart';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Package,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building2,
  FileText,
  Warehouse,
  MapPin,
  ArrowUpRight,
  Split,
  RefreshCw,
  Clock,
  Calendar,
  BarChart3,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { INITIAL_PURCHASE_REQUESTS } from '../data/mockProcurementData';

export const AnalysisView: React.FC = () => {
  const { currentAnalysisPR, setCurrentAnalysisPR, navigateTo } = useProcure();
  const [gate4ViewMode, setGate4ViewMode] = useState<'ENTERPRISE_24M' | 'QUICK_90D'>('ENTERPRISE_24M');
  const [showFullEvidence, setShowFullEvidence] = useState(false);

  // If no PR currently active in context, default to the Steel Pipe demo (PR-2025-0839)
  const pr = currentAnalysisPR || INITIAL_PURCHASE_REQUESTS[3];

  const handleSelectDemoScenario = (prId: string) => {
    const found = INITIAL_PURCHASE_REQUESTS.find((p) => p.id === prId);
    if (found) {
      setCurrentAnalysisPR(found);
    }
  };

  const { gate1, gate2, gate3, gate4 } = pr;

  // Warehouses list for Gate 3
  const warehouses = gate3?.warehouses || [
    {
      warehouseId: 'WH-A',
      name: 'Warehouse A',
      quantity: gate3?.localAvailable ?? 2,
      location: 'Bay 4, Rack 12',
      stockStatus: (gate3?.localAvailable ?? 2) > 0 ? ('In Stock' as const) : ('Out of Stock' as const),
      isLocal: true,
    },
    {
      warehouseId: 'WH-B',
      name: 'Warehouse B',
      quantity: 45,
      location: 'Logistics Depot North, Staging A',
      stockStatus: 'Excess / Idle' as const,
      isLocal: false,
    },
    {
      warehouseId: 'WH-C',
      name: 'Warehouse C',
      quantity: 0,
      location: 'Central Distribution Yard',
      stockStatus: 'Out of Stock' as const,
      isLocal: false,
    },
  ];

  // Preceding 90-day history for Gate 4
  const history90Days = gate4?.preceding90Days || [
    { month: 'Jun', usage: 14 },
    { month: 'Jul', usage: 10 },
    { month: 'Aug', usage: 12 },
  ];

  const unitPrice = pr.estimatedPrice || (gate2 ? Math.round(gate2.estimatedCost / Math.max(1, pr.quantity)) : 25);
  const totalCost = gate2?.estimatedCost ?? pr.quantity * unitPrice;
  const budgetAvailable = gate2?.availableBudget ?? 4000;
  const varianceAmount = gate2?.variance ?? Math.max(0, totalCost - budgetAvailable);
  const remainingBudgetAmount = gate2?.remainingBudget ?? Math.max(0, budgetAvailable - totalCost);

  // Calculate budget bar percentages
  const budgetPercentUsed = Math.min(100, Math.round((totalCost / Math.max(1, budgetAvailable)) * 100));
  const isOverBudget = varianceAmount > 0;

  return (
    <div id="data-checks-analysis-page" className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Context Metadata */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded">
                {pr.id}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Requisitioner: <strong className="text-slate-800">{pr.employeeName}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Department: <strong className="text-slate-800">{pr.department}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Required Date: <strong className="text-slate-800">{pr.requiredDate}</strong>
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Procurement Pre-Submission Gatekeeper Analysis
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Comprehensive 4-gate verification auditing data taxonomy, departmental budget, cross-depot stock, and 90-day consumption velocity.
            </p>
          </div>

          {/* Quick Scenario Switcher */}
          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Switch Scenario:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                id="demo-steel-pipe-btn"
                onClick={() => handleSelectDemoScenario('PR-2025-0839')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                  pr.id === 'PR-2025-0839'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50'
                }`}
              >
                3in Steel Pipe (Demo 1)
              </button>
              <button
                type="button"
                id="demo-helmet-btn"
                onClick={() => handleSelectDemoScenario('PR-2025-0841')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                  pr.id === 'PR-2025-0841'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50'
                }`}
              >
                500 Helmets (Marcus)
              </button>
              <button
                type="button"
                id="demo-charger-btn"
                onClick={() => handleSelectDemoScenario('PR-2025-0842')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                  pr.id === 'PR-2025-0842'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50'
                }`}
              >
                Laptop Charger
              </button>
              <button
                type="button"
                id="demo-chair-btn"
                onClick={() => handleSelectDemoScenario('PR-2025-0840')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                  pr.id === 'PR-2025-0840'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-250 hover:bg-slate-50'
                }`}
              >
                Office Chair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gemini AI Intelligence Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm border border-indigo-800/60">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-wide uppercase text-indigo-300 font-mono">
                Gemini Procurement Intelligence
              </span>
              <span className="text-[10px] bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 px-2 py-0.5 rounded-full font-medium">
                Server-Side Validated
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {pr.decisionResult?.headline || `Standardized Requisition Audit for ${gate1?.standardized || pr.itemDescription}`}
            </h2>
            <div className="space-y-1 mt-1 text-xs text-indigo-100/90 leading-relaxed max-w-3xl">
              {pr.decisionResult?.reasoning && pr.decisionResult.reasoning.length > 0 ? (
                pr.decisionResult.reasoning.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <p>All pre-submission policies evaluated deterministically against live master data and stock catalogs.</p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-start gap-2">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-medium block">
                NLP Confidence
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {((gate1?.confidenceScore ?? 0.98) * 100).toFixed(0)}%
              </span>
            </div>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-1 rounded border border-indigo-700/50">
              Zero Frontend API Key Exposure
            </span>
          </div>
        </div>
      </div>

      {/* 4 CLEARLY SEPARATED PROCUREMENT GATES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ========================================================
            GATE 1 — DATA CLEANING
            ======================================================== */}
        <GateCard
          id="gate-1-data-cleaning"
          gateNumber="01"
          title="Gate 1 — Data Cleaning"
          subtitle="NLP Catalog Alignment & Taxonomy Standardization"
          status="Passed"
          icon={<Sparkles className="w-4 h-4 text-indigo-500" />}
          inputs={
            <div className="space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">Raw Requisition Text:</div>
              <div className="font-mono text-xs text-slate-800 bg-white p-2 rounded border border-slate-200 select-all font-semibold">
                "{gate1?.originalInput || '3in steele pip for factory maintenance 50 count'}"
              </div>
            </div>
          }
          results={
            <div className="divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500 font-medium">Standardized Title</span>
                <span className="font-semibold text-slate-900 text-right">
                  {gate1?.standardized || '3-inch carbon-steel pipe'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500 font-medium">Commodity Category</span>
                <span className="font-medium text-slate-800">
                  {gate1?.category || 'Piping'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500 font-medium">Item Code (ERP SKU)</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                  #{gate1?.matchedItemCode || '402-STEEL-P3'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500 font-medium">GL Code & Account</span>
                <span className="font-mono text-slate-700 font-medium text-right">
                  {gate1?.glCode || '5120 • MRO Supplies'}
                </span>
              </div>
            </div>
          }
          relevantMetrics={
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2 flex items-center justify-between">
                <span className="text-emerald-800 font-medium">AI Confidence:</span>
                <span className="font-mono font-bold text-emerald-900">
                  {((gate1?.confidenceScore ?? 0.99) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Taxonomy Status:</span>
                <span className="font-bold text-slate-800">Master Verified</span>
              </div>
            </div>
          }
          visualIndicator={
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Identified Corrections:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gate1?.typosCorrected && gate1.typosCorrected.length > 0 ? (
                  gate1.typosCorrected.map((fix, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-slate-700 px-2.5 py-1 rounded border border-slate-200 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      {fix}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-[11px]">Exact catalog match. No spelling modifications required.</span>
                )}
              </div>
            </div>
          }
          explanation={
            <span>
              Colloquial terminology and informal project specs were resolved using semantic ERP embeddings.
              The request was standardized to <strong>{gate1?.standardized}</strong> (SKU #{gate1?.matchedItemCode}) and mapped to general ledger account <strong>{gate1?.glCode}</strong>.
            </span>
          }
        />

        {/* ========================================================
            GATE 2 — BUDGET CHECK
            ======================================================== */}
        <GateCard
          id="gate-2-budget-check"
          gateNumber="02"
          title="Gate 2 — Budget Check"
          subtitle="Commitment Calculation vs Available Department Ceiling"
          status={gate2?.status || (isOverBudget ? 'Warning' : 'Passed')}
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          inputs={
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Requested Quantity</span>
                <span className="font-mono font-bold text-slate-800">{pr.quantity} units</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Estimated Price per Unit</span>
                <span className="font-mono font-bold text-slate-800">${unitPrice} / unit</span>
              </div>
            </div>
          }
          results={
            <div className="divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500 font-medium">Estimated Cost ({pr.quantity} × ${unitPrice})</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ${totalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500 font-medium">Available Budget ({pr.department})</span>
                <span className="font-mono font-semibold text-slate-800">
                  ${budgetAvailable.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500 font-medium">Variance</span>
                <span
                  className={`font-mono font-bold ${
                    varianceAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {varianceAmount > 0 ? `+$${varianceAmount.toLocaleString()}` : `$0`}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500 font-medium">Remaining Budget</span>
                <span className="font-mono font-bold text-slate-800">
                  ${remainingBudgetAmount.toLocaleString()}
                </span>
              </div>
            </div>
          }
          relevantMetrics={
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Budget Ratio:</span>
                <span className={`font-mono font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-800'}`}>
                  {budgetPercentUsed}%
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Approval Tier:</span>
                <span className="font-bold text-slate-700">
                  {totalCost > 5000 ? 'Director Level' : 'Manager Level'}
                </span>
              </div>
            </div>
          }
          visualIndicator={
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-600">Budget Pool Allocation</span>
                <span className="font-mono font-semibold text-slate-800">
                  ${totalCost.toLocaleString()} of ${budgetAvailable.toLocaleString()}
                </span>
              </div>
              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className={`h-full ${isOverBudget ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (Math.min(totalCost, budgetAvailable) / budgetAvailable) * 100)}%` }}
                />
                {isOverBudget && (
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${Math.min(100, (varianceAmount / budgetAvailable) * 100)}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Allocated: ${Math.min(totalCost, budgetAvailable).toLocaleString()}
                </span>
                {isOverBudget ? (
                  <span className="text-rose-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                    Variance (Over): +${varianceAmount.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">
                    Surplus: ${remainingBudgetAmount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          }
          explanation={
            <span>
              {isOverBudget ? (
                <>
                  The commitment of <strong>${totalCost.toLocaleString()}</strong> exceeds the available {pr.department} allocation of <strong>${budgetAvailable.toLocaleString()}</strong> by <strong>${varianceAmount.toLocaleString()}</strong>.
                  External procurement will trigger an approval flag unless internal warehouse transfers are leveraged.
                </>
              ) : (
                <>
                  The commitment of <strong>${totalCost.toLocaleString()}</strong> is fully covered by the {pr.department} budget pool (available <strong>${budgetAvailable.toLocaleString()}</strong>), leaving <strong>${remainingBudgetAmount.toLocaleString()}</strong> in unencumbered reserve.
                </>
              )}
            </span>
          }
        />

        {/* ========================================================
            GATE 3 — INVENTORY CHECK
            ======================================================== */}
        <GateCard
          id="gate-3-inventory-check"
          gateNumber="03"
          title="Gate 3 — Inventory Check"
          subtitle="Multi-Depot Stock Search & Idle Transfer Opportunity"
          status={gate3?.status || 'Found'}
          icon={<Warehouse className="w-4 h-4 text-sky-500" />}
          inputs={
            <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Queried Item Master:</span>
              <span className="font-mono font-bold text-slate-800">
                #{gate1?.matchedItemCode || '402-STEEL-P3'}
              </span>
            </div>
          }
          results={
            <div className="divide-y divide-slate-100 text-xs">
              {warehouses.map((wh) => (
                <div key={wh.warehouseId} className="p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        wh.stockStatus === 'In Stock'
                          ? 'bg-emerald-500'
                          : wh.stockStatus === 'Excess / Idle'
                          ? 'bg-sky-500'
                          : wh.stockStatus === 'Reserved'
                          ? 'bg-amber-500'
                          : 'bg-slate-300'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{wh.name}</span>
                        {wh.isLocal && (
                          <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-250">
                            Local
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{wh.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900 text-xs">
                      {wh.quantity} units
                    </div>
                    <span
                      className={`inline-block text-[10px] font-medium px-1.5 py-0.2 rounded ${
                        wh.stockStatus === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : wh.stockStatus === 'Excess / Idle'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : wh.stockStatus === 'Reserved'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {wh.stockStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          }
          relevantMetrics={
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-2 flex items-center justify-between">
                <span className="text-sky-800 font-medium">Idle Network Stock:</span>
                <span className="font-mono font-bold text-sky-950">
                  {gate3?.totalSisterStock ?? 45} units
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Local Available:</span>
                <span className="font-mono font-bold text-slate-800">
                  {gate3?.localAvailable ?? 2} units
                </span>
              </div>
            </div>
          }
          visualIndicator={
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span className="flex items-center gap-1 text-sky-900">
                  <Split className="w-3.5 h-3.5 text-sky-600" />
                  Inter-Warehouse Transfer Recommendation:
                </span>
              </div>
              <div className="bg-sky-50/80 border border-sky-200 p-2.5 rounded-lg text-[11px] text-sky-950 leading-relaxed font-medium">
                {gate3?.transferRecommendation ||
                  'Transfer 45 units from Warehouse B (Logistics Depot North) to local facility to avoid external supplier lead time and save $6,525.'}
              </div>
            </div>
          }
          explanation={
            <span>
              Real-time enterprise inventory queries uncovered <strong>{gate3?.totalSisterStock ?? 45} idle/excess units</strong> at sister depots.
              Fulfilling this requirement via internal stock transfer avoids new supplier commitments and eliminates lead time.
            </span>
          }
        />

        {/* ========================================================
            GATE 4 — UPGRADED HISTORICAL CONSUMPTION & REQUIREMENT ANALYSIS
            ======================================================== */}
        <GateCard
          id="gate-4-usage-analysis"
          gateNumber="04"
          title="Gate 4 — Historical Consumption Intelligence"
          subtitle="24-Month Consumption Velocity, YoY Trend & Anomaly Detection"
          status={
            gate4?.recommendationStatus === 'POTENTIAL_EXCESS'
              ? 'High'
              : gate4?.recommendationStatus === 'ALIGNED_WITH_HISTORY'
              ? 'Optimal'
              : (gate4?.status || 'High')
          }
          icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
          inputs={
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Historical Baseline:</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-800 border border-purple-200">
                  {gate4?.availablePeriodLabel || '24 MONTHS (FULL BASELINE)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-500">View Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGate4ViewMode('ENTERPRISE_24M')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                      gate4ViewMode === 'ENTERPRISE_24M'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    24M Full Baseline
                  </button>
                  <button
                    type="button"
                    onClick={() => setGate4ViewMode('QUICK_90D')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                      gate4ViewMode === 'QUICK_90D'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    90-Day Velocity
                  </button>
                </div>
              </div>
            </div>
          }
          results={
            <div className="divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-purple-50/20">
                <div>
                  <span className="text-slate-700 font-semibold block">Requested Quantity</span>
                  <span className="text-[10px] text-slate-400">Current Requisition Line</span>
                </div>
                <span className="font-mono font-bold text-indigo-700 text-sm">
                  {gate4?.requestedQuantity ?? pr.quantity} units
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <div>
                  <span className="text-slate-600 font-medium block">Annualized Consumption</span>
                  <span className="text-[10px] text-slate-400">12-Month Extrapolated Pace</span>
                </div>
                <span className="font-mono font-bold text-slate-800">
                  {gate4?.annualizedConsumption ?? (gate4?.avgMonthlyUsage ? gate4.avgMonthlyUsage * 12 : 144)} units / yr
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <div>
                  <span className="text-slate-600 font-medium block">Monthly Average Run-Rate</span>
                  <span className="text-[10px] text-slate-400">Historical Monthly Pace</span>
                </div>
                <span className="font-mono font-bold text-slate-800">
                  {gate4?.avgMonthlyUsage ?? 12} units / mo
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <div>
                  <span className="text-slate-600 font-medium block">Historical Variance</span>
                  <span className="text-[10px] text-slate-400">Delta vs Annual Consumption</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    (gate4?.quantityVariance ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {(gate4?.quantityVariance ?? 0) > 0
                    ? `+${gate4?.quantityVariance} units (+${gate4?.percentageVariance}%)`
                    : `${gate4?.quantityVariance ?? 0} units (${gate4?.percentageVariance ?? 0}%)`}
                </span>
              </div>
            </div>
          }
          relevantMetrics={
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block font-medium">Consumption Trend:</span>
                  <span
                    className={`font-bold inline-flex items-center gap-1 ${
                      gate4?.consumptionTrend === 'INCREASING'
                        ? 'text-indigo-700'
                        : gate4?.consumptionTrend === 'DECREASING'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {gate4?.consumptionTrend || 'STABLE'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block font-medium">Coverage Months:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {gate4?.monthsOfSupply ?? 4.2} months
                  </span>
                </div>
              </div>

              {/* Recommendation Pill */}
              <div
                className={`p-2.5 rounded-lg border text-xs ${
                  gate4?.recommendationStatus === 'POTENTIAL_EXCESS'
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : gate4?.recommendationStatus === 'ALIGNED_WITH_HISTORY'
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-indigo-50/90 border-indigo-300 text-indigo-950'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    {gate4?.recommendationStatus === 'POTENTIAL_EXCESS' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {gate4?.recommendationStatusLabel || (gate4?.recommendationStatus || 'ALIGNED_WITH_HISTORY').replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 bg-white rounded border border-slate-200">
                    {gate4?.suggestedAction || 'proceed to review'}
                  </span>
                </div>

                {gate4?.keyEvidence && gate4.keyEvidence.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 mt-1.5">
                    {gate4.keyEvidence.slice(0, showFullEvidence ? 5 : 2).map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                )}

                {gate4?.keyEvidence && gate4.keyEvidence.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowFullEvidence(!showFullEvidence)}
                    className="text-[10px] font-bold text-slate-700 underline mt-1 block"
                  >
                    {showFullEvidence ? 'Show less evidence' : `+${gate4.keyEvidence.length - 2} more evidence points`}
                  </button>
                )}
              </div>
            </div>
          }
          visualIndicator={
            <UsageChart
              history={history90Days}
              avgMonthlyUsage={gate4?.avgMonthlyUsage ?? 12}
              requestedQuantity={gate4?.requestedQuantity ?? pr.quantity}
              recommendedQuantity={gate4?.recommendedQuantity ?? 5}
              monthsOfSupply={gate4?.monthsOfSupply ?? 4.2}
            />
          }
          explanation={
            <span>
              {gate4?.usageFlagMessage ||
                `Requested ${pr.quantity} units represents ${gate4?.monthsOfSupply ?? 4.2} months of inventory against the baseline of ${gate4?.avgMonthlyUsage ?? 12} units/month.`}{' '}
              By transferring 45 units from Warehouse B, the recommended external purchase is reduced to <strong>{gate4?.recommendedQuantity ?? 5} units</strong>.
            </span>
          }
        />
      </div>

      {/* Footer Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <Button
          id="btn-back-to-submit"
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          onClick={() => navigateTo('/submit')}
        >
          Back to Requisition Form
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden md:inline font-medium">
            All 4 procurement gates verified and cross-referenced with ERP
          </span>
          <Button
            id="btn-proceed-to-decision"
            variant="primary"
            size="sm"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigateTo('/decision')}
          >
            Review AI Decision & Recommendations →
          </Button>
        </div>
      </div>
    </div>
  );
};
