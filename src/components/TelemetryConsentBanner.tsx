import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, ExternalLink } from 'lucide-react';
import { getTelemetryConsent, setTelemetryConsent } from '../utils/telemetry';

export const TelemetryConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't made a decision yet
    const consent = getTelemetryConsent();
    if (consent === 'pending') {
      setIsVisible(true);
    }
  }, []);

  const handleConsent = (granted: boolean) => {
    setTelemetryConsent(granted ? 'granted' : 'denied');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cài đặt quyền riêng tư & đo lường"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 rounded-2xl bg-[#0D121F]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-md text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-white text-sm">Tôn trọng quyền riêng tư (Privacy-First)</h4>
            <button
              onClick={() => handleConsent(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title="Từ chối"
              aria-label="Đóng banner đo lường"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#8E9BB0] leading-relaxed">
            ClipForge <strong>mặc định tắt toàn bộ theo dõi</strong> và không dùng cookie bên thứ ba. Bạn có muốn bật báo cáo sự cố & hiệu năng kỹ thuật ẩn danh (<strong>tuyệt đối không gửi nội dung video, tên file hay project</strong>)?
          </p>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={() => handleConsent(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1FC8DB] to-[#22D3EE] text-slate-950 font-bold text-xs hover:opacity-90 shadow-md transition-all cursor-pointer"
            >
              Đồng ý (Opt-in)
            </button>
            <button
              onClick={() => handleConsent(false)}
              className="px-3 py-1.5 rounded-xl bg-[#141B2D] hover:bg-[#1E2842] text-slate-300 font-semibold text-xs border border-[#232F4A] transition-colors cursor-pointer"
            >
              Từ chối
            </button>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[11px] text-[#1FC8DB] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Chính sách</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
