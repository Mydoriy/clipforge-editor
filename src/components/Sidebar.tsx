import React from 'react';
import { NavLink } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { isSupabaseConfigured } from '../utils/supabase';
import {
  Home,
  LayoutTemplate,
  Video,
  Palette,
  Sparkles,
  TrendingUp,
  FolderKanban,
  Trash2,
  Cloud,
  Crown,
  UserCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { language, openModal } = useEditorStore();
  const t = translations[language];

  return (
    <aside className="w-[274px] bg-[#0E1320] border-r border-[#1F2937] flex flex-col justify-between p-4 select-none shrink-0 h-full">
      {/* Top Section */}
      <div className="flex flex-col gap-4">
        {/* User / Guest Profile Card */}
        <div className="p-3 rounded-2xl bg-[#111827] border border-[#1F2937] flex flex-col gap-2.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0E1320] flex items-center justify-center border border-[#1F2937] text-[#9CA3AF]">
              <UserCheck className="w-4 h-4 text-[#22D3EE]" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-[#E5E7EB] truncate">
                {isSupabaseConfigured ? 'Tài khoản Cloud' : t.guestMode}
              </span>
              <span className="text-[10px] text-[#9CA3AF]">
                {isSupabaseConfigured ? 'Đã liên kết Supabase' : 'Offline • Dexie DB'}
              </span>
            </div>
          </div>

          <button
            onClick={() => openModal('pro')}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/20 hover-lift transition-all"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>{t.joinPro}</span>
          </button>
        </div>

        {/* Main Nav */}
        <nav className="flex flex-col gap-1">
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

          <button
            onClick={() => openModal('templates')}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60 transition-all hover-lift w-full text-left"
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>{t.navTemplates}</span>
          </button>
        </nav>

        {/* Create with AI Section */}
        <div className="flex flex-col gap-1 pt-3 border-t border-[#1F2937]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]/70 px-3 py-1">
            {t.navCreateWithAi}
          </span>

          <NavLink
            to="/editor/demo-916-intro"
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

          <button
            onClick={() => openModal('marketing')}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60 transition-all hover-lift w-full text-left"
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>{t.navMarketingTools}</span>
          </button>

          <button
            onClick={() => openModal('aiImage')}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60 transition-all hover-lift w-full text-left"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>{t.quickAiImage}</span>
          </button>
        </div>

        {/* Management */}
        <div className="flex flex-col gap-1 pt-3 border-t border-[#1F2937]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]/70 px-3 py-1">
            {t.navLibrary}
          </span>

          <button
            onClick={() => openModal('library')}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60 transition-all hover-lift w-full text-left"
          >
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <span>{t.navLibrary}</span>
          </button>

          <button
            onClick={() => openModal('trash')}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#111827]/60 transition-all hover-lift w-full text-left"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>{t.navTrash}</span>
          </button>
        </div>
      </div>

      {/* Bottom Cloud Sync Status */}
      <div className="pt-3 border-t border-[#1F2937]">
        <button
          onClick={() => openModal('cloud')}
          className="w-full p-2.5 rounded-xl bg-[#111827] hover:bg-[#111827]/80 border border-[#1F2937] text-left flex items-center justify-between text-xs text-[#E5E7EB] transition-all hover-lift"
        >
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#22D3EE]" />
            <span>{t.navCloudSync}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#0E1320] text-[#9CA3AF] border border-[#1F2937]">
            {isSupabaseConfigured ? 'Sẵn sàng' : 'Tùy chọn'}
          </span>
        </button>
      </div>
    </aside>
  );
};
