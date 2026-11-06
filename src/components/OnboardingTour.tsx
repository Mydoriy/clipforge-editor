import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Film, Sliders, CheckCircle, ArrowRight, X, Play } from 'lucide-react';
import { trackEvent } from '../utils/telemetry';

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const OnboardingTour: React.FC<Props> = ({ forceOpen = false, onClose }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setStep(0);
      return;
    }
    const completed = localStorage.getItem('clipforge_onboarding_completed') === 'true';
    if (!completed) {
      setIsOpen(true);
      trackEvent('onboarding_step', { step_index: 0, action: 'view' });
    }
  }, [forceOpen]);

  const handleFinish = (openSample: boolean = false, isSkip: boolean = false) => {
    localStorage.setItem('clipforge_onboarding_completed', 'true');
    trackEvent('onboarding_step', {
      step_index: step,
      action: isSkip ? 'skip' : 'complete'
    });
    setIsOpen(false);
    if (onClose) onClose();
    if (openSample) {
      navigate('/editor/demo-916-intro');
    }
  };

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Chào mừng đến với CapCut Desktop Web! 🎉',
      desc: 'Trình biên tập video ngắn 9:16 chuyên nghiệp chuẩn TikTok, Reels, Shorts hoạt động hoàn toàn trong trình duyệt.',
      badge: 'Local-First 100%',
      icon: Sparkles,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      details: [
        'Không cần đăng nhập: Mở app là dựng ngay, dữ liệu lưu an toàn trên máy bạn.',
        'Xử lý phần cứng trực tiếp bằng WebCodecs & FFmpeg WebAssembly.',
        'Độ phân giải xuất linh hoạt từ 720p đến 4K Ultra HD mượt mà.'
      ]
    },
    {
      title: 'Không gian dựng 9:16 trực quan 🎬',
      desc: 'Thiết kế bố cục chuẩn công thái học giúp bạn cắt ghép video tốc độ cao.',
      badge: 'Công cụ dựng',
      icon: Film,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30',
      details: [
        'Panel trái: Kho Media, Âm thanh SFX, Phụ đề tự động, Sticker Lottie và Bộ lọc màu 3D LUT.',
        'Khung Canvas trung tâm: Khung dọc 9:16 với thước đo Vùng an toàn (Safe Zone) tránh bị che bởi UI TikTok.',
        'Timeline đa track: Hỗ trợ phím tắt S (cắt), Q/W (cắt đầu/đuôi), Delete, và dồn track (Ripple Delete).'
      ]
    },
    {
      title: 'Thử ngay với Dự án Mẫu có sẵn! 🚀',
      desc: 'Chúng tôi đã chuẩn bị sẵn một dự án mẫu 9:16 có clip video, nhạc nền và chữ để bạn trải nghiệm ngay lập tức.',
      badge: 'Sẵn sàng sáng tạo',
      icon: Sliders,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      details: [
        'Dự án mẫu đã nạp sẵn 2 video, hình ảnh và nhạc nền.',
        'Thử cắt tỉa, đổi tốc độ và bấm nút Xuất (Export) MP4 1080p ngay.',
        'Bạn có thể mở lại hướng dẫn này bất kỳ lúc nào trong mục Cài đặt.'
      ]
    }
  ];

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-modal-title"
        className="w-full max-w-lg rounded-2xl bg-[#141824] border border-[#1F2937] shadow-2xl p-6 flex flex-col gap-5 text-left relative overflow-hidden"
      >
        {/* Top bar with Step Counter and Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === step ? 'w-6 bg-[#1FC8DB]' : idx < step ? 'w-2 bg-[#1FC8DB]/60' : 'w-2 bg-[#1F2937]'
                }`}
              />
            ))}
            <span className="text-[11px] font-mono text-[#9CA3AF] ml-2">
              Bước {step + 1} / {steps.length}
            </span>
          </div>

          <button
            onClick={() => handleFinish(false)}
            aria-label="Đóng hướng dẫn"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center ${currentStep.bg} ${currentStep.color}`}
            >
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1FC8DB]">{currentStep.badge}</span>
              <h3 id="tour-modal-title" className="text-base sm:text-lg font-bold text-white">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <p className="text-xs text-[#9CA3AF] leading-relaxed">{currentStep.desc}</p>

          <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2937] flex flex-col gap-2 mt-1">
            {currentStep.details.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[#E5E7EB]">
                <CheckCircle className="w-4 h-4 text-[#1FC8DB] shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1F2937] mt-1">
          <button
            onClick={() => handleFinish(false, true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors"
          >
            Bỏ qua (Skip)
          </button>

          <div className="flex items-center gap-2">
            {step < steps.length - 1 ? (
              <button
                onClick={() => {
                  trackEvent('onboarding_step', { step_index: step + 1, action: 'next' });
                  setStep((s) => s + 1);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1FC8DB] to-cyan-500 hover:opacity-90 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFinish(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#1F2937] hover:bg-[#374151] text-white font-bold text-xs"
                >
                  Bắt đầu trống
                </button>
                <button
                  onClick={() => handleFinish(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1FC8DB] to-cyan-500 hover:opacity-90 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Mở dự án mẫu thử ngay</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
