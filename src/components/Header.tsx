import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { db } from '../db';
import { APP_VERSION, APP_NAME } from '../constants/version';
import { markCleanExit } from '../utils/crashRecovery';
import { packageProjectForExport, verifyProjectDependencies } from '../utils/extensionRegistryManager';
import {
  Menu as MenuIcon,
  Crown,
  Share2,
  Download,
  ChevronDown,
  Globe,
  Eye,
  EyeOff,
  Bell,
  Settings,
  MessageSquarePlus,
  CheckCheck,
  Sparkles,
  Columns3,
  Keyboard,
  Minus,
  Square,
  X,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  FolderOpen,
  FilePlus,
  Save,
  Check,
  Flame,
  BookmarkPlus,
  Upload,
  Gem,
  HelpCircle,
  Info,
  Activity,
  Maximize2,
  History,
  WifiOff
} from 'lucide-react';

interface HeaderProps {
  isEditor?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isEditor = false }) => {
  const navigate = useNavigate();
  const {
    language,
    setLanguage,
    safeZoneEnabled,
    toggleSafeZone,
    openModal,
    projectTitle,
    setProjectTitle,
    currentProjectId,
    setCurrentProjectId,
    clips,
    duration,
    showToast,
    toggleSidebar,
    isPro,
    notifications,
    addNotification,
    markAllNotificationsAsRead,
    autosaveStatus,
    setAutosaveStatus,
    isOffline,
    panelTopHeight,
    panelLeftWidth,
    panelRightWidth,
    showDetails,
    showTimeline,
    layoutPreset,
    setLayoutPreset,
    toggleShowDetails,
    toggleShowTimeline,
    resetLayout,
    undo,
    redo,
    undoStack,
    redoStack,
    cutClip,
    copyClip,
    pasteClip,
    selectAllClips,
    deselectAllClips,
    selectedClipId,
    duplicateClip
  } = useEditorStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState<'file' | 'edit' | 'view' | 'help'>('file');
  const [layoutDropdownOpen, setLayoutDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  // Inline Rename State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(projectTitle);

  const importFileRef = useRef<HTMLInputElement>(null);
  const t = translations[language];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Navigate to Home immediately & autosave project without blocking popup
  const handleHomeNavigation = async () => {
    if (isEditor && currentProjectId) {
      try {
        setAutosaveStatus('saving');
        await db.projects.update(currentProjectId, {
          title: projectTitle,
          name: projectTitle,
          duration,
          updatedAt: Date.now(),
          tracksData: { clips }
        });
        markCleanExit(currentProjectId);
        setAutosaveStatus('saved');
      } catch (err) {
        console.warn('Autosave before navigating home error:', err);
      }
    }
    navigate('/');
  };

  // M9: Reactive Extension Events to Notification Bell
  useEffect(() => {
    const handleInstalled = (e: any) => {
      const pkg = e.detail?.pkg;
      if (pkg) {
        addNotification({
          id: `notif-inst-${Date.now()}`,
          title: `Đã cài đặt: ${pkg.name}`,
          desc: `Gói "${pkg.name}" (v${pkg.version || '1.0.0'}) đã được cài đặt và sẵn sàng dùng offline.`,
          time: 'Vừa xong',
          read: false,
          type: 'install',
        });
      }
    };

    const handleRevoked = (e: any) => {
      const assets = e.detail?.revokedAssets || [];
      for (const rev of assets) {
        addNotification({
          id: `notif-rev-${Date.now()}-${rev.id}`,
          title: `⚠️ Thu hồi khẩn cấp: ${rev.name}`,
          desc: `Gói "${rev.name}" đã bị thu hồi (${rev.revokeReason || 'Lỗi an toàn GPU'}). Timeline đã chuyển sang Ghost an toàn.`,
          time: 'Vừa xong',
          read: false,
          type: 'revocation',
        });
      }
    };

    const handleUpdated = (e: any) => {
      const info = e.detail;
      if (info) {
        addNotification({
          id: `notif-upd-${Date.now()}`,
          title: `Có bản cập nhật: ${info.name || 'Gói mở rộng'}`,
          desc: `Đã có bản cập nhật mới v${info.version || ''}. Mở Kho tài nguyên để cập nhật.`,
          time: 'Vừa xong',
          read: false,
          type: 'update',
        });
      }
    };

    window.addEventListener('clipforge_extension_installed', handleInstalled);
    window.addEventListener('clipforge_extension_revoked', handleRevoked);
    window.addEventListener('clipforge_extension_updated', handleUpdated);

    return () => {
      window.removeEventListener('clipforge_extension_installed', handleInstalled);
      window.removeEventListener('clipforge_extension_revoked', handleRevoked);
      window.removeEventListener('clipforge_extension_updated', handleUpdated);
    };
  }, [addNotification]);

  // Manual Save project to IndexedDB
  const handleManualSave = async () => {
    setMenuOpen(false);
    if (currentProjectId) {
      try {
        await db.projects.update(currentProjectId, {
          title: projectTitle,
          name: projectTitle,
          updatedAt: Date.now(),
          tracksData: { clips }
        });
        showToast('Đã lưu dự án vào Dexie IndexedDB', 'success');
      } catch (err: any) {
        showToast(`Lỗi lưu dự án: ${err.message}`, 'error');
      }
    } else {
      showToast('Dự án được lưu tự động liên tục', 'info');
    }
  };

  // Save current project as a template
  const handleSaveAsTemplate = async () => {
    setMenuOpen(false);
    try {
      const tplId = 'proj-tpl-' + Date.now();
      const tplTitle = `[Template] ${projectTitle}`;
      const thumb = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80';
      await db.projects.add({
        id: tplId,
        title: tplTitle,
        name: tplTitle,
        width: 1080,
        height: 1920,
        fps: 30,
        duration,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
        thumbnail: thumb,
        tracksData: { clips }
      });

      // Synchronize with user custom templates in localStorage
      try {
        const raw = localStorage.getItem('clipforge_custom_templates');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift({
          id: tplId,
          cat: 'trending',
          name: projectTitle || 'Mẫu của bạn',
          dur: duration || 15,
          slots: Math.max(1, clips.filter((c) => c.type === 'video' || c.type === 'image').length || 3),
          tag: 'Tùy chỉnh ⭐',
          img: thumb,
          desc: 'Mẫu thiết kế lưu từ dự án của bạn'
        });
        localStorage.setItem('clipforge_custom_templates', JSON.stringify(list));
      } catch {
        // localStorage fallback
      }

      showToast(`Đã lưu "${projectTitle}" làm Template mới!`, 'success');
    } catch (err: any) {
      showToast(`Lỗi lưu template: ${err.message}`, 'error');
    }
  };

  // Export current project as .capproj JSON file (embeds redistributable specs per M4)
  const handleExportCapproj = async () => {
    setMenuOpen(false);
    try {
      let projData: any = null;
      if (currentProjectId) {
        projData = await db.projects.get(currentProjectId);
      }
      const rawData = projData || {
        id: currentProjectId || 'proj-' + Date.now(),
        title: projectTitle,
        duration,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tracksData: { clips }
      };
      // Package project with embedded declarative specs for redistributable items
      const exportData = await packageProjectForExport(rawData);
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(projectTitle || 'Project').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.capproj`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất tệp dự án .capproj kèm tài nguyên mở rộng!', 'success');
    } catch (err: any) {
      showToast(`Lỗi xuất file: ${err.message}`, 'error');
    }
  };

  // Import .capproj JSON file (verifies extension dependencies per M4)
  const handleImportCapproj = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMenuOpen(false);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const newId = 'proj-' + Date.now();
      const title = data.title || data.name || 'Imported Project';

      // Verify dependencies for any missing external packages
      const depCheck = await verifyProjectDependencies(data);
      if (!depCheck.complete) {
        showToast(
          `Dự án chứa ${depCheck.missingAssets.length} hiệu ứng chưa được cài đặt trong kho. Đang giữ khung hình placeholder (Ghost Reference).`,
          'info'
        );
      }

      await db.projects.add({
        ...data,
        id: newId,
        title,
        name: title,
        updatedAt: Date.now(),
        createdAt: data.createdAt || Date.now()
      });
      showToast(`Đã nhập dự án: "${title}"`, 'success');
      setCurrentProjectId(newId);
      setProjectTitle(title);
      navigate(`/editor/${newId}`);
    } catch (err: any) {
      showToast(`Tệp .capproj không hợp lệ: ${err.message}`, 'error');
    }
  };

  // Fullscreen toggle for window control
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header
      className={`${
        isEditor ? 'h-[44px] bg-[#1F1F1F] border-[#333333] px-3 font-sans' : 'h-14 bg-[#0E1320] border-[#1F2937] px-5'
      } border-b flex items-center justify-between select-none z-30 shrink-0 text-xs`}
    >
      {/* Hidden file input for import .capproj */}
      <input
        type="file"
        ref={importFileRef}
        accept=".capproj,.json"
        onChange={handleImportCapproj}
        className="hidden"
      />

      {/* LEFT: Logo "CapCut" + Menu ▾ Dropdown */}
      <div className="flex items-center gap-2.5">
        {!isEditor && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-xl bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB] hover-lift md:hidden"
            title="Thu gọn / Mở sidebar"
          >
            <MenuIcon className="w-4 h-4" />
          </button>
        )}

        {/* Logo: click autosaves and navigates to Home immediately without blocking popup */}
        <Logo size={isEditor ? 'sm' : 'md'} onClick={isEditor ? handleHomeNavigation : undefined} />

        {/* Menu ▾ Dropdown for Editor */}
        {isEditor && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border transition-all ${
                menuOpen
                  ? 'bg-[#1FC8DB]/20 border-[#1FC8DB]/40 text-[#1FC8DB]'
                  : 'bg-[#2E2E2E] hover:bg-[#262626] border-[#333333] text-[#E6E6E6] hover:text-[#1FC8DB]'
              }`}
            >
              <span>{t.menu}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8A8A8A]" />
            </button>

            {menuOpen && (
              <div
                className="absolute left-0 mt-2 w-72 bg-[#1F1F1F] border border-[#333333] rounded-md shadow-2xl z-50 animate-in fade-in flex flex-col overflow-hidden text-xs text-[#E6E6E6]"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {/* Menu Category Tabs */}
                <div className="grid grid-cols-4 bg-[#262626] border-b border-[#333333] p-1 gap-1 text-[11px] font-bold">
                  {(['file', 'edit', 'view', 'help'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveMenuTab(tab)}
                      className={`py-1 rounded text-center uppercase tracking-wider transition-colors ${
                        activeMenuTab === tab
                          ? 'bg-[#1FC8DB] text-slate-950 shadow-sm'
                          : 'text-[#8A8A8A] hover:text-white hover:bg-[#2E2E2E]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Submenu: FILE */}
                {activeMenuTab === 'file' && (
                  <div className="flex flex-col py-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openModal('newProject');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <FilePlus className="w-3.5 h-3.5 text-[#1FC8DB]" /> Dự án mới (New project)
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openModal('recentProjects');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> Dự án gần đây (Recent)
                      </span>
                    </button>
                    <button
                      onClick={handleManualSave}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Save className="w-3.5 h-3.5 text-emerald-400" /> Lưu dự án (Save)
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">Ctrl+S</span>
                    </button>
                    <button
                      onClick={handleSaveAsTemplate}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" /> Lưu làm mẫu (Save as template)
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openModal('versionHistory');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-[#1FC8DB]" /> Lịch sử phiên bản (Version history)
                      </span>
                    </button>
                    <div className="border-t border-[#333333] my-1" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        importFileRef.current?.click();
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-sky-400" /> Nhập dự án (.capproj)
                      </span>
                    </button>
                    <button
                      onClick={handleExportCapproj}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-teal-400" /> Xuất dự án (.capproj)
                      </span>
                    </button>
                    <div className="border-t border-[#333333] my-1" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleHomeNavigation();
                      }}
                      className="px-3.5 py-2 hover:bg-rose-950/40 text-rose-300 flex items-center justify-between text-left"
                    >
                      <span>Quay về trang chủ (Back to home)</span>
                    </button>
                  </div>
                )}

                {/* Submenu: EDIT */}
                {activeMenuTab === 'edit' && (
                  <div className="flex flex-col py-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        undo();
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Undo2 className="w-3.5 h-3.5" /> Hoàn tác (Undo)
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">Ctrl+Z</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        redo();
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Redo2 className="w-3.5 h-3.5" /> Làm lại (Redo)
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">Ctrl+Shift+Z</span>
                    </button>
                    <div className="border-t border-[#333333] my-1" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        cutClip();
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-amber-400" /> Cắt (Cut)
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">Ctrl+X</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        copyClip();
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Copy className="w-3.5 h-3.5 text-blue-400" /> Sao chép (Copy)
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">Ctrl+C</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        pasteClip();
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" /> Dán (Paste)
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">Ctrl+V</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        if (selectedClipId) duplicateClip(selectedClipId);
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Nhân bản (Duplicate)
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">Ctrl+D</span>
                    </button>
                    <div className="border-t border-[#333333] my-1" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        selectAllClips();
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span>Chọn tất cả (Select all)</span>
                      <span className="text-[10px] text-[#8A8A8A]">Ctrl+A</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        deselectAllClips();
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span>Bỏ chọn (Deselect)</span>
                      <span className="text-[10px] text-[#8A8A8A]">Esc</span>
                    </button>
                  </div>
                )}

                {/* Submenu: VIEW */}
                {activeMenuTab === 'view' && (
                  <div className="flex flex-col py-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        resetLayout();
                        showToast('Đã khôi phục bố cục mặc định', 'info');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span>Đặt lại bố cục (Reset layout)</span>
                    </button>
                    <button
                      onClick={() => {
                        toggleShowDetails();
                        showToast(showDetails ? 'Đã ẩn panel Details' : 'Đã hiện panel Details');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span>{showDetails ? 'Ẩn bảng Details' : 'Hiện bảng Details'}</span>
                      {showDetails && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                    </button>
                    <button
                      onClick={() => {
                        toggleShowTimeline();
                        showToast(showTimeline ? 'Đã ẩn Timeline' : 'Đã hiện Timeline');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span>{showTimeline ? 'Ẩn Timeline' : 'Hiện Timeline'}</span>
                      {showTimeline && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                    </button>
                    <div className="border-t border-[#333333] my-1" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openModal('settings');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-[#8A8A8A]" /> Cài đặt hệ thống (Settings)
                      </span>
                    </button>
                  </div>
                )}

                {/* Submenu: HELP */}
                {activeMenuTab === 'help' && (
                  <div className="flex flex-col py-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/help');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-[#1FC8DB]" /> Trợ giúp & Khắc phục sự cố (Help)
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openModal('systemCheck');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" /> Kiểm tra hệ thống & WebCodecs
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openModal('shortcuts');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Keyboard className="w-3.5 h-3.5 text-[#1FC8DB]" /> Phím tắt (Keyboard shortcuts)
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openModal('about');
                      }}
                      className="px-3.5 py-2 hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-sky-400" /> Giới thiệu ClipForge Desktop Web
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Direct Undo / Redo buttons with disabled tooltips */}
        {isEditor && (
          <div className="flex items-center gap-0.5 border-l border-[#333333] pl-2 ml-1">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              title={undoStack.length === 0 ? 'Không có thao tác nào để hoàn tác (Ctrl+Z)' : 'Hoàn tác (Undo - Ctrl+Z)'}
              className={`p-1.5 rounded-md transition-colors ${
                undoStack.length === 0
                  ? 'text-[#555555] cursor-not-allowed opacity-40'
                  : 'text-[#8A8A8A] hover:text-[#1FC8DB] hover:bg-[#262626]'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              title={
                redoStack.length === 0
                  ? 'Không có thao tác nào để làm lại (Ctrl+Shift+Z / Ctrl+Y)'
                  : 'Làm lại (Redo - Ctrl+Shift+Z)'
              }
              className={`p-1.5 rounded-md transition-colors ${
                redoStack.length === 0
                  ? 'text-[#555555] cursor-not-allowed opacity-40'
                  : 'text-[#8A8A8A] hover:text-[#1FC8DB] hover:bg-[#262626]'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* CapCut Auto-saved green status badge */}
        {isEditor && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#888] font-mono ml-1.5 pl-2 border-l border-[#333333] hidden md:flex select-none">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autosaveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span>{autosaveStatus === 'saving' ? 'Saving…' : 'Auto saved'}</span>
          </div>
        )}
      </div>

      {/* CENTER: Project Name Inline Rename + Saved/Saving Status */}
      {isEditor ? (
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={() => {
                if (tempTitle.trim()) {
                  setProjectTitle(tempTitle.trim());
                  if (currentProjectId) {
                    db.projects
                      .update(currentProjectId, { title: tempTitle.trim(), name: tempTitle.trim() })
                      .catch(() => {});
                  }
                }
                setIsEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (tempTitle.trim()) {
                    setProjectTitle(tempTitle.trim());
                    if (currentProjectId) {
                      db.projects
                        .update(currentProjectId, { title: tempTitle.trim(), name: tempTitle.trim() })
                        .catch(() => {});
                    }
                    showToast('Đã đổi tên dự án!', 'success');
                  }
                  setIsEditingTitle(false);
                } else if (e.key === 'Escape') {
                  setTempTitle(projectTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="bg-[#2E2E2E] border border-[#1FC8DB] text-[#E6E6E6] text-xs px-2.5 py-0.5 rounded-md outline-none font-medium text-center w-40"
            />
          ) : (
            <span
              onClick={() => {
                setTempTitle(projectTitle);
                setIsEditingTitle(true);
              }}
              title="Bấm để đổi tên dự án (Enter lưu, Esc hủy)"
              className="text-xs font-semibold text-[#E6E6E6] hover:text-[#1FC8DB] cursor-pointer px-2 py-0.5 rounded-md hover:bg-[#262626] transition-all truncate max-w-[200px]"
            >
              {projectTitle}
            </span>
          )}

          {/* Aspect ratio 9:16 tag */}
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#262626] text-[#8A8A8A] border border-[#333333] font-mono">
            9:16
          </span>

          {/* Saved / Saving Status Indicator */}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-md border font-medium flex items-center gap-1.5 transition-all ${
              autosaveStatus === 'saving'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-[#262626] text-[#8A8A8A] border-[#333333]'
            }`}
            title="Dự án được lưu tự động mỗi 3 giây vào IndexedDB"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autosaveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-[#1FC8DB]'
              }`}
            />
            <span>{autosaveStatus === 'saving' ? 'Saving…' : 'Saved'}</span>
          </span>

          {/* Offline Status Badge */}
          {isOffline && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium flex items-center gap-1 select-none"
              title="Đang ở chế độ Ngoại tuyến. Mọi thao tác dựng và xuất video vẫn hoạt động bình thường trên máy của bạn."
            >
              <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Offline</span>
            </span>
          )}
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-2 text-xs text-[#9CA3AF]">
          <span className="font-semibold text-[#E5E7EB]">{APP_NAME} v{APP_VERSION}</span>
          <span>•</span>
          <span className="text-[#1FC8DB] font-medium">9:16 Vertical Video Studio</span>
        </div>
      )}

      {/* RIGHT: Layout, Shortcuts, Pro, Share, Export, Window controls */}
      <div className="flex items-center gap-2">
        {/* Layout Presets Dropdown */}
        {isEditor && (
          <div className="relative">
            <button
              onClick={() => setLayoutDropdownOpen(!layoutDropdownOpen)}
              title="Tùy chọn bố cục làm việc (Layout)"
              className={`p-1.5 rounded-md border transition-all ${
                layoutDropdownOpen
                  ? 'bg-[#1FC8DB]/20 border-[#1FC8DB]/40 text-[#1FC8DB]'
                  : 'bg-[#2E2E2E] hover:bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-[#E6E6E6]'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
            </button>

            {layoutDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-[#1F1F1F] border border-[#333333] rounded-md shadow-2xl py-1 text-xs text-[#E6E6E6] z-50 animate-in fade-in flex flex-col"
                onMouseLeave={() => setLayoutDropdownOpen(false)}
              >
                <span className="px-3 py-1 text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">
                  Bố cục giao diện (Layout)
                </span>
                {[
                  { id: 'default', label: 'Default (Mặc định)' },
                  { id: 'media-focus', label: 'Media focus (Thư viện)' },
                  { id: 'timeline-focus', label: 'Timeline focus (Dựng phim)' },
                  { id: 'large-player', label: 'Large player (Canvas lớn)' },
                  { id: 'hide-details', label: 'Hide Details (Ẩn thuộc tính)' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setLayoutPreset(item.id as any);
                      setLayoutDropdownOpen(false);
                      showToast(`Đã chuyển bố cục: ${item.label}`, 'info');
                    }}
                    className={`px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] ${
                      layoutPreset === item.id ? 'text-[#1FC8DB] font-bold bg-[#1FC8DB]/5' : ''
                    }`}
                  >
                    <span>{item.label}</span>
                    {layoutPreset === item.id && <Check className="w-3 h-3 text-[#1FC8DB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Keyboard Shortcuts Icon Button */}
        {isEditor && (
          <button
            onClick={() => openModal('shortcuts')}
            title="Xem phím tắt (Keyboard shortcuts)"
            className="p-1.5 rounded-md bg-[#2E2E2E] hover:bg-[#262626] border border-[#333333] text-[#8A8A8A] hover:text-[#E6E6E6] transition-all"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Safe Zone Toggle in Editor */}
        {isEditor && (
          <button
            onClick={toggleSafeZone}
            title={safeZoneEnabled ? 'Tắt vùng an toàn 9:16' : 'Bật vùng an toàn 9:16 (TikTok/Reels)'}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border transition-all ${
              safeZoneEnabled
                ? 'bg-[#1FC8DB]/20 border-[#1FC8DB]/40 text-[#1FC8DB]'
                : 'bg-[#2E2E2E] border-[#333333] text-[#8A8A8A] hover:text-[#E6E6E6]'
            }`}
          >
            {safeZoneEnabled ? <Eye className="w-3.5 h-3.5 text-[#1FC8DB]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{t.safeZone}</span>
          </button>
        )}

        {/* Language VN/EN */}
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md border transition-all ${
              isEditor
                ? 'bg-[#2E2E2E] hover:bg-[#262626] text-[#E6E6E6] border-[#333333]'
                : 'bg-[#111827] hover:bg-[#1F2937] text-[#E5E7EB] border-[#1F2937]'
            }`}
            title="Đổi ngôn ngữ toàn app"
          >
            <Globe className="w-3.5 h-3.5 text-[#1FC8DB]" />
            <span>{language}</span>
            <ChevronDown className="w-3 h-3 text-[#8A8A8A]" />
          </button>

          {langDropdownOpen && (
            <div
              className={`absolute right-0 mt-2 w-32 ${
                isEditor ? 'bg-[#1F1F1F] border-[#333333]' : 'bg-[#111827] border-[#1F2937]'
              } border rounded-md shadow-2xl py-1 text-xs text-[#E6E6E6] z-50 animate-in fade-in`}
              onMouseLeave={() => setLangDropdownOpen(false)}
            >
              <button
                onClick={() => {
                  setLanguage('VN');
                  setLangDropdownOpen(false);
                  showToast('Đã đổi ngôn ngữ sang Tiếng Việt (VN)', 'success');
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] ${
                  language === 'VN' ? 'text-[#1FC8DB] font-bold' : ''
                }`}
              >
                <span>Tiếng Việt</span>
                <span className="text-[10px] text-[#8A8A8A]">VN</span>
              </button>
              <button
                onClick={() => {
                  setLanguage('EN');
                  setLangDropdownOpen(false);
                  showToast('Language changed to English (EN)', 'success');
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#1FC8DB]/10 hover:text-[#1FC8DB] ${
                  language === 'EN' ? 'text-[#1FC8DB] font-bold' : ''
                }`}
              >
                <span>English</span>
                <span className="text-[10px] text-[#8A8A8A]">EN</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
            className={`relative p-1.5 rounded-md border transition-all ${
              isEditor
                ? 'bg-[#2E2E2E] hover:bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-[#E6E6E6]'
                : 'bg-[#111827] hover:bg-[#1F2937] border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
            title="Thông báo hệ thống"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {notifDrawerOpen && (
            <div
              className={`absolute right-0 mt-2 w-80 ${
                isEditor ? 'bg-[#1F1F1F] border-[#333333]' : 'bg-[#111827] border-[#1F2937]'
              } border rounded-md shadow-2xl p-3 text-xs text-[#E6E6E6] z-50 animate-in fade-in`}
              onMouseLeave={() => setNotifDrawerOpen(false)}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#333333]">
                <span className="font-bold text-white text-xs">Thông báo</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      markAllNotificationsAsRead();
                      showToast('Đã đánh dấu đã đọc tất cả', 'info');
                    }}
                    className="flex items-center gap-1 text-[10px] text-[#1FC8DB] hover:underline font-semibold"
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
                    className={`p-2 rounded-md border text-left flex flex-col gap-1 transition-colors ${
                      n.read
                        ? 'bg-[#141414] border-[#333333] text-[#8A8A8A]'
                        : 'bg-[#262626] border-[#1FC8DB]/40 text-[#E6E6E6]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{n.title}</span>
                      <span className="text-[9px] text-[#8A8A8A]">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#8A8A8A] leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Closed Beta Guided Tasks Button */}
        <button
          onClick={() => openModal('betaTasks')}
          aria-label="Kịch bản thử nghiệm Beta kín (Closed Beta Tasks)"
          className={`px-2 py-1.5 rounded-md border text-[11px] font-bold flex items-center gap-1 transition-all ${
            isEditor
              ? 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/40 text-amber-300'
              : 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
          }`}
          title="Kịch bản 5 nhiệm vụ thử nghiệm Beta (Closed Beta Tasks)"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden md:inline">Nhiệm vụ Beta</span>
        </button>

        {/* Feedback / Bug Report button */}
        <button
          onClick={() => openModal('feedback')}
          aria-label="Báo lỗi hoặc Góp ý phát triển (Feedback & Bug Report)"
          className={`p-1.5 rounded-md border transition-all ${
            isEditor
              ? 'bg-[#2E2E2E] hover:bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-[#1FC8DB]'
              : 'bg-[#111827] hover:bg-[#1F2937] border-[#1F2937] text-[#9CA3AF] hover:text-[#22D3EE]'
          }`}
          title="Báo lỗi / Góp ý tính năng (Feedback)"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
        </button>

        {/* Settings button */}
        <button
          onClick={() => openModal('settings')}
          aria-label="Cài đặt hệ thống (Settings)"
          className={`p-1.5 rounded-md border transition-all ${
            isEditor
              ? 'bg-[#2E2E2E] hover:bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-[#E6E6E6]'
              : 'bg-[#111827] hover:bg-[#1F2937] border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB]'
          }`}
          title="Cài đặt hệ thống (Settings)"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Huy hiệu PRO VIP: Khẳng định đặc quyền tài khoản mức hạn cao nhất */}
        <button
          onClick={() => {
            showToast('👑 Tài khoản PRO VIP: Đang hoạt động ở mức hạn cao nhất (4K 60fps & AI Unlimited)!', 'success');
          }}
          className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md transition-all shadow-sm bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/25 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 active:scale-95 cursor-pointer"
          title="Tài khoản PRO VIP vĩnh viễn (Mức hạn cao nhất)"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
          <span>PRO VIP</span>
        </button>

        {/* Nút Share: Mở Share modal */}
        {isEditor && (
          <button
            onClick={() => openModal('share')}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#2E2E2E] hover:bg-[#262626] text-[#E6E6E6] border border-[#333333] hover:border-[#1FC8DB] transition-all"
            title="Chia sẻ dự án (.capproj, link, Web Share)"
          >
            <Share2 className="w-3.5 h-3.5 text-[#1FC8DB]" />
            <span className="hidden sm:inline">{t.share}</span>
          </button>
        )}

        {/* Nút Export (Cyan) */}
        <button
          onClick={() => openModal('export')}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 transition-all shadow-sm active:scale-95"
          title="Xuất video hoàn tất (MP4 / WebM)"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t.export}</span>
        </button>

        {/* Cụm cửa sổ (– ☐ ✕) */}
        {isEditor && (
          <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-[#333333]">
            <button
              onClick={() => {
                toggleShowTimeline();
                showToast(showTimeline ? 'Đã thu gọn Timeline để mở rộng không gian xem' : 'Đã hiển thị lại Timeline', 'info');
              }}
              className="p-1 rounded text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626] transition-colors"
              title={showTimeline ? 'Thu gọn Timeline (–)' : 'Mở rộng Timeline (–)'}
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded text-[#8A8A8A] hover:text-[#E6E6E6] hover:bg-[#262626] transition-colors"
              title="Phóng to toàn màn hình (☐)"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleHomeNavigation}
              className="p-1 rounded text-[#8A8A8A] hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
              title="Đóng về trang chủ (✕)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
