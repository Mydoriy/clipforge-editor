import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { db } from '../lib/db';
import { Header } from '../components/Header';
import { CategoryPanel, PlayerCanvas, Inspector, Timeline } from '../editor';
import { EditPilot } from '../components/EditPilot';
import { Sliders, Eye } from 'lucide-react';

export const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { setCurrentProjectId, setProjectTitle, setClips, setDuration } = useEditorStore();
  const [showInspectorOnTablet, setShowInspectorOnTablet] = useState(false);

  useEffect(() => {
    if (id) {
      setCurrentProjectId(id);
      db.projects.get(id).then((proj) => {
        if (proj) {
          setProjectTitle(proj.title);
          setDuration(proj.duration || 15);
          if (proj.tracksData?.clips) {
            setClips(proj.tracksData.clips);
          }
        }
      });
    }
  }, [id, setCurrentProjectId, setProjectTitle, setClips, setDuration]);

  // Keyboard Shortcuts (Space, S split, Del, +/- zoom, Ctrl+Z / Ctrl+Shift+Z, Shift+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const store = useEditorStore.getState();

      if (e.code === 'Space') {
        e.preventDefault();
        store.setIsPlaying(!store.isPlaying);
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        // 'S' key: Split at playhead
        e.preventDefault();
        if (store.selectedClipId) {
          store.splitClip(store.selectedClipId, store.currentTime);
          store.showToast('Đã tách clip tại playhead (S)', 'info');
        } else {
          // If no clip selected, split the first video clip that intersects currentTime
          const activeClip = store.clips.find(
            (c) => store.currentTime > c.start && store.currentTime < c.start + c.duration
          );
          if (activeClip) {
            store.splitClip(activeClip.id, store.currentTime);
            store.showToast(`Đã tách clip "${activeClip.name}" (S)`, 'info');
          }
        }
      } else if (e.code === 'KeyB' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+B split
        e.preventDefault();
        if (store.selectedClipId) {
          store.splitClip(store.selectedClipId, store.currentTime);
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (store.selectedClipId) {
          e.preventDefault();
          store.deleteClip(store.selectedClipId);
          store.showToast('Đã xóa clip', 'info');
        }
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
          store.showToast('Làm lại (Redo)', 'info');
        } else {
          store.undo();
          store.showToast('Hoàn tác (Undo)', 'info');
        }
      } else if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.redo();
        store.showToast('Làm lại (Redo)', 'info');
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault();
        store.setTimelineZoom(store.timelineZoom + 0.25);
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        store.setTimelineZoom(store.timelineZoom - 0.25);
      } else if (e.code === 'KeyS' && e.shiftKey) {
        e.preventDefault();
        store.toggleSafeZone();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autosave every 3 seconds to IndexedDB
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      const { settings, clips, duration, projectTitle, setAutosaveStatus } = useEditorStore.getState();
      if (settings.autosave === false) return;

      try {
        setAutosaveStatus('saving');
        await db.projects.update(id, {
          title: projectTitle,
          duration,
          updatedAt: Date.now(),
          tracksData: { clips }
        });
        setAutosaveStatus('saved');
      } catch (err) {
        console.warn('Autosave error:', err);
        setAutosaveStatus('idle');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0c0e14]">
      {/* Editor Header */}
      <Header isEditor={true} />

      {/* Main Workspace (Category Panel + 9:16 Canvas + Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Category Panel: visible on tablet & desktop */}
        <div className="hidden md:flex shrink-0">
          <CategoryPanel />
        </div>

        {/* Central 9:16 Preview Canvas Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <PlayerCanvas />

          {/* Tablet Inspector Toggle Button (visible only when screen < 1280px) */}
          <button
            onClick={() => setShowInspectorOnTablet(!showInspectorOnTablet)}
            className="xl:hidden absolute top-3 right-3 z-30 px-3 py-1.5 rounded-xl bg-[#111827]/90 hover:bg-[#1F2937] border border-[#1F2937] hover:border-[#22D3EE]/50 text-xs font-semibold text-white flex items-center gap-1.5 shadow-xl transition-all"
            title="Bật/tắt bảng thuộc tính trên tablet"
          >
            <Sliders className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>{showInspectorOnTablet ? 'Ẩn thuộc tính' : 'Thuộc tính'}</span>
          </button>
        </div>

        {/* Inspector: Always visible on desktop (>= 1280px / xl), slide-in on tablet */}
        <div
          className={`shrink-0 transition-all ${
            showInspectorOnTablet ? 'flex absolute right-0 top-0 bottom-0 z-40 md:relative' : 'hidden xl:flex'
          }`}
        >
          <Inspector />
        </div>
      </div>

      {/* Bottom Multi-track Timeline */}
      <Timeline />

      {/* Floating AI Assistant */}
      <EditPilot />
    </div>
  );
};

