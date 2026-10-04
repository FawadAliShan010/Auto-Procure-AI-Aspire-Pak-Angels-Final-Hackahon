import React, { useState } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  CheckCircle2,
  Database,
  ArrowRight,
  BookmarkCheck,
  FileCheck,
  Share2,
  Building2,
  PackageCheck,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  Check,
  Layers,
  DollarSign,
  TrendingDown,
  Clock,
  Zap,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Cpu,
  FileText,
  Lock,
} from 'lucide-react';
import { DEMO_DECISION_SCENARIOS, evaluateProcurementDecision } from '../services/decisionEngine';
import { PurchaseRequest, PRStatus, isRequisitionerRole } from '../types/procurement';

export const RecommendationView: React.FC = () => {
  const {
    currentAnalysisPR,
    requests,
    approveAndSendToERP,
    updateRequestStatus,
    navigateTo,
    setSelectedRequestForModal,
    addToast,
    currentUser,
  } = useProcure();

  // State for ERP simulation sequence
  const [isSimulatingERP, setIsSimulatingERP] = useState(false);
  const [simulationStep, setSimulationStep] = useState<string | null>(null);
  const [erpSuccessData, setErpSuccessData] = useState<{
    poNumber: string;
    transferOrder: string;
    timestamp: string;
    status: string;
    gatewayRef: string;
  } | null>(null);

  const [copiedPO, setCopiedPO] = useState(false);
  const [savedForLater, setSavedForLater] = useState(false);
  const [showFullReportModal, setShowFullReportModal] = useState(false);

  // Fallback to high-value demo requisition if currentAnalysisPR is not active
  const demoFallbackPR: PurchaseRequest = {
    id: 'PR-2025-0914',
    employeeName: 'Marcus Vance',
    department: 'Operations',
    itemDescription: '500 ansi safty helmit for plant turnaround',
    quantity: 500,
    estimatedPrice: 25,
    requiredDate: '2025-10-15',
    additionalNotes: 'Urgent turnaround equipment requisition for production sector B.',
    createdAt: 'Today at 09:42 AM',
    status: 'REDUCE',
    erpSynced: false,
    gate1: {
      originalInput: '500 ansi safty helmit for plant turnaround',
      standardized: 'Safety Helmet ANSI Z89.1',
      matchedItemCode: 'HS-9912',
      category: 'PPE & Safety Equipment',
      glCode: '5210-PPE-SAFETY',
      confidenceScore: 0.94,
      typosCorrected: ['safty -> safety', 'helmit -> helmet', 'ansi -> ANSI Z89.1'],
    },
    gate2: {
      estimatedCost: 12500,
      availableBudget: 8500,
      status: 'Warning',
      variance: 4000,
      remainingBudget: 0,
      message: 'Requisition exceeds available budget by $4,000 before internal stock optimization.',
    },
    gate3: {
      localWarehouseName: 'Houston Central Hub',
      localAvailable: 0,
      otherSites: [
        {
          siteId: 'WH-AUSTIN',
          siteName: 'Austin Logistics Center',
          quantity: 350,
          status: 'excess/project-canceled',
        },
      ],
      warehouses: [
        {
          warehouseId: 'WH-AUSTIN',
          name: 'Austin Logistics Center',
          location: 'Austin, TX (42 miles)',
          quantity: 350,
          isLocal: false,
          stockStatus: 'Excess / Idle',
        },
        {
          warehouseId: 'WH-DALLAS',
          name: 'Dallas Distribution Depot',
          location: 'Dallas, TX (185 miles)',
          quantity: 20,
          isLocal: false,
          stockStatus: 'Reserved',
        },
      ],
      totalSisterStock: 350,
      status: 'Found',
      recommendedTransferQuantity: 350,
      transferRecommendation: 'Transfer 350 units from Austin Logistics Center to satisfy 70% of requirement.',
    },
    gate4: {
      preceding90Days: [
        { month: 'Jul', usage: 28 },
        { month: 'Aug', usage: 32 },
        { month: 'Sep', usage: 30 },
      ],
      avgMonthlyUsage: 30,
      requestedQuantity: 500,
      monthsOfSupply: 16.7,
      recommendedQuantity: 50,
      status: 'High',
      usageFlagMessage: 'Requested quantity exceeds 90-day run rate.',
    },
    decisionResult: {
      decision: 'REDUCE',
      headline: 'Requisition resized to 50 buffer units with 350 units transferred from Austin.',
      purchaseQuantity: 50,
      transferQuantity: 350,
      estimatedSavings: 11250,
      reasoning: [
        'Budget variance resolved via internal depot transfer ($8,750 capital preserved)',
        '350 idle units available at Austin Logistics Center',
        'External PO reduced from 500 to 50 units (saves $2,500 in excess holding volume)',
        'Total estimated savings: $11,250',
      ],
      recommendedActions: [
        {
          type: 'transfer',
          text: 'Transfer 350 units from Austin Logistics Center.',
          quantity: 350,
          site: 'Austin Logistics Center',
        },
        {
          type: 'purchase',
          text: 'Purchase only 50 units externally.',
          quantity: 50,
        },
      ],
    },
  };

  const activePR = currentAnalysisPR || requests[0] || demoFallbackPR;
  const decisionResult = activePR.decisionResult || demoFallbackPR.decisionResult!;

  // Calculations for Summary
  const itemTitle = activePR.gate1?.standardized || activePR.itemDescription || 'Requisition Item';
  const itemCode = activePR.gate1?.matchedItemCode || 'REQ-001';
  const department = activePR.department || 'Operations';
  const purchaseQty = decisionResult.purchaseQuantity ?? activePR.quantity;
  const transferQty = decisionResult.transferQuantity ?? activePR.gate3?.recommendedTransferQuantity ?? 0;
  const totalQtyAfterAdjustment = purchaseQty + transferQty;
  const estimatedSavings = decisionResult.estimatedSavings ?? 0;

  // Final Action Text Formulation
  const finalActionTitle =
    decisionResult.decision === 'REDUCE'
      ? 'REDUCE & PARTIAL TRANSFER'
      : decisionResult.decision === 'APPROVE'
      ? 'APPROVE PURCHASE ORDER'
      : decisionResult.decision === 'HOLD'
      ? 'PLACE ON MANAGER HOLD'
      : decisionResult.decision === 'INVESTIGATE'
      ? 'FLAG FOR COMPLIANCE INVESTIGATION'
      : decisionResult.decision === 'EXPEDITE'
      ? 'EXPEDITE PRIORITY PROCUREMENT'
      : 'REJECT REQUISITION';

  const finalActionDescription =
    decisionResult.decision === 'REDUCE'
      ? `Transfer ${transferQty} units from Warehouse B and purchase only ${purchaseQty} units externally.`
      : decisionResult.decision === 'APPROVE'
      ? `Authorize standard release of ${purchaseQty} units to contracted vendor.`
      : decisionResult.decision === 'HOLD'
      ? 'Pause procurement execution pending cost-center manager budget authorization.'
      : decisionResult.decision === 'EXPEDITE'
      ? `Fast-track expedited order for ${purchaseQty} units with next-day air freight.`
      : 'Review compliance notes before releasing procurement commitment.';

  const isRequisitioner = isRequisitionerRole(currentUser.role);

  // Simulate ERP Handshake with interactive steps
  const handleApproveAndSendToERP = () => {
    if (isRequisitioner) {
      addToast(
        'Approval Authority Required',
        'Requisitioners cannot commit POs to ERP directly (Segregation of Duties). Please switch to Sarah Chen (Purchase Manager) or Admin in the sidebar to authorize.',
        'warning'
      );
      return;
    }

    setIsSimulatingERP(true);
    setSimulationStep('Synthesizing SAP S/4HANA BAPI payload (BAPI_PO_CREATE1)...');

    setTimeout(() => {
      setSimulationStep('Validating General Ledger line items & cost-center allocations...');
    }, 450);

    setTimeout(() => {
      setSimulationStep('Dispatching Transfer Order #TR-8821 to Austin Logistics Depot...');
    }, 900);

    setTimeout(() => {
      const generatedPO = `SAP-PO-${Math.floor(100000 + Math.random() * 900000)}`;
      const generatedTO = `TR-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const approved = approveAndSendToERP(activePR.id);
      if (!approved) {
        setIsSimulatingERP(false);
        setSimulationStep(null);
        return;
      }

      updateRequestStatus(activePR.id, 'APPROVED', `PO committed to SAP S/4HANA (${generatedPO})`);

      setErpSuccessData({
        poNumber: generatedPO,
        transferOrder: generatedTO,
        timestamp: now,
        status: 'SUCCESS_201_CREATED',
        gatewayRef: `GW-S4HANA-US-CENTRAL-${Math.floor(100 + Math.random() * 900)}`,
      });

      setIsSimulatingERP(false);
      setSimulationStep(null);

      addToast(
        'ERP Handshake Succeeded',
        `Requisition successfully converted to Purchase Order ${generatedPO} in SAP S/4HANA.`,
        'success'
      );
    }, 1400);
  };

  const handleSaveForLater = () => {
    updateRequestStatus(
      activePR.id,
      'ON_HOLD',
      `Saved to procurement queue by ${currentUser.name} (${currentUser.role})`
    );
    setSavedForLater(true);
    addToast(
      'Saved for Later',
      `Requisition ${activePR.id} queued safely in local procurement register.`,
      'info'
    );
  };

  const handleCopyPO = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPO(true);
    setTimeout(() => setCopiedPO(false), 2000);
    addToast('Copied to Clipboard', `PO number ${text} copied.`, 'info');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Banner: RECOMMENDATION READY */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Recommendation Ready
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {activePR.id}
              </span>
              <StatusBadge status={activePR.status} size="sm" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Final Recommendation & ERP Routing
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Autonomous 4-gate verification completed. Requisition optimized, capital preserved, and ready for enterprise dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo('/decision')}
          >
            ← Back to Decision Card
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP RESULT METRICS: Final Action, Purchase Qty, Transfer Qty, Savings  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Final Action */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
              Final Action
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-base font-black uppercase tracking-tight text-slate-900 font-mono">
                {finalActionTitle}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {finalActionDescription}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Confidence: {((activePR.gate1?.confidenceScore ?? 0.94) * 100).toFixed(0)}%</span>
            <span className="font-mono font-semibold text-emerald-700">Policy Approved</span>
          </div>
        </div>

        {/* Card 2: Purchase Quantity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
              Purchase Quantity
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-slate-900">
                {purchaseQty}
              </span>
              <span className="text-sm font-semibold text-slate-500">units</span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              External Vendor PO volume adjusted to target 2-month buffer stock.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Vendor Spend:</span>
            <span className="font-mono font-bold text-slate-800">
              ${(purchaseQty * activePR.estimatedPrice).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 3: Transfer Quantity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 font-mono block">
              Transfer Quantity
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-indigo-700">
                {transferQty}
              </span>
              <span className="text-sm font-semibold text-indigo-500">units</span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              Sourced from Austin Logistics Center (idle project inventory).
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-400">
            <span>Internal Transfer:</span>
            <span className="font-mono font-bold text-indigo-800">Depot Order #TR-8821</span>
          </div>
        </div>

        {/* Card 4: Estimated Savings */}
        <div className="bg-emerald-50/90 rounded-2xl border border-emerald-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-mono block flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Estimated Savings
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-emerald-700">
                ${estimatedSavings.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-emerald-800 mt-1.5 font-medium">
              Net financial cost avoidance via internal re-allocation & run-rate sizing.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-emerald-200 flex items-center justify-between text-[11px] text-emerald-700">
            <span>Capital Preserved:</span>
            <span className="font-mono font-bold">84.8% Avoidance</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUCCESS CONFIRMATION BANNER (Interactive Simulation Feedback)          */}
      {/* ========================================================================= */}
      {erpSuccessData && (
        <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                <CheckCircle2 className="w-7 h-7 text-emerald-200" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-200 block">
                  ERP Commit Confirmed
                </span>
                <h3 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                  PO Payload Successfully Committed to SAP S/4HANA
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Requisition state set to APPROVED. General Ledger and transfer records registered.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-700/80 px-4 py-2.5 rounded-xl border border-emerald-500/50 self-start sm:self-auto">
              <span className="text-xs text-emerald-100 font-mono">PO Reference:</span>
              <span className="text-base font-mono font-black text-white">
                {erpSuccessData.poNumber}
              </span>
              <button
                onClick={() => handleCopyPO(erpSuccessData.poNumber)}
                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer ml-1"
                title="Copy PO Number"
              >
                {copiedPO ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-500/60 text-xs text-emerald-100 font-mono">
            <div>
              <span className="text-emerald-300 block text-[10px]">Purchase Order:</span>
              <span className="font-bold text-white">{erpSuccessData.poNumber}</span>
            </div>
            <div>
              <span className="text-emerald-300 block text-[10px]">Internal Transfer:</span>
              <span className="font-bold text-white">{erpSuccessData.transferOrder}</span>
            </div>
            <div>
              <span className="text-emerald-300 block text-[10px]">Timestamp:</span>
              <span className="text-white">{erpSuccessData.timestamp}</span>
            </div>
            <div>
              <span className="text-emerald-300 block text-[10px]">Gateway Code:</span>
              <span className="text-white">{erpSuccessData.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading state during ERP simulation */}
      {isSimulatingERP && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-sm font-mono font-bold text-indigo-300">
              DISPATCHING TO ENTERPRISE GATEWAY...
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono">{simulationStep}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TWO-COLUMN SPLIT: SUMMARY vs NEXT STEPS                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: SUMMARY CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Summary
                </h2>
                <span className="text-base font-bold text-slate-900 tracking-tight block mt-0.5">
                  Requisition Line Specification
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                {activePR.id}
              </span>
            </div>

            <div className="space-y-3.5 text-sm">
              {/* Field 1: Item */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 border-b border-slate-100 gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Item
                </span>
                <div className="text-left sm:text-right">
                  <span className="font-bold text-slate-900 block">{itemTitle}</span>
                  <span className="text-[11px] text-slate-400">
                    Cleaned from original input
                  </span>
                </div>
              </div>

              {/* Field 2: Item Code */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Item Code
                </span>
                <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200">
                  #{itemCode}
                </span>
              </div>

              {/* Field 3: Department */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Department
                </span>
                <span className="font-medium text-slate-800">
                  {department}
                </span>
              </div>

              {/* Field 4: Total Quantity After Adjustment */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 gap-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 font-mono">
                  Total Quantity After Adjustment
                </span>
                <div className="text-left sm:text-right">
                  <span className="text-lg font-black font-mono text-indigo-900 block">
                    {totalQtyAfterAdjustment} units
                  </span>
                  <span className="text-[11px] text-indigo-700">
                    ({purchaseQty} external PO + {transferQty} sister transfer)
                  </span>
                </div>
              </div>

              {/* Additional Context Metrics */}
              <div className="pt-1 text-xs text-slate-500 space-y-1.5">
                <div className="flex justify-between">
                  <span>Original Requested Volume:</span>
                  <span className="font-mono font-semibold text-slate-700">{activePR.quantity} units</span>
                </div>
                <div className="flex justify-between">
                  <span>General Ledger Allocation:</span>
                  <span className="font-mono font-semibold text-slate-700">#5210-PPE-SAFETY</span>
                </div>
                <div className="flex justify-between">
                  <span>Audit Verification Result:</span>
                  <span className="font-semibold text-emerald-700">Passed (4 of 4 Gates)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Pre-submission compliance certified</span>
            <button
              onClick={() => setShowFullReportModal(true)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
            >
              <span>Inspect Raw JSON</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: NEXT STEPS CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3.5 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">
                Next Steps
              </h2>
              <span className="text-base font-bold text-slate-900 tracking-tight block mt-0.5">
                Downstream Action Execution
              </span>
            </div>

            <div className="space-y-3">
              {/* 1. Primary Action: Approve & Send to ERP */}
              <button
                id="btn-approve-send-erp"
                disabled={isSimulatingERP || Boolean(erpSuccessData)}
                onClick={handleApproveAndSendToERP}
                className={`w-full p-4 rounded-xl font-bold text-sm flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                  erpSuccessData
                    ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                    : isRequisitioner
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      erpSuccessData
                        ? 'bg-slate-200 text-slate-600'
                        : isRequisitioner
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {isRequisitioner && !erpSuccessData ? (
                      <Lock className="w-4 h-4 text-amber-800" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="block leading-tight">
                      {erpSuccessData
                        ? 'PO Committed to SAP S/4HANA'
                        : isRequisitioner
                        ? 'Manager Approval Required (Requisitioner Role)'
                        : 'Approve & Send to ERP'}
                    </span>
                    <span
                      className={`text-xs block mt-0.5 font-normal ${
                        erpSuccessData
                          ? 'text-slate-400'
                          : isRequisitioner
                          ? 'text-amber-800'
                          : 'text-emerald-100'
                      }`}
                    >
                      {erpSuccessData
                        ? `Created reference: ${erpSuccessData.poNumber}`
                        : isRequisitioner
                        ? 'Switch to Sarah Chen (Purchase Manager) to release PO'
                        : 'Simulate ERP execution & release Purchase Order'}
                    </span>
                  </div>
                </div>

                {isRequisitioner && !erpSuccessData ? (
                  <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                    RBAC GATE
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 shrink-0" />
                )}
              </button>

              {/* 2. Secondary Action: Save for Later */}
              <button
                id="btn-save-for-later"
                onClick={handleSaveForLater}
                className="w-full p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold text-sm flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <BookmarkCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">Save for Later</span>
                    <span className="text-xs text-slate-400 block mt-0.5 font-normal">
                      Hold requisition in queue for supervisor review
                    </span>
                  </div>
                </div>

                {savedForLater && (
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Saved
                  </span>
                )}
              </button>

              {/* 3. Tertiary Action: View Full Report */}
              <button
                id="btn-view-full-report"
                onClick={() => setShowFullReportModal(true)}
                className="w-full p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold text-sm flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">View Full Report</span>
                    <span className="text-xs text-slate-400 block mt-0.5 font-normal">
                      Full audit certificate, 4 gate breakdown & compliance log
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Active Integration Gateway Card */}
          <div className="mt-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Target ERP Gateway:</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                SAP S/4HANA 2023 Cloud
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Endpoint: /sap/bc/bapi/po/v1</span>
              <span>Status: Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Demo Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateTo('/submit')}
        >
          Submit Another Requisition
        </Button>

        <div className="flex items-center gap-2">
          {erpSuccessData && (
            <button
              onClick={() => {
                setErpSuccessData(null);
                addToast('ERP Simulation Reset', 'You can re-test the ERP approval action.', 'info');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline mr-2"
            >
              Re-run ERP Simulation
            </button>
          )}

          <Button
            variant="secondary"
            size="sm"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigateTo('/requests')}
          >
            Go to Requisition Queue
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FULL REPORT AUDIT MODAL (View Full Report)                             */}
      {/* ========================================================================= */}
      {showFullReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowFullReportModal(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto z-10 flex flex-col p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Procurement Audit Certificate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Requisition {activePR.id} • Automated Pre-Submission Verification
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFullReportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content: 4 Gates Verification */}
            <div className="space-y-4 text-xs">
              {/* Gate 1 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>Gate 1: Catalog & Description Standardization</span>
                  <span className="text-emerald-700 font-mono">94% Confidence</span>
                </div>
                <div className="text-slate-600">
                  Mapped to <strong className="text-slate-800">{itemTitle}</strong> (#{itemCode}). Typos automatically resolved.
                </div>
              </div>

              {/* Gate 2 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>Gate 2: Budget & Cost Ceiling Validation</span>
                  <span className="text-amber-700 font-mono">Variance Optimized</span>
                </div>
                <div className="text-slate-600">
                  Original spend ($12,500) exceeded available budget ($8,500). Internal transfer resolved variance down to $1,250 external commitment.
                </div>
              </div>

              {/* Gate 3 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>Gate 3: Sister Depots & Network Inventory</span>
                  <span className="text-indigo-700 font-mono">350 Units Transferred</span>
                </div>
                <div className="text-slate-600">
                  Austin Logistics Center allocated 350 units from project-canceled surplus.
                </div>
              </div>

              {/* Gate 4 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>Gate 4: 90-Day Consumption Run-Rate</span>
                  <span className="text-emerald-700 font-mono">Resized to Buffer</span>
                </div>
                <div className="text-slate-600">
                  Historical run rate: 30 units/mo. Reduced requested 16.7-month supply down to target buffer. Total savings: ${estimatedSavings.toLocaleString()}.
                </div>
              </div>

              {/* JSON Payload Export Block */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 font-mono text-[11px] block">
                  SAP S/4HANA ERP BAPI Payload:
                </span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-40 leading-relaxed">
{JSON.stringify(
  {
    requisitionId: activePR.id,
    erpAction: 'BAPI_PO_CREATE1',
    itemCode,
    standardizedDescription: itemTitle,
    department,
    purchaseQuantity: purchaseQty,
    transferQuantity: transferQty,
    estimatedSavings,
    status: activePR.status,
    glAccount: '5210-PPE-SAFETY',
    costCenter: 'CC-4010-OPS',
    generatedAt: new Date().toISOString(),
  },
  null,
  2
)}
                </pre>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                SHA-256: 7f8a...e91b (Certified)
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowFullReportModal(false)}
              >
                Close Certificate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
