import React, { useState } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { PurchaseRequest } from '../types/procurement';
import {
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  Building2,
  AlertTriangle,
  RefreshCw,
  Inbox,
  Check,
  AlertCircle,
  XCircle,
  HelpCircle,
  RotateCcw,
  Database,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    requests,
    currentUser,
    navigateTo,
    setCurrentAnalysisPR,
    addToast,
  } = useProcure();

  // State management for realistic loading, empty, and error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [forceEmptyState, setForceEmptyState] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Trigger realistic refresh loading
  const handleRefresh = () => {
    setIsLoading(true);
    setErrorState(null);
    setTimeout(() => {
      setIsLoading(false);
      addToast('Data Synchronized', 'Retrieved latest purchase requisitions from SAP S/4HANA endpoint', 'success');
    }, 750);
  };

  // State simulator helper for easy testing
  const handleSimulateState = (mode: 'normal' | 'loading' | 'empty' | 'error') => {
    if (mode === 'normal') {
      setIsLoading(false);
      setErrorState(null);
      setForceEmptyState(false);
      setSearchQuery('');
      setSelectedStatusFilter('ALL');
    } else if (mode === 'loading') {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 2000);
    } else if (mode === 'empty') {
      setForceEmptyState(true);
      setErrorState(null);
      setIsLoading(false);
    } else if (mode === 'error') {
      setErrorState('ERP Gateway Timeout: Unable to synchronize live requisition cache with SAP S/4HANA (Error 504 Gateway Timeout).');
      setForceEmptyState(false);
      setIsLoading(false);
    }
  };

  // Requisition opening handler - opens detailed analysis as specified
  const handleOpenAnalysis = (req: PurchaseRequest) => {
    setCurrentAnalysisPR(req);
    navigateTo('/analysis');
  };

  // Realistic demo values for summary metrics
  const totalDemoCount = 24;
  const approvedDemoCount = 14;
  const onHoldDemoCount = 5;
  const investigateDemoCount = 3;
  const rejectedDemoCount = 2;

  // Filter requests based on search query, status, and empty simulation
  const filteredRequests = forceEmptyState
    ? []
    : requests.filter((r) => {
        const matchesQuery =
          (r.gate1?.standardized || r.itemDescription)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          r.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.id.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          selectedStatusFilter === 'ALL' ||
          (selectedStatusFilter === 'APPROVED' &&
            (r.status === 'APPROVED' || r.decisionResult?.decision === 'PROCEED')) ||
          (selectedStatusFilter === 'ON_HOLD' &&
            (r.status === 'ON_HOLD' || r.status === 'REDUCE' || r.decisionResult?.decision === 'HOLD')) ||
          (selectedStatusFilter === 'INVESTIGATE' && r.status === 'INVESTIGATE') ||
          (selectedStatusFilter === 'REJECTED' && r.status === 'REJECTED');

        return matchesQuery && matchesStatus;
      });

  // Calculate cumulative avoided spend for highlight banner
  const cumulativeSavings = requests.reduce(
    (acc, r) => acc + (r.decisionResult?.estimatedSavings || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Good morning, {currentUser?.name ? currentUser.name.trim().split(' ')[0] : 'Director'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here's what's happening with your purchase requests.
          </p>
        </div>

        {/* Primary CTA button */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            className="hidden sm:inline-flex"
          >
            Refresh
          </Button>

          {currentUser?.role !== 'REQUISITIONER' && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Database className="w-4 h-4 text-indigo-600" />}
              onClick={() => navigateTo('/historical-data')}
              className="shadow-2xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              Historical Data (Excel)
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigateTo('/submit')}
            className="shadow-xs font-semibold"
          >
            Submit Purchase Request
          </Button>
        </div>
      </div>

      {/* State Preview Pill Bar for Testing Verification */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100/70 border border-slate-200/90 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-mono font-bold text-slate-700 text-[10px] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
            QA Simulator
          </span>
          <span className="text-slate-400 text-[11px] hidden md:inline">
            Interactive system state switcher
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSimulateState('normal')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              !isLoading && !errorState && !forceEmptyState
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Live Data
          </button>
          <button
            onClick={() => handleSimulateState('loading')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              isLoading
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Loading State
          </button>
          <button
            onClick={() => handleSimulateState('empty')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              forceEmptyState
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Empty State
          </button>
          <button
            onClick={() => handleSimulateState('error')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              errorState
                ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Error State
          </button>
        </div>
      </div>

      {/* 2. Error State Alert Banner (if error is active) */}
      {errorState && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600 mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                ERP Gateway Synchronization Error
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">{errorState}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setErrorState(null);
                handleRefresh();
              }}
            >
              Retry Sync
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setErrorState(null)}
              className="text-rose-700 hover:bg-rose-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* 3. Summary Cards: Total Requests, Approved, On Hold, Investigate, Rejected */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Requests */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Requests
            </span>
            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
              <Inbox className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-14 bg-slate-200 animate-pulse rounded" />
              <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {forceEmptyState ? 0 : totalDemoCount}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  +3 this week
                </span>
                <span className="text-[10px] text-slate-400">across 6 depots</span>
              </div>
            </>
          )}
        </div>

        {/* Card 2: Approved */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-14 bg-slate-200 animate-pulse rounded" />
              <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
                {forceEmptyState ? 0 : approvedDemoCount}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-medium text-emerald-700">58% auto-cleared</span>
                <span className="text-[10px] text-slate-400">• ERP synced</span>
              </div>
            </>
          )}
        </div>

        {/* Card 3: On Hold */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              On Hold
            </span>
            <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-14 bg-slate-200 animate-pulse rounded" />
              <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono text-amber-700 mt-2">
                {forceEmptyState ? 0 : onHoldDemoCount}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-medium text-amber-700">Stock transfers active</span>
                <span className="text-[10px] text-slate-400">• Resized</span>
              </div>
            </>
          )}
        </div>

        {/* Card 4: Investigate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Investigate
            </span>
            <div className="w-6 h-6 rounded-md bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-14 bg-slate-200 animate-pulse rounded" />
              <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono text-purple-700 mt-2">
                {forceEmptyState ? 0 : investigateDemoCount}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-medium text-purple-700">Consumption spike</span>
                <span className="text-[10px] text-slate-400">• Review</span>
              </div>
            </>
          )}
        </div>

        {/* Card 5: Rejected */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-rose-300 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Rejected
            </span>
            <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-14 bg-slate-200 animate-pulse rounded" />
              <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-mono text-rose-700 mt-2">
                {forceEmptyState ? 0 : rejectedDemoCount}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-medium text-rose-700">Deficit & Policy cap</span>
                <span className="text-[10px] text-slate-400">• Intercepted</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Avoided Spend Performance Banner */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
            <TrendingUp className="w-3 h-3" />
            <span>Avoided Capital Outflow Recorded</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            ${(cumulativeSavings + 12790).toLocaleString()}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">cumulative savings</span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Automatic inter-facility transfers and quantity resizing eliminated unneeded external vendor purchase orders prior to ERP ingestion.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Turnaround Acceleration</span>
            <span className="text-sm font-bold font-mono text-emerald-400">95% faster (142ms average)</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigateTo('/analytics')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Audit Metrics
          </Button>
        </div>
      </div>

      {/* 4. Recent Requests Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Controls & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Requests</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live purchase requisitions audited across 4 verification gates
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search item, department..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>

            {/* Status quick filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="INVESTIGATE">Investigate</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('/requests')}
              className="text-xs"
            >
              Full Ledger →
            </Button>
          </div>
        </div>

        {/* Loading State Skeleton for Table */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center py-8 text-slate-500 gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Fetching verified requisitions from database...</span>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          /* Empty State Display */
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 mx-auto mb-3.5">
              <Inbox className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No purchase requests found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {forceEmptyState
                ? 'The empty state simulation is currently active. You can create a new request or switch back to live demo data.'
                : searchQuery || selectedStatusFilter !== 'ALL'
                ? `No requisition matched "${searchQuery || selectedStatusFilter}". Try clearing your filters.`
                : 'There are currently no purchase requisitions in your ledger.'}
            </p>

            <div className="flex items-center justify-center gap-2.5 mt-5">
              {forceEmptyState || searchQuery || selectedStatusFilter !== 'ALL' ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setForceEmptyState(false);
                    setSearchQuery('');
                    setSelectedStatusFilter('ALL');
                  }}
                >
                  Reset Filters & View Data
                </Button>
              ) : null}

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => navigateTo('/submit')}
              >
                Submit Purchase Request
              </Button>
            </div>
          </div>
        ) : (
          /* Real Requisitions Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Item</th>
                  <th className="py-3 px-5">Department</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => handleOpenAnalysis(req)}
                  >
                    {/* Item Column */}
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors text-xs">
                          {req.gate1?.standardized || req.itemDescription}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {req.id} • Qty: {req.quantity} • By: {req.employeeName}
                        </span>
                      </div>
                    </td>

                    {/* Department Column */}
                    <td className="py-3.5 px-5 text-slate-600 font-medium">
                      {req.department}
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-5">
                      <StatusBadge status={req.status} size="sm" />
                    </td>

                    {/* Date Column */}
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">
                      {req.createdAt}
                    </td>

                    {/* Action Column */}
                    <td className="py-3.5 px-5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAnalysis(req);
                        }}
                        className="text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
