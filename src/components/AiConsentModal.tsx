import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  Eye,
  AlertTriangle,
  Lock,
  Check,
  X,
  Cpu,
  Coins,
} from 'lucide-react';
import type { AiConsentPayload } from '../types/privacyCostSafety.ts';
import { AI_PRIVACY_COPYRIGHT_NOTICE } from '../types/privacyCostSafety.ts';

export interface AiConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rememberForSession: boolean) => void;
  onFallbackToLocal: () => void;
  payload: AiConsentPayload;
  language?: 'VN' | 'EN';
}

export const AiConsentModal: React.FC<AiConsentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onFallbackToLocal,
  payload,
  language = 'VN',
}) => {
  const [rememberSession, setRememberSession] = useState(false);

  if (!isOpen) return null;

  const isVi = language === 'VN';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4 text-gray-200 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-[#22D3EE] border border-cyan-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                {isVi ? 'Xác nhận gửi dữ liệu phân tích AI' : 'Confirm AI Analysis Dispatch'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  {payload.provider} / {payload.model}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                {isVi
                  ? 'Quyền riêng tư & kiểm soát dữ liệu rời khỏi thiết bị'
                  : 'Privacy & outbound data control'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Outbound Notice Alert */}
        <div className="p-3 bg-cyan-950/30 border border-cyan-800/60 rounded-xl text-xs text-cyan-200 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>{isVi ? 'Xác nhận quan trọng:' : 'Important confirmation:'}</strong>{' '}
            {isVi
              ? `Các khung hình trích xuất (${payload.frameCount} khung) sẽ rời khỏi máy tính của bạn và được gửi tới nhà cung cấp AI (${payload.provider}).`
              : `The extracted frames (${payload.frameCount} frames) will leave your machine and be sent to the AI provider (${payload.provider}).`}
          </div>
        </div>

        {/* Warning if Full Video Enabled */}
        {payload.sendFullVideo && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>{isVi ? 'CẢNH BÁO:' : 'WARNING:'}</strong>{' '}
              {isVi
                ? 'Tùy chọn gửi toàn bộ tệp video đang BẬT. Việc này sẽ gửi toàn bộ tệp video gốc ra ngoài máy tính và tiêu tốn nhiều token.'
                : 'Full video upload is ENABLED. This sends your full original video file outbound and consumes significant tokens.'}
            </div>
          </div>
        )}

        {/* Filmstrip Preview */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5 text-gray-300">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              {isVi ? 'Khung hình sẽ gửi (đã làm mờ & che watermark):' : 'Frames to send (blurred & masked):'}
            </span>
            <span className="font-mono text-[11px] text-cyan-400">
              {payload.frameCount} / 48 {isVi ? 'khung tối đa' : 'frames max'}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin max-h-24 p-1.5 bg-[#0B0F19] rounded-xl border border-gray-800">
            {payload.frames.map((frame, idx) => (
              <div
                key={idx}
                className="relative shrink-0 w-16 h-20 rounded bg-gray-900 border border-gray-700 overflow-hidden group"
              >
                {frame.dataUrl ? (
                  <img
                    src={frame.dataUrl}
                    alt={`Frame ${frame.timestampSec}s`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-500 font-mono">
                    #{idx + 1}
                  </div>
                )}
                <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/70 text-[8px] font-mono text-cyan-300">
                  {frame.timestampSec}s
                </span>
                {frame.masked && (
                  <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" title="Watermark Masked" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cost & Token Estimates Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-gray-800 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400">{isVi ? 'Ước tính token' : 'Estimated tokens'}</div>
              <div className="font-bold font-mono text-white">~{payload.estimatedTokens.toLocaleString()}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-gray-800 flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400">{isVi ? 'Ước tính chi phí' : 'Estimated cost'}</div>
              <div className="font-bold font-mono text-amber-300">~${payload.estimatedCostUsd.toFixed(5)} USD</div>
            </div>
          </div>
        </div>

        {/* Privacy Defaults Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1 font-semibold">
            <Check className="w-3 h-3" /> Làm mờ khuôn mặt: BẬT
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1 font-semibold">
            <Check className="w-3 h-3" /> Che 4 góc watermark: BẬT
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/80 flex items-center gap-1 font-semibold">
            <Check className="w-3 h-3" /> Âm thanh: KHÔNG GỬI (Đo cục bộ)
          </span>
        </div>

        {/* Copyright Reminder */}
        <div className="p-2.5 bg-gray-900/60 rounded-xl border border-gray-800 text-[11px] text-gray-400 italic">
          "{AI_PRIVACY_COPYRIGHT_NOTICE[isVi ? 'vi' : 'en']}"
        </div>

        {/* Remember Session Checkbox */}
        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberSession}
            onChange={(e) => setRememberSession(e.target.checked)}
            className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-cyan-500/20"
          />
          <span>{isVi ? 'Nhớ lựa chọn đồng ý trong phiên làm việc này' : 'Remember consent for this session'}</span>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1F2937]">
          <button
            onClick={onFallbackToLocal}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition-colors"
          >
            {isVi ? 'Chỉ phân tích cục bộ (Không gửi dữ liệu)' : 'Use Local Only (No Send)'}
          </button>
          <button
            onClick={() => onConfirm(rememberSession)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1FC8DB] to-[#0070F3] hover:brightness-110 text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isVi ? 'Đồng ý & Phân tích AI' : 'Agree & Analyze with AI'}
          </button>
        </div>
      </div>
    </div>
  );
};

