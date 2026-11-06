import React, { useState } from 'react';
import { Logo } from './Logo';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { isSupabaseConfigured } from '../utils/supabase';
import {
  ShieldCheck,
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
        text: 'Check out this 9:16 vertical video created in ClipForge Web!',
        url: window.location.href
      }).catch(() => {});
    } else {
      openModal('share');
    }
  };

  return (
    <header className="h-13 bg-[#11141c] border-b border-[#1f2633] px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Left: Logo + Menu */}
      <div className="flex items-center gap-4">
        <Logo size="md" />

        {isEditor && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              <span>{t.menu}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {menuOpen && (
              <div
                className="absolute left-0 mt-1.5 w-48 bg-[#181d28] border border-slate-700 rounded-lg shadow-2xl py-1 text-xs text-slate-200 z-50 animate-in fade-in"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openModal('export');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/10 hover:text-cyan-300 flex items-center justify-between"
                >
                  <span>{t.export} (MP4 / WebM)</span>
                  <span className="text-[10px] text-slate-500">Ctrl+E</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    toggleSafeZone();
                    showToast(safeZoneEnabled ? 'Đã tắt vùng an toàn' : 'Đã bật vùng an toàn 9:16');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/10 hover:text-cyan-300 flex items-center justify-between"
                >
                  <span>{t.safeZone}</span>
                  <span className="text-[10px] text-slate-500">Shift+S</span>
                </button>
                <div className="border-t border-slate-700/60 my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openModal('shortcuts');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/10 hover:text-cyan-300"
                >
                  Phím tắt biên tập (Hotkeys)
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openModal('about');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/10 hover:text-cyan-300"
                >
                  Giới thiệu ClipForge Web v3.0
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center: Project Title / Subtitle */}
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
              className="bg-slate-900 border border-cyan-500 text-white text-xs px-2 py-0.5 rounded outline-none font-medium text-center"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click để đổi tên dự án"
              className="text-xs font-semibold text-slate-200 hover:text-cyan-400 cursor-pointer px-2 py-0.5 rounded hover:bg-slate-800/60 transition-colors"
            >
              {projectTitle}
            </span>
          )}
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            9:16
          </span>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-300">CapCut Desktop Web</span>
          <span>•</span>
          <span>9:16 Vertical Video Studio (Guest Mode)</span>
        </div>
      )}

      {/* Right: Actions, Language, Pro, Export */}
      <div className="flex items-center gap-2.5">
        {/* Safe Zone Toggle in Editor */}
        {isEditor && (
          <button
            onClick={toggleSafeZone}
            title={safeZoneEnabled ? 'Tắt vùng an toàn 9:16' : 'Bật vùng an toàn 9:16 (TikTok/Reels)'}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
              safeZoneEnabled
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {safeZoneEnabled ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{t.safeZone}</span>
          </button>
        )}

        {/* Cloud Sync / Guest Storage Indicator */}
        <div
          onClick={() => openModal(isSupabaseConfigured ? 'cloud' : 'guest')}
          title={isSupabaseConfigured ? 'Đang đồng bộ Supabase Cloud' : 'Chế độ khách: Dữ liệu lưu an toàn trên máy (IndexedDB)'}
          className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded bg-slate-800/70 border border-slate-700/50 text-slate-300 cursor-pointer hover:border-slate-600 transition-colors"
        >
          {isSupabaseConfigured ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Cloud Sync</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.guestMode}</span>
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
          className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
          title="Đổi ngôn ngữ / Change language"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language}</span>
        </button>

        {/* Pro Pill */}
        <button
          onClick={() => openModal('pro')}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-300 border border-purple-500/40 transition-all shadow-sm"
        >
          <Crown className="w-3 h-3 text-pink-400" />
          <span>{t.proBadge}</span>
        </button>

        {/* Share Button */}
        {isEditor && (
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.share}</span>
          </button>
        )}

        {/* Bright Cyan Export Button */}
        <button
          onClick={() => openModal('export')}
          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t.export}</span>
        </button>
      </div>
    </header>
  );
};
