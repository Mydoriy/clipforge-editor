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
  const { language, openModal, showToast } = useEditorStore();
  const t = translations[language];

  return (
    <aside className="w-56 bg-[#10131b] border-r border-[#1e2430] flex flex-col justify-between p-3 select-none shrink-0 h-full">
      {/* Top Section */}
      <div className="flex flex-col gap-4">
        {/* User / Guest Profile Card */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300">
              <UserCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">
                {isSupabaseConfigured ? 'Tài khoản Cloud' : t.guestMode}
              </span>
              <span className="text-[10px] text-slate-400">
                {isSupabaseConfigured ? 'Đã liên kết Supabase' : 'Offline • Dexie DB'}
              </span>
            </div>
          </div>

          <button
            onClick={() => openModal('pro')}
            className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
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
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <Home className="w-4 h-4" />
            <span>{t.navHome}</span>
          </NavLink>

          <button
            onClick={() => openModal('templates')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors w-full text-left"
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>{t.navTemplates}</span>
          </button>
        </nav>

        {/* Create with AI Section */}
        <div className="flex flex-col gap-1 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
            {t.navCreateWithAi}
          </span>

          <NavLink
            to="/editor/demo-916-intro"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <Video className="w-4 h-4 text-sky-400" />
            <span>{t.navVideoStudio}</span>
          </NavLink>

          <NavLink
            to="/design"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <Palette className="w-4 h-4 text-purple-400" />
            <span>{t.navDesignStudio}</span>
          </NavLink>
        </div>

        {/* More Tools */}
        <div className="flex flex-col gap-1 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
            {t.navMarketingTools}
          </span>

          <button
            onClick={() => openModal('marketing')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors w-full text-left"
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>{t.navMarketingTools}</span>
          </button>

          <button
            onClick={() => openModal('aiImage')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors w-full text-left"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>{t.quickAiImage}</span>
          </button>
        </div>

        {/* Management */}
        <div className="flex flex-col gap-1 pt-2 border-t border-slate-800/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
            {t.navLibrary}
          </span>

          <button
            onClick={() => openModal('library')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors w-full text-left"
          >
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <span>{t.navLibrary}</span>
          </button>

          <button
            onClick={() => openModal('trash')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors w-full text-left"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>{t.navTrash}</span>
          </button>
        </div>
      </div>

      {/* Bottom Cloud Sync Status */}
      <div className="pt-3 border-t border-slate-800/60">
        <button
          onClick={() => openModal('cloud')}
          className="w-full p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 text-left flex items-center justify-between text-xs text-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-400" />
            <span>{t.navCloudSync}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {isSupabaseConfigured ? 'Sẵn sàng' : 'Tùy chọn'}
          </span>
        </button>
      </div>
    </aside>
  );
};
