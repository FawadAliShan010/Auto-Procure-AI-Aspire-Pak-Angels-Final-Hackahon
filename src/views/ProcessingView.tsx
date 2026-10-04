import React, { useEffect, useState, useRef } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { runRequisitionAudit } from '../services/aiAuditService';
import {
  CheckCircle2,
  Loader2,
  Circle,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Building2,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';

type StepStatus = 'WAITING' | 'PROCESSING' | 'COMPLETED';

interface AuditStep {
  id: number;
  label: string;
  description: string;
}

const AUDIT_STEPS: AuditStep[] = [
  {
    id: 1,
    label: 'Cleaning & standardizing data',
    description: 'Resolving spelling typos, colloquialisms, and mapping to UNSPSC taxonomy.',
  },
  {
    id: 2,
    label: 'Checking inventory',
    description: 'Scanning on-hand balances across 6 sister warehouses and regional depots.',
  },
  {
    id: 3,
    label: 'Verifying open purchase orders',
    description: 'Cross-referencing department quarterly budget and open commitments.',
  },
  {
    id: 4,
    label: 'Analyzing usage patterns',
    description: 'Auditing 90-day consumption baseline to detect over-ordering velocity.',
  },
  {
    id: 5,
    label: 'Generating recommendation',
    description: 'Synthesizing optimal routing: internal transfers vs. supplier purchase order.',
  },
];

export const ProcessingView: React.FC = () => {
  const { currentAnalysisPR, setCurrentAnalysisPR, setRequests, navigateTo } = useProcure();
  const [activeStepIndex, setActiveStepIndex] = useState<number>(1);
  const [isDoneAll, setIsDoneAll] = useState<boolean>(false);
  const hasAuditedRef = useRef<boolean>(false);

  const pr = currentAnalysisPR;

  // Run the actual analysis service in parallel with the step animation
  useEffect(() => {
    if (pr && !hasAuditedRef.current) {
      hasAuditedRef.current = true;
      runRequisitionAudit(pr).then((output) => {
        const updatedPR = {
          ...pr,
          gate1: output.gate1,
          gate2: output.gate2,
          gate3: output.gate3,
          gate4: output.gate4,
          decisionResult: output.decisionResult,
          status:
            output.decisionResult.decision === 'PROCEED' || output.decisionResult.decision === 'APPROVE'
              ? ('APPROVED' as const)
              : output.decisionResult.decision === 'REDUCE'
              ? ('REDUCE' as const)
              : output.decisionResult.decision === 'HOLD'
              ? ('ON_HOLD' as const)
              : output.decisionResult.decision === 'EXPEDITE'
              ? ('EXPEDITED' as const)
              : output.decisionResult.decision === 'INVESTIGATE'
              ? ('INVESTIGATE' as const)
              : ('REJECTED' as const),
        };
        setCurrentAnalysisPR(updatedPR);
        setRequests((prev) =>
          prev.map((item) => (item.id === updatedPR.id ? updatedPR : item))
        );
      });
    }
  }, [pr, setCurrentAnalysisPR, setRequests]);

  // Timed transition through the 5 steps (approximately 3.2 seconds total)
  useEffect(() => {
    // Step 1: 0ms -> 600ms
    const timer1 = setTimeout(() => {
      setActiveStepIndex(2);
    }, 600);

    // Step 2: 600ms -> 1200ms
    const timer2 = setTimeout(() => {
      setActiveStepIndex(3);
    }, 1200);

    // Step 3: 1200ms -> 1800ms
    const timer3 = setTimeout(() => {
      setActiveStepIndex(4);
    }, 1800);

    // Step 4: 1800ms -> 2400ms
    const timer4 = setTimeout(() => {
      setActiveStepIndex(5);
    }, 2400);

    // Step 5: 2400ms -> 3000ms
    const timer5 = setTimeout(() => {
      setActiveStepIndex(6); // All steps completed
      setIsDoneAll(true);
    }, 3000);

    // Complete & automatically navigate to /analysis (at ~3.3 seconds)
    const timerFinal = setTimeout(() => {
      navigateTo('/analysis');
    }, 3350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timerFinal);
    };
  }, [navigateTo]);

  // Determine status for each individual step: WAITING -> PROCESSING -> COMPLETED
  const getStepStatus = (stepId: number): StepStatus => {
    if (activeStepIndex > stepId) {
      return 'COMPLETED';
    }
    if (activeStepIndex === stepId) {
      return 'PROCESSING';
    }
    return 'WAITING';
  };

  const calculateProgressPercent = (): number => {
    if (isDoneAll) return 100;
    switch (activeStepIndex) {
      case 1:
        return 15;
      case 2:
        return 35;
      case 3:
        return 55;
      case 4:
        return 75;
      case 5:
        return 90;
      default:
        return 100;
    }
  };

  const progress = calculateProgressPercent();

  return (
    <div className="max-w-4xl mx-auto my-auto py-4 sm:py-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Left 2 Columns: Animated Processing Timeline */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col relative overflow-hidden">
          {/* Top subtle progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header & Title */}
          <div className="flex items-start gap-4 mb-6">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Cpu className="w-6 h-6 animate-pulse text-indigo-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded">
                  AI AUDIT IN PROGRESS
                </span>
                <span className="text-xs text-slate-400 font-mono">{progress}% Complete</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Analyzing Purchase Request...
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Our AI is checking your request against company data.
              </p>
            </div>
          </div>

          {/* Animated Processing Timeline Steps */}
          <div className="space-y-3 mt-2">
            {AUDIT_STEPS.map((step) => {
              const status = getStepStatus(step.id);

              return (
                <div
                  key={step.id}
                  className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                    status === 'COMPLETED'
                      ? 'bg-emerald-50/60 border-emerald-200/90 text-slate-900'
                      : status === 'PROCESSING'
                      ? 'bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-500/20 text-indigo-950 shadow-2xs'
                      : 'bg-slate-50/50 border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    <div className="shrink-0">
                      {status === 'COMPLETED' ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : status === 'PROCESSING' ? (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                          <Circle className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">0{step.id}</span>
                        <span
                          className={`text-xs font-semibold ${
                            status === 'PROCESSING'
                              ? 'text-indigo-950'
                              : status === 'COMPLETED'
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 line-clamp-1 ${
                          status === 'PROCESSING'
                            ? 'text-indigo-700'
                            : status === 'COMPLETED'
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Transition Badges: WAITING -> PROCESSING -> COMPLETED */}
                  <div className="shrink-0">
                    {status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-emerald-100/80 text-emerald-800 border border-emerald-300/80">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        COMPLETED
                      </span>
                    ) : status === 'PROCESSING' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-300 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        PROCESSING
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-slate-100 text-slate-400 border border-slate-200">
                        WAITING
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with manual skip fallback */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              Automated handoff to 4-Gate Decision Dashboard
            </span>

            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigateTo('/analysis')}
              className="text-xs text-slate-500 hover:text-indigo-600"
            >
              Skip to Analysis
            </Button>
          </div>
        </div>

        {/* Right Column: Purchase Request Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Request Summary
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {pr?.id || 'PR-2025-0842'}
              </span>
            </div>

            {/* Exact Required Fields: Item, Quantity, Unit Price, Department */}
            <div className="space-y-3.5 text-xs">
              {/* 1. Item */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Item
                </span>
                <span className="font-semibold text-slate-900 text-sm mt-0.5 block leading-snug">
                  {pr?.itemDescription || 'Safety Helmet'}
                </span>
                {pr?.gate1?.standardized && pr.gate1.standardized !== pr.itemDescription && (
                  <span className="text-[10px] text-indigo-600 font-mono mt-0.5 block">
                    Standardized: {pr.gate1.standardized}
                  </span>
                )}
              </div>

              {/* 2 & 3: Quantity & Unit Price */}
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100 bg-slate-50/50 -mx-5 px-5">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Quantity
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    {pr?.quantity ?? 500}{' '}
                    <span className="text-xs font-normal text-slate-500 font-sans">units</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Unit Price
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    ${(pr?.estimatedPrice ?? 25).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 4. Department */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Department
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800 text-xs">
                    {pr?.department || 'Operations'}
                  </span>
                </div>
              </div>

              {/* Gross Commitment */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Gross Value:</span>
                <span className="font-mono font-bold text-slate-900 text-base">
                  ${((pr?.quantity ?? 500) * (pr?.estimatedPrice ?? 25)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Enterprise Security & Gateway Specs Card */}
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4.5 text-white shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white tracking-tight">AutoProcure Gateway</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Taxonomy Engine</span>
                <span className="font-mono text-slate-200">ISO-1087 / UNSPSC</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>ERP Data Connector</span>
                <span className="font-mono text-slate-200">SAP S/4HANA (BAPI)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Budget Validation</span>
                <span className="font-mono text-slate-200">Real-time GL Check</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Latency</span>
                <span className="font-mono text-emerald-400">&lt; 3.2 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
