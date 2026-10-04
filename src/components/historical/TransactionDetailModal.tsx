import React from 'react';
import {
  X,
  FileText,
  Calendar,
  Layers,
  MapPin,
  Building,
  Package,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { HistoricalTransactionDoc } from '../../types/procurementDataModel';

interface TransactionDetailModalProps {
  transaction: HistoricalTransactionDoc | null;
  onClose: () => void;
  onSelectBatch?: (batchId: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onSelectBatch,
}) => {
  if (!transaction) return null;

  const isPurchase = transaction.quantityPurchased !== undefined;
  const qty = isPurchase ? transaction.quantityPurchased : transaction.quantityConsumed;

  return (
    <div
      id="tx-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="tx-detail-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Historical Transaction Record</h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    transaction.dataQualityStatus === 'VALID'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : transaction.dataQualityStatus === 'CORRECTED'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : transaction.dataQualityStatus === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {transaction.dataQualityStatus}
                </span>
              </div>
              <p className="text-xs font-mono text-indigo-300">{transaction.transactionId}</p>
            </div>
          </div>

          <button
            id="tx-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Item & Description Comparison */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                Standardized Item Description
              </div>
              <div className="text-sm font-bold text-white">
                {transaction.standardizedItemDescription}
              </div>
            </div>

            {transaction.rawItemDescription &&
              transaction.rawItemDescription !== transaction.standardizedItemDescription && (
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-amber-400/80 mb-1">
                    Raw Source Spreadsheet Entry
                  </div>
                  <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                    &ldquo;{transaction.rawItemDescription}&rdquo;
                  </div>
                </div>
              )}

            <div className="flex items-center gap-4 pt-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Assigned SKU:</span>{' '}
                <span className="text-xs font-mono font-bold text-indigo-300">
                  {transaction.itemId || 'Uncataloged'}
                </span>
              </div>
            </div>
          </div>

          {/* Transaction Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">Transaction Date</div>
              <div className="text-sm font-bold font-mono text-sky-300 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {transaction.transactionDate}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                {isPurchase ? 'Purchased Quantity' : 'Consumed Quantity'}
              </div>
              <div
                className={`text-sm font-bold font-mono mt-0.5 ${
                  isPurchase ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {qty} <span className="text-xs text-slate-400">{transaction.unit}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">Unit Price</div>
              <div className="text-sm font-bold font-mono text-white mt-0.5">
                {transaction.unitPrice !== undefined ? `$${transaction.unitPrice.toFixed(2)}` : '—'}
              </div>
            </div>
          </div>

          {/* Location & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Plant / Yard Location</div>
                <div className="text-xs font-semibold text-slate-200">
                  {transaction.siteLocation || 'General Facility'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center gap-3">
              <Building className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Department / Section</div>
                <div className="text-xs font-semibold text-slate-200">
                  {transaction.department || 'Operations'}
                </div>
              </div>
            </div>
          </div>

          {/* Traceability & Immutability */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                Source File & Batch Lineage
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                <Lock className="w-3 h-3 text-slate-500" />
                Immutable Record
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Batch ID:</span>{' '}
                <button
                  onClick={() => onSelectBatch?.(transaction.importBatchId)}
                  className="font-mono text-indigo-400 hover:underline cursor-pointer"
                >
                  {transaction.importBatchId}
                </button>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">File ID:</span>{' '}
                <span className="font-mono text-slate-300">{transaction.sourceFileId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end sticky bottom-0 bg-slate-900">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
