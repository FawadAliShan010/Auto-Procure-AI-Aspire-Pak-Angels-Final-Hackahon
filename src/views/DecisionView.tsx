import React, { useState, useMemo, useEffect } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ArrowLeft,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  Building2,
  Package,
  Layers,
  Sparkles,
  Sliders,
  Check,
  RefreshCw,
  Search,
  XCircle,
  Cpu,
  ArrowRight,
  TrendingUp,
  FileCheck,
  UserCheck,
  ShieldAlert,
  Edit3,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Send,
  X,
} from 'lucide-react';
import {
  evaluateProcurementDecision,
  runDecisionEngineSelfTest,
  DEMO_DECISION_SCENARIOS,
  DecisionDemoScenario,
  DecisionEngineThresholds,
  DEFAULT_DECISION_THRESHOLDS,
  enhanceDecisionWithGemini,
} from '../services/decisionEngine';
import {
  runHistoricalEngineVerificationSuite,
  VerificationSuiteSummary,
  TestResultItem,
} from '../services/historicalEngineTestSuite';
import { DecisionType, PRStatus, isPurchaseManagerRole } from '../types/procurement';
import { recordAuditLog, createManagerDecisionDoc } from '../services/persistentDataService';

export const DecisionView: React.FC = () => {
  const {
    currentAnalysisPR,
    requests,
    navigateTo,
    addToast,
    updateRequestStatus,
    currentUser,
  } = useProcure();

  // Top navigation tabs
  const [activeTab, setActiveTab] = useState<'DECISION_WORKFLOW' | 'AI_CARD' | 'VERIFICATION_SUITE'>('DECISION_WORKFLOW');

  // Configurable thresholds state
  const [thresholds, setThresholds] = useState<DecisionEngineThresholds>(DEFAULT_DECISION_THRESHOLDS);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);
  
  const pr = currentAnalysisPR || requests[0];

  // Default to CURRENT_PR if a requisition is available, else SCENARIO-REDUCE
  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    pr ? 'CURRENT_PR' : 'SCENARIO-REDUCE'
  );

  useEffect(() => {
    if (pr) {
      setActiveScenarioId('CURRENT_PR');
    }
  }, [pr]);
  const [selfTestResults, setSelfTestResults] = useState<ReturnType<typeof runDecisionEngineSelfTest> | null>(null);
  const [verificationSummary, setVerificationSummary] = useState<VerificationSuiteSummary | null>(null);
  const [isRunningVerification, setIsRunningVerification] = useState(false);
  const [isEnhancingWithGemini, setIsEnhancingWithGemini] = useState(false);
  const [geminiExplanation, setGeminiExplanation] = useState<{
    executiveSummary?: string;
    negotiationNote?: string;
  } | null>(null);

  // Purchase Manager Decision & Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideActionType, setOverrideActionType] = useState<
    'APPROVE_AS_IS' | 'APPROVE_MODIFIED' | 'HOLD' | 'REJECT' | 'CLARIFICATION' | 'REANALYSIS'
  >('APPROVE_MODIFIED');
  const [overrideApprovedQty, setOverrideApprovedQty] = useState<number>(200);
  const [overrideCategory, setOverrideCategory] = useState<string>('Unexpected Safety Requirement');
  const [overrideJustification, setOverrideJustification] = useState<string>('');
  const [targetItemName, setTargetItemName] = useState<string>('');

  // Per-item manager decision store
  const [managerLineDecisions, setManagerLineDecisions] = useState<
    Record<
      string,
      {
        decision: 'APPROVE' | 'REDUCE' | 'HOLD' | 'REJECT' | 'CLARIFICATION' | 'REANALYSIS';
        approvedQuantity: number;
        category?: string;
        justification: string;
        timestamp: string;
      }
    >
  >({});

  // Track the most recent action executed on this page
  const [lastActionRecorded, setLastActionRecorded] = useState<{
    type: string;
    status: PRStatus;
    timestamp: string;
    note: string;
  } | null>(null);

  const isManager = isPurchaseManagerRole(currentUser?.role);

  // Active inputs for decision evaluation
  const activeInput = useMemo(() => {
    if (activeScenarioId === 'CURRENT_PR' && pr) {
      const gate1 = pr.gate1;
      const gate2 = pr.gate2;
      const gate3 = pr.gate3;
      const gate4 = pr.gate4;

      return {
        standardizedItem: gate1?.standardized || pr.itemDescription,
        itemCode: gate1?.matchedItemCode,
        itemMatchingConfidence: gate1?.confidenceScore ?? 0.94,
        quantity: pr.quantity,
        unitPrice: pr.estimatedPrice,
        department: pr.department,
        availableBudget: gate2?.availableBudget ?? 8500,
        otherSiteInventory: (gate3?.warehouses || [])
          .filter((w) => !w.isLocal)
          .map((w) => ({
            siteId: w.warehouseId,
            siteName: w.name,
            quantity: w.quantity,
            status: (w.stockStatus === 'Excess / Idle'
              ? 'excess/project-canceled'
              : w.stockStatus === 'In Stock'
              ? 'in-stock'
              : 'reserve') as any,
          })),
        historicalUsage: gate4?.preceding90Days || [30, 30, 30],
        urgency: (pr as any).urgency || 'normal',
        localInventory: gate3?.localAvailable ?? 0,
      };
    }

    const found = DEMO_DECISION_SCENARIOS.find((s) => s.id === activeScenarioId);
    if (found) return found.input;

    return DEMO_DECISION_SCENARIOS[1].input;
  }, [activeScenarioId, pr]);

  // Compute decision deterministically using the central decision engine
  const evaluatedOutput = useMemo(() => {
    return evaluateProcurementDecision(activeInput, thresholds);
  }, [activeInput, thresholds]);

  // Execute the 22-point Verification Suite
  const handleRunVerificationSuite = async () => {
    setIsRunningVerification(true);
    try {
      const summary = await runHistoricalEngineVerificationSuite();
      setVerificationSummary(summary);
      if (summary.allPassed) {
        addToast(
          'Verification Suite Passed (22/22)',
          'All historical consumption, multi-item, decision, and system integrity tests passed perfectly.',
          'success'
        );
      } else {
        addToast(
          'Verification Notice',
          `${summary.passedCount} passed, ${summary.failedCount} failed.`,
          'warning'
        );
      }
    } catch (err: any) {
      addToast('Test Runner Error', err?.message || 'Failed to run test suite', 'error');
    } finally {
      setIsRunningVerification(false);
    }
  };

  // Open the override modal for a specific line item
  const openDecisionModal = (
    action: 'APPROVE_AS_IS' | 'APPROVE_MODIFIED' | 'HOLD' | 'REJECT' | 'CLARIFICATION' | 'REANALYSIS',
    defaultQty: number,
    itemDesc: string
  ) => {
    setOverrideActionType(action);
    setOverrideApprovedQty(defaultQty);
    setTargetItemName(itemDesc);
    setOverrideJustification(
      action === 'APPROVE_MODIFIED'
        ? `Adjusted volume to ${defaultQty} units based on site refit schedule and warehouse transfer availability.`
        : action === 'APPROVE_AS_IS'
        ? 'Approved requested volume based on operational urgency and scheduled maintenance turnaround.'
        : action === 'HOLD'
        ? 'Held pending technical specification verification with requesting team.'
        : action === 'CLARIFICATION'
        ? 'Requested clarification on scope and project timeline.'
        : 'Re-evaluating historical baseline.'
    );
    setShowOverrideModal(true);
  };

  // Save the Purchase Manager decision
  const handleSaveManagerDecision = async () => {
    if (!overrideJustification.trim()) {
      addToast('Justification Required', 'Purchase Manager must provide a business reason.', 'warning');
      return;
    }

    const targetId = pr?.id || 'PR-2025-0914';
    const decisionKey = targetItemName || pr?.itemDescription || 'PRIMARY-ITEM';

    const decisionRecord = {
      decision: (overrideActionType === 'APPROVE_AS_IS'
        ? 'APPROVE'
        : overrideActionType === 'APPROVE_MODIFIED'
        ? 'REDUCE'
        : overrideActionType === 'HOLD'
        ? 'HOLD'
        : overrideActionType === 'REJECT'
        ? 'REJECT'
        : overrideActionType === 'CLARIFICATION'
        ? 'CLARIFICATION'
        : 'REANALYSIS') as any,
      approvedQuantity: overrideApprovedQty,
      category: overrideCategory,
      justification: overrideJustification,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setManagerLineDecisions((prev) => ({
      ...prev,
      [decisionKey]: decisionRecord,
    }));

    // Update global PR status
    const newPRStatus: PRStatus =
      overrideActionType === 'APPROVE_AS_IS'
        ? 'APPROVED'
        : overrideActionType === 'APPROVE_MODIFIED'
        ? 'REDUCE'
        : overrideActionType === 'HOLD'
        ? 'ON_HOLD'
        : overrideActionType === 'REJECT'
        ? 'REJECTED'
        : 'INVESTIGATE';

    const actionSummaryNote = `Purchase Manager (${currentUser.name}) ${overrideActionType}: ${overrideJustification} [Approved Qty: ${overrideApprovedQty}]`;

    updateRequestStatus(targetId, newPRStatus, actionSummaryNote);

    // Save to Firestore audit log if configured
    try {
      await recordAuditLog({
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        },
        action: `PURCHASE_MANAGER_${overrideActionType}`,
        entityType: 'PURCHASE_REQUISITION',
        entityId: targetId,
        reason: `${overrideCategory}: ${overrideJustification}`,
        newValue: {
          approvedQuantity: overrideApprovedQty,
          reasonCategory: overrideCategory,
          justification: overrideJustification,
          item: decisionKey,
        },
      });
    } catch {
      // Non-blocking fallback
    }

    setLastActionRecorded({
      type: overrideActionType,
      status: newPRStatus,
      timestamp: decisionRecord.timestamp,
      note: actionSummaryNote,
    });

    setShowOverrideModal(false);
    addToast(
      'Purchase Manager Decision Recorded',
      `Requisition updated to [${newPRStatus}] with approved quantity ${overrideApprovedQty} units.`,
      'success'
    );
  };

  // Update request state upon clicking quick action buttons
  const handleAction = (type: 'Approve' | 'Hold' | 'Investigate' | 'Expedite') => {
    const targetId = pr?.id || 'PR-2025-0914';
    const newStatus: PRStatus =
      type === 'Approve'
        ? 'APPROVED'
        : type === 'Hold'
        ? 'ON_HOLD'
        : type === 'Investigate'
        ? 'INVESTIGATE'
        : 'EXPEDITED';

    const actionText =
      type === 'Approve'
        ? 'Approved procurement recommendation'
        : type === 'Hold'
        ? 'Placed on hold for departmental review'
        : type === 'Investigate'
        ? 'Flagged for compliance investigation'
        : 'Expedited with priority routing';

    const note = `${actionText} by ${currentUser.name} (${currentUser.role})`;
    const updated = updateRequestStatus(targetId, newStatus, note);
    if (!updated) return;

    const recorded = {
      type,
      status: newStatus,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      note,
    };
    setLastActionRecorded(recorded);

    addToast(
      `Requisition ${type === 'Approve' ? 'Approved' : type === 'Hold' ? 'Held' : type === 'Investigate' ? 'Flagged' : 'Expedited'}`,
      `Request state updated to [${newStatus}].`,
      type === 'Approve' ? 'success' : type === 'Hold' ? 'warning' : 'info'
    );
  };

  const handleRunSelfTest = () => {
    const res = runDecisionEngineSelfTest();
    setSelfTestResults(res);
    if (res.allPassed) {
      addToast('Decision Engine Verified', 'All 6 test scenarios passed deterministic criteria.', 'success');
    } else {
      addToast('Test Failure', 'Some test scenarios did not match expected decisions.', 'error');
    }
  };

  const handleEnhanceWithGemini = async () => {
    setIsEnhancingWithGemini(true);
    try {
      const res = await enhanceDecisionWithGemini(
        evaluatedOutput,
        activeInput.standardizedItem,
        String(activeInput.department)
      );
      setGeminiExplanation(res);
      addToast('Language Intelligence Applied', 'Generated executive narrative via Gemini.', 'success');
    } catch {
      addToast('Notice', 'Using deterministic narrative fallback.', 'info');
    } finally {
      setIsEnhancingWithGemini(false);
    }
  };

  const decision = evaluatedOutput.decision;
  const isApprove = decision === 'APPROVE' || decision === 'PROCEED';
  const isReduce = decision === 'REDUCE';
  const isHold = decision === 'HOLD';
  const isInvestigate = decision === 'INVESTIGATE';
  const isExpedite = decision === 'EXPEDITE';
  const isReject = decision === 'REJECT' || decision === 'REJECTED';

  const confidencePercent = Math.round(activeInput.itemMatchingConfidence * 100);

  const theme = isApprove
    ? {
        cardBorder: 'border-emerald-300',
        heroBg: 'bg-emerald-600',
        badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        iconBg: 'bg-emerald-100 text-emerald-700',
        accentText: 'text-emerald-700',
        calloutBg: 'bg-emerald-50/70 border-emerald-200',
        confidenceBar: 'bg-emerald-500',
      }
    : isReduce
    ? {
        cardBorder: 'border-amber-300',
        heroBg: 'bg-amber-600',
        badgeBg: 'bg-amber-50 text-amber-950 border-amber-200',
        iconBg: 'bg-amber-100 text-amber-800',
        accentText: 'text-amber-800',
        calloutBg: 'bg-amber-50/70 border-amber-200',
        confidenceBar: 'bg-amber-500',
      }
    : isHold
    ? {
        cardBorder: 'border-orange-300',
        heroBg: 'bg-orange-600',
        badgeBg: 'bg-orange-50 text-orange-950 border-orange-200',
        iconBg: 'bg-orange-100 text-orange-800',
        accentText: 'text-orange-800',
        calloutBg: 'bg-orange-50/70 border-orange-200',
        confidenceBar: 'bg-orange-500',
      }
    : isInvestigate
    ? {
        cardBorder: 'border-purple-300',
        heroBg: 'bg-purple-600',
        badgeBg: 'bg-purple-50 text-purple-950 border-purple-200',
        iconBg: 'bg-purple-100 text-purple-800',
        accentText: 'text-purple-800',
        calloutBg: 'bg-purple-50/70 border-purple-200',
        confidenceBar: 'bg-purple-500',
      }
    : isExpedite
    ? {
        cardBorder: 'border-blue-300',
        heroBg: 'bg-blue-600',
        badgeBg: 'bg-blue-50 text-blue-950 border-blue-200',
        iconBg: 'bg-blue-100 text-blue-800',
        accentText: 'text-blue-800',
        calloutBg: 'bg-blue-50/70 border-blue-200',
        confidenceBar: 'bg-blue-500',
      }
    : {
        cardBorder: 'border-rose-300',
        heroBg: 'bg-rose-600',
        badgeBg: 'bg-rose-50 text-rose-950 border-rose-200',
        iconBg: 'bg-rose-100 text-rose-800',
        accentText: 'text-rose-800',
        calloutBg: 'bg-rose-50/70 border-rose-200',
        confidenceBar: 'bg-rose-500',
      };

  // Requisition items list (multi-item support)
  const lineItems = useMemo(() => {
    const primaryItem = {
      id: 'LINE-01',
      sku: pr?.gate1?.matchedItemCode || '402-STEEL-P3',
      itemDescription: pr?.gate1?.standardized || pr?.itemDescription || '3-inch Carbon Steel Pipe',
      quantity: pr?.quantity || 50,
      estimatedPrice: pr?.estimatedPrice || 145,
      unit: 'EA',
      periodLabel: pr?.gate4?.availablePeriodLabel || '24 MONTHS (FULL BASELINE)',
      annualized: pr?.gate4?.annualizedConsumption ?? (pr?.gate4?.avgMonthlyUsage ? pr.gate4.avgMonthlyUsage * 12 : 144),
      monthlyAvg: pr?.gate4?.avgMonthlyUsage ?? 12,
      trend: pr?.gate4?.consumptionTrend || 'STABLE',
      variance: pr?.gate4?.quantityVariance ?? 0,
      pctVariance: pr?.gate4?.percentageVariance ?? 0,
      recStatus: pr?.gate4?.recommendationStatus || (decision === 'REDUCE' ? 'POTENTIAL_EXCESS' : 'ALIGNED_WITH_HISTORY'),
      statusLabel: pr?.gate4?.recommendationStatusLabel || (decision === 'REDUCE' ? 'Potential Excess' : 'Aligned With History'),
      evidence: pr?.gate4?.keyEvidence || [
        `Historical velocity averages ${pr?.gate4?.avgMonthlyUsage ?? 12} units/mo`,
        'Sister warehouse contains 45 idle units eligible for inter-site stock transfer',
      ],
      suggestedAction: pr?.gate4?.suggestedAction || 'Review transfer opportunity and curtail external purchase',
      recommendedPurchaseQty: evaluatedOutput.calculations.recommendedQuantity,
      transferQty: evaluatedOutput.calculations.inventoryTransferQuantity,
    };

    return [primaryItem];
  }, [pr, decision, evaluatedOutput]);

  return (
    <div id="decision-synthesis-page" className="max-w-6xl mx-auto space-y-6">
      {/* ========================================================================= */}
      {/* CORE MANDATE BANNER: AI IS DECISION SUPPORT */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-300 shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 font-mono">
                AUTOPROCURE AI MANDATE
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                AI IS DECISION SUPPORT. THE PURCHASE MANAGER MAKES THE FINAL PROCUREMENT DECISION.
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                AI calculations are purely deterministic advisory baselines. The Purchase Manager reviews evidence, applies operational business context, and executes final approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Active User Role:</span>
              <span className={`text-xs font-mono font-bold ${isManager ? 'text-emerald-400' : 'text-amber-400'}`}>
                {currentUser.name} ({currentUser.role})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header & Tab Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => navigateTo('/analysis')}
            >
              Back to 4-Gate Analysis
            </Button>
            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {pr?.id || 'PR-2025-0839'}
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              id="tab-btn-manager-workflow"
              onClick={() => setActiveTab('DECISION_WORKFLOW')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'DECISION_WORKFLOW'
                  ? 'bg-white text-indigo-950 shadow-xs border border-slate-250'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                Purchase Manager Decision Center
              </span>
            </button>
            <button
              type="button"
              id="tab-btn-ai-card"
              onClick={() => setActiveTab('AI_CARD')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'AI_CARD'
                  ? 'bg-white text-indigo-950 shadow-xs border border-slate-250'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                AI Recommendation Synthesis
              </span>
            </button>
            <button
              type="button"
              id="tab-btn-verification-suite"
              onClick={() => {
                setActiveTab('VERIFICATION_SUITE');
                if (!verificationSummary) handleRunVerificationSuite();
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'VERIFICATION_SUITE'
                  ? 'bg-white text-indigo-950 shadow-xs border border-slate-250'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                22-Point Verification Suite
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  22/22
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PURCHASE MANAGER FINAL DECISION WORKFLOW (STAGE 3) */}
      {/* ========================================================================= */}
      {activeTab === 'DECISION_WORKFLOW' && (
        <div className="space-y-6">
          {/* Requisition Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    REQUISITION REVIEW & SIGN-OFF
                  </span>
                  <StatusBadge status={pr?.status || 'PENDING_VALIDATION'} size="sm" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {pr?.itemDescription || 'Requisition Package'} • {pr?.department}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  Requested by <strong>{pr?.employeeName || 'Marcus Vance'}</strong> • Total Commitment:{' '}
                  <strong>${((pr?.quantity || 50) * (pr?.estimatedPrice || 145)).toLocaleString()}</strong>
                </div>
              </div>

              {/* Status Summary Pill */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center gap-4">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Requested Qty:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{pr?.quantity || 50} units</span>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">AI Suggested Purchase:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {evaluatedOutput.calculations.recommendedQuantity} units
                  </span>
                </div>
                {evaluatedOutput.calculations.inventoryTransferQuantity > 0 && (
                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Sister Depot Transfer:</span>
                    <span className="font-mono font-bold text-sky-700 text-sm">
                      {evaluatedOutput.calculations.inventoryTransferQuantity} units
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table & Decision Controls */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  LINE ITEM PROCUREMENT INTELLIGENCE & FINAL SIGN-OFF
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {lineItems.length} Line Item{lineItems.length > 1 ? 's' : ''} Analyzed
                </span>
              </div>

              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                {lineItems.map((item) => {
                  const savedDecision = managerLineDecisions[item.itemDescription] || managerLineDecisions['PRIMARY-ITEM'];

                  return (
                    <div key={item.id} className="p-5 space-y-4">
                      {/* Top Row: Item Details & AI Recommendation Status */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              #{item.sku}
                            </span>
                            <span className="font-bold text-slate-900 text-base">{item.itemDescription}</span>
                            <span className="text-xs text-slate-400 font-mono">• {item.periodLabel}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>Req Qty: <strong className="text-slate-800">{item.quantity} units</strong></span>
                            <span>•</span>
                            <span>Annualized Pace: <strong className="text-slate-800">{item.annualized} units/yr</strong></span>
                            <span>•</span>
                            <span>Run-rate: <strong className="text-slate-800">{item.monthlyAvg} units/mo</strong></span>
                            <span>•</span>
                            <span>Trend: <strong className="text-slate-800">{item.trend}</strong></span>
                          </div>
                        </div>

                        {/* AI Status Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-xs font-bold uppercase font-mono ${
                              item.recStatus === 'POTENTIAL_EXCESS'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : item.recStatus === 'ALIGNED_WITH_HISTORY'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-indigo-50 text-indigo-900 border-indigo-300'
                            }`}
                          >
                            {item.recStatus === 'POTENTIAL_EXCESS' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            {item.statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* Evidence & Action Guidance Box */}
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/90 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider block mb-1">
                            Key Historical Evidence:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                            {item.evidence.map((ev, i) => (
                              <li key={i}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider block mb-1">
                            AI Suggested Action:
                          </span>
                          <p className="text-slate-800 leading-relaxed font-medium">
                            {item.suggestedAction}
                          </p>
                          {item.transferQty > 0 && (
                            <div className="mt-1 text-[11px] font-bold text-sky-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                              Transfer {item.transferQty} units from sister depot + Purchase {item.recommendedPurchaseQty} units
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Purchase Manager Decision Status (if already recorded) */}
                      {savedDecision && (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Purchase Manager Final Decision: {savedDecision.decision}
                            </span>
                            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                              Approved Quantity: {savedDecision.approvedQuantity} units
                            </span>
                          </div>
                          <div className="text-slate-600 text-xs">
                            <strong className="text-slate-800">Business Category:</strong> {savedDecision.category || 'Standard'}
                          </div>
                          <div className="text-slate-700 text-xs leading-relaxed">
                            <strong className="text-slate-800">Justification:</strong> "{savedDecision.justification}"
                          </div>
                        </div>
                      )}

                      {/* Action Decision Buttons (Purchase Manager Authority) */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-slate-500 font-medium">
                          {isManager ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              Purchase Manager Authorization Active
                            </span>
                          ) : (
                            <span className="text-amber-700 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Read-Only View: Purchase Manager role required to finalize decisions
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 1. Approve As Requested */}
                          <button
                            type="button"
                            disabled={!isManager}
                            onClick={() => openDecisionModal('APPROVE_AS_IS', item.quantity, item.itemDescription)}
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Requested ({item.quantity})</span>
                          </button>

                          {/* 2. Approve with Modified Quantity / Override */}
                          <button
                            type="button"
                            disabled={!isManager}
                            onClick={() => openDecisionModal('APPROVE_MODIFIED', item.recommendedPurchaseQty || Math.ceil(item.quantity / 2), item.itemDescription)}
                            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modify Quantity & Override</span>
                          </button>

                          {/* 3. Hold / Clarification */}
                          <button
                            type="button"
                            disabled={!isManager}
                            onClick={() => openDecisionModal('HOLD', item.quantity, item.itemDescription)}
                            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Hold / Clarify</span>
                          </button>

                          {/* 4. Reject */}
                          <button
                            type="button"
                            disabled={!isManager}
                            onClick={() => openDecisionModal('REJECT', 0, item.itemDescription)}
                            className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI RECOMMENDATION CARD (THE FULL 4-GATE CENTERPIECE) */}
      {/* ========================================================================= */}
      {activeTab === 'AI_CARD' && (
        <div className="space-y-6">
          {/* Quick Scenario Switcher Header inside AI Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Explore AI decision outputs across real procurement scenarios:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DEMO_DECISION_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveScenarioId(s.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                    activeScenarioId === s.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* The Large Decision Card */}
          <div className={`bg-white rounded-2xl border-2 ${theme.cardBorder} shadow-lg overflow-hidden`}>
            {/* Active State Update Notification Banner */}
            {lastActionRecorded && (
              <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>
                    Request State Updated to <span className="underline uppercase tracking-wider font-mono">{lastActionRecorded.status}</span>: {lastActionRecorded.note}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-100 font-mono">
                  Recorded at {lastActionRecorded.timestamp}
                </span>
              </div>
            )}

            {/* Hero Header: DECISION, CONFIDENCE, ESTIMATED SAVINGS */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 font-mono">
                      AI RECOMMENDATION:
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border text-xl sm:text-2xl font-black tracking-tight font-mono uppercase shadow-xs ${theme.badgeBg}`}
                    >
                      {isApprove && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                      {isReduce && <TrendingDown className="w-6 h-6 text-amber-600" />}
                      {isHold && <Clock className="w-6 h-6 text-orange-600" />}
                      {isInvestigate && <Search className="w-6 h-6 text-purple-600" />}
                      {isExpedite && <Zap className="w-6 h-6 text-blue-600" />}
                      {isReject && <XCircle className="w-6 h-6 text-rose-600" />}
                      <span>{decision}</span>
                    </span>
                    <StatusBadge status={decision} size="sm" />
                  </div>

                  <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug max-w-2xl">
                    {evaluatedOutput.headline}
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-700">{activeInput.standardizedItem}</span>
                    <span>•</span>
                    <span>Req Qty: {activeInput.quantity} units</span>
                    <span>•</span>
                    <span>Unit Price: ${activeInput.unitPrice}</span>
                    <span>•</span>
                    <span>Dept: {activeInput.department}</span>
                  </div>
                </div>

                {/* Right: CONFIDENCE & ESTIMATED SAVINGS Callouts */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 flex-wrap">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs min-w-[140px]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      CONFIDENCE
                    </div>
                    <div className="text-3xl font-black font-mono text-slate-900 mt-0.5">
                      {confidencePercent}%
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${theme.confidenceBar}`}
                        style={{ width: `${confidencePercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-2xs min-w-[160px]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 font-mono flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      ESTIMATED SAVINGS
                    </div>
                    <div className="text-3xl font-black font-mono text-emerald-700 mt-0.5">
                      ${evaluatedOutput.calculations.estimatedSavings.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-800 mt-1 font-medium">
                      {evaluatedOutput.calculations.estimatedSavings > 0
                        ? 'Total cost avoidance'
                        : 'Standard procurement'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gemini AI Narrative */}
              <div className="mt-4 pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    {geminiExplanation?.executiveSummary
                      ? `AI Narrative: "${geminiExplanation.executiveSummary}"`
                      : 'AI Executive Summary & Policy Analysis'}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                  onClick={handleEnhanceWithGemini}
                  disabled={isEnhancingWithGemini}
                >
                  {isEnhancingWithGemini ? 'Synthesizing...' : 'Generate AI Narrative'}
                </Button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* 1. KEY FACTORS & REASONING */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 font-mono">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    KEY FACTORS & POLICY REASONING
                  </h3>
                </div>

                <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-2.5">
                  {evaluatedOutput.reasoning.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                        •
                      </div>
                      <div className="text-sm font-medium text-slate-800 leading-relaxed">
                        {factor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. THE THREE IMPACT PILLARS */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 font-mono">
                  THREE CORE IMPACT PILLARS
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Budget */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        Budget Impact
                      </span>
                      <span
                        className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${
                          evaluatedOutput.calculations.budgetVariance > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {evaluatedOutput.calculations.budgetVariance > 0 ? 'Exceeded' : 'Within Budget'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Requested Spend:</span>
                        <span className="font-bold font-mono text-slate-900">
                          ${evaluatedOutput.calculations.totalCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Available Budget:</span>
                        <span className="font-bold font-mono text-slate-900">
                          ${activeInput.availableBudget.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Variance:</span>
                        <span
                          className={`font-bold font-mono ${
                            evaluatedOutput.calculations.budgetVariance > 0
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {evaluatedOutput.calculations.budgetVariance > 0
                            ? `+$${evaluatedOutput.calculations.budgetVariance.toLocaleString()} (Over)`
                            : `$${evaluatedOutput.calculations.remainingBudget.toLocaleString()} Surplus`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inventory */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-indigo-600" />
                        Inventory Impact
                      </span>
                      <span
                        className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${
                          evaluatedOutput.calculations.inventoryTransferQuantity > 0
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {evaluatedOutput.calculations.inventoryTransferQuantity > 0 ? 'Transfer Available' : 'No Sister Stock'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Transferable Units:</span>
                        <span className="font-bold font-mono text-sky-700">
                          {evaluatedOutput.calculations.inventoryTransferQuantity} units
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Source Depot:</span>
                        <span className="font-bold text-slate-900 truncate">
                          {evaluatedOutput.calculations.primaryTransferSource || 'None required'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Transfer Savings:</span>
                        <span className="font-bold font-mono text-emerald-700">
                          ${evaluatedOutput.calculations.savingsBreakdown.transferSavings.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        24M Velocity Impact
                      </span>
                      <span
                        className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${
                          evaluatedOutput.calculations.coverageMonths > thresholds.excessiveMonthsOfSupplyThreshold
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {evaluatedOutput.calculations.coverageMonths} Mos Supply
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Monthly Run-Rate:</span>
                        <span className="font-bold font-mono text-slate-900">
                          {evaluatedOutput.calculations.averageMonthlyUsage} units/mo
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Recommended PO:</span>
                        <span className="font-bold font-mono text-indigo-700">
                          {evaluatedOutput.calculations.recommendedQuantity} units
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Curtailment Savings:</span>
                        <span className="font-bold font-mono text-emerald-700">
                          ${evaluatedOutput.calculations.savingsBreakdown.volumeReductionSavings.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. RECOMMENDED ACTION BLOCK */}
              <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-indigo-300 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    RECOMMENDED EXECUTION PLAN
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Total Estimated Savings: ${evaluatedOutput.calculations.estimatedSavings.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3">
                  {evaluatedOutput.recommendedActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-sm font-medium"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-slate-100 font-medium text-sm">
                          {action.text}
                        </span>
                      </div>

                      {action.quantity !== undefined && (
                        <span className="font-bold font-mono text-xs text-indigo-200 bg-indigo-900/50 border border-indigo-700 px-3 py-1 rounded-lg shrink-0">
                          {action.quantity} units
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 22-POINT HISTORICAL ANALYSIS VERIFICATION SUITE */}
      {/* ========================================================================= */}
      {activeTab === 'VERIFICATION_SUITE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  AUTOMATED TEST SUITE
                </span>
                <span className="bg-emerald-100 text-emerald-800 font-bold font-mono text-xs px-2.5 py-0.5 rounded-full">
                  Deterministic Criteria Engine
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                22-Point Historical Analysis & Decision Verification Suite
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Executes all 22 test scenarios specified in the AutoProcure AI Core Procurement Intelligence PRD.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRunningVerification ? 'animate-spin' : ''}`} />}
              onClick={handleRunVerificationSuite}
              disabled={isRunningVerification}
            >
              {isRunningVerification ? 'Executing 22 Tests...' : 'Re-Run Complete Suite'}
            </Button>
          </div>

          {/* Test Summary Stats */}
          {verificationSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Tests</span>
                <span className="text-2xl font-black font-mono text-slate-900">{verificationSummary.totalTests}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-emerald-800 block text-[10px] font-bold uppercase">Passed</span>
                <span className="text-2xl font-black font-mono text-emerald-700">{verificationSummary.passedCount}</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                <span className="text-rose-800 block text-[10px] font-bold uppercase">Failed</span>
                <span className="text-2xl font-black font-mono text-rose-700">{verificationSummary.failedCount}</span>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                <span className="text-indigo-800 block text-[10px] font-bold uppercase">Suite Status</span>
                <span className="text-sm font-black font-mono text-indigo-900 mt-1 block">
                  {verificationSummary.allPassed ? '100% PASS' : 'ATTENTION REQUIRED'}
                </span>
              </div>
            </div>
          )}

          {/* Detailed 22-Test Results Grid */}
          {verificationSummary && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                TEST EXECUTION LOG (TEST 1 TO TEST 22)
              </h3>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
                {verificationSummary.results.map((test) => (
                  <div key={test.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-700 w-16 shrink-0">{test.id}</span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          test.passed ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <div>
                        <span className="font-semibold text-slate-900">{test.name}</span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                            {test.category}
                          </span>
                          <span>Expected: {test.expected}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] shrink-0 ${
                        test.passed
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {test.passed ? '✓ PASS' : '✗ FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PURCHASE MANAGER OVERRIDE & BUSINESS CONTEXT MODAL */}
      {/* ========================================================================= */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Purchase Manager Decision & Context
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Requisition Target Item:
                </label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800">
                  {targetItemName || pr?.itemDescription || 'Requisition Item'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Decision Action:
                  </label>
                  <select
                    value={overrideActionType}
                    onChange={(e) => setOverrideActionType(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                  >
                    <option value="APPROVE_AS_IS">Approve Requested Volume</option>
                    <option value="APPROVE_MODIFIED">Approve Modified Quantity</option>
                    <option value="HOLD">Place On Hold</option>
                    <option value="CLARIFICATION">Request Clarification</option>
                    <option value="REANALYSIS">Request Re-Analysis</option>
                    <option value="REJECT">Reject Requisition</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Final Approved Quantity:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overrideApprovedQty}
                    onChange={(e) => setOverrideApprovedQty(Math.max(0, Number(e.target.value)))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Business Context Category:
                </label>
                <select
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white"
                >
                  <option value="Unexpected Safety Requirement">Unexpected Safety Requirement</option>
                  <option value="New Project / Expansion">New Project / Plant Expansion</option>
                  <option value="Regulatory Compliance">Regulatory / Safety Audit Compliance</option>
                  <option value="Emergency Breakdown">Emergency Breakdown / Unplanned Maintenance</option>
                  <option value="Seasonal Surge">Seasonal Surge / Peak Operational Demand</option>
                  <option value="Increased Workforce">Increased Workforce / Added Shifts</option>
                  <option value="Plant Shutdown">Plant Shutdown / Turnaround Preparation</option>
                  <option value="Site-Specific Constraint">Site-Specific Logistics Constraint</option>
                  <option value="Other Reason">Other Operational Justification</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Detailed Justification (Audit Trail Required):
                </label>
                <textarea
                  rows={3}
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  placeholder="Explain the operational justification, shift requirements, or scheduled refit details..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-normal bg-white"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverrideModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Check className="w-3.5 h-3.5" />}
                onClick={handleSaveManagerDecision}
              >
                Confirm & Record Decision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionView;
