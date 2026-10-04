import React from 'react';
import { StatusBadge } from '../common/StatusBadge';

export interface GateCardProps {
  id?: string;
  gateNumber: string; // e.g. "01", "02", "03", "04"
  title: string;
  subtitle?: string;
  status: string; // e.g. "Passed", "Warning", "Failed", "Found", "Optimal", "High"
  icon?: React.ReactNode;
  inputs: React.ReactNode;
  results: React.ReactNode;
  visualIndicator: React.ReactNode;
  explanation: React.ReactNode;
  relevantMetrics?: React.ReactNode;
}

export const GateCard: React.FC<GateCardProps> = ({
  id,
  gateNumber,
  title,
  subtitle,
  status,
  icon,
  inputs,
  results,
  visualIndicator,
  explanation,
  relevantMetrics,
}) => {
  return (
    <div
      id={id || `gate-card-${gateNumber}`}
      className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between overflow-hidden"
    >
      {/* Top Header */}
      <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700 font-bold text-xs font-mono shrink-0 shadow-2xs">
            {gateNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">{title}</h3>
              {icon && <span className="text-slate-400">{icon}</span>}
            </div>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-4 text-xs flex-1">
        {/* Section: Inputs */}
        <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Gate Inputs
          </div>
          <div className="text-slate-700">{inputs}</div>
        </div>

        {/* Section: Results */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Gate Results
          </div>
          <div className="bg-white rounded-lg border border-slate-150 divide-y divide-slate-100">
            {results}
          </div>
        </div>

        {/* Section: Relevant Metrics (if provided) */}
        {relevantMetrics && (
          <div className="pt-1">
            {relevantMetrics}
          </div>
        )}

        {/* Section: Visual Indicator */}
        <div className="pt-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            Visual Indicator & Analysis
          </div>
          <div className="rounded-lg border border-slate-200/80 p-3 bg-slate-50/40">
            {visualIndicator}
          </div>
        </div>
      </div>

      {/* Footer: Explanation */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-700">
        <div className="flex items-start gap-2">
          <span className="font-semibold text-slate-900 shrink-0">Explanation:</span>
          <div className="text-slate-600 leading-relaxed">{explanation}</div>
        </div>
      </div>
    </div>
  );
};
