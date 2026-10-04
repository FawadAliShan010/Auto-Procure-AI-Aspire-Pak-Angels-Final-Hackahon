import React from 'react';
import { useProcure } from '../../context/ProcurementContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useProcure();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = Info;
          let borderClass = 'border-blue-200 bg-white';
          let iconClass = 'text-blue-600 bg-blue-50';

          if (toast.type === 'success') {
            Icon = CheckCircle2;
            borderClass = 'border-emerald-200 bg-white';
            iconClass = 'text-emerald-600 bg-emerald-50';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            borderClass = 'border-amber-200 bg-white';
            iconClass = 'text-amber-600 bg-amber-50';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            borderClass = 'border-rose-200 bg-white';
            iconClass = 'text-rose-600 bg-rose-50';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              layout
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${borderClass}`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${iconClass}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h4 className="text-sm font-semibold text-slate-900">{toast.title}</h4>
                {toast.description && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
