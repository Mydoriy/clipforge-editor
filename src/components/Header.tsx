import React, { useState } from 'react';
import { Logo } from './Logo';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { isSupabaseConfigured } from '../utils/supabase';
import {
  Crown,
  Share2,
  Download,
  ChevronDown,
  Globe,
  Cloud,
  HardDrive,
  Eye,
  EyeOff
} from 'lucide-react';

interface HeaderProps {
  isEditor?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isEditor = false }) => {
  const {
    language,
    setLanguage,
    safeZoneEnabled,
    toggleSafeZone,
    openModal,
    projectTitle,
    setProjectTitle,
    showToast
  } = useEditorStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const t = translations[language];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: projectTitle,
        text: 'Check out this 9:16 vertical video created in CapCut Desktop Web!',
        url: window.location.href
      }).catch(() => {});
    } else {
      openModal('share');
    }
  };

  return (
    <header className="h-14 bg-[#0E1320] border-b border-[#1F2937] px-5 flex items-center justify-between select-none z-30 shrink-0">
      {/* Left: Logo + Menu */}
      <div className="flex items-center gap-4">
        <Logo size="md" />

        {isEditor && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#E5E7EB] hover:text-[#22D3EE] px-2.5 py-1.5 rounded-xl hover:bg-[#111827] border border-transparent hover:border-[#1F2937] transition-all hover-lift"
            >
              <span>{t.menu}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </button>

            {menuOpen && (
              <div
                className="absolute left-0 mt-2 w-52 bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl py-1.5 text-xs text-[#E5E7EB] z-50 animate-in fade-in"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openModal('export');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#22D3EE]/10 hover:text-[#22D3EE] flex items-center justify-between"
                >
                  <span>{t.export} (MP4 / WebM)</span>
                  <span className="text-[10px] text-[#9CA3AF]">Ctrl+E</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    toggleSafeZone();
                    showToast(safeZoneEnabled ? 'Đã tắt vùng an toàn' : 'Đã bật vùng an toàn 9:16');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#22D3EE]/10 hover:text-[#22D3EE] flex items-center justify-between"
                >
                  <span>{t.safeZone}</span>
                  <span className="text-[10px] text-[#9CA3AF]">Shift+S</span>
                </button>
                <div className="border-t border-[#1F2937] my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openModal('shortcuts');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#22D3EE]/10 hover:text-[#22D3EE]"
                >
                  Phím tắt biên tập (Hotkeys)
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openModal('about');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#22D3EE]/10 hover:text-[#22D3EE]"
                >
                  Giới thiệu CapCut Web v3.0
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center: Title / Subtitle matching exact Design System specification */}
      {isEditor ? (
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
              className="bg-[#111827] border border-[#22D3EE] text-white text-xs px-2.5 py-1 rounded-xl outline-none font-semibold text-center"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click để đổi tên dự án"
              className="text-xs font-bold text-[#E5E7EB] hover:text-[#22D3EE] cursor-pointer px-2.5 py-1 rounded-xl hover:bg-[#111827] transition-all hover-lift"
            >
              {projectTitle}
            </span>
          )}
          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#111827] text-[#9CA3AF] border border-[#1F2937] font-mono">
            9:16
          </span>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-2 text-xs text-[#9CA3AF]">
          <span className="font-semibold text-[#E5E7EB]">CapCut Desktop Web v3.0</span>
          <span>•</span>
          <span className="text-[#22D3EE] font-medium">9:16 Vertical Video Studio</span>
        </div>
      )}

      {/* Right: Actions, Language, Pro, Export */}
      <div className="flex items-center gap-3">
        {/* Safe Zone Toggle in Editor */}
        {isEditor && (
          <button
            onClick={toggleSafeZone}
            title={safeZoneEnabled ? 'Tắt vùng an toàn 9:16' : 'Bật vùng an toàn 9:16 (TikTok/Reels)'}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover-lift ${
              safeZoneEnabled
                ? 'bg-[#22D3EE]/15 border-[#22D3EE]/50 text-[#22D3EE]'
                : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            {safeZoneEnabled ? <Eye className="w-3.5 h-3.5 text-[#22D3EE]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{t.safeZone}</span>
          </button>
        )}

        {/* Cloud Sync / Guest Storage Indicator */}
        <div
          onClick={() => openModal(isSupabaseConfigured ? 'cloud' : 'guest')}
          title={isSupabaseConfigured ? 'Đang đồng bộ Supabase Cloud' : 'Chế độ khách: Dữ liệu lưu an toàn trong IndexedDB'}
          className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-xl bg-[#111827] border border-[#1F2937] text-[#E5E7EB] cursor-pointer hover:border-[#22D3EE]/50 transition-all hover-lift"
        >
          {isSupabaseConfigured ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">Cloud Sync</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span className="text-[#9CA3AF] font-medium">{t.guestMode}</span>
            </>
          )}
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => {
            const nextLang = language === 'VN' ? 'EN' : 'VN';
            setLanguage(nextLang);
            showToast(`Ngôn ngữ: ${nextLang === 'VN' ? 'Tiếng Việt' : 'English'}`);
          }}
          className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-[#E5E7EB] border border-[#1F2937] transition-all hover-lift"
          title="Đổi ngôn ngữ / Change language"
        >
          <Globe className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>{language}</span>
        </button>

        {/* Pro Pill: Gradient tím → hồng (#7C3AED → #EC4899) */}
        <button
          onClick={() => openModal('pro')}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:opacity-95 text-white shadow-md shadow-pink-500/20 transition-all hover-lift"
        >
          <Crown className="w-3.5 h-3.5 text-amber-300" />
          <span>{t.proBadge}</span>
        </button>

        {/* Share Button */}
        {isEditor && (
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-[#E5E7EB] border border-[#1F2937] transition-all hover-lift"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.share}</span>
          </button>
        )}

        {/* Bright Cyan Export Button */}
        <button
          onClick={() => openModal('export')}
          className="flex items-center gap-1.5 text-xs font-extrabold px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#22D3EE] to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover-lift active:scale-95"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t.export}</span>
        </button>
      </div>
    </header>
  );
};
