import React from 'react';
import { useProcure } from '../../context/ProcurementContext';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import {
  X,
  FileCheck2,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const RequestDetailModal: React.FC = () => {
  const { selectedRequestForModal, setSelectedRequestForModal, navigateTo, setCurrentAnalysisPR } =
    useProcure();

  if (!selectedRequestForModal) return null;

  const pr = selectedRequestForModal;

  const handleOpenAnalysis = () => {
    setCurrentAnalysisPR(pr);
    setSelectedRequestForModal(null);
    navigateTo('/analysis');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedRequestForModal(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                  {pr.id}
                </span>
                <StatusBadge status={pr.status} size="sm" />
                {pr.erpSynced && (
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Synced: {pr.erpRefId}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1.5">{pr.itemDescription}</h3>
            </div>
            <button
              onClick={() => setSelectedRequestForModal(null)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Requisitioner</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{pr.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Cost Center</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{pr.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Quantity & Price</span>
                <span className="font-semibold font-mono text-slate-800 mt-0.5 block">
                  {pr.quantity} @ ${pr.estimatedPrice}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Commitment</span>
                <span className="font-bold font-mono text-indigo-700 mt-0.5 block">
                  ${(pr.quantity * pr.estimatedPrice).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Gate Audit Breakdown */}
            {pr.gate1 && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Pre-Submission Audit Gates
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 text-xs">Gate 1: Data Cleaning</span>
                      <StatusBadge status="Passed" size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Standardized to <span className="font-medium text-slate-900">"{pr.gate1.standardized}"</span>
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      SKU: #{pr.gate1.matchedItemCode} • GL: {pr.gate1.glCode}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 text-xs">Gate 2: Budget Check</span>
                      <StatusBadge status={pr.gate2?.status || 'Passed'} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{pr.gate2?.message}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Allocated: ${pr.gate2?.availableBudget.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 text-xs">Gate 3: Sister Inventory</span>
                      <StatusBadge status={pr.gate3?.status || 'Found'} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {pr.gate3?.totalSisterStock || 0} units available across network
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Rec. Transfer: {pr.gate3?.recommendedTransferQuantity || 0} units
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 text-xs">Gate 4: 90-Day Consumption</span>
                      <StatusBadge status={pr.gate4?.status || 'Optimal'} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{pr.gate4?.usageFlagMessage}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Monthly run-rate: {pr.gate4?.avgMonthlyUsage} units/mo
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Decision Rationale */}
            {pr.decisionResult && (
              <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-900">
                    Decision Outcome
                  </span>
                  <StatusBadge status={pr.decisionResult.decision} size="sm" />
                </div>
                <p className="text-xs font-semibold text-slate-900 mt-1.5">
                  {pr.decisionResult.headline}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {pr.decisionResult.reasoning.map((r, i) => (
                    <li key={i} className="text-[11px] text-slate-700 flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                {pr.decisionResult.estimatedSavings > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex items-center justify-between text-xs">
                    <span className="text-indigo-900 font-medium">Estimated External Spend Avoided:</span>
                    <span className="font-bold font-mono text-emerald-800">
                      ${pr.decisionResult.estimatedSavings.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedRequestForModal(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={handleOpenAnalysis}
            >
              View Full Gate Breakdown
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
