import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Sparkles, X, ChevronRight, Lightbulb } from 'lucide-react';

const CREATOR_TIPS = [
  '⚡ Phím tắt nhanh: Nhấn phím S hoặc Ctrl+B để tách clip ngay tại vị trí Playhead!',
  '🎵 Giữ phím Alt khi kéo clip trên Timeline để nhân bản (Duplicate) siêu nhanh.',
  '✂️ Phím Q cắt bỏ phần bên trái playhead, phím W cắt bỏ phần bên phải playhead.',
  '🎯 Nhấn phím M để ghim Marker nhịp beat, phím [ và ] để nhảy lùi / tiến giữa các marker.',
  '🔊 Nhấp chuột phải vào clip Video chọn "Detach audio" để tách âm thanh ra track riêng.',
  '🚀 Chọn nhiều clip bằng Shift+Click rồi bấm Ctrl+G để nhóm chúng di chuyển đồng bộ!',
  '📱 Dựng video dọc 9:16 cho TikTok: Đặt hook chữ to nổi bật ở 3 giây đầu tiên để giữ chân người xem.',
  '✨ Sử dụng bộ lọc Cinematic hoặc Retro trong tab Filters để nâng cấp màu sắc video chỉ với 1 click.',
  '⏱️ Chế độ tua ngược (Reverse) trong menu chuột phải tạo hiệu ứng giật lùi cực kỳ bắt mắt cho vlog!',
  '🪄 Bạn có thể dùng EditPilot AI ở góc phải để ra lệnh bằng giọng nói hoặc văn bản tiếng Việt tự nhiên.'
];

export const Mascot: React.FC = () => {
  const { settings, openModal } = useEditorStore();
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  // Hidden if turned off in Settings
  if (settings.showMascot === false) {
    return null;
  }

  const handleNextTip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTipIndex((prev) => (prev + 1) % CREATOR_TIPS.length);
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start select-none">
      {/* Speech Bubble */}
      {bubbleOpen && (
        <div className="mb-3 max-w-[270px] bg-[#1F1F1F] border border-[#333333] shadow-2xl rounded-2xl p-3.5 text-xs text-[#E6E6E6] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#333333]">
            <span className="font-bold text-[#1FC8DB] flex items-center gap-1.5 text-[11px]">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Mẹo Dựng Hay
            </span>
            <button
              onClick={() => setBubbleOpen(false)}
              className="p-1 hover:bg-[#2E2E2E] rounded-md text-[#8A8A8A] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="leading-relaxed text-[11px] text-[#CCCCCC]">
            {CREATOR_TIPS[tipIndex]}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A] text-[10px]">
            <button
              onClick={() => {
                setBubbleOpen(false);
                openModal('settings');
              }}
              className="text-[#8A8A8A] hover:text-[#1FC8DB] transition-colors"
            >
              Cài đặt ẩn
            </button>
            <button
              onClick={handleNextTip}
              className="flex items-center gap-1 font-semibold text-[#1FC8DB] hover:text-[#4BD9E8] transition-colors"
            >
              <span>Mẹo khác</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Speech bubble pointy arrow */}
          <div className="w-3 h-3 bg-[#1F1F1F] border-r border-b border-[#333333] rotate-45 absolute -bottom-1.5 left-5" />
        </div>
      )}

      {/* Pixel Sprout Mascot Button */}
      <button
        onClick={() => setBubbleOpen(!bubbleOpen)}
        className="group relative flex items-center justify-center p-2 rounded-2xl bg-[#1F1F1F]/90 hover:bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] shadow-xl backdrop-blur transition-all duration-200 active:scale-95"
        title="Linh vật Pixel Sprout - Nhấp để xem mẹo dựng!"
      >
        {/* Pixel Art SVG for Cute Sprout */}
        <svg
          viewBox="0 0 24 24"
          className="w-8 h-8 filter drop-shadow group-hover:scale-110 transition-transform animate-bounce"
          style={{ animationDuration: '3s' }}
        >
          {/* Ground soil */}
          <path d="M4 20h16v2H4z" fill="#78350F" />
          <path d="M6 18h12v2H6z" fill="#92400E" />

          {/* Sprout Stem */}
          <path d="M11 12h2v6h-2z" fill="#10B981" />

          {/* Left Leaf */}
          <path d="M7 8h4v4H7z" fill="#34D399" />
          <path d="M5 6h4v3H5z" fill="#10B981" />

          {/* Right Leaf */}
          <path d="M13 6h4v4h-4z" fill="#34D399" />
          <path d="M15 4h4v3h-4z" fill="#059669" />

          {/* Cute Eyes */}
          <rect x="10" y="14" width="1.5" height="2" fill="#064E3B" rx="0.5" />
          <rect x="13.5" y="14" width="1.5" height="2" fill="#064E3B" rx="0.5" />

          {/* Blush */}
          <rect x="8.5" y="15.5" width="1.5" height="1" fill="#F472B6" rx="0.5" />
          <rect x="15" y="15.5" width="1.5" height="1" fill="#F472B6" rx="0.5" />
        </svg>

        {/* Small sparkle badge */}
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#1FC8DB] flex items-center justify-center text-slate-950 shadow">
          <Sparkles className="w-2 h-2 fill-current" />
        </span>
      </button>
    </div>
  );
};

