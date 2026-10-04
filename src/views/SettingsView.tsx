import React, { useState } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { Button } from '../components/common/Button';
import { ProfilePictureUploadCard } from '../components/profile/ProfilePictureUploadCard';
import { isPurchaseManagerRole } from '../types/procurement';
import {
  Settings,
  Database,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Save,
  ArrowRight,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { addToast, currentUser, navigateTo } = useProcure();

  const [erpTarget, setErpTarget] = useState('SAP_S4HANA');
  const [budgetTolerance, setBudgetTolerance] = useState('5');
  const [usageThreshold, setUsageThreshold] = useState('3.0');
  const [autoTransfer, setAutoTransfer] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast(
        'Configuration Saved',
        'Procurement gatekeeper parameters and ERP connection updated.',
        'success'
      );
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">User Profile & System Parameters</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your verified enterprise identity, Cloud Storage avatar, downstream ERP connectors, and audit gate rules.
        </p>
      </div>

      {/* Enterprise Identity & Profile Picture Upload Card */}
      <ProfilePictureUploadCard />

      {/* Historical Data Management Card (Purchase Managers & Admins) */}
      {isPurchaseManagerRole(currentUser.role) && (
        <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Historical Procurement Ingestion</h3>
                  <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded">
                    STAGE 1–3
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload Excel/CSV spreadsheets to seed historical consumption & purchase data with Gate 1 cleaning.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigateTo('/historical-data')}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 shrink-0"
            >
              Open Data Pipeline
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* ERP Integration Target */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs tracking-tight">Downstream ERP Gateway</h3>
              <p className="text-[11px] text-slate-500">
                Authorized destination for post-audit PO/PR payload ingestion (PRD Sec. 7)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label
              className={`p-3.5 rounded-lg border cursor-pointer flex flex-col justify-between transition-all ${
                erpTarget === 'SAP_S4HANA'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-xs">SAP S/4HANA (Enterprise)</span>
                <input
                  type="radio"
                  name="erp"
                  checked={erpTarget === 'SAP_S4HANA'}
                  onChange={() => setErpTarget('SAP_S4HANA')}
                  className="accent-indigo-600"
                />
              </div>
              <span className="text-[11px] text-slate-500 leading-relaxed">
                Connected via OData PurchaseRequisition API v2. Al-Futtaim DC hub endpoint active.
              </span>
            </label>

            <label
              className={`p-3.5 rounded-lg border cursor-pointer flex flex-col justify-between transition-all ${
                erpTarget === 'ORACLE_CLOUD'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-xs">Oracle Cloud SCM</span>
                <input
                  type="radio"
                  name="erp"
                  checked={erpTarget === 'ORACLE_CLOUD'}
                  onChange={() => setErpTarget('ORACLE_CLOUD')}
                  className="accent-indigo-600"
                />
              </div>
              <span className="text-[11px] text-slate-500 leading-relaxed">
                Oracle Fusion Procurement REST API endpoint for enterprise purchasing lines.
              </span>
            </label>
          </div>
        </div>

        {/* Gatekeeper Thresholds */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-700">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs tracking-tight">Audit Gate Sensitivity & Rules</h3>
              <p className="text-[11px] text-slate-500">Fine-tune tolerance thresholds for Gates 2, 3, and 4</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Gate 2: Budget Variance Tolerance (%)
              </label>
              <input
                type="number"
                value={budgetTolerance}
                onChange={(e) => setBudgetTolerance(e.target.value)}
                className="w-full max-w-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
              <span className="text-slate-400 block mt-1 text-[11px]">
                Requisitions exceeding cost-center budget by more than this percentage trigger an automatic HOLD.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block font-semibold text-slate-800 mb-1">
                Gate 4: Consumption Run-Rate Anomaly Multiplier
              </label>
              <input
                type="number"
                step="0.5"
                value={usageThreshold}
                onChange={(e) => setUsageThreshold(e.target.value)}
                className="w-full max-w-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
              <span className="text-slate-400 block mt-1 text-[11px]">
                Flags request for REDUCE when requisition quantity exceeds this multiple of 30-day run rate (Default: 3.0x).
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block text-xs">
                  Gate 3: Auto-Draft Sister Warehouse Stock Transfer
                </span>
                <span className="text-slate-400 block text-[11px]">
                  Automatically generate inter-facility stock movement orders when idle inventory is found.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoTransfer}
                onChange={(e) => setAutoTransfer(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            leftIcon={<Save className="w-3.5 h-3.5" />}
            isLoading={isSaving}
          >
            Save Parameters
          </Button>
        </div>
      </form>
    </div>
  );
};
