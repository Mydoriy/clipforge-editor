import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { db, seedDemoProjects, type ProjectEntity } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Sparkles,
  Image as ImageIcon,
  Clock,
  Wand2,
  Sliders,
  Search,
  Trash2,
  RefreshCw,
  Video,
  Palette,
  Megaphone,
  Scissors,
  Film,
  ArrowRight,
  LayoutGrid,
  List,
  MoreVertical,
  Copy,
  Edit2,
  Download,
  FolderOpen,
  Calendar,
  Cloud,
  Check
} from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const {
    language,
    openModal,
    showToast,
    setCurrentProjectId,
    setProjectTitle,
    setEditPilotOpen,
    addChatMessage,
    user
  } = useEditorStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('clipforge_view_mode') as 'grid' | 'list') || 'grid';
  });
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  const t = translations[language];

  // Seed initial demo data in IndexedDB
  useEffect(() => {
    seedDemoProjects().then(() => {
      setTimeout(() => setIsLoading(false), 300);
    });
  }, []);

  // Save viewMode preference to localStorage
  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('clipforge_view_mode', mode);
  };

  // Close three-dot menu on click outside
  useEffect(() => {
    const handleGlobalClick = () => setMenuOpenId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Live queries from Dexie IndexedDB
  const allProjects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const trashItems = useLiveQuery(() => db.trash.toArray(), []) || [];

  // Filter realtime by name
  const projects = allProjects.filter(
    (p) => !p.isDeleted && p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create Project Action
  const handleCreateProject = async () => {
    const id = 'proj-' + Date.now();
    const title = `0917 - New Project ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newProj: ProjectEntity = {
      id,
      title,
      width: 1080,
      height: 1920,
      fps: 30,
      duration: 15,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
      tracksData: {
        clips: [
          { id: 'c1', track: 'video', name: 'Main 9:16 Video', start: 0, duration: 15, type: 'video' },
          { id: 'c2', track: 'text', name: 'Tiêu đề mở đầu', start: 0, duration: 4, type: 'text', text: '🔥 CLIP MỚI 9:16' }
        ]
      }
    };

    await db.projects.add(newProj);
    setCurrentProjectId(id);
    setProjectTitle(title);
    showToast('Đã khởi tạo dự án mới trong IndexedDB!', 'success');
    navigate(`/editor/${id}`);
  };

  // Delete project -> move to trash
  const handleDeleteProject = async (proj: ProjectEntity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMenuOpenId(null);
    await db.projects.delete(proj.id);
    await db.trash.add({
      id: 'trash-' + Date.now(),
      projectId: proj.id,
      title: proj.title,
      deletedAt: Date.now(),
      projectData: proj
    });
    showToast(`Đã chuyển "${proj.title}" vào Thùng rác`, 'info');
  };

  // Duplicate project
  const handleDuplicateProject = async (proj: ProjectEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    const newId = 'proj-' + Date.now();
    const duplicate: ProjectEntity = {
      ...proj,
      id: newId,
      title: `${proj.title} (Bản sao)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.projects.add(duplicate);
    showToast(`Đã nhân bản: "${duplicate.title}"`, 'success');
  };

  // Rename project
  const handleStartRename = (proj: ProjectEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setRenamingId(proj.id);
    setRenameValue(proj.title);
  };

  const handleSaveRename = async (projId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await db.projects.update(projId, { title: renameValue.trim(), updatedAt: Date.now() });
    setRenamingId(null);
    showToast('Đã cập nhật tên dự án!', 'success');
  };

  // Export project file (.capproj)
  const handleExportProjectFile = (proj: ProjectEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(proj, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${proj.title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.capproj`;
    a.click();
    showToast(`Đã xuất file ${proj.title}.capproj!`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F19] p-7 flex flex-col gap-8 select-none">
      {/* 1. HERO BANNER: gradient teal → xanh dương đậm (#12A8C9 → #0B4A66), bo góc 16px, nút "Create project" nằm giữa */}
      <div className="relative w-full h-48 rounded-[16px] bg-gradient-to-r from-[#12A8C9] to-[#0B4A66] flex items-center justify-center shadow-2xl shadow-cyan-950/40 overflow-hidden border border-cyan-400/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent pointer-events-none" />

        <button
          onClick={() => openModal('newProject')}
          className="relative z-10 flex items-center gap-3 px-8 py-3.5 rounded-[14px] bg-[#0B0F19]/90 hover:bg-[#0B0F19] text-[#E5E7EB] hover:text-white font-bold text-sm shadow-2xl border border-cyan-400/30 hover:border-cyan-400 hover-lift active:scale-95 transition-all"
        >
          <div className="w-6 h-6 rounded-lg bg-[#22D3EE] text-slate-950 flex items-center justify-center font-black">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="tracking-wide text-base">{t.heroCreateProject}</span>
        </button>
      </div>

      {/* 2. EDITPILOT & 4 QUICK CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* EditPilot Prompt Card */}
        <div className="lg:col-span-5 rounded-[16px] bg-[#111827] border border-[#1F2937] p-5 flex flex-col justify-between gap-4 shadow-lg">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#22D3EE]">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold text-xs tracking-wider uppercase">EditPilot AI Assistant</span>
            </div>
            <h3 className="font-bold text-sm text-[#E5E7EB]">{t.editPilotTitle}</h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!promptText.trim()) return;
              addChatMessage('global', 'user', promptText);
              setEditPilotOpen(true);
              setPromptText('');
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={t.editPilotPlaceholder}
              className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-[#E5E7EB] placeholder-[#9CA3AF] outline-none focus:border-[#22D3EE] pr-10 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 p-1.5 rounded-lg bg-[#22D3EE] text-slate-950 hover:bg-[#22D3EE]/90 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[t.chip1, t.chip2, t.chip3, t.chip4].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setPromptText(chip);
                  addChatMessage('global', 'user', chip);
                  setEditPilotOpen(true);
                }}
                className="py-0.5 px-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] border border-[#1F2937] text-[11px] text-[#9CA3AF] transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Quick Tools Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* AI Image */}
          <button
            onClick={() => openModal('aiImage')}
            className="p-4 rounded-[16px] bg-[#111827] hover:bg-[#111827]/80 border border-[#1F2937] hover:border-pink-500/50 hover-lift text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center border border-pink-500/30">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#E5E7EB] text-xs block group-hover:text-pink-400 transition-colors">
                {t.quickAiImage}
              </span>
              <span className="text-[10px] text-[#9CA3AF] block mt-0.5">{t.quickAiImageDesc}</span>
            </div>
          </button>

          {/* Extend Video */}
          <button
            onClick={() => openModal('extendVideo')}
            className="p-4 rounded-[16px] bg-[#111827] hover:bg-[#111827]/80 border border-[#1F2937] hover:border-sky-500/50 hover-lift text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#E5E7EB] text-xs block group-hover:text-sky-400 transition-colors">
                {t.quickExtendVideo}
              </span>
              <span className="text-[10px] text-[#9CA3AF] block mt-0.5">{t.quickExtendVideoDesc}</span>
            </div>
          </button>

          {/* AI Edit */}
          <button
            onClick={() => openModal('aiEdit')}
            className="p-4 rounded-[16px] bg-[#111827] hover:bg-[#111827]/80 border border-[#1F2937] hover:border-[#22D3EE]/50 hover-lift text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center border border-[#22D3EE]/30">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#E5E7EB] text-xs block group-hover:text-[#22D3EE] transition-colors">
                {t.quickAiEdit}
              </span>
              <span className="text-[10px] text-[#9CA3AF] block mt-0.5">{t.quickAiEditDesc}</span>
            </div>
          </button>

          {/* Enhance Quality */}
          <button
            onClick={() => openModal('enhanceQuality')}
            className="p-4 rounded-[16px] bg-[#111827] hover:bg-[#111827]/80 border border-[#1F2937] hover:border-amber-500/50 hover-lift text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#E5E7EB] text-xs block group-hover:text-amber-400 transition-colors">
                {t.quickEnhanceQuality}
              </span>
              <span className="text-[10px] text-[#9CA3AF] block mt-0.5">{t.quickEnhanceQualityDesc}</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. AI-POWERED CREATIVE SUITE (4 Card lớn) */}
      <div className="flex flex-col gap-3">
        <h3 className="font-bold text-base text-[#E5E7EB]">{t.aiCreativeSuite}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Video Studio */}
          <div
            onClick={() => openModal('videoStudio')}
            className="relative h-44 rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-[#22D3EE] p-5 flex flex-col justify-between cursor-pointer hover-lift group overflow-hidden shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center border border-[#22D3EE]/30">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#E5E7EB] text-sm block group-hover:text-[#22D3EE] transition-colors">
                {t.videoStudioCard}
              </span>
              <span className="text-[11px] text-[#9CA3AF] block mt-0.5">{t.videoStudioCardDesc}</span>
            </div>
          </div>

          {/* Card 2: Design Studio (Konva Canvas) */}
          <div
            onClick={() => navigate('/design')}
            className="relative h-44 rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-purple-400 p-5 flex flex-col justify-between cursor-pointer hover-lift group overflow-hidden shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#E5E7EB] text-sm block group-hover:text-purple-300 transition-colors">
                {t.designStudioCard}
              </span>
              <span className="text-[11px] text-[#9CA3AF] block mt-0.5">{t.designStudioCardDesc}</span>
            </div>
          </div>

          {/* Card 3: AI Ad Maker */}
          <div
            onClick={() => openModal('aiAdMaker')}
            className="relative h-44 rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-blue-400 p-5 flex flex-col justify-between cursor-pointer hover-lift group overflow-hidden shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#E5E7EB] text-sm block group-hover:text-blue-300 transition-colors">
                {t.aiAdMakerCard}
              </span>
              <span className="text-[11px] text-[#9CA3AF] block mt-0.5">{t.aiAdMakerCardDesc}</span>
            </div>
          </div>

          {/* Card 4: Long video to shorts */}
          <div
            onClick={() => openModal('longToShorts')}
            className="relative h-44 rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-teal-400 p-5 flex flex-col justify-between cursor-pointer hover-lift group overflow-hidden shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#E5E7EB] text-sm block group-hover:text-teal-300 transition-colors">
                {t.longToShortsCard}
              </span>
              <span className="text-[11px] text-[#9CA3AF] block mt-0.5">{t.longToShortsCardDesc}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENT PROJECTS SECTION (Search realtime, Grid/List toggle, Three-dot menu, Empty state) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-[#E5E7EB]">{t.projectsTitle}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#111827] border border-[#1F2937] text-slate-400 font-mono">
              {projects.length}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Realtime Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchProjects}
                className="bg-[#111827] border border-[#1F2937] rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-[#E5E7EB] placeholder-[#9CA3AF] outline-none focus:border-[#22D3EE] w-48 sm:w-56 transition-colors"
              />
            </div>

            {/* Grid / List View Toggle */}
            <div className="flex items-center bg-[#111827] border border-[#1F2937] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                title="Chế độ xem lưới (Grid)"
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-[#22D3EE] text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                title="Chế độ xem danh sách (List)"
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'list' ? 'bg-[#22D3EE] text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Trash Button with Count */}
            <button
              onClick={() => openModal('trash')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] border border-[#1F2937] hover:border-rose-500/50 text-[#9CA3AF] hover:text-rose-300 text-xs font-semibold hover-lift transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.trashTitle}</span>
              {trashItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                  {trashItems.length}
                </span>
              )}
            </button>

            {/* Project Sync Button */}
            <button
              onClick={() => openModal('projectSync')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#22D3EE]/20 text-xs font-bold hover-lift transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.projectSync}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-normal">
                {user ? '🟢 Synced' : '⚡ Local'}
              </span>
            </button>
          </div>
        </div>

        {/* Skeleton Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="rounded-[16px] bg-[#111827] border border-[#1F2937] p-3 flex flex-col gap-2.5">
                <div className="aspect-[9/16] rounded-xl skeleton-shimmer w-full" />
                <div className="h-4 rounded-lg skeleton-shimmer w-3/4" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Empty State with Neon Illustration */
          <div className="p-12 rounded-[20px] bg-[#111827] border border-[#1F2937] text-center flex flex-col items-center justify-center gap-4 text-[#9CA3AF] shadow-xl relative overflow-hidden">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#12A8C9]/20 via-purple-500/10 to-pink-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Film className="w-10 h-10 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h4 className="text-sm font-bold text-white">Chưa có dự án nào</h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                {searchQuery ? `Không tìm thấy dự án khớp với "${searchQuery}"` : 'Bắt đầu sáng tạo video 9:16 đầu tiên với CapCut Desktop Web ngay bây giờ!'}
              </p>
            </div>
            <button
              onClick={() => openModal('newProject')}
              className="mt-1 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#22D3EE] to-sky-500 text-slate-950 font-bold text-xs hover-lift shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t.heroCreateProject}</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Projects Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => {
                  setCurrentProjectId(proj.id);
                  setProjectTitle(proj.title);
                  navigate(`/editor/${proj.id}`);
                }}
                className="group relative rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-[#22D3EE] p-3 flex flex-col gap-2.5 cursor-pointer hover-lift shadow-md shadow-black/20"
              >
                {/* 9:16 Aspect Thumbnail Container */}
                <div className="relative aspect-[9/16] w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-[#1F2937]">
                  <img
                    src={proj.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1.5 right-1.5 bg-black/85 px-2 py-0.5 rounded-md text-[10px] font-mono text-white">
                    {proj.duration}s
                  </span>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-[#22D3EE] text-slate-950 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Film className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Info & Three-dots Menu */}
                <div className="flex flex-col gap-1">
                  {renamingId === proj.id ? (
                    <form
                      onSubmit={(e) => handleSaveRename(proj.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleSaveRename(proj.id)}
                        className="w-full bg-[#0B0F19] border border-cyan-400 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                      />
                      <button type="submit" className="text-cyan-400 hover:text-cyan-300">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-[#E5E7EB] truncate group-hover:text-[#22D3EE] transition-colors" title={proj.title}>
                        {proj.title}
                      </span>

                      {/* Three-dot Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === proj.id ? null : proj.id);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-800 text-[#9CA3AF] hover:text-white transition-colors"
                          title="Tùy chọn dự án"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {menuOpenId === proj.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-full mb-1.5 w-40 rounded-xl bg-[#141824] border border-[#1F2937] shadow-2xl py-1 text-xs text-slate-200 z-30 flex flex-col"
                          >
                            <button
                              onClick={() => {
                                setCurrentProjectId(proj.id);
                                setProjectTitle(proj.title);
                                navigate(`/editor/${proj.id}`);
                              }}
                              className="px-3 py-1.5 hover:bg-cyan-500/20 hover:text-[#22D3EE] flex items-center gap-2 text-left"
                            >
                              <Film className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{t.openProject}</span>
                            </button>

                            <button
                              onClick={(e) => handleStartRename(proj, e)}
                              className="px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>{t.rename}</span>
                            </button>

                            <button
                              onClick={(e) => handleDuplicateProject(proj, e)}
                              className="px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-purple-400" />
                              <span>{t.duplicate}</span>
                            </button>

                            <button
                              onClick={(e) => handleExportProjectFile(proj, e)}
                              className="px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{t.exportProjectFile}</span>
                            </button>

                            <div className="border-t border-[#1F2937] my-0.5" />

                            <button
                              onClick={(e) => handleDeleteProject(proj, e)}
                              className="px-3 py-1.5 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 flex items-center gap-2 text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t.moveToTrash}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-[#9CA3AF]">
                    <span>{new Date(proj.updatedAt).toLocaleDateString('vi-VN')}</span>
                    <span className="font-mono">9:16</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Projects List View */
          <div className="flex flex-col gap-2 rounded-2xl bg-[#111827] border border-[#1F2937] p-2 overflow-x-auto">
            <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[11px] font-bold text-[#9CA3AF] border-b border-[#1F2937]">
              <span className="col-span-6">TÊN DỰ ÁN</span>
              <span className="col-span-2">NGÀY SỬA</span>
              <span className="col-span-2">THỜI LƯỢNG</span>
              <span className="col-span-2 text-right">THAO TÁC</span>
            </div>

            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => {
                  setCurrentProjectId(proj.id);
                  setProjectTitle(proj.title);
                  navigate(`/editor/${proj.id}`);
                }}
                className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-xl hover:bg-[#151D2F] border border-transparent hover:border-[#1F2937] cursor-pointer transition-colors group"
              >
                {/* Thumbnail & Title */}
                <div className="col-span-6 flex items-center gap-3">
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-[#1F2937]">
                    <img
                      src={proj.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'}
                      alt={proj.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {renamingId === proj.id ? (
                    <form
                      onSubmit={(e) => handleSaveRename(proj.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleSaveRename(proj.id)}
                        className="bg-[#0B0F19] border border-cyan-400 rounded px-2 py-1 text-xs text-white outline-none"
                      />
                      <button type="submit" className="text-cyan-400">
                        <Check className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <div>
                      <span className="font-semibold text-xs text-[#E5E7EB] block group-hover:text-[#22D3EE] transition-colors">
                        {proj.title}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] block">1080 x 1920 • 30fps</span>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="col-span-2 text-xs text-[#9CA3AF]">
                  {new Date(proj.updatedAt).toLocaleDateString('vi-VN')}
                </div>

                {/* Duration */}
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-[#1F2937] text-[11px] font-mono text-cyan-300">
                    {proj.duration}s
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleStartRename(proj, e)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-[#9CA3AF] hover:text-amber-400 transition-colors"
                    title={t.rename}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDuplicateProject(proj, e)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-[#9CA3AF] hover:text-purple-400 transition-colors"
                    title={t.duplicate}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleExportProjectFile(proj, e)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-[#9CA3AF] hover:text-emerald-400 transition-colors"
                    title={t.exportProjectFile}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProject(proj, e)}
                    className="p-1.5 rounded-lg hover:bg-rose-950 text-[#9CA3AF] hover:text-rose-400 transition-colors"
                    title={t.moveToTrash}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
