import React, { useState, useMemo } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  Search,
  Download,
  Plus,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  FileCheck2,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Layers,
  X,
  Eye,
} from 'lucide-react';
import { PurchaseRequest, PRStatus, DecisionType } from '../types/procurement';

type StatusFilterTab = 'ALL' | 'APPROVED' | 'REDUCE' | 'HOLD' | 'INVESTIGATE' | 'EXPEDITE' | 'REJECTED';
type DateFilterOption = 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'OLDER';

export const RequestsView: React.FC = () => {
  const {
    requests,
    setCurrentAnalysisPR,
    navigateTo,
    setSelectedRequestForModal,
    addToast,
  } = useProcure();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterTab>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'savings' | 'quantity' | 'id'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Extract unique departments from actual requests state
  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    requests.forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts);
  }, [requests]);

  // Status mapping helper
  const matchesStatusFilter = (r: PurchaseRequest, tab: StatusFilterTab): boolean => {
    if (tab === 'ALL') return true;
    const s = r.status.toUpperCase();
    const d = r.decisionResult?.decision?.toUpperCase();

    switch (tab) {
      case 'APPROVED':
        return s === 'APPROVED' || d === 'APPROVE';
      case 'REDUCE':
        return s === 'REDUCE' || d === 'REDUCE';
      case 'HOLD':
        return s === 'ON_HOLD' || s === 'HOLD' || d === 'HOLD';
      case 'INVESTIGATE':
        return s === 'INVESTIGATE' || d === 'INVESTIGATE';
      case 'EXPEDITE':
        return s === 'EXPEDITE' || s === 'EXPEDITED' || d === 'EXPEDITE';
      case 'REJECTED':
        return s === 'REJECTED' || d === 'REJECT';
      default:
        return true;
    }
  };

  // Date filtering helper
  const matchesDateFilter = (r: PurchaseRequest, filter: DateFilterOption): boolean => {
    if (filter === 'ALL') return true;
    const text = (r.createdAt || '').toLowerCase();

    if (filter === 'TODAY') {
      return text.includes('today') || text.includes('just now');
    }
    if (filter === 'LAST_7_DAYS') {
      return text.includes('today') || text.includes('sep') || text.includes('2025');
    }
    if (filter === 'THIS_MONTH') {
      return text.includes('today') || text.includes('sep') || text.includes('2025-09');
    }
    if (filter === 'OLDER') {
      return !text.includes('today');
    }
    return true;
  };

  // Filtered & Sorted Requests List from live context state
  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        // Search query
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          r.id.toLowerCase().includes(query) ||
          r.itemDescription.toLowerCase().includes(query) ||
          (r.gate1?.standardized && r.gate1.standardized.toLowerCase().includes(query)) ||
          (r.gate1?.matchedItemCode && r.gate1.matchedItemCode.toLowerCase().includes(query)) ||
          r.employeeName.toLowerCase().includes(query) ||
          r.department.toLowerCase().includes(query);

        // Status Tab
        const matchesStatus = matchesStatusFilter(r, statusFilter);

        // Department
        const matchesDept =
          departmentFilter === 'ALL' || r.department === departmentFilter;

        // Date
        const matchesDate = matchesDateFilter(r, dateFilter);

        return matchesSearch && matchesStatus && matchesDept && matchesDate;
      })
      .sort((a, b) => {
        const factor = sortDirection === 'asc' ? 1 : -1;
        if (sortField === 'savings') {
          const sA = a.decisionResult?.estimatedSavings || 0;
          const sB = b.decisionResult?.estimatedSavings || 0;
          return (sA - sB) * factor;
        }
        if (sortField === 'quantity') {
          return (a.quantity - b.quantity) * factor;
        }
        if (sortField === 'id') {
          return a.id.localeCompare(b.id) * factor;
        }
        // Default sort by date / insertion order
        return 0; // Requests are already newest-first in context
      });
  }, [requests, searchQuery, statusFilter, departmentFilter, dateFilter, sortField, sortDirection]);

  // Counts for each tab badge
  const tabCounts = useMemo(() => {
    return {
      ALL: requests.length,
      APPROVED: requests.filter((r) => matchesStatusFilter(r, 'APPROVED')).length,
      REDUCE: requests.filter((r) => matchesStatusFilter(r, 'REDUCE')).length,
      HOLD: requests.filter((r) => matchesStatusFilter(r, 'HOLD')).length,
      INVESTIGATE: requests.filter((r) => matchesStatusFilter(r, 'INVESTIGATE')).length,
      EXPEDITE: requests.filter((r) => matchesStatusFilter(r, 'EXPEDITE')).length,
      REJECTED: requests.filter((r) => matchesStatusFilter(r, 'REJECTED')).length,
    };
  }, [requests]);

  // Summary Metrics calculated from live state
  const totalSavings = useMemo(() => {
    return requests.reduce((acc, r) => acc + (r.decisionResult?.estimatedSavings || 0), 0);
  }, [requests]);

  const totalSpend = useMemo(() => {
    return requests.reduce((acc, r) => acc + r.quantity * r.estimatedPrice, 0);
  }, [requests]);

  // Handler: clicking request row opens its complete analysis
  const handleOpenAnalysis = (r: PurchaseRequest) => {
    setCurrentAnalysisPR(r);
    navigateTo('/analysis');
  };

  // Handler: CSV export
  const handleExportCSV = () => {
    const headers = [
      'Request ID',
      'Item',
      'Standardized Item',
      'SKU',
      'Department',
      'Requisitioner',
      'Quantity',
      'Estimated Unit Price',
      'Total Value',
      'Status',
      'AI Decision',
      'Savings',
      'Submitted Date',
      'ERP Synced',
    ];

    const rows = filteredRequests.map((r) => [
      r.id,
      `"${r.itemDescription.replace(/"/g, '""')}"`,
      `"${(r.gate1?.standardized || r.itemDescription).replace(/"/g, '""')}"`,
      r.gate1?.matchedItemCode || 'N/A',
      r.department,
      `"${r.employeeName}"`,
      r.quantity,
      r.estimatedPrice,
      r.quantity * r.estimatedPrice,
      r.status,
      r.decisionResult?.decision || r.status,
      r.decisionResult?.estimatedSavings || 0,
      `"${r.createdAt}"`,
      r.erpSynced ? `YES (${r.erpRefId})` : 'NO',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AutoProcure_PR_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('CSV Exported', `Exported ${filteredRequests.length} requisition records.`, 'success');
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
    setDateFilter('ALL');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'ALL' ||
    departmentFilter !== 'ALL' ||
    dateFilter !== 'ALL';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              My Requests
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {requests.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete audit trail of all purchase requisitions intercepted, standardized, and policy-checked by the AI Gatekeeper.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => navigateTo('/submit')}
          >
            Submit PR
          </Button>
        </div>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total In Requisition</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">
              ${totalSpend.toLocaleString()}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
            {requests.length} active PR lines
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">Capital Preserved</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-700">
              ${totalSavings.toLocaleString()}
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block font-medium">
            Via internal depot transfer
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-600 block">Optimized / Reduced</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-indigo-700">
              {tabCounts.REDUCE}
            </span>
            <span className="text-xs text-slate-500">requisitions</span>
          </div>
          <span className="text-[11px] text-indigo-500 mt-0.5 block">
            Holding risk eliminated
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">ERP Committed</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-800">
              {requests.filter((r) => r.erpSynced).length}
            </span>
            <span className="text-xs text-slate-400">/ {requests.length}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            SAP S/4HANA verified
          </span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        {/* Top Controls: Search Bar + Department + Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              id="search-requests-input"
              type="text"
              placeholder="Search by Request ID, Item description, SKU, or employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="sm:col-span-3">
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                id="filter-department-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer appearance-none"
              >
                <option value="ALL">All Departments</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
          </div>

          {/* Date Filter */}
          <div className="sm:col-span-3">
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                id="filter-date-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
                className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer appearance-none"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="OLDER">Older</option>
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs (Pill Bar as required) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto py-1">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'REDUCE', label: 'Reduce' },
                { id: 'HOLD', label: 'Hold' },
                { id: 'INVESTIGATE', label: 'Investigate' },
                { id: 'EXPEDITE', label: 'Expedite' },
                { id: 'REJECTED', label: 'Rejected' },
              ] as const
            ).map((tab) => {
              const isActive = statusFilter === tab.id;
              const count = tabCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Request History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Department</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => {
                    setSortField('quantity');
                    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Quantity</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">AI Decision</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => {
                    setSortField('savings');
                    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Savings</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800">No matching requests found</h4>
                      <p className="text-xs text-slate-500">
                        Try adjusting your search keywords or resetting the status and date filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline mt-2 inline-block cursor-pointer"
                        >
                          Reset all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const decision = r.decisionResult?.decision || r.status;
                  const savings = r.decisionResult?.estimatedSavings || 0;
                  const standardizedName = r.gate1?.standardized || r.itemDescription;
                  const itemSku = r.gate1?.matchedItemCode;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleOpenAnalysis(r)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      title="Click to open complete analysis"
                    >
                      {/* 1. Request ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {r.id}
                          </span>
                          {r.erpSynced && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500"
                              title={`Synced with ERP: ${r.erpRefId}`}
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          by {r.employeeName}
                        </span>
                      </td>

                      {/* 2. Item */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {standardizedName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                          {itemSku ? <span>SKU #{itemSku}</span> : null}
                          {r.gate1?.typosCorrected && r.gate1.typosCorrected.length > 0 && (
                            <span className="text-emerald-700 bg-emerald-50 px-1 rounded">
                              Auto-Cleaned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Department */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {r.department}
                      </td>

                      {/* 4. Quantity */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {r.quantity} <span className="text-[11px] font-normal text-slate-500">units</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ${(r.quantity * r.estimatedPrice).toLocaleString()} total
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} size="sm" />
                      </td>

                      {/* 6. AI Decision */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-wider border ${
                            decision === 'APPROVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : decision === 'REDUCE'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : decision === 'HOLD'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : decision === 'INVESTIGATE'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : decision === 'EXPEDITE'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {decision}
                        </span>
                      </td>

                      {/* 7. Savings */}
                      <td className="py-3.5 px-4 text-right">
                        {savings > 0 ? (
                          <div>
                            <span className="font-mono font-bold text-emerald-800">
                              +${savings.toLocaleString()}
                            </span>
                            <span className="block text-[10px] text-emerald-600 font-medium">
                              Preserved
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-slate-400 text-xs">$0</span>
                        )}
                      </td>

                      {/* 8. Submitted Date */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                        {r.createdAt}
                      </td>

                      {/* 9. Action */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenAnalysis(r)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Open full 4-gate analysis"
                          >
                            <span>Analysis</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => setSelectedRequestForModal(r)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Quick View JSON Modal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info strip */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Showing <strong className="text-slate-800">{filteredRequests.length}</strong> of{' '}
            <strong className="text-slate-800">{requests.length}</strong> live requisitions
          </span>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              💡 Tip: Click any row to inspect complete 4-gate audit and AI decision logic
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
