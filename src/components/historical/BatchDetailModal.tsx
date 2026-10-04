import React from 'react';
import {
  X,
  Layers,
  FileSpreadsheet,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Database,
  ArrowRight,
} from 'lucide-react';
import { ImportBatchDoc } from '../../types/procurementDataModel';

interface BatchDetailModalProps {
  batch: ImportBatchDoc | null;
  onClose: () => void;
  onViewTransactions: (batchId: string) => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  batch,
  onClose,
  onViewTransactions,
}) => {
  if (!batch) return null;

  const validRate =
    batch.totalRows > 0
      ? Math.round(((batch.validRows + batch.correctedRows) / batch.totalRows) * 100)
      : 0;

  return (
    <div
      id="batch-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="batch-detail-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Import Batch Audit Dossier</h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    batch.importStatus === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : batch.importStatus === 'COMPLETED_WITH_WARNINGS'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {batch.importStatus}
                </span>
              </div>
              <p className="text-xs font-mono text-indigo-300">{batch.batchId}</p>
            </div>
          </div>

          <button
            id="batch-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Original File</div>
                <div className="text-xs font-semibold text-slate-100 truncate max-w-[220px]">
                  {batch.originalFilename}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Uploaded By</div>
                <div className="text-xs font-semibold text-slate-100">
                  {batch.uploadedBy?.name || 'System User'} ({batch.uploadedBy?.email || 'N/A'})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Timestamp</div>
                <div className="text-xs font-mono text-slate-200">
                  {new Date(batch.uploadedAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Timeline Span</div>
                <div className="text-xs font-mono text-sky-300">
                  {batch.dateRange
                    ? `${batch.dateRange.minDate} → ${batch.dateRange.maxDate}`
                    : 'Not detected'}
                </div>
              </div>
            </div>
          </div>

          {/* Row Health Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Data Quality & Ingestion Yield
              </span>
              <span className="font-mono font-bold text-emerald-400">{validRate}% Clean</span>
            </div>

            {/* Health Bar */}
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(batch.validRows / (batch.totalRows || 1)) * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`Valid: ${batch.validRows}`}
              />
              <div
                style={{ width: `${(batch.correctedRows / (batch.totalRows || 1)) * 100}%` }}
                className="bg-indigo-500 h-full"
                title={`Corrected: ${batch.correctedRows}`}
              />
              <div
                style={{ width: `${(batch.warningRows / (batch.totalRows || 1)) * 100}%` }}
                className="bg-amber-500 h-full"
                title={`Warnings: ${batch.warningRows}`}
              />
              <div
                style={{ width: `${(batch.rejectedRows / (batch.totalRows || 1)) * 100}%` }}
                className="bg-rose-500 h-full"
                title={`Rejected: ${batch.rejectedRows}`}
              />
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center">
                <div className="text-[10px] uppercase text-slate-400 font-bold">Total Rows</div>
                <div className="text-lg font-bold font-mono text-white">{batch.totalRows}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-center">
                <div className="text-[10px] uppercase text-emerald-300 font-bold">Pristine Valid</div>
                <div className="text-lg font-bold font-mono text-emerald-300">{batch.validRows}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-center">
                <div className="text-[10px] uppercase text-indigo-300 font-bold">Corrected</div>
                <div className="text-lg font-bold font-mono text-indigo-300">{batch.correctedRows}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-center">
                <div className="text-[10px] uppercase text-amber-300 font-bold">Warnings</div>
                <div className="text-lg font-bold font-mono text-amber-300">{batch.warningRows}</div>
              </div>
            </div>
          </div>

          {/* Catalog & Anomaly Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">Rejected Rows</div>
              <div className="text-base font-bold font-mono text-rose-400">
                {batch.rejectedRows} row{batch.rejectedRows === 1 ? '' : 's'}
              </div>
              <p className="text-[10px] text-slate-400">Skipped from active transactions</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">Duplicates Detected</div>
              <div className="text-base font-bold font-mono text-amber-300">
                {batch.duplicateRows || 0} row{batch.duplicateRows === 1 ? '' : 's'}
              </div>
              <p className="text-[10px] text-slate-400">Deduped or flagged</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">Uncataloged Items</div>
              <div className="text-base font-bold font-mono text-indigo-300">
                {batch.unmatchedItemCount || 0} SKU{batch.unmatchedItemCount === 1 ? '' : 's'}
              </div>
              <p className="text-[10px] text-slate-400">Assigned temporary IDs</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 flex items-center justify-between sticky bottom-0 bg-slate-900">
          <a
            href={`/api/files/download/${batch.sourceFileId}`}
            download
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Download Source Excel
          </a>

          <button
            id="batch-modal-view-txs-btn"
            onClick={() => {
              onViewTransactions(batch.batchId);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            Explore Batch Transactions
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
