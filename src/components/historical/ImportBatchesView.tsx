import React, { useState } from 'react';
import {
  Layers,
  FileSpreadsheet,
  Download,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  ArrowRight,
  UploadCloud,
} from 'lucide-react';
import { ImportBatchDoc } from '../../types/procurementDataModel';

interface ImportBatchesViewProps {
  batches: ImportBatchDoc[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectBatch: (batch: ImportBatchDoc) => void;
  onViewBatchTransactions: (batchId: string) => void;
  onNavigateToUpload: () => void;
}

export const ImportBatchesView: React.FC<ImportBatchesViewProps> = ({
  batches,
  isLoading,
  onRefresh,
  onSelectBatch,
  onViewBatchTransactions,
  onNavigateToUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    if (statusFilter !== 'ALL' && b.importStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBatchId = b.batchId.toLowerCase().includes(q);
      const matchFile = (b.originalFilename || '').toLowerCase().includes(q);
      const matchUser = (b.uploadedBy?.name || '').toLowerCase().includes(q);
      return matchBatchId || matchFile || matchUser;
    }
    return true;
  });

  return (
    <div id="import-batches-view-container" className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              id="batch-search-input"
              type="text"
              placeholder="Search batch ID or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <select
            id="batch-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed Clean</option>
            <option value="COMPLETED_WITH_WARNINGS">With Warnings</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-batches-btn"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Refresh Batch List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="upload-new-batch-btn"
            onClick={onNavigateToUpload}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Import New Spreadsheet
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Original File</th>
                <th className="py-3 px-4">Upload Date & User</th>
                <th className="py-3 px-4">Timeline Span</th>
                <th className="py-3 px-4">Total Rows</th>
                <th className="py-3 px-4">Valid / Corrected</th>
                <th className="py-3 px-4">Warnings / Rejected</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBatches.map((batch) => (
                <tr
                  key={batch.batchId}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => onSelectBatch(batch)}
                >
                  <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                    {batch.batchId}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 font-medium text-white max-w-[200px] truncate">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate">{batch.originalFilename}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="text-slate-200 text-xs">
                      {batch.uploadedBy?.name || 'Authorized User'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {new Date(batch.uploadedAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-sky-300 whitespace-nowrap">
                    {batch.dateRange
                      ? `${batch.dateRange.minDate} → ${batch.dateRange.maxDate}`
                      : '—'}
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {batch.totalRows}
                  </td>

                  <td className="py-3 px-4 font-mono text-emerald-400">
                    {batch.validRows + batch.correctedRows}{' '}
                    <span className="text-[10px] text-slate-500">
                      ({batch.correctedRows} corrected)
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono">
                    <span className={batch.warningRows > 0 ? 'text-amber-400' : 'text-slate-500'}>
                      {batch.warningRows} warn
                    </span>{' '}
                    •{' '}
                    <span className={batch.rejectedRows > 0 ? 'text-rose-400' : 'text-slate-500'}>
                      {batch.rejectedRows} rej
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        batch.importStatus === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : batch.importStatus === 'COMPLETED_WITH_WARNINGS'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {batch.importStatus === 'COMPLETED' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {batch.importStatus}
                    </span>
                  </td>

                  <td
                    className="py-3 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectBatch(batch)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="View Batch Audit Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onViewBatchTransactions(batch.batchId)}
                        className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white transition-colors"
                        title="Explore Batch Transactions"
                      >
                        <Database className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={`/api/files/download/${batch.sourceFileId}`}
                        download
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Download Source Spreadsheet"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredBatches.length === 0 && !isLoading && (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">No Import Batches Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No historical spreadsheet batches have been committed yet. Authorized users can upload Excel/CSV workbooks via the upload pipeline.
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
    </div>
  );
};
