import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toasts: React.FC = () => {
  const { toasts, removeToast } = useEditorStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold transition-all transform animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-[#111827]/95 border-emerald-500/50 text-emerald-300'
              : toast.type === 'error'
              ? 'bg-[#111827]/95 border-rose-500/50 text-rose-300'
              : toast.type === 'warning'
              ? 'bg-[#111827]/95 border-amber-500/50 text-amber-300'
              : 'bg-[#111827]/95 border-[#1F2937] text-[#E5E7EB]'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-[#22D3EE] shrink-0" />}

          <span>{toast.message}</span>

          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-75 transition-opacity text-[#9CA3AF] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
