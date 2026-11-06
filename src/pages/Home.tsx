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
  LayoutGrid,
  List,
  Trash2,
  RefreshCw,
  Video,
  Palette,
  Megaphone,
  Scissors
} from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { language, openModal, showToast, setCurrentProjectId, setProjectTitle } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [promptText, setPromptText] = useState('');
  const t = translations[language];

  // Seed initial demo data in IndexedDB
  useEffect(() => {
    seedDemoProjects();
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
    <div className="flex-1 overflow-y-auto bg-[#0d1017] p-6 flex flex-col gap-8 select-none">
      {/* 1. HERO CARD: Cyan-teal gradient banner with centered "+ Create project" */}
      <div className="relative w-full h-44 rounded-2xl bg-gradient-to-r from-[#00f2fe] via-[#22d3ee] to-[#38bdf8] flex items-center justify-center shadow-2xl shadow-cyan-500/15 overflow-hidden">
        {/* Subtle mesh wave decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />

        <button
          onClick={handleCreateProject}
          className="relative z-10 flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-950 text-white font-bold text-base shadow-2xl hover:shadow-cyan-400/30 transition-all transform hover:scale-[1.03] active:scale-[0.98] border border-cyan-300/40"
        >
          <div className="w-6 h-6 rounded-lg bg-cyan-400 text-slate-950 flex items-center justify-center font-black">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="tracking-wide">{t.heroCreateProject}</span>
        </button>
      </div>

      {/* 2. PROMPT BAR + 4 QUICK TOOLS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* EditPilot Prompt Search Card (5 cols) */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-[#141822] border border-[#1f2634] flex flex-col justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="w-4 h-4 fill-cyan-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-cyan-400">EditPilot</span>
          </div>

          <h4 className="font-semibold text-white text-sm italic">
            {t.editPilotPlaceholder}
          </h4>

          <div className="relative flex items-center">
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && promptText.trim()) {
                  showToast(`EditPilot đang xử lý: "${promptText}"`, 'info');
                  handleCreateProject();
                }
              }}
              placeholder="Mô tả video bạn muốn dựng..."
              className="w-full bg-[#0d1017] border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            <button
              onClick={() => {
                if (promptText.trim()) {
                  showToast(`EditPilot đang phân tích kịch bản...`, 'info');
                  handleCreateProject();
                }
              }}
              className="absolute right-2 px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow"
            >
              {t.askAi}
            </button>
          </div>
        </div>

        {/* 4 Quick Tools (2 cols each = 8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* AI Image */}
          <button
            onClick={() => openModal('aiImage')}
            className="p-4 rounded-2xl bg-[#141822] hover:bg-[#181d2a] border border-[#1f2634] hover:border-pink-500/40 transition-all text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block group-hover:text-pink-400 transition-colors">
                {t.quickAiImage}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{t.quickAiImageDesc}</span>
            </div>
          </button>

          {/* Extend Video */}
          <button
            onClick={() => openModal('extendVideo')}
            className="p-4 rounded-2xl bg-[#141822] hover:bg-[#181d2a] border border-[#1f2634] hover:border-sky-500/40 transition-all text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block group-hover:text-sky-400 transition-colors">
                {t.quickExtendVideo}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{t.quickExtendVideoDesc}</span>
            </div>
          </button>

          {/* AI Edit */}
          <button
            onClick={() => openModal('aiEdit')}
            className="p-4 rounded-2xl bg-[#141822] hover:bg-[#181d2a] border border-[#1f2634] hover:border-cyan-500/40 transition-all text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block group-hover:text-cyan-400 transition-colors">
                {t.quickAiEdit}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{t.quickAiEditDesc}</span>
            </div>
          </button>

          {/* Enhance Quality */}
          <button
            onClick={() => openModal('enhanceQuality')}
            className="p-4 rounded-2xl bg-[#141822] hover:bg-[#181d2a] border border-[#1f2634] hover:border-amber-500/40 transition-all text-left flex flex-col justify-between gap-3 group shadow-md"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block group-hover:text-amber-400 transition-colors">
                {t.quickEnhanceQuality}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{t.quickEnhanceQualityDesc}</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. AI-POWERED CREATIVE SUITE CAROUSEL */}
      <div className="flex flex-col gap-3">
        <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">{t.aiCreativeSuite}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Video Studio */}
          <div
            onClick={() => navigate('/editor/demo-916-intro')}
            className="relative h-44 rounded-2xl bg-gradient-to-tr from-cyan-900/60 via-slate-900 to-sky-950 border border-cyan-800/40 p-4 flex flex-col justify-between cursor-pointer hover:border-cyan-400 transition-all group overflow-hidden shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block group-hover:text-cyan-300 transition-colors">
                {t.videoStudioCard}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{t.videoStudioCardDesc}</span>
            </div>
          </div>

          {/* Card 2: Design Studio (Konva Canvas) */}
          <div
            onClick={() => navigate('/design')}
            className="relative h-44 rounded-2xl bg-gradient-to-tr from-purple-900/60 via-slate-900 to-indigo-950 border border-purple-800/40 p-4 flex flex-col justify-between cursor-pointer hover:border-purple-400 transition-all group overflow-hidden shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block group-hover:text-purple-300 transition-colors">
                {t.designStudioCard}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{t.designStudioCardDesc}</span>
            </div>
          </div>

          {/* Card 3: AI Ad Maker */}
          <div
            onClick={() => openModal('marketing')}
            className="relative h-44 rounded-2xl bg-gradient-to-tr from-blue-900/60 via-slate-900 to-sky-950 border border-blue-800/40 p-4 flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-all group overflow-hidden shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block group-hover:text-blue-300 transition-colors">
                {t.aiAdMakerCard}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{t.aiAdMakerCardDesc}</span>
            </div>
          </div>

          {/* Card 4: Long video to shorts */}
          <div
            onClick={() => openModal('aiEdit')}
            className="relative h-44 rounded-2xl bg-gradient-to-tr from-teal-900/60 via-slate-900 to-emerald-950 border border-teal-800/40 p-4 flex flex-col justify-between cursor-pointer hover:border-teal-400 transition-all group overflow-hidden shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/40">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block group-hover:text-teal-300 transition-colors">
                {t.longToShortsCard}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{t.longToShortsCardDesc}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENT PROJECTS SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-base text-white">{t.projectsTitle}</h3>

          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchProjects}
                className="bg-[#141822] border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 w-48"
              />
            </div>

            {/* Trash Button */}
            <button
              onClick={() => openModal('trash')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.trashTitle}</span>
            </button>

            {/* Sync Button */}
            <button
              onClick={() => showToast('Dự án đã đồng bộ tự động trong IndexedDB', 'success')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.projectSync}</span>
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#141822] border border-slate-800 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <span className="text-xs">{t.noProjects}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => {
                  setCurrentProjectId(proj.id);
                  setProjectTitle(proj.title);
                  navigate(`/editor/${proj.id}`);
                }}
                className="group relative rounded-xl bg-[#141822] border border-slate-800/80 hover:border-cyan-400/80 p-2.5 flex flex-col gap-2 cursor-pointer transition-all shadow-md hover:shadow-cyan-500/10 transform hover:-translate-y-0.5"
              >
                {/* 9:16 Aspect Thumbnail Container */}
                <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={proj.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                    {proj.duration}s
                  </span>
                </div>

                {/* Info & Options */}
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                    {proj.title}
                  </span>
                  <button
                    onClick={(e) => handleDeleteProject(proj, e)}
                    className="p-1 rounded hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
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
