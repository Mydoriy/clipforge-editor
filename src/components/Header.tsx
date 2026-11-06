import React, { useState } from 'react';
import { Logo } from './Logo';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { isSupabaseConfigured } from '../utils/supabase';
import {
  Menu as MenuIcon,
  Crown,
  Share2,
  Download,
  ChevronDown,
  Globe,
  Cloud,
  HardDrive,
  Eye,
  EyeOff,
  Bell,
  Settings,
  CheckCheck,
  Sparkles,
  Info
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
    showToast,
    toggleSidebar,
    isPro,
    notifications,
    markAllNotificationsAsRead,
    autosaveStatus
  } = useEditorStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const t = translations[language];
  const unreadCount = notifications.filter((n) => !n.read).length;

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
      {/* Left: Logo + Mobile Hamburger + Menu */}
      <div className="flex items-center gap-3">
        {!isEditor && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-xl bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB] hover-lift md:hidden"
            title="Thu gọn / Mở sidebar"
          >
            <MenuIcon className="w-4 h-4" />
          </button>
        )}

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
          <span
            className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium hidden sm:flex items-center gap-1 transition-all ${
              autosaveStatus === 'saving'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
            title="Dự án được tự động lưu mỗi 3 giây vào Dexie IndexedDB"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autosaveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span>{autosaveStatus === 'saving' ? 'Đang lưu...' : 'Đã lưu'}</span>
          </span>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-2 text-xs text-[#9CA3AF]">
          <span className="font-semibold text-[#E5E7EB]">CapCut Desktop Web v3.0</span>
          <span>•</span>
          <span className="text-[#22D3EE] font-medium">9:16 Vertical Video Studio</span>
        </div>
      )}

      {/* Right: Actions, Language, Bell, Settings, Pro, Export, Window decor */}
      <div className="flex items-center gap-2.5">
        {/* Safe Zone Toggle in Editor */}
        {isEditor && (
          <button
            onClick={toggleSafeZone}
            title={safeZoneEnabled ? 'Tắt vùng an toàn 9:16' : 'Bật vùng an toàn 9:16 (TikTok/Reels)'}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all hover-lift ${
              safeZoneEnabled
                ? 'bg-[#22D3EE]/15 border-[#22D3EE]/50 text-[#22D3EE]'
                : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            {safeZoneEnabled ? <Eye className="w-3.5 h-3.5 text-[#22D3EE]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{t.safeZone}</span>
          </button>
        )}

        {/* 1. NÚT "VN" DROPDOWN: Chuyển đổi ngôn ngữ VN/EN tức thì */}
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-[#E5E7EB] border border-[#1F2937] transition-all hover-lift"
            title="Đổi ngôn ngữ toàn app"
          >
            <Globe className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>{language}</span>
            <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
          </button>

          {langDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-36 bg-[#111827] border border-[#1F2937] rounded-xl shadow-2xl py-1 text-xs text-[#E5E7EB] z-50 animate-in fade-in"
              onMouseLeave={() => setLangDropdownOpen(false)}
            >
              <button
                onClick={() => {
                  setLanguage('VN');
                  setLangDropdownOpen(false);
                  showToast('Đã đổi ngôn ngữ sang Tiếng Việt (VN)', 'success');
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#22D3EE]/10 hover:text-[#22D3EE] ${
                  language === 'VN' ? 'text-[#22D3EE] font-bold' : ''
                }`}
              >
                <span>Tiếng Việt</span>
                <span className="text-[10px] text-[#9CA3AF]">VN</span>
              </button>
              <button
                onClick={() => {
                  setLanguage('EN');
                  setLangDropdownOpen(false);
                  showToast('Language changed to English (EN)', 'success');
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#22D3EE]/10 hover:text-[#22D3EE] ${
                  language === 'EN' ? 'text-[#22D3EE] font-bold' : ''
                }`}
              >
                <span>English</span>
                <span className="text-[10px] text-[#9CA3AF]">EN</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. CHUÔNG THÔNG BÁO (NOTIFICATION BELL WITH DRAWER) */}
        <div className="relative">
          <button
            onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
            className="relative p-2 rounded-xl bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB] transition-all hover-lift"
            title="Thông báo hệ thống"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Drawer Popover */}
          {notifDrawerOpen && (
            <div
              className="absolute right-0 mt-2 w-80 bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl p-3 text-xs text-[#E5E7EB] z-50 animate-in fade-in"
              onMouseLeave={() => setNotifDrawerOpen(false)}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1F2937]">
                <span className="font-bold text-white text-xs">Thông báo</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      markAllNotificationsAsRead();
                      showToast('Đã đánh dấu đã đọc tất cả', 'info');
                    }}
                    className="flex items-center gap-1 text-[10px] text-[#22D3EE] hover:underline font-semibold"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Đánh dấu đã đọc</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-colors ${
                      n.read
                        ? 'bg-[#0B0F19]/60 border-[#1F2937] text-[#9CA3AF]'
                        : 'bg-[#111827] border-[#22D3EE]/40 text-[#E5E7EB]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{n.title}</span>
                      <span className="text-[9px] text-[#9CA3AF]">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. BÁNH RĂNG SETTINGS */}
        <button
          onClick={() => openModal('settings')}
          className="p-2 rounded-xl bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB] transition-all hover-lift"
          title="Cài đặt hệ thống (Settings)"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Pro Pill: Gradient tím → hồng (#7C3AED → #EC4899) */}
        <button
          onClick={() => openModal('pro')}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:opacity-95 text-white shadow-md shadow-pink-500/20 transition-all hover-lift"
        >
          <Crown className="w-3.5 h-3.5 text-amber-300" />
          <span>{isPro ? 'PRO VIP' : t.proBadge}</span>
        </button>

        {/* Share Button (Editor only) */}
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
          className="flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#22D3EE] to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover-lift active:scale-95"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t.export}</span>
        </button>

        {/* 4. BA CHẤM TRÒN BÊN PHẢI (Trang trí cửa sổ Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 ml-1 pl-2 border-l border-[#1F2937] text-[#9CA3AF]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1F2937] hover:bg-slate-600 transition-colors" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#1F2937] hover:bg-slate-600 transition-colors" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#1F2937] hover:bg-slate-600 transition-colors" />
        </div>
      </div>
    </header>
  );
};
