import React from 'react';
import { Hexagon, ShieldCheck } from 'lucide-react';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#090E1A] flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="flex flex-col items-center max-w-sm text-center">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/40 relative z-10 animate-pulse">
            <Hexagon className="w-8 h-8 fill-white/20 stroke-[2] text-white" />
          </div>
          <div className="absolute -inset-2 bg-indigo-500/20 rounded-2xl blur-md -z-0" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-white mb-2">
          AutoProcure AI
        </h1>
        <p className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-6">
          Point-of-Origin Gatekeeper
        </p>

        {/* Progress indicator */}
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div className="w-full h-full bg-indigo-500 origin-left animate-[shimmer_1.5s_infinite]" />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Verifying enterprise credentials...</span>
        </div>
      </div>
    </div>
  );
};
