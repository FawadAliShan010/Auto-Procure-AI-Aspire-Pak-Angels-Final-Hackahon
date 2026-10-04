import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  XCircle,
  Sparkles,
  HelpCircle,
  Search,
  CheckCircle2,
  Eye,
  Filter,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  UploadCloud,
} from 'lucide-react';
import { HistoricalTransactionDoc } from '../../types/procurementDataModel';

interface DataQualityHubViewProps {
  transactions: HistoricalTransactionDoc[];
  onSelectTransaction: (tx: HistoricalTransactionDoc) => void;
  onNavigateToUpload: () => void;
}

export const DataQualityHubView: React.FC<DataQualityHubViewProps> = ({
  transactions,
  onSelectTransaction,
  onNavigateToUpload,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'ALL' | 'WARNINGS' | 'CORRECTED' | 'FLAGGED' | 'UNMATCHED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Categorize transactions
  const warningList = useMemo(
    () => transactions.filter((t) => t.dataQualityStatus === 'WARNING'),
    [transactions]
  );
  const correctedList = useMemo(
    () => transactions.filter((t) => t.dataQualityStatus === 'CORRECTED'),
    [transactions]
  );
  const flaggedList = useMemo(
    () => transactions.filter((t) => t.dataQualityStatus === 'FLAGGED'),
    [transactions]
  );
  const unmatchedList = useMemo(
    () => transactions.filter((t) => !t.itemId || t.itemId.startsWith('TEMP-')),
    [transactions]
  );

  // Filtered by selected category & search
  const displayList = useMemo(() => {
    let list: HistoricalTransactionDoc[] = [];
    if (activeCategory === 'ALL') {
      list = transactions.filter((t) => t.dataQualityStatus !== 'VALID');
    } else if (activeCategory === 'WARNINGS') {
      list = warningList;
    } else if (activeCategory === 'CORRECTED') {
      list = correctedList;
    } else if (activeCategory === 'FLAGGED') {
      list = flaggedList;
    } else if (activeCategory === 'UNMATCHED') {
      list = unmatchedList;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        const desc = t.standardizedItemDescription.toLowerCase();
        const raw = (t.rawItemDescription || '').toLowerCase();
        const sku = (t.itemId || '').toLowerCase();
        return desc.includes(q) || raw.includes(q) || sku.includes(q);
      });
    }

    return list;
  }, [
    activeCategory,
    transactions,
    warningList,
    correctedList,
    flaggedList,
    unmatchedList,
    searchQuery,
  ]);

  return (
    <div id="data-quality-hub-container" className="space-y-6">
      {/* Category Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Corrected */}
        <div
          onClick={() => setActiveCategory('CORRECTED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1 ${
            activeCategory === 'CORRECTED'
              ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm'
              : 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/40 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Corrected
            </span>
            <span className="text-xl font-bold font-mono text-indigo-300">
              {correctedList.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Dates, trimming, units normalized by cleaning engine
          </p>
        </div>

        {/* Warnings */}
        <div
          onClick={() => setActiveCategory('WARNINGS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1 ${
            activeCategory === 'WARNINGS'
              ? 'bg-amber-950/40 border-amber-500 text-white shadow-sm'
              : 'bg-slate-900/40 border-slate-800 hover:border-amber-500/40 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Quality Warnings
            </span>
            <span className="text-xl font-bold font-mono text-amber-300">
              {warningList.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Statistical quantity outliers, date boundaries, or fuzzy units
          </p>
        </div>

        {/* Flagged / Rejected */}
        <div
          onClick={() => setActiveCategory('FLAGGED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1 ${
            activeCategory === 'FLAGGED'
              ? 'bg-rose-950/40 border-rose-500 text-white shadow-sm'
              : 'bg-slate-900/40 border-slate-800 hover:border-rose-500/40 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Flagged / Blocked
            </span>
            <span className="text-xl font-bold font-mono text-rose-300">
              {flaggedList.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Unparseable records, future dates, or missing critical fields
          </p>
        </div>

        {/* Unmatched Catalog SKUs */}
        <div
          onClick={() => setActiveCategory('UNMATCHED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1 ${
            activeCategory === 'UNMATCHED'
              ? 'bg-sky-950/40 border-sky-500 text-white shadow-sm'
              : 'bg-slate-900/40 border-slate-800 hover:border-sky-500/40 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              Unmatched Items
            </span>
            <span className="text-xl font-bold font-mono text-sky-300">
              {unmatchedList.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Items not found in Enterprise Item Master Catalog
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Flagged & Adjusted ({transactions.filter((t) => t.dataQualityStatus !== 'VALID').length})
          </button>
          <button
            onClick={() => setActiveCategory('WARNINGS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'WARNINGS'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-amber-300'
            }`}
          >
            Warnings ({warningList.length})
          </button>
          <button
            onClick={() => setActiveCategory('CORRECTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'CORRECTED'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-indigo-300'
            }`}
          >
            Corrected ({correctedList.length})
          </button>
          <button
            onClick={() => setActiveCategory('UNMATCHED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'UNMATCHED'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-sky-300'
            }`}
          >
            Unmatched ({unmatchedList.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search flagged records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Quality Anomaly List */}
      <div className="space-y-3">
        {displayList.map((tx) => {
          const isPurchase = tx.quantityPurchased !== undefined;
          const qty = isPurchase ? tx.quantityPurchased : tx.quantityConsumed;

          return (
            <div
              key={tx.transactionId}
              onClick={() => onSelectTransaction(tx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-indigo-500/50 ${
                tx.dataQualityStatus === 'FLAGGED'
                  ? 'bg-rose-950/15 border-rose-500/30'
                  : tx.dataQualityStatus === 'WARNING'
                  ? 'bg-amber-950/15 border-amber-500/30'
                  : tx.dataQualityStatus === 'CORRECTED'
                  ? 'bg-indigo-950/15 border-indigo-500/30'
                  : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">
                      {tx.transactionId}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        tx.dataQualityStatus === 'FLAGGED'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : tx.dataQualityStatus === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : tx.dataQualityStatus === 'CORRECTED'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {tx.dataQualityStatus}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Date: {tx.transactionDate}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-white">
                    {tx.standardizedItemDescription}
                  </div>

                  {tx.rawItemDescription &&
                    tx.rawItemDescription !== tx.standardizedItemDescription && (
                      <div className="text-[11px] font-mono text-slate-400">
                        Raw Excel Entry: &ldquo;{tx.rawItemDescription}&rdquo;
                      </div>
                    )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-sans">
                      {isPurchase ? 'Purchased' : 'Consumed'}
                    </div>
                    <div
                      className={`font-bold ${
                        isPurchase ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {qty} {tx.unit}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-sans">
                      Matched SKU
                    </div>
                    <div className="text-indigo-300 font-bold">
                      {tx.itemId || 'Uncataloged'}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTransaction(tx);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {displayList.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800 space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              {transactions.length === 0
                ? 'No Historical Transactions Available'
                : 'No Problematic Records in this Category'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {transactions.length === 0
                ? 'Upload historical spreadsheets to verify and audit data quality.'
                : 'All imported records in this view are clean or match the selected criteria.'}
            </p>
            {transactions.length === 0 && (
              <div className="pt-2">
                <button
                  onClick={onNavigateToUpload}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Go to Upload Pipeline
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
