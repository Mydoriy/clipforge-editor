import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { db } from '../db';
import { Header } from '../components/Header';
import { CategoryPanel } from '../components/CategoryPanel';
import { PlayerCanvas } from '../components/PlayerCanvas';
import { Inspector } from '../components/Inspector';
import { Timeline } from '../components/Timeline';
import { EditPilot } from '../components/EditPilot';

export const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { setCurrentProjectId, setProjectTitle, setClips, setDuration } = useEditorStore();

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
      <div className="flex-1 flex overflow-hidden">
        <CategoryPanel />
        <PlayerCanvas />
        <Inspector />
      </div>

      {/* Bottom Multi-track Timeline */}
      <Timeline />

      {/* Floating AI Assistant */}
      <EditPilot />
    </div>
  );
};

