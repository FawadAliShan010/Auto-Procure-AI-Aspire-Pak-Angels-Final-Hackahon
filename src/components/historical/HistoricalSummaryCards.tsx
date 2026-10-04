import React from 'react';
import {
  Database,
  Layers,
  FileSpreadsheet,
  Package,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  AlertOctagon,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import {
  HistoricalTransactionDoc,
  ImportBatchDoc,
  UploadedFileMetadataDoc,
} from '../../types/procurementDataModel';

interface HistoricalSummaryCardsProps {
  transactions: HistoricalTransactionDoc[];
  batches: ImportBatchDoc[];
  files: UploadedFileMetadataDoc[];
  onFilterStatus?: (status: string) => void;
}

export const HistoricalSummaryCards: React.FC<HistoricalSummaryCardsProps> = ({
  transactions,
  batches,
  files,
  onFilterStatus,
}) => {
  // Aggregate Calculations
  const totalTransactions = transactions.length;
  const totalBatches = batches.length;
  const totalFiles = files.length;

  // Unique SKUs / Items
  const uniqueItems = new Set(
    transactions
      .map((t) => t.itemId || t.standardizedItemDescription)
      .filter(Boolean)
  );
  const totalUniqueItems = uniqueItems.size;

  // Date Range calculation
  const dates = transactions
    .map((t) => t.transactionDate)
    .filter(Boolean)
    .sort();
  const minDate = dates.length > 0 ? dates[0] : null;
  const maxDate = dates.length > 0 ? dates[dates.length - 1] : null;

  // Calculate span in months
  let dateRangeSpan = 'No date data';
  if (minDate && maxDate) {
    const d1 = new Date(minDate);
    const d2 = new Date(maxDate);
    const months =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth()) +
      1;
    dateRangeSpan =
      months > 1
        ? `${months} Months (${minDate} → ${maxDate})`
        : `${minDate} → ${maxDate}`;
  }

  // Status Breakdowns
  const validCount = transactions.filter(
    (t) => t.dataQualityStatus === 'VALID'
  ).length;
  const correctedCount = transactions.filter(
    (t) => t.dataQualityStatus === 'CORRECTED'
  ).length;
  const warningCount = transactions.filter(
    (t) => t.dataQualityStatus === 'WARNING'
  ).length;
  const rejectedCount = transactions.filter(
    (t) => t.dataQualityStatus === 'FLAGGED'
  ).length;

  // Catalog Matching Aggregates
  const matchedCount = transactions.filter(
    (t) => t.itemId && !t.itemId.startsWith('TEMP-')
  ).length;
  const unmatchedCount = transactions.filter(
    (t) => !t.itemId || t.itemId.startsWith('TEMP-')
  ).length;

  // Total Quantity Purchased vs Consumed
  const totalPurchasedQty = transactions.reduce(
    (sum, t) => sum + (t.quantityPurchased || 0),
    0
  );
  const totalConsumedQty = transactions.reduce(
    (sum, t) => sum + (t.quantityConsumed || 0),
    0
  );

  return (
    <div id="historical-summary-cards-section" className="space-y-4">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Transactions */}
        <div
          id="kpi-total-transactions"
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Transactions
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {totalTransactions.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {totalPurchasedQty.toLocaleString()} purchased •{' '}
            {totalConsumedQty.toLocaleString()} consumed
          </div>
        </div>

        {/* Card 2: Import Batches */}
        <div
          id="kpi-import-batches"
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Import Batches
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">
            {totalBatches}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {totalFiles} source file{totalFiles === 1 ? '' : 's'} registered
          </div>
        </div>

        {/* Card 3: Unique Catalog Items */}
        <div
          id="kpi-unique-items"
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Unique SKUs / Items
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {totalUniqueItems}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {matchedCount} matched ({totalTransactions > 0 ? Math.round((matchedCount / totalTransactions) * 100) : 0}%)
          </div>
        </div>

        {/* Card 4: Date Range of Data */}
        <div
          id="kpi-date-range"
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-1.5 col-span-2 sm:col-span-1 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Historical Timeline
            </span>
            <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-bold font-mono text-sky-300 truncate">
            {minDate && maxDate ? `${minDate} → ${maxDate}` : 'No Transactions'}
          </div>
          <div className="text-[10px] text-slate-400 truncate">{dateRangeSpan}</div>
        </div>
      </div>

      {/* Secondary Quality Matrix Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Valid / Clean */}
        <div
          id="quality-chip-valid"
          onClick={() => onFilterStatus?.('VALID')}
          className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-300">
                Pristine Valid
              </div>
              <div className="text-xs text-slate-400">
                {totalTransactions > 0
                  ? Math.round((validCount / totalTransactions) * 100)
                  : 0}
                % clean
              </div>
            </div>
          </div>
          <span className="text-lg font-bold font-mono text-emerald-300">
            {validCount}
          </span>
        </div>

        {/* Corrected */}
        <div
          id="quality-chip-corrected"
          onClick={() => onFilterStatus?.('CORRECTED')}
          className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 hover:bg-indigo-950/40 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-300">
                Auto-Corrected
              </div>
              <div className="text-xs text-slate-400">Standardized</div>
            </div>
          </div>
          <span className="text-lg font-bold font-mono text-indigo-300">
            {correctedCount}
          </span>
        </div>

        {/* Warnings */}
        <div
          id="quality-chip-warning"
          onClick={() => onFilterStatus?.('WARNING')}
          className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 hover:bg-amber-950/40 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-300">
                Quality Warnings
              </div>
              <div className="text-xs text-slate-400">Review Recommended</div>
            </div>
          </div>
          <span className="text-lg font-bold font-mono text-amber-300">
            {warningCount}
          </span>
        </div>

        {/* Flagged / Rejected */}
        <div
          id="quality-chip-flagged"
          onClick={() => onFilterStatus?.('FLAGGED')}
          className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 hover:bg-rose-950/40 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-rose-300">
                Flagged / Blocked
              </div>
              <div className="text-xs text-slate-400">Requires Action</div>
            </div>
          </div>
          <span className="text-lg font-bold font-mono text-rose-300">
            {rejectedCount}
          </span>
        </div>
      </div>
    </div>
  );
};
