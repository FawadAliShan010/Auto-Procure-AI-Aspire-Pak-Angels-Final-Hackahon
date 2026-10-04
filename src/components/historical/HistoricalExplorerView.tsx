import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Layers,
  MapPin,
  Building,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  X,
  UploadCloud,
} from 'lucide-react';
import { HistoricalTransactionDoc } from '../../types/procurementDataModel';

interface HistoricalExplorerViewProps {
  transactions: HistoricalTransactionDoc[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectTransaction: (tx: HistoricalTransactionDoc) => void;
  onSelectBatch: (batchId: string) => void;
  initialBatchFilter?: string;
  initialStatusFilter?: string;
  onNavigateToUpload: () => void;
}

export const HistoricalExplorerView: React.FC<HistoricalExplorerViewProps> = ({
  transactions,
  isLoading,
  onRefresh,
  onSelectTransaction,
  onSelectBatch,
  initialBatchFilter = '',
  initialStatusFilter = 'ALL',
  onNavigateToUpload,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState(initialBatchFilter);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Available Filter Options extracted from current dataset
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach((t) => {
      if (t.transactionDate && t.transactionDate.length >= 4) {
        years.add(t.transactionDate.substring(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [transactions]);

  const availableSites = useMemo(() => {
    const sites = new Set<string>();
    transactions.forEach((t) => {
      if (t.siteLocation) sites.add(t.siteLocation);
    });
    return Array.from(sites).sort();
  }, [transactions]);

  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    transactions.forEach((t) => {
      if (t.department) depts.add(t.department);
    });
    return Array.from(depts).sort();
  }, [transactions]);

  // Filtering Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== 'ALL' && tx.dataQualityStatus !== statusFilter) return false;
      if (batchFilter && !tx.importBatchId.toLowerCase().includes(batchFilter.toLowerCase())) return false;
      if (skuFilter && !(tx.itemId || '').toLowerCase().includes(skuFilter.toLowerCase())) return false;
      if (siteFilter && tx.siteLocation !== siteFilter) return false;
      if (deptFilter && tx.department !== deptFilter) return false;
      if (yearFilter !== 'ALL' && !tx.transactionDate.startsWith(yearFilter)) return false;
      if (startDate && tx.transactionDate < startDate) return false;
      if (endDate && tx.transactionDate > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = tx.standardizedItemDescription.toLowerCase().includes(q);
        const matchRaw = (tx.rawItemDescription || '').toLowerCase().includes(q);
        const matchSku = (tx.itemId || '').toLowerCase().includes(q);
        const matchTxId = tx.transactionId.toLowerCase().includes(q);
        return matchDesc || matchRaw || matchSku || matchTxId;
      }
      return true;
    });
  }, [
    transactions,
    statusFilter,
    batchFilter,
    skuFilter,
    siteFilter,
    deptFilter,
    yearFilter,
    startDate,
    endDate,
    searchQuery,
  ]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

  const resetFilters = () => {
    setSearchQuery('');
    setSkuFilter('');
    setSiteFilter('');
    setDeptFilter('');
    setBatchFilter('');
    setStatusFilter('ALL');
    setYearFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery ||
    skuFilter ||
    siteFilter ||
    deptFilter ||
    batchFilter ||
    statusFilter !== 'ALL' ||
    yearFilter !== 'ALL' ||
    startDate ||
    endDate;

  return (
    <div id="historical-explorer-container" className="space-y-4">
      {/* Top Filter Panel */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              id="explorer-search-input"
              type="text"
              placeholder="Search description, raw text, SKU, or Tx ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Year Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Year:</span>
            <button
              onClick={() => {
                setYearFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                yearFilter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => {
                  setYearFilter(yr);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono ${
                  yearFilter === yr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Quick Refresh & Clear */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              title="Refresh Transactions"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Detailed Secondary Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Quality Status
            </label>
            <select
              id="explorer-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="VALID">Valid Clean</option>
              <option value="CORRECTED">Corrected</option>
              <option value="WARNING">Warnings</option>
              <option value="FLAGGED">Flagged / Rejected</option>
            </select>
          </div>

          {/* Site Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Site / Yard
            </label>
            <select
              value={siteFilter}
              onChange={(e) => {
                setSiteFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Sites</option>
              {availableSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Department
            </label>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {availableDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Batch ID Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Batch Filter
            </label>
            <input
              type="text"
              placeholder="e.g. BATCH-2026..."
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Date Range Start */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Results Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-slate-400">
        <div>
          Showing{' '}
          <span className="font-bold text-white">
            {filteredTransactions.length > 0 ? startIndex + 1 : 0}–
            {Math.min(startIndex + pageSize, filteredTransactions.length)}
          </span>{' '}
          of <span className="font-bold text-white">{filteredTransactions.length}</span> records
          {filteredTransactions.length !== transactions.length && (
            <span> (filtered from {transactions.length} total)</span>
          )}
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10">#</th>
                <th className="py-3 px-3">Tx ID</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Purchased</th>
                <th className="py-3 px-3">Consumed</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-3">Plant / Yard</th>
                <th className="py-3 px-3">Batch ID</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedTransactions.map((tx, idx) => (
                <tr
                  key={tx.transactionId}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => onSelectTransaction(tx)}
                >
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
                    {startIndex + idx + 1}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    {tx.transactionId}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[11px] text-sky-300 whitespace-nowrap">
                    {tx.transactionDate}
                  </td>

                  <td className="py-2.5 px-3 max-w-[240px]">
                    <div className="font-semibold text-white truncate">
                      {tx.standardizedItemDescription}
                    </div>
                    {tx.rawItemDescription &&
                      tx.rawItemDescription !== tx.standardizedItemDescription && (
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          Raw: &ldquo;{tx.rawItemDescription}&rdquo;
                        </div>
                      )}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-300">
                    {tx.itemId || '—'}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-emerald-400 whitespace-nowrap">
                    {tx.quantityPurchased !== undefined ? tx.quantityPurchased : '—'}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-amber-400 whitespace-nowrap">
                    {tx.quantityConsumed !== undefined ? tx.quantityConsumed : '—'}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                    {tx.unit}
                  </td>

                  <td className="py-2.5 px-3 text-slate-300 truncate max-w-[140px]">
                    {tx.siteLocation || '—'}
                  </td>

                  <td
                    className="py-2.5 px-3 font-mono text-[10px] text-indigo-400 hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBatch(tx.importBatchId);
                    }}
                  >
                    {tx.importBatchId}
                  </td>

                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        tx.dataQualityStatus === 'VALID'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : tx.dataQualityStatus === 'CORRECTED'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : tx.dataQualityStatus === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {tx.dataQualityStatus}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectTransaction(tx)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Inspect Transaction"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && !isLoading && (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <Database className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">No Historical Transactions Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No transactions match the selected filters. Try clearing some criteria.'
                : 'No historical procurement data has been imported yet. An authorized user can upload historical Excel data to populate records.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                onClick={onNavigateToUpload}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Go to Upload Pipeline
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-900/40 px-4 py-3 rounded-xl border border-slate-800 text-xs">
          <div className="text-slate-400">
            Page <span className="font-bold text-white">{safeCurrentPage}</span> of{' '}
            <span className="font-bold text-white">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick jump numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (safeCurrentPage <= 3) {
                pageNum = i + 1;
              } else if (safeCurrentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = safeCurrentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    safeCurrentPage === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
