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

  // Keyboard Shortcuts (Space, Ctrl+B, Del, Shift+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const store = useEditorStore.getState();

      if (e.code === 'Space') {
        e.preventDefault();
        store.setIsPlaying(!store.isPlaying);
      } else if (e.code === 'KeyB' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (store.selectedClipId) {
          store.splitClip(store.selectedClipId, store.currentTime);
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (store.selectedClipId) {
          e.preventDefault();
          store.deleteClip(store.selectedClipId);
        }
      } else if (e.code === 'KeyS' && e.shiftKey) {
        e.preventDefault();
        store.toggleSafeZone();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

