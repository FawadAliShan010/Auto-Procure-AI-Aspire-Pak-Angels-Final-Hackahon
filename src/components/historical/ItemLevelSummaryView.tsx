import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  ArrowUpDown,
  Calendar,
  Layers,
  Database,
  TrendingDown,
  TrendingUp,
  Clock,
  ArrowRight,
  UploadCloud,
} from 'lucide-react';
import { HistoricalTransactionDoc } from '../../types/procurementDataModel';

interface ItemSummaryRecord {
  itemId: string;
  description: string;
  unit: string;
  totalPurchased: number;
  totalConsumed: number;
  txCount: number;
  firstDate: string;
  latestDate: string;
  spanMonths: number;
  spanLabel: string;
}

interface ItemLevelSummaryViewProps {
  transactions: HistoricalTransactionDoc[];
  onFilterByItem: (sku: string) => void;
  onNavigateToUpload: () => void;
}

export const ItemLevelSummaryView: React.FC<ItemLevelSummaryViewProps> = ({
  transactions,
  onFilterByItem,
  onNavigateToUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'consumed' | 'purchased' | 'txCount' | 'latestDate' | 'sku'>('consumed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Compute Item-Level Aggregates dynamically from real transactions
  const itemSummaries = useMemo(() => {
    const itemMap = new Map<string, {
      itemId: string;
      description: string;
      unit: string;
      purchased: number;
      consumed: number;
      dates: string[];
      count: number;
    }>();

    transactions.forEach((tx) => {
      const key = tx.itemId || tx.standardizedItemDescription || 'UNKNOWN_ITEM';
      const existing = itemMap.get(key) || {
        itemId: tx.itemId || 'Uncataloged',
        description: tx.standardizedItemDescription || 'Unknown Description',
        unit: tx.unit || 'units',
        purchased: 0,
        consumed: 0,
        dates: [],
        count: 0,
      };

      if (tx.quantityPurchased) existing.purchased += tx.quantityPurchased;
      if (tx.quantityConsumed) existing.consumed += tx.quantityConsumed;
      if (tx.transactionDate) existing.dates.push(tx.transactionDate);
      existing.count += 1;

      itemMap.set(key, existing);
    });

    const records: ItemSummaryRecord[] = [];
    itemMap.forEach((val) => {
      val.dates.sort();
      const firstDate = val.dates.length > 0 ? val.dates[0] : 'N/A';
      const latestDate = val.dates.length > 0 ? val.dates[val.dates.length - 1] : 'N/A';

      let spanMonths = 1;
      let spanLabel = 'Single Period';
      if (firstDate !== 'N/A' && latestDate !== 'N/A') {
        const d1 = new Date(firstDate);
        const d2 = new Date(latestDate);
        spanMonths =
          (d2.getFullYear() - d1.getFullYear()) * 12 +
          (d2.getMonth() - d1.getMonth()) +
          1;
        spanLabel = `${Math.max(1, spanMonths)} mo (${firstDate.substring(0, 7)} → ${latestDate.substring(0, 7)})`;
      }

      records.push({
        itemId: val.itemId,
        description: val.description,
        unit: val.unit,
        totalPurchased: val.purchased,
        totalConsumed: val.consumed,
        txCount: val.count,
        firstDate,
        latestDate,
        spanMonths,
        spanLabel,
      });
    });

    return records;
  }, [transactions]);

  // Filter & Sort
  const filteredRecords = useMemo(() => {
    return itemSummaries
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.itemId.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;
        if (sortBy === 'consumed') {
          valA = a.totalConsumed;
          valB = b.totalConsumed;
        } else if (sortBy === 'purchased') {
          valA = a.totalPurchased;
          valB = b.totalPurchased;
        } else if (sortBy === 'txCount') {
          valA = a.txCount;
          valB = b.txCount;
        } else if (sortBy === 'latestDate') {
          valA = a.latestDate;
          valB = b.latestDate;
        } else {
          valA = a.itemId;
          valB = b.itemId;
        }

        if (sortOrder === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
  }, [itemSummaries, searchQuery, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  return (
    <div id="item-summary-view-container" className="space-y-4">
      {/* Controls */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              id="item-summary-search"
              type="text"
              placeholder="Search by SKU or Description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Found <span className="font-bold text-white">{filteredRecords.length}</span> unique catalog items
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
          >
            <option value="consumed">Total Consumed Qty</option>
            <option value="purchased">Total Purchased Qty</option>
            <option value="txCount">Transaction Count</option>
            <option value="latestDate">Latest Date</option>
            <option value="sku">SKU Code</option>
          </select>

          <button
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Standardized Description</th>
                <th className="py-3 px-4">Total Consumed</th>
                <th className="py-3 px-4">Total Purchased</th>
                <th className="py-3 px-4">Tx Count</th>
                <th className="py-3 px-4">First Activity</th>
                <th className="py-3 px-4">Latest Activity</th>
                <th className="py-3 px-4">Historical Span</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedRecords.map((item) => (
                <tr
                  key={item.itemId + item.description}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => onFilterByItem(item.itemId !== 'Uncataloged' ? item.itemId : item.description)}
                >
                  <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                    {item.itemId}
                  </td>

                  <td className="py-3 px-4 max-w-[260px]">
                    <div className="font-semibold text-white truncate">{item.description}</div>
                  </td>

                  <td className="py-3 px-4 font-mono text-amber-400 whitespace-nowrap">
                    <span className="font-bold text-sm">{item.totalConsumed.toLocaleString()}</span>{' '}
                    <span className="text-[10px] text-slate-400">{item.unit}</span>
                  </td>

                  <td className="py-3 px-4 font-mono text-emerald-400 whitespace-nowrap">
                    <span className="font-bold text-sm">{item.totalPurchased.toLocaleString()}</span>{' '}
                    <span className="text-[10px] text-slate-400">{item.unit}</span>
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-200">
                    {item.txCount} txs
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {item.firstDate}
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-sky-300 whitespace-nowrap">
                    {item.latestDate}
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                    {item.spanLabel}
                  </td>

                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onFilterByItem(item.itemId !== 'Uncataloged' ? item.itemId : item.description)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all cursor-pointer"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredRecords.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">No Item Summaries Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No historical consumption records have been imported yet. When transactions are uploaded, their item codes, consumption sums, and duration timelines will be automatically calculated here.
            </p>
            <div className="pt-2">
              <button
                onClick={onNavigateToUpload}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Go to Upload Pipeline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-900/40 px-4 py-3 rounded-xl border border-slate-800 text-xs text-slate-400">
          <div>
            Showing items {startIndex + 1}–{Math.min(startIndex + pageSize, filteredRecords.length)} of {filteredRecords.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="font-mono text-white">
              {safeCurrentPage} / {totalPages}
            </span>
            <button
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
