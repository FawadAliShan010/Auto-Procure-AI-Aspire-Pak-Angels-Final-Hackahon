import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, FileText, LayoutDashboard } from 'lucide-react';
import { useProcure } from '../../context/ProcurementContext';
import { Button } from './Button';

interface AccessDeniedProps {
  title?: string;
  requiredRole?: string;
  currentRole?: string;
  message?: string;
  attemptedResource?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = 'Access Denied — Role Authorization Required',
  requiredRole = 'PURCHASE_MANAGER or ADMIN',
  currentRole = 'REQUISITIONER',
  message = 'Your enterprise security profile does not have sufficient clearance to execute this operation or view this resource.',
  attemptedResource,
}) => {
  const { navigateTo } = useProcure();

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-rose-200/90 shadow-lg overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-rose-50 to-amber-50/50 p-6 sm:p-8 border-b border-rose-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100/80 border border-rose-200 text-rose-800 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3" />
              <span>Security Policy Enforcement (RBAC)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Security Audit Details Box */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2 font-mono">
            <div className="flex items-center justify-between text-slate-600">
              <span>Current User Role:</span>
              <span className="font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                {currentRole}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Required Clearance:</span>
              <span className="font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                {requiredRole}
              </span>
            </div>
            {attemptedResource && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Attempted Route / Resource:</span>
                <span className="text-slate-800 font-semibold">{attemptedResource}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/80 text-[11px]">
              <span>Compliance Rule:</span>
              <span>PRD Sec 6.4 — Segregation of Procurement Duties</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/70">
            <strong className="text-amber-900 block mb-0.5">Segregation of Duties Enforced:</strong>
            Requisitioners are authorized to create, submit, and track their purchase requests. Managerial approvals, quantity adjustments, and company-wide spend analytics require an authorized Purchase Manager or Administrator profile.
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigateTo('/dashboard')}
              leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
            >
              Return to Dashboard
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateTo('/requests')}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
            >
              View My Requisitions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
