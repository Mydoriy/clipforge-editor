import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import {
  Home,
  LayoutTemplate,
  Video,
  Palette,
  Sparkles,
  TrendingUp,
  FolderKanban,
  Cloud,
  Crown,
  User,
  LogOut,
  ChevronDown,
  LogIn,
  Shield
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    language,
    openModal,
    user,
    signOut,
    sidebarOpen,
    showToast
  } = useEditorStore();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const t = translations[language];

  if (!sidebarOpen) return null;

  return (
    <aside className="w-[274px] bg-[#0E1320] border-r border-[#1F2937] flex flex-col justify-between p-4 select-none shrink-0 h-full overflow-y-auto transition-all duration-200">
      {/* Top Section */}
      <div className="flex flex-col gap-4">
        {/* 1. THẺ TÀI KHOẢN */}
        {user ? (
          /* ĐÃ ĐĂNG NHẬP */
          <div className="relative">
            <div
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="p-3 rounded-2xl bg-[#111827] border border-[#1F2937] hover:border-[#22D3EE]/50 flex items-center justify-between cursor-pointer hover-lift shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 truncate">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-[#22D3EE]/40"
                />
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#E5E7EB] truncate">{user.name}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                      <Crown className="w-2.5 h-2.5" />
                      PRO VIP
                    </span>
                  </div>
                  <span className="text-[10px] text-[#9CA3AF] truncate">{user.email}</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            </div>

            {/* Account Menu Dropdown */}
            {accountMenuOpen && (
              <div
                className="absolute left-0 right-0 mt-2 bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl py-1.5 text-xs text-[#E5E7EB] z-50 animate-in fade-in"
                onMouseLeave={() => setAccountMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setAccountMenuOpen(false);
                    openModal('pro');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-amber-500/10 hover:text-amber-300 flex items-center gap-2"
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Đặc quyền PRO VIP (Mức cao nhất)</span>
                </button>
                <div className="border-t border-[#1F2937] my-1" />
                <button
                  onClick={() => {
                    setAccountMenuOpen(false);
                    signOut();
                    showToast('Đã đăng xuất tài khoản. Quay về chế độ Khách.', 'info');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-950/50 hover:text-rose-300 flex items-center gap-2 text-rose-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất (Sign out)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* CHƯA ĐĂNG NHẬP (GUEST MODE) */
          <div className="p-3 rounded-2xl bg-[#111827] border border-[#1F2937] flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0E1320] flex items-center justify-center border border-[#1F2937] text-[#9CA3AF]">
                  <User className="w-4 h-4 text-[#9CA3AF]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#E5E7EB]">{t.guestMode}</span>
                  <span className="text-[10px] text-[#9CA3AF]">Lưu trên máy (IndexedDB)</span>
                </div>
              </div>

              <button
                onClick={() => openModal('auth')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#0E1320] hover:bg-[#1F2937] text-[#22D3EE] border border-[#1F2937] text-[11px] font-bold hover-lift transition-all"
              >
                <LogIn className="w-3 h-3" />
                <span>{t.signIn}</span>
              </button>
            </div>

            {/* Huy hiệu PRO VIP kích hoạt sẵn ở mức hạn cao nhất */}
            <div className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-1.5 font-bold">
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span>PRO VIP (Mức cao nhất)</span>
              </div>
              <span className="text-[10px] text-amber-400/90 font-semibold">Đã mở khóa</span>
            </div>
          </div>
        )}

        {/* 2. MENU ĐIỀU HƯỚNG */}
        <nav className="flex flex-col gap-1">
          {/* Home */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-[#22D3EE] border border-[#1F2937] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <Home className="w-4 h-4" />
            <span>{t.navHome}</span>
          </NavLink>

          {/* Templates */}
          <NavLink
            to="/templates"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-[#22D3EE] border border-[#1F2937] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>{t.navTemplates}</span>
          </NavLink>
        </nav>

        {/* Create with AI Section */}
        <div className="flex flex-col gap-1 pt-3 border-t border-[#1F2937]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]/70 px-3 py-1">
            {t.navCreateWithAi}
          </span>

          <NavLink
            to="/video-studio"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-[#22D3EE] border border-[#1F2937]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <Video className="w-4 h-4 text-sky-400" />
            <span>{t.navVideoStudio}</span>
          </NavLink>

          <NavLink
            to="/design"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-[#22D3EE] border border-[#1F2937]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <Palette className="w-4 h-4 text-purple-400" />
            <span>{t.navDesignStudio}</span>
          </NavLink>
        </div>

        {/* More Tools */}
        <div className="flex flex-col gap-1 pt-3 border-t border-[#1F2937]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]/70 px-3 py-1">
            {t.navMarketingTools}
          </span>

          <NavLink
            to="/ai-tools"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-[#22D3EE] border border-[#1F2937]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>{t.navCreateWithAi}</span>
          </NavLink>

          <NavLink
            to="/marketing"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-[#22D3EE] border border-[#1F2937]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>{t.navMarketingTools}</span>
          </NavLink>
        </div>

        {/* Management */}
        <div className="flex flex-col gap-1 pt-3 border-t border-[#1F2937]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]/70 px-3 py-1">
            {t.navLibrary}
          </span>

          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-[#22D3EE] border border-[#1F2937]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <span>{t.navLibrary}</span>
          </NavLink>

          <button
            type="button"
            onClick={() => openModal('extensionLibrary')}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60 transition-all hover-lift text-left w-full cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{language === 'VN' ? 'Kho hiệu ứng mở rộng' : 'Extension Store'}</span>
          </button>

          <NavLink
            to="/cloud-storage"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-[#22D3EE] border border-[#1F2937]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <Cloud className="w-4 h-4 text-[#22D3EE]" />
            <span>Cloud storage (Supabase)</span>
          </NavLink>

          <NavLink
            to="/privacy"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover-lift ${
                isActive
                  ? 'bg-[#111827] text-emerald-400 border border-[#1F2937]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60'
              }`
            }
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Bảo mật & Quyền riêng tư</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
