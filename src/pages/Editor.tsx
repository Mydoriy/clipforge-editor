import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { db, createProjectSnapshot } from '../lib/db';
import { syncClipsToTracks, extractClipsFromTracks, createDefaultTracks, type Timeline } from '../types/project';
import { Header } from '../components/Header';
import { CategoryPanel, PlayerCanvas, Inspector, Timeline as TimelineComponent } from '../editor';
import { PanelErrorBoundary } from '../components/PanelErrorBoundary';
import { EditPilot } from '../components/EditPilot';
import { Mascot } from '../components/Mascot';
import { sharedCompositor } from '../engine/compositor';
import { masterAudio } from '../engine/audioEngine';
import { matchShortcut } from '../utils/shortcuts';
import { acquireProjectLock, type ProjectLockHandle } from '../utils/projectLock';
import { saveCrashCheckpoint, markCleanExit, checkUnsavedCrashCheckpoint, clearCrashCheckpoint, type CrashCheckpoint } from '../utils/crashRecovery';
import { Sliders, Eye, AlertTriangle, Info, X, Lock, RotateCcw } from 'lucide-react';

export const Editor: React.FC = () => {
  const {
    id
  } = useParams<{ id: string }>();
  const {
    setCurrentProjectId,
    setProjectTitle,
    setClips,
    setDuration,
    setTimelines,
    setActiveTimelineId,
    updateProjectSettings,
    setMediaItems,
    storageWarning,
    setStorageWarning,
    checkStorageQuota,
    isReadOnly,
    setIsReadOnly
  } = useEditorStore();
  const [showInspectorOnTablet, setShowInspectorOnTablet] = useState(false);
  const [missingApis, setMissingApis] = useState<{ webCodecs: boolean; fsAccess: boolean; webGpu: boolean }>({
    webCodecs: false,
    fsAccess: false,
    webGpu: false
  });
  const [dismissApiWarning, setDismissApiWarning] = useState(false);
  const [unsavedCrashCheckpoint, setUnsavedCrashCheckpoint] = useState<CrashCheckpoint | null>(null);

  useEffect(() => {
    let lockHandle: ProjectLockHandle | null = null;

    if (id) {
      setCurrentProjectId(id);

      // 1. Acquire Project Lock to prevent multi-tab conflicts
      acquireProjectLock(id, (readOnly) => {
        setIsReadOnly(readOnly);
      }).then((handle) => {
        lockHandle = handle;
        setIsReadOnly(handle.isReadOnly);
      });

      // 2. Load project data & check for crash recovery checkpoint
      db.projects.get(id).then(async (proj) => {
        if (proj) {
          const name = proj.name || proj.title;
          setProjectTitle(name);
          setDuration(proj.duration || 15);

          // Check if there is an unsaved crash checkpoint from an abrupt tab closure
          const checkpoint = checkUnsavedCrashCheckpoint(id, proj.updatedAt || proj.createdAt);
          if (checkpoint) {
            setUnsavedCrashCheckpoint(checkpoint);
          }

          // Rehydrate persisted media blobs from IndexedDB into fresh Object URLs
          const allMedia = await db.media.toArray();
          const mediaMapById = new Map(allMedia.map((m) => [m.id, m]));
          const mediaMapByName = new Map(allMedia.map((m) => [m.name, m]));

          const rehydrate = (rawClips: any[]) => {
            return rawClips.map((c) => {
              if (c.src && (c.src.startsWith('blob:') || !c.src)) {
                const match = (c.mediaId && mediaMapById.get(c.mediaId)) || (c.name && mediaMapByName.get(c.name));
                if (match && match.blob) {
                  return {
                    ...c,
                    src: URL.createObjectURL(match.blob),
                    mediaId: c.mediaId || match.id,
                    hasError: false,
                    missingMedia: false
                  };
                }
              }
              return c;
            });
          };

          if (proj.timelines && proj.timelines.length > 0) {
            setTimelines(proj.timelines);
            const activeId = proj.activeTimelineId || proj.timelines[0].id;
            setActiveTimelineId(activeId);
            const activeTl = proj.timelines.find((t) => t.id === activeId) || proj.timelines[0];
            const extracted = extractClipsFromTracks(activeTl.tracks);
            if (extracted.length > 0) {
              setClips(rehydrate(extracted));
            } else if (proj.tracksData?.clips) {
              setClips(rehydrate(proj.tracksData.clips));
            }
          } else if (proj.tracksData?.clips) {
            setClips(rehydrate(proj.tracksData.clips));
          }

          if (proj.settings) {
            updateProjectSettings(proj.settings);
          }
          if (proj.media) {
            setMediaItems(proj.media);
          }
        }
      });
    }

    const handleBeforeUnload = () => {
      if (id && !useEditorStore.getState().isReadOnly) {
        markCleanExit(id);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (lockHandle) {
        lockHandle.release();
      }
      setIsReadOnly(false);
      sharedCompositor.cleanup();
      masterAudio.clearCache();
      masterAudio.pauseAll();
    };
  }, [id, setCurrentProjectId, setProjectTitle, setClips, setDuration, setTimelines, setActiveTimelineId, updateProjectSettings, setMediaItems, setIsReadOnly]);

  // Detect browser APIs & check storage quota
  useEffect(() => {
    const hasWebCodecs = typeof window !== 'undefined' && typeof (window as any).VideoEncoder !== 'undefined';
    const hasFs = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
    const hasGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
    setMissingApis({ webCodecs: !hasWebCodecs, fsAccess: !hasFs, webGpu: !hasGpu });
    checkStorageQuota();
  }, [checkStorageQuota]);

  // Immediate Save for Ctrl+S
  const handleImmediateSave = async () => {
    if (!id) return;
    const store = useEditorStore.getState();
    if (store.isReadOnly) {
      store.showToast('Dự án đang ở chế độ CHỈ ĐỌC vì mở ở tab khác, không thể lưu!', 'warning');
      return;
    }
    try {
      store.setAutosaveStatus('saving');
      const activeTracks = syncClipsToTracks(
        store.timelines.find((t) => t.id === store.activeTimelineId)?.tracks || createDefaultTracks(),
        store.clips
      );
      const updatedTimelines: Timeline[] = store.timelines.map((t) =>
        t.id === store.activeTimelineId
          ? { ...t, tracks: activeTracks, duration: store.duration }
          : t
      );

      await db.projects.update(id, {
        name: store.projectTitle,
        title: store.projectTitle,
        duration: store.duration,
        updatedAt: Date.now(),
        settings: store.projectSettings,
        timelines: updatedTimelines,
        tracksData: { clips: store.clips }
      });
      saveCrashCheckpoint(id, store.projectTitle, store.duration, store.clips, store.projectSettings);
      store.setAutosaveStatus('saved');
      store.showToast('Đã lưu dự án vào bộ nhớ trình duyệt (Ctrl+S)', 'success');
    } catch (err: any) {
      store.setAutosaveStatus('idle');
      store.showToast(`Lỗi lưu dự án: ${err.message}`, 'error');
    }
  };

  // Global Media Import for Ctrl+I
  const handleGlobalFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const store = useEditorStore.getState();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');
      const mediaId = 'media-' + Date.now() + '-' + i;

      try {
        await db.media.put({
          id: mediaId,
          name: file.name,
          type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          blob: file,
          size: file.size,
          createdAt: Date.now()
        });
      } catch (err) {
        console.warn('Put media to db error:', err);
      }

      store.addClip({
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : 'video',
        track: isAudio ? 'audio' : 'video',
        start: store.currentTime,
        duration: isVideo || isAudio ? 5 : 3,
        inPoint: 0,
        outPoint: 0,
        speed: 1,
        src: blobUrl,
        mediaId,
        opacity: 1,
        volume: 1,
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        adjustments: {},
        effects: [],
        animation: {}
      });
    }

    store.showToast(`Đã thêm ${files.length} tệp vào timeline (Ctrl+I)`, 'success');
    e.target.value = '';
  };

  // Keyboard Shortcuts (Space, S split, Q/W trim, Del, Shift+Del, Ctrl+Z/Y, Ctrl+C/X/V/D, V/B/H, M, +/-, ←/→, Home/End, Ctrl+E/S/I, N, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) return;

      const store = useEditorStore.getState();
      const custom = store.settings.customShortcuts;

      // 1. Play / Pause (Space)
      if (matchShortcut(e, 'playPause', custom)) {
        e.preventDefault();
        store.setIsPlaying(!store.isPlaying);
        return;
      }

      // 2. Split (S or Ctrl+B)
      if (matchShortcut(e, 'split', custom) || matchShortcut(e, 'splitAlt', custom)) {
        e.preventDefault();
        if (store.selectedClipId) {
          store.splitClip(store.selectedClipId, store.currentTime);
          store.showToast('Đã tách clip tại playhead (S / Ctrl+B)', 'info');
        } else {
          const activeClip = store.clips.find(
            (c) => store.currentTime > c.start && store.currentTime < c.start + c.duration
          );
          if (activeClip) {
            store.splitClip(activeClip.id, store.currentTime);
            store.showToast(`Đã tách clip "${activeClip.name}" (S)`, 'info');
          }
        }
        return;
      }

      // 3. Delete Left (Q)
      if (matchShortcut(e, 'deleteLeft', custom)) {
        e.preventDefault();
        if (store.selectedClipId) {
          const target = store.clips.find((c) => c.id === store.selectedClipId);
          if (target && !target.locked && store.currentTime > target.start && store.currentTime < target.start + target.duration) {
            const cutAmount = store.currentTime - target.start;
            store.updateClip(target.id, {
              start: store.currentTime,
              duration: target.duration - cutAmount,
              inPoint: (target.inPoint || 0) + cutAmount
            });
            store.showToast('Đã cắt bỏ phần bên trái (Q)', 'info');
          }
        }
        return;
      }

      // 4. Delete Right (W)
      if (matchShortcut(e, 'deleteRight', custom)) {
        e.preventDefault();
        if (store.selectedClipId) {
          const target = store.clips.find((c) => c.id === store.selectedClipId);
          if (target && !target.locked && store.currentTime > target.start && store.currentTime < target.start + target.duration) {
            const newDuration = store.currentTime - target.start;
            const cutAmount = target.duration - newDuration;
            store.updateClip(target.id, {
              duration: newDuration,
              outPoint: (target.outPoint || 0) + cutAmount
            });
            store.showToast('Đã cắt bỏ phần bên phải (W)', 'info');
          }
        }
        return;
      }

      // 5. Ripple Delete (Shift+Del)
      if (matchShortcut(e, 'rippleDelete', custom)) {
        e.preventDefault();
        if (store.selectedClipId) {
          const target = store.clips.find((c) => c.id === store.selectedClipId);
          if (target && !target.locked) {
            const targetEnd = target.start + target.duration;
            const targetTrack = target.track;
            const gap = target.duration;
            const updatedClips = store.clips
              .filter((c) => c.id !== target.id)
              .map((c) => {
                if (c.track === targetTrack && c.start >= targetEnd) {
                  return { ...c, start: Math.max(0, c.start - gap) };
                }
                return c;
              });
            useEditorStore.setState({
              undoStack: [...store.undoStack, store.clips],
              redoStack: [],
              clips: updatedClips,
              selectedClipId: null,
              selectedClipIds: []
            });
            store.showToast('Đã xóa và dồn track (Ripple Delete)', 'info');
          }
        }
        return;
      }

      // 6. Delete (Del / Backspace)
      if (matchShortcut(e, 'delete', custom)) {
        if (store.selectedClipId || store.selectedClipIds.length > 0) {
          e.preventDefault();
          const toDelete = store.selectedClipIds.length > 0 ? store.selectedClipIds : [store.selectedClipId!];
          toDelete.forEach((cId) => store.deleteClip(cId));
          store.showToast(`Đã xóa ${toDelete.length} clip`, 'info');
        }
        return;
      }

      // 7. Undo / Redo (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
      if (matchShortcut(e, 'undo', custom)) {
        e.preventDefault();
        store.undo();
        store.showToast('Hoàn tác (Undo)', 'info');
        return;
      }
      if (matchShortcut(e, 'redo', custom) || (e.code === 'KeyY' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        store.redo();
        store.showToast('Làm lại (Redo)', 'info');
        return;
      }

      // 8. Clipboard (Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+D, Ctrl+A, Escape)
      if (matchShortcut(e, 'copy', custom)) {
        e.preventDefault();
        store.copyClip();
        return;
      }
      if (matchShortcut(e, 'cut', custom)) {
        e.preventDefault();
        store.cutClip();
        return;
      }
      if (matchShortcut(e, 'paste', custom)) {
        e.preventDefault();
        store.pasteClip();
        return;
      }
      if (matchShortcut(e, 'duplicate', custom)) {
        e.preventDefault();
        if (store.selectedClipId) {
          store.duplicateClip(store.selectedClipId);
          store.showToast('Đã nhân bản clip (Ctrl+D)', 'info');
        }
        return;
      }
      if (e.code === 'KeyA' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.selectAllClips();
        return;
      }
      if (e.code === 'Escape') {
        store.deselectAllClips();
        return;
      }

      // 9. Tools (V, B, H, N)
      if (matchShortcut(e, 'toolSelect', custom)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('editor-set-tool', { detail: 'select' }));
        store.showToast('Công cụ: Chọn (Select V)', 'info');
        return;
      }
      if (matchShortcut(e, 'toolRazor', custom)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('editor-set-tool', { detail: 'razor' }));
        store.showToast('Công cụ: Dao cắt (Razor B)', 'info');
        return;
      }
      if (matchShortcut(e, 'toolHand', custom)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('editor-set-tool', { detail: 'hand' }));
        store.showToast('Công cụ: Bàn tay cuộn (Hand H)', 'info');
        return;
      }
      if (matchShortcut(e, 'toggleSnapping', custom)) {
        e.preventDefault();
        store.toggleSnap();
        return;
      }

      // 10. Marker (M)
      if (matchShortcut(e, 'marker', custom)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('editor-add-marker'));
        return;
      }

      // 11. Zoom (+ / -)
      if (matchShortcut(e, 'zoomIn', custom)) {
        e.preventDefault();
        store.setTimelineZoom(store.timelineZoom + 0.25);
        return;
      }
      if (matchShortcut(e, 'zoomOut', custom)) {
        e.preventDefault();
        store.setTimelineZoom(store.timelineZoom - 0.25);
        return;
      }

      // 12. Frame navigation (← / → / Shift+← / Shift+→)
      if (matchShortcut(e, 'prevSecond', custom)) {
        e.preventDefault();
        store.setCurrentTime(Math.max(0, store.currentTime - 1.0));
        return;
      }
      if (matchShortcut(e, 'nextSecond', custom)) {
        e.preventDefault();
        store.setCurrentTime(Math.min(store.duration, store.currentTime + 1.0));
        return;
      }
      if (matchShortcut(e, 'prevFrame', custom)) {
        e.preventDefault();
        const fps = store.projectSettings?.fps || 30;
        store.setCurrentTime(Math.max(0, store.currentTime - 1 / fps));
        return;
      }
      if (matchShortcut(e, 'nextFrame', custom)) {
        e.preventDefault();
        const fps = store.projectSettings?.fps || 30;
        store.setCurrentTime(Math.min(store.duration, store.currentTime + 1 / fps));
        return;
      }

      // 13. Home / End
      if (matchShortcut(e, 'home', custom)) {
        e.preventDefault();
        store.setCurrentTime(0);
        return;
      }
      if (matchShortcut(e, 'end', custom)) {
        e.preventDefault();
        store.setCurrentTime(store.duration);
        return;
      }

      // 14. Project (Ctrl+E, Ctrl+S, Ctrl+I)
      if (matchShortcut(e, 'export', custom)) {
        e.preventDefault();
        store.openModal('export');
        return;
      }
      if (matchShortcut(e, 'save', custom)) {
        e.preventDefault();
        handleImmediateSave();
        return;
      }
      if (matchShortcut(e, 'import', custom)) {
        e.preventDefault();
        document.getElementById('global-media-import-input')?.click();
        return;
      }

      // 15. Fullscreen Player (F)
      if (matchShortcut(e, 'toggleFullscreen', custom)) {
        e.preventDefault();
        const playerEl = document.getElementById('player-canvas-container');
        if (playerEl) {
          if (!document.fullscreenElement) {
            playerEl.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autosave every 3 seconds to IndexedDB
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      const store = useEditorStore.getState();
      if (store.isReadOnly || store.settings.autosave === false) return;

      try {
        store.setAutosaveStatus('saving');
        const activeTracks = syncClipsToTracks(
          store.timelines.find((t) => t.id === store.activeTimelineId)?.tracks || createDefaultTracks(),
          store.clips
        );
        const updatedTimelines: Timeline[] = store.timelines.map((t) =>
          t.id === store.activeTimelineId
            ? { ...t, tracks: activeTracks, duration: store.duration }
            : t
        );

        await db.projects.update(id, {
          name: store.projectTitle,
          title: store.projectTitle,
          duration: store.duration,
          updatedAt: Date.now(),
          settings: store.projectSettings,
          timelines: updatedTimelines,
          activeTimelineId: store.activeTimelineId,
          media: store.mediaItems,
          tracksData: { clips: store.clips }
        });
        saveCrashCheckpoint(id, store.projectTitle, store.duration, store.clips, store.projectSettings);
        store.setAutosaveStatus('saved');
      } catch (err) {
        console.warn('Autosave error:', err);
        store.setAutosaveStatus('idle');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  // Auto snapshot every 5 minutes (Version history)
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      const store = useEditorStore.getState();
      if (store.isReadOnly || store.clips.length === 0) return;
      try {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await createProjectSnapshot(
          id,
          `Tự động (${timeStr})`,
          { clips: store.clips },
          store.duration,
          store.projectSettings
        );
      } catch (e) {
        console.warn('Auto snapshot error:', e);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [id]);

  const {
    panelTopHeight,
    panelLeftWidth,
    panelRightWidth,
    showDetails,
    showTimeline,
    setPanelDimensions
  } = useEditorStore();

  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRowRef = useRef(false);
  const isDraggingCol1Ref = useRef(false);
  const isDraggingCol2Ref = useRef(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (isDraggingRowRef.current) {
        const offsetY = e.clientY - rect.top;
        const newPct = Math.min(75, Math.max(30, (offsetY / rect.height) * 100));
        setPanelDimensions({ top: newPct });
      } else if (isDraggingCol1Ref.current) {
        const offsetX = e.clientX - rect.left;
        const newPct = Math.min(50, Math.max(20, (offsetX / rect.width) * 100));
        setPanelDimensions({ left: newPct });
      } else if (isDraggingCol2Ref.current) {
        const offsetRight = rect.right - e.clientX;
        const newPct = Math.min(50, Math.max(20, (offsetRight / rect.width) * 100));
        setPanelDimensions({ right: newPct });
      }
    };

    const handleMouseUp = () => {
      isDraggingRowRef.current = false;
      isDraggingCol1Ref.current = false;
      isDraggingCol2Ref.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setPanelDimensions]);

  const isCompactDetails = windowWidth < 1100;

  return (
    <div className="theme-editor flex-1 flex flex-col h-screen min-w-[1280px] min-h-[720px] overflow-hidden select-none bg-[#141414] text-[#E6E6E6]">
      {/* Editor Header: Height 44px */}
      <Header isEditor={true} />

      {/* Multi-tab Read-Only Warning Banner */}
      {isReadOnly && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-amber-200 text-xs z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>CHẾ ĐỘ CHỈ ĐỌC (READ-ONLY):</strong> Dự án này đang được mở tại một tab trình duyệt khác. Chức năng chỉnh sửa và tự động lưu đã được khóa để tránh xung đột và ghi đè dữ liệu.
            </span>
          </div>
        </div>
      )}

      {/* Crash Recovery Banner */}
      {unsavedCrashCheckpoint && (
        <div className="bg-[#22D3EE]/15 border-b border-[#22D3EE]/40 px-4 py-2.5 flex items-center justify-between text-[#22D3EE] text-xs z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#22D3EE] shrink-0" />
            <span>
              <strong>Khôi phục phiên chưa lưu:</strong> Phát hiện bản ghi nhật ký chưa lưu từ lần thoát trước ({new Date(unsavedCrashCheckpoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {unsavedCrashCheckpoint.clips.length} clip). Bạn có muốn khôi phục không?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setClips(unsavedCrashCheckpoint.clips);
                setDuration(unsavedCrashCheckpoint.duration || 15);
                clearCrashCheckpoint(id!);
                setUnsavedCrashCheckpoint(null);
                useEditorStore.getState().showToast('Đã khôi phục thành công phiên làm việc chưa lưu!', 'success');
              }}
              className="px-3 py-1 rounded-md bg-[#22D3EE] text-slate-950 font-bold text-xs hover:bg-[#22D3EE]/90 shadow transition-colors cursor-pointer"
            >
              Khôi phục phiên
            </button>
            <button
              onClick={() => {
                clearCrashCheckpoint(id!);
                setUnsavedCrashCheckpoint(null);
              }}
              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* Storage Quota Warning Banner */}
      {storageWarning && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-amber-200 text-xs z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{storageWarning}</span>
          </div>
          <button
            onClick={() => setStorageWarning(null)}
            className="text-amber-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded hover:bg-amber-500/20"
          >
            ✕
          </button>
        </div>
      )}

      {/* Browser API Fallback Info Banner */}
      {!dismissApiWarning && (missingApis.webCodecs || missingApis.webGpu || missingApis.fsAccess) && (
        <div className="bg-sky-500/10 border-b border-sky-500/20 px-4 py-1.5 flex items-center justify-between text-slate-300 text-[11px] z-30">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
            <span>
              Chế độ tương thích:{' '}
              {missingApis.webCodecs && 'WebCodecs → MediaRecorder. '}
              {missingApis.webGpu && 'WebGPU → WebGL2/Canvas2D. '}
              {missingApis.fsAccess && 'FS Access → Trình duyệt tải về.'}
            </span>
          </div>
          <button
            onClick={() => setDismissApiWarning(true)}
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Resizable Workspace */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Row: Resizable Panels */}
        <div
          className="flex overflow-hidden relative"
          style={{ height: showTimeline ? `${panelTopHeight}%` : '100%' }}
        >
          {/* Panel Trái: CategoryPanel */}
          <div
            className="flex flex-col overflow-hidden shrink-0"
            style={{ width: `${panelLeftWidth}%` }}
          >
            <PanelErrorBoundary panelName="Thanh công cụ & Media (Category Panel)">
              <CategoryPanel />
            </PanelErrorBoundary>
          </div>

          {/* Splitter Col 1: Left vs Player */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              isDraggingCol1Ref.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
            className="splitter-col"
            title="Kéo để thay đổi kích thước Panel trái & Player"
          />

          {/* Center Panel: 9:16 Canvas Player */}
          <div className="flex-1 flex flex-col overflow-hidden relative bg-[#141414]">
            <PanelErrorBoundary panelName="Khung xem trước (Player Canvas)">
              <PlayerCanvas />
            </PanelErrorBoundary>

            {/* Toggle Details Drawer button when screen < 1100px */}
            {isCompactDetails && (
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="absolute top-2.5 right-2.5 z-30 px-2.5 py-1.5 rounded-md bg-[#1F1F1F] hover:bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] text-xs font-medium text-[#E6E6E6] flex items-center gap-1.5 shadow-xl transition-all"
                title="Mở bảng thuộc tính (Details Drawer)"
              >
                <Sliders className="w-3.5 h-3.5 text-[#1FC8DB]" />
                <span>{drawerOpen ? 'Đóng Details' : 'Details'}</span>
              </button>
            )}
          </div>

          {/* Panel Phải: Details (Inspector) when >= 1100px and showDetails is true */}
          {!isCompactDetails && showDetails && (
            <>
              {/* Splitter Col 2: Player vs Details */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  isDraggingCol2Ref.current = true;
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
                className="splitter-col"
                title="Kéo để thay đổi kích thước Player & Details"
              />

              <div
                className="flex flex-col overflow-hidden shrink-0"
                style={{ width: `${panelRightWidth}%` }}
              >
                <PanelErrorBoundary panelName="Bảng thuộc tính (Inspector)">
                  <Inspector />
                </PanelErrorBoundary>
              </div>
            </>
          )}

          {/* Drawer for Details when screen < 1100px */}
          {isCompactDetails && drawerOpen && (
            <div className="fixed inset-y-0 right-0 w-80 bg-[#1F1F1F] border-l border-[#333333] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
              <div className="h-[44px] px-3 border-b border-[#333333] flex items-center justify-between text-xs font-bold text-white bg-[#262626]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#1FC8DB]" />
                  <span>DETAILS (THUỘC TÍNH)</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-md text-[#8A8A8A] hover:text-white hover:bg-[#1F1F1F]"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <PanelErrorBoundary panelName="Bảng thuộc tính (Inspector)">
                  <Inspector />
                </PanelErrorBoundary>
              </div>
            </div>
          )}
        </div>

        {/* Splitter Row & Timeline Panel when showTimeline is true */}
        {showTimeline && (
          <>
            {/* Splitter Row: Top Row vs Timeline */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                isDraggingRowRef.current = true;
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
              }}
              className="splitter-row"
              title="Kéo để thay đổi tỉ lệ Hàng trên & Timeline"
            />

            {/* Hàng dưới: Timeline (thanh công cụ 40px + vùng timeline chiếm phần còn lại) */}
            <div
              className="flex-1 flex flex-col overflow-hidden bg-[#141414]"
              style={{ height: `calc(${100 - panelTopHeight}% - 5px)` }}
            >
              <PanelErrorBoundary panelName="Dòng thời gian (Timeline)">
                <TimelineComponent />
              </PanelErrorBoundary>
            </div>
          </>
        )}
      </div>

      {/* Floating AI Assistant & Pixel Mascot */}
      <Mascot />
      <EditPilot />

      {/* Hidden file input for global media import (Ctrl+I) */}
      <input
        id="global-media-import-input"
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        onChange={handleGlobalFileImport}
        className="hidden"
      />
    </div>
  );
};

