import React from 'react';
import { DecisionType, PRStatus } from '../../types/procurement';

interface StatusBadgeProps {
  status: PRStatus | DecisionType | 'Passed' | 'Warning' | 'Failed' | 'Found' | 'Not Found' | 'High' | 'Optimal' | 'Low' | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const norm = String(status).toUpperCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (norm === 'APPROVED' || norm === 'PASSED' || norm === 'PROCEED' || norm === 'OPTIMAL') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200/90 ring-1 ring-emerald-500/10';
    dotColor = 'bg-emerald-500';
  } else if (norm === 'REDUCE' || norm === 'WARNING') {
    colorClasses = 'bg-amber-50 text-amber-900 border-amber-200/90 ring-1 ring-amber-500/10';
    dotColor = 'bg-amber-500';
  } else if (norm === 'ON_HOLD' || norm === 'ON HOLD' || norm === 'HOLD') {
    colorClasses = 'bg-orange-50 text-orange-900 border-orange-200/90 ring-1 ring-orange-500/10';
    dotColor = 'bg-orange-500';
  } else if (norm === 'FOUND') {
    colorClasses = 'bg-sky-50 text-sky-800 border-sky-200/90 ring-1 ring-sky-500/10';
    dotColor = 'bg-sky-500';
  } else if (norm === 'HIGH' || norm === 'FAILED' || norm === 'REJECTED' || norm === 'REJECT') {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-200/90 ring-1 ring-rose-500/10';
    dotColor = 'bg-rose-500';
  } else if (norm === 'INVESTIGATE') {
    colorClasses = 'bg-purple-50 text-purple-800 border-purple-200/90 ring-1 ring-purple-500/10';
    dotColor = 'bg-purple-500';
  } else if (norm === 'EXPEDITE' || norm === 'EXPEDITED') {
    colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200/90 ring-1 ring-indigo-500/10';
    dotColor = 'bg-indigo-500';
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-[11px] px-2.5 py-0.5 font-semibold tracking-wide',
    lg: 'text-xs px-3 py-1 font-semibold tracking-wide',
  }[size];

  // Friendly display label
  let displayLabel = status;
  if (norm === 'ON_HOLD') displayLabel = 'ON HOLD';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border uppercase font-mono ${sizeClasses} ${colorClasses} whitespace-nowrap shadow-2xs`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />}
      <span>{displayLabel}</span>
    </span>
  );
};
