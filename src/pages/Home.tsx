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
  ArrowRight
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
    addChatMessage
  } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const t = translations[language];

  // Seed initial demo data in IndexedDB
  useEffect(() => {
    seedDemoProjects().then(() => {
      setTimeout(() => setIsLoading(false), 300);
    });
  }, []);

  // Live query from Dexie IndexedDB
  const allProjects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const projects = allProjects.filter((p) => !p.isDeleted && p.title.toLowerCase().includes(searchQuery.toLowerCase()));

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

  const handleDeleteProject = async (proj: ProjectEntity, e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F19] p-7 flex flex-col gap-8 select-none">
      {/* 1. HERO BANNER: gradient teal → xanh dương đậm (#12A8C9 → #0B4A66), bo góc 16px, nút "Create project" nằm giữa, nền tối, viền sáng nhẹ */}
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

      {/* 2. PROMPT BAR + 4 QUICK TOOLS GRID (Card #111827 viền #1F2937, accent #22D3EE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* EditPilot Prompt Search Card (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-[16px] bg-[#111827] border border-[#1F2937] flex flex-col justify-between gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#22D3EE]">
              <Sparkles className="w-4 h-4 fill-[#22D3EE]" />
              <span className="font-extrabold text-xs uppercase tracking-wider text-[#22D3EE]">EditPilot</span>
            </div>
            <button
              onClick={() => setEditPilotOpen(true)}
              className="text-[10px] text-[#22D3EE] font-bold hover:underline"
            >
              Mở chat drawer →
            </button>
          </div>

          <h4 className="font-semibold text-[#E5E7EB] text-sm italic">
            {t.editPilotPlaceholder}
          </h4>

          {/* Ô nhập + Nút gửi (mũi tên) */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && promptText.trim()) {
                  setEditPilotOpen(true);
                  handleCreateProject();
                }
              }}
              placeholder="VD: Cắt 5 giây đầu, tăng tốc 2x, thêm chữ..."
              className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl pl-4 pr-11 py-2.5 text-xs text-[#E5E7EB] placeholder-[#9CA3AF] outline-none transition-colors"
            />
            <button
              onClick={() => {
                if (promptText.trim()) {
                  setEditPilotOpen(true);
                  handleCreateProject();
                } else {
                  setEditPilotOpen(true);
                }
              }}
              className="absolute right-2 p-2 rounded-lg bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-bold shadow hover-lift transition-all"
              title="Gửi lệnh cho EditPilot"
            >
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Gợi ý nhanh (Chips) dưới ô nhập */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              'Cắt 5 giây đầu',
              'Tăng tốc 2x',
              'Thêm chữ Xin chào',
              'Làm sáng video',
              'Tắt tiếng',
              'Xuất video'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPromptText(chip);
                  setEditPilotOpen(true);
                  handleCreateProject();
                }}
                className="px-2 py-0.5 rounded-lg bg-[#0B0F19] hover:bg-[#1F2937] text-[#22D3EE] text-[10px] font-semibold border border-[#1F2937] hover-lift transition-all"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Quick Tools (2 cols each = 8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* AI Image */}
          <button
            onClick={() => openModal('aiImage')}
            className="p-4 rounded-[16px] bg-[#111827] hover:bg-[#111827]/80 border border-[#1F2937] hover:border-pink-500/50 hover-lift text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20 group-hover:scale-110 transition-transform">
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
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform">
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
            <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/10 text-[#22D3EE] flex items-center justify-center border border-[#22D3EE]/20 group-hover:scale-110 transition-transform">
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
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

      {/* 3. AI-POWERED CREATIVE SUITE CAROUSEL */}
      <div className="flex flex-col gap-3.5">
        <h3 className="font-extrabold text-xs text-[#9CA3AF] uppercase tracking-wider">{t.aiCreativeSuite}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Video Studio */}
          <div
            onClick={() => navigate('/editor/demo-916-intro')}
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
            onClick={() => openModal('marketing')}
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
            onClick={() => openModal('aiEdit')}
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

      {/* 4. RECENT PROJECTS SECTION (With Skeleton Loading & Empty State) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-base text-[#E5E7EB]">{t.projectsTitle}</h3>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchProjects}
                className="bg-[#111827] border border-[#1F2937] rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-[#E5E7EB] placeholder-[#9CA3AF] outline-none focus:border-[#22D3EE] w-52 transition-colors"
              />
            </div>

            {/* Trash Button */}
            <button
              onClick={() => openModal('trash')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] border border-[#1F2937] hover:border-rose-500/50 text-[#9CA3AF] hover:text-rose-300 text-xs font-semibold hover-lift transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.trashTitle}</span>
            </button>

            {/* Sync Button */}
            <button
              onClick={() => showToast('Dự án đã được lưu trữ an toàn trong IndexedDB', 'success')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#22D3EE]/20 text-xs font-bold hover-lift transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.projectSync}</span>
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
          /* Empty State */
          <div className="p-14 rounded-[16px] bg-[#111827] border border-[#1F2937] text-center flex flex-col items-center justify-center gap-3 text-[#9CA3AF] shadow-md">
            <Film className="w-10 h-10 opacity-30 text-[#9CA3AF]" />
            <span className="text-xs font-medium">{t.noProjects}</span>
            <button
              onClick={handleCreateProject}
              className="mt-1 px-4 py-2 rounded-xl bg-[#22D3EE] text-slate-950 font-bold text-xs hover-lift shadow-md"
            >
              + {t.heroCreateProject}
            </button>
          </div>
        ) : (
          /* Projects Grid */
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
                  <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-2 py-0.5 rounded-md text-[10px] font-mono text-white">
                    {proj.duration}s
                  </span>
                </div>

                {/* Info & Options */}
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs text-[#E5E7EB] truncate group-hover:text-[#22D3EE] transition-colors">
                    {proj.title}
                  </span>
                  <button
                    onClick={(e) => handleDeleteProject(proj, e)}
                    className="p-1 rounded-lg hover:bg-rose-950/60 text-[#9CA3AF] hover:text-rose-400 transition-colors shrink-0"
                    title="Chuyển vào thùng rác"
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
