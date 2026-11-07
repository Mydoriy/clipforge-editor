import React, { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { AlertTriangle, Trash2, Info, Cloud, X } from 'lucide-react';

export const ConfirmDialog: React.FC = () => {
  const { confirmDialogState, closeConfirmDialog } = useEditorStore();

  useEffect(() => {
    if (!confirmDialogState) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeConfirmDialog(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        closeConfirmDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialogState, closeConfirmDialog]);

  if (!confirmDialogState) return null;

  const {
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    type = 'warning',
    badgeIcon
  } = confirmDialogState;

  const isDanger = type === 'danger';
  const isInfo = type === 'info';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
      onClick={() => closeConfirmDialog(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="relative w-full max-w-[340px] bg-[#181E29] border border-[#2B3545] rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Close (X) button */}
        <button
          type="button"
          onClick={() => closeConfirmDialog(false)}
          className="absolute right-3.5 top-3.5 p-1 rounded-lg text-[#64748B] hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Đóng (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Centered Top Badge Icon (Styled exactly as in CapCut Desktop / Image 2) */}
        <div
          className={`w-14 h-14 mx-auto mb-3.5 rounded-2xl flex items-center justify-center relative shadow-lg ${
            isDanger
              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-rose-500/10'
              : isInfo
              ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
              : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-amber-500/10'
          }`}
        >
          {badgeIcon === 'cloud' ? (
            <div className="relative flex items-center justify-center">
              <Cloud className="w-7 h-7 stroke-[2.2] text-red-400" />
            </div>
          ) : isDanger || badgeIcon === 'trash' ? (
            <div className="relative flex items-center justify-center">
              <Trash2 className="w-7 h-7 stroke-[2.2] text-rose-400" />
            </div>
          ) : isInfo ? (
            <div className="relative flex items-center justify-center">
              <Info className="w-7 h-7 stroke-[2.2] text-cyan-400" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Vibrant Warning Triangle */}
              <AlertTriangle className="w-8 h-8 text-amber-400 fill-amber-400 stroke-[1.5]" />
              {/* Miniature emblem badge overlapping inside the triangle (CapCut style) */}
              <div className="absolute inset-0 flex items-center justify-center pt-2">
                <div className="w-3.5 h-3.5 rounded-[4px] bg-[#181E29] border border-amber-300/40 flex items-center justify-center shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6L14 3L12 13L4 17V6Z" fill="#1FC8DB" />
                    <path d="M20 18L10 21L12 11L20 7V18Z" fill="#FFFFFF" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 id="confirm-dialog-title" className="text-base font-bold text-white mb-2 tracking-tight">
          {title}
        </h3>

        {/* Description / Message */}
        <p className="text-xs text-[#94A3B8] leading-relaxed mb-6 font-normal whitespace-pre-line px-1">
          {message}
        </p>

        {/* Two Action Buttons side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Primary Confirm Button (Left) */}
          <button
            type="button"
            onClick={() => closeConfirmDialog(true)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
              isDanger
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                : 'bg-[#1FC8DB] hover:bg-cyan-300 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {confirmText}
          </button>

          {/* Secondary Cancel Button (Right) */}
          <button
            type="button"
            onClick={() => closeConfirmDialog(false)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#CBD5E1] bg-[#283244] hover:bg-[#344158] hover:text-white transition-all border border-[#3A4961]/50 active:scale-95 cursor-pointer"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
