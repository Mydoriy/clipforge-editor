import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore, type TimelineClip, createClip } from '../store/useEditorStore';
import { translations } from '../i18n';
import { db } from '../db';
import { generateMediaMetadata } from '../engine/storageProxy';
import { type TimelineMarker } from '../types/project';
import {
  Scissors,
  Trash2,
  Undo2,
  Redo2,
  Copy,
  Plus,
  Type,
  Music,
  Smile,
  Video,
  Sparkles,
  Magnet,
  ZoomIn,
  ZoomOut,
  Sliders,
  MousePointer,
  Hand,
  Shield,
  Lock,
  Unlock,
  EyeOff,
  VolumeX,
  Mic,
  Link,
  Unlink,
  Eye,
  Maximize2,
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Volume2,
  Layers,
  ArrowLeftToLine,
  ArrowRightToLine,
  Upload,
  Film,
  Snowflake,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  Gauge,
  Edit3,
  AlertTriangle
} from 'lucide-react';

export const Timeline: React.FC = () => {
  const {
    language,
    clips,
    currentTime,
    setCurrentTime,
    duration,
    selectedClipId,
    selectedClipIds,
    selectClip,
    setSelectedClipIds,
    splitClip,
    duplicateClip,
    deleteClip,
    trimClipStart,
    trimClipEnd,
    updateClip,
    copyClip,
    cutClip,
    pasteClip,
    selectAllClips,
    undo,
    redo,
    undoStack,
    redoStack,
    addClip,
    timelineZoom,
    setTimelineZoom,
    snapEnabled,
    toggleSnap,
    showToast,
    isPlaying,
    relinkClipMedia,
    projectSettings
  } = useEditorStore();

  const fps = projectSettings?.fps || 30;
  const formatSmpte = (seconds: number) => {
    const totalFrames = Math.floor(seconds * fps);
    const ff = (totalFrames % fps).toString().padStart(2, '0');
    const ss = (Math.floor(seconds) % 60).toString().padStart(2, '0');
    const mm = (Math.floor(seconds / 60) % 60).toString().padStart(2, '0');
    const hh = Math.floor(seconds / 3600).toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  const t = translations[language];
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Active Tool: 'select' (V), 'razor' (B), 'hand' (H)
  const [activeTool, setActiveTool] = useState<'select' | 'razor' | 'hand'>('select');
  const [toolDropdownOpen, setToolDropdownOpen] = useState(false);

  // Plus (+) Menu state
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  // Cyan Toggle Buttons state
  const [mainTrackMagnet, setMainTrackMagnet] = useState(true);
  const [linkageEnabled, setLinkageEnabled] = useState(true);
  const [linkageDropdownOpen, setLinkageDropdownOpen] = useState(false);
  const [previewSkimming, setPreviewSkimming] = useState(false);
  const [skimmingDropdownOpen, setSkimmingDropdownOpen] = useState(false);
  const [showWaveformInTimeline, setShowWaveformInTimeline] = useState(true);

  // Timeline Markers state
  const [markers, setMarkers] = useState<TimelineMarker[]>([
    { id: 'm-init', time: 0, label: 'Intro', color: '#1FC8DB' }
  ]);
  const [editingMarker, setEditingMarker] = useState<TimelineMarker | null>(null);

  // Voiceover modal state
  const [voiceoverOpen, setVoiceoverOpen] = useState(false);
  const [voiceoverCountdown, setVoiceoverCountdown] = useState<number | null>(null);
  const [isRecordingVo, setIsRecordingVo] = useState(false);
  const [voTimer, setVoTimer] = useState(0);
  const [voNoiseReduction, setVoNoiseReduction] = useState(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const voMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voChunksRef = useRef<Blob[]>([]);
  const voTimerRef = useRef<any>(null);

  // Hidden media input for "+ Add media at playhead"
  const addMediaInputRef = useRef<HTMLInputElement | null>(null);

  // Relink state & input
  const relinkInputRef = useRef<HTMLInputElement | null>(null);
  const [relinkingClipId, setRelinkingClipId] = useState<string | null>(null);

  // Responsive collapsible track headers on mobile (< 768px) and scroll sync
  const [trackHeaderCollapsed, setTrackHeaderCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const trackHeadersScrollRef = useRef<HTMLDivElement | null>(null);

  // Long-press timer & touch gesture coordinates for mobile clips
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setTrackHeaderCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTimelineScroll = () => {
    if (timelineRef.current && trackHeadersScrollRef.current) {
      trackHeadersScrollRef.current.scrollTop = timelineRef.current.scrollTop;
    }
  };

  // Virtualization window for rendering hundreds of clips smoothly
  const [visibleTimeRange, setVisibleTimeRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 1000
  });

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const computeWindow = () => {
      const scrollLeft = el.scrollLeft;
      const clientWidth = el.clientWidth;
      const scrollWidth = el.scrollWidth || 1;
      const rStart = scrollLeft / scrollWidth;
      const rEnd = (scrollLeft + clientWidth) / scrollWidth;
      const vStart = rStart * duration;
      const vEnd = rEnd * duration;
      const overscan = Math.max(1.5, (vEnd - vStart) * 0.4);
      setVisibleTimeRange({
        start: Math.max(0, vStart - overscan),
        end: Math.min(duration, vEnd + overscan)
      });
    };

    computeWindow();
    el.addEventListener('scroll', computeWindow, { passive: true });
    window.addEventListener('resize', computeWindow, { passive: true });
    return () => {
      el.removeEventListener('scroll', computeWindow);
      window.removeEventListener('resize', computeWindow);
    };
  }, [duration, timelineZoom]);

  const handleTriggerRelink = (clipId: string) => {
    setRelinkingClipId(clipId);
    if (relinkInputRef.current) relinkInputRef.current.click();
  };

  const handleRelinkFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && relinkingClipId) {
      await relinkClipMedia(relinkingClipId, file);
      setRelinkingClipId(null);
    }
    e.target.value = '';
  };

  // Listen for global shortcut events (tools & marker)
  useEffect(() => {
    const handleSetTool = (e: any) => {
      if (e.detail) setActiveTool(e.detail);
    };
    const handleAddMarkerEvt = () => {
      handleAddMarkerAtPlayhead();
    };
    window.addEventListener('editor-set-tool', handleSetTool);
    window.addEventListener('editor-add-marker', handleAddMarkerEvt);
    return () => {
      window.removeEventListener('editor-set-tool', handleSetTool);
      window.removeEventListener('editor-add-marker', handleAddMarkerEvt);
    };
  }, [markers, currentTime]);

  // Dragging / Trimming state
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [trimmingHandle, setTrimmingHandle] = useState<'start' | 'end' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [origClipStart, setOrigClipStart] = useState<number>(0);
  const [origClipDuration, setOrigClipDuration] = useState<number>(0);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [trimTooltip, setTrimTooltip] = useState<{ duration: number; delta: number } | null>(null);

  // Ruler Scrubbing state
  const [isScrubbingPlayhead, setIsScrubbingPlayhead] = useState(false);

  // Hand / Pan tool state
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);
  const [panStartScroll, setPanStartScroll] = useState(0);

  // Marquee Selection Box state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    clipId: string;
  } | null>(null);
  const [speedSubmenuOpen, setSpeedSubmenuOpen] = useState(false);

  // Track renaming inline state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string>('');

  // Tracks list with lock/hide/mute/height/rename capabilities
  const [tracks, setTracks] = useState([
    { id: 'text', name: 'Text / Sub', icon: Type, color: 'border-amber-500/60 bg-amber-950/40 text-amber-300', locked: false, hidden: false, muted: false, height: 44 },
    { id: 'sticker', name: 'Sticker', icon: Smile, color: 'border-pink-500/60 bg-pink-950/40 text-pink-300', locked: false, hidden: false, muted: false, height: 44 },
    { id: 'adjustment', name: 'Adjustment', icon: Sliders, color: 'border-violet-500/60 bg-violet-950/40 text-violet-300', locked: false, hidden: false, muted: false, height: 44 },
    { id: 'video', name: 'Video 9:16', icon: Video, color: 'border-[#1FC8DB]/60 bg-cyan-950/40 text-[#1FC8DB]', locked: false, hidden: false, muted: false, height: 52 },
    { id: 'audio', name: 'Audio / BGM', icon: Music, color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300', locked: false, hidden: false, muted: false, height: 44 },
    { id: 'effect', name: 'Effects', icon: Sparkles, color: 'border-purple-500/60 bg-purple-950/40 text-purple-300', locked: false, hidden: false, muted: false, height: 44 },
    { id: 'filter', name: 'Filter', icon: Sparkles, color: 'border-sky-500/60 bg-sky-950/40 text-sky-300', locked: false, hidden: false, muted: false, height: 44 }
  ]);

  // Skimming mouse hover time
  const [skimmingTime, setSkimmingTime] = useState<number | null>(null);

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  // Load audio devices for Voiceover
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      }).catch(() => {});
    }
  }, []);

  // Auto-scroll when playhead runs out of view during playback
  useEffect(() => {
    if (!isPlaying || !timelineRef.current) return;
    const container = timelineRef.current;
    const totalPixelWidth = container.clientWidth * timelineZoom;
    const playheadPixel = (currentTime / duration) * totalPixelWidth;

    const visibleLeft = container.scrollLeft;
    const visibleRight = container.scrollLeft + container.clientWidth;

    if (playheadPixel > visibleRight - 40) {
      container.scrollLeft = playheadPixel - 120;
    } else if (playheadPixel < visibleLeft) {
      container.scrollLeft = Math.max(0, playheadPixel - 50);
    }
  }, [currentTime, isPlaying, duration, timelineZoom]);

  // Snapping helper (snaps to 0, playhead, clip boundaries, and markers)
  const snapTime = (targetTime: number, clipId: number | string): number => {
    if (!snapEnabled) return targetTime;
    const SNAP_THRESHOLD = 0.35; // seconds

    // Snap to 0 or playhead
    if (Math.abs(targetTime - 0) < SNAP_THRESHOLD) return 0;
    if (Math.abs(targetTime - currentTime) < SNAP_THRESHOLD) return currentTime;

    // Snap to markers
    for (const m of markers) {
      if (Math.abs(targetTime - m.time) < SNAP_THRESHOLD) return m.time;
    }

    // Snap to other clip boundaries
    for (const other of clips) {
      if (other.id === clipId) continue;
      const otherEnd = other.start + other.duration;
      if (Math.abs(targetTime - other.start) < SNAP_THRESHOLD) return other.start;
      if (Math.abs(targetTime - otherEnd) < SNAP_THRESHOLD) return otherEnd;
    }
    return targetTime;
  };

  // Keyboard Shortcuts (M, [, ], Q, W, S, B, V, H, Del, Shift+Del, Ctrl+C/V/X/A/G)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Marker Shortcuts
      if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleAddMarkerAtPlayhead();
        return;
      }
      if (e.code === 'BracketLeft') {
        e.preventDefault();
        handleJumpMarker('prev');
        return;
      }
      if (e.code === 'BracketRight') {
        e.preventDefault();
        handleJumpMarker('next');
        return;
      }

      // Clipboard & Selection Shortcuts
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault();
        copyClip();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        pasteClip();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyX') {
        e.preventDefault();
        cutClip();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        e.preventDefault();
        selectAllClips();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroupSelected();
        } else {
          handleGroupSelected();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        if (selectedClipId) {
          e.preventDefault();
          duplicateClip(selectedClipId);
          showToast('Đã nhân bản clip (Ctrl+D)', 'info');
        }
        return;
      }

      // Editing Tools Shortcuts
      if (e.code === 'KeyQ') {
        e.preventDefault();
        handleDeleteLeft();
      } else if (e.code === 'KeyW') {
        e.preventDefault();
        handleDeleteRight();
      } else if (e.code === 'KeyB' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('razor');
        showToast('Đã chọn công cụ Cắt (Razor / Blade)', 'info');
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        setActiveTool('select');
        showToast('Đã chọn công cụ Chọn (Select)', 'info');
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        setActiveTool('hand');
        showToast('Đã chọn công cụ Kéo cuộn (Hand / Pan)', 'info');
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId || selectedClipIds.length > 0) {
          e.preventDefault();
          if (e.shiftKey && selectedClipId) {
            handleRippleDelete(selectedClipId);
          } else {
            handleDelete();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, selectedClipIds, clips, currentTime, markers]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => {
      setPlusMenuOpen(false);
      setToolDropdownOpen(false);
      setLinkageDropdownOpen(false);
      setSkimmingDropdownOpen(false);
      setContextMenu(null);
      setSpeedSubmenuOpen(false);
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Split Action (S / Ctrl+B)
  const handleSplit = () => {
    if (selectedClipId) {
      const target = clips.find((c) => c.id === selectedClipId);
      if (target?.locked) {
        showToast('Clip này đang bị khóa, không thể cắt!', 'warning');
        return;
      }
      splitClip(selectedClipId, currentTime);
      showToast('Đã tách clip tại playhead (S)', 'info');
    } else {
      const activeClip = clips.find(
        (c) => currentTime > c.start && currentTime < c.start + c.duration
      );
      if (activeClip) {
        if (activeClip.locked) {
          showToast('Clip này đang bị khóa!', 'warning');
          return;
        }
        splitClip(activeClip.id, currentTime);
        showToast(`Đã tách clip "${activeClip.name}" (S)`, 'info');
      }
    }
  };

  // Delete Left (Q): Trims clip start up to currentTime
  const handleDeleteLeft = () => {
    if (!selectedClipId) return;
    const target = clips.find((c) => c.id === selectedClipId);
    if (!target || target.locked) return;
    if (currentTime > target.start && currentTime < target.start + target.duration) {
      const cutAmount = currentTime - target.start;
      updateClip(target.id, {
        start: currentTime,
        duration: target.duration - cutAmount,
        inPoint: (target.inPoint || 0) + cutAmount
      });
      showToast('Đã cắt bỏ phần bên trái playhead (Q)', 'info');
    }
  };

  // Delete Right (W): Trims clip end starting from currentTime
  const handleDeleteRight = () => {
    if (!selectedClipId) return;
    const target = clips.find((c) => c.id === selectedClipId);
    if (!target || target.locked) return;
    if (currentTime > target.start && currentTime < target.start + target.duration) {
      const newDuration = currentTime - target.start;
      const cutAmount = target.duration - newDuration;
      updateClip(target.id, {
        duration: newDuration,
        outPoint: (target.outPoint || 0) + cutAmount
      });
      showToast('Đã cắt bỏ phần bên phải playhead (W)', 'info');
    }
  };

  // Normal Delete
  const handleDelete = () => {
    if (!selectedClipId && selectedClipIds.length === 0) return;
    const idsToDelete = selectedClipIds.length > 0 ? selectedClipIds : [selectedClipId!];
    idsToDelete.forEach((id) => deleteClip(id));
    showToast(`Đã xóa ${idsToDelete.length} clip`, 'info');
  };

  // Ripple Delete (Shift+Del): Closes gap on the track
  const handleRippleDelete = (clipId: string) => {
    const target = clips.find((c) => c.id === clipId);
    if (!target || target.locked) return;
    const targetEnd = target.start + target.duration;
    const targetTrack = target.track;
    const gap = target.duration;

    const updatedClips = clips
      .filter((c) => c.id !== clipId)
      .map((c) => {
        if (c.track === targetTrack && c.start >= targetEnd) {
          return { ...c, start: Math.max(0, c.start - gap) };
        }
        return c;
      });

    useEditorStore.setState({
      undoStack: [...undoStack, clips],
      redoStack: [],
      clips: updatedClips,
      selectedClipId: null,
      selectedClipIds: []
    });
    showToast('Đã xóa gập (Ripple Delete)', 'info');
  };

  // Protect / Lock clip toggle
  const handleToggleLockClip = () => {
    if (!selectedClipId) return;
    const target = clips.find((c) => c.id === selectedClipId);
    if (!target) return;
    const newLock = !target.locked;
    updateClip(target.id, { locked: newLock });
    showToast(newLock ? 'Đã khóa clip (Protect/Lock ON)' : 'Đã mở khóa clip', 'info');
  };

  // Add Track Handler
  const handleAddTrack = (trackType: string) => {
    setPlusMenuOpen(false);
    const names: Record<string, string> = {
      video: 'Video phụ',
      audio: 'Audio phụ',
      text: 'Text / Phụ đề',
      sticker: 'Sticker / Shape',
      effect: 'Hiệu ứng (Effect)',
      filter: 'Bộ lọc (Filter)',
      adjustment: 'Layer Chỉnh màu'
    };
    const icons: Record<string, any> = {
      video: Video,
      audio: Music,
      text: Type,
      sticker: Smile,
      effect: Sparkles,
      filter: Sparkles,
      adjustment: Sliders
    };
    const colors: Record<string, string> = {
      video: 'border-[#1FC8DB]/60 bg-cyan-950/40 text-[#1FC8DB]',
      audio: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300',
      text: 'border-amber-500/60 bg-amber-950/40 text-amber-300',
      sticker: 'border-pink-500/60 bg-pink-950/40 text-pink-300',
      effect: 'border-purple-500/60 bg-purple-950/40 text-purple-300',
      filter: 'border-sky-500/60 bg-sky-950/40 text-sky-300',
      adjustment: 'border-violet-500/60 bg-violet-950/40 text-violet-300'
    };
    const newTrackId = `${trackType}-${Date.now()}`;
    const newTrackName = `${names[trackType] || trackType} ${tracks.filter((t) => t.id.startsWith(trackType)).length + 1}`;
    setTracks((prev) => [
      ...prev,
      {
        id: newTrackId,
        name: newTrackName,
        icon: icons[trackType] || Video,
        color: colors[trackType] || colors.video,
        locked: false,
        hidden: false,
        muted: false,
        height: trackType === 'video' ? 52 : 44
      }
    ]);
    showToast(`Đã tạo track mới: ${newTrackName}`, 'success');
  };

  // Track Header Actions
  const toggleTrackLock = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t))
    );
  };

  const toggleTrackHidden = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t))
    );
  };

  const toggleTrackMute = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    );
  };

  const toggleTrackHeight = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const cur = t.height || 44;
        const next = cur === 36 ? 52 : cur === 52 ? 68 : 36;
        return { ...t, height: next };
      })
    );
  };

  const handleStartRenameTrack = (trackId: string, currentName: string) => {
    setEditingTrackId(trackId);
    setEditingTrackName(currentName);
  };

  const handleSaveRenameTrack = (trackId: string) => {
    if (editingTrackName.trim()) {
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, name: editingTrackName.trim() } : t))
      );
    }
    setEditingTrackId(null);
  };

  // Marker Operations (phím M, nhảy marker [, ])
  const handleAddMarkerAtPlayhead = (label?: string, color?: string) => {
    const newMarker: TimelineMarker = {
      id: `m-${Date.now()}`,
      time: currentTime,
      label: label || `Marker ${markers.length + 1}`,
      color: color || '#1FC8DB'
    };
    setMarkers((prev) => [...prev, newMarker]);
    showToast(`Đã thêm marker tại ${currentTime.toFixed(1)}s (phím M)`, 'success');
  };

  const handleJumpMarker = (direction: 'prev' | 'next') => {
    if (markers.length === 0) return;
    const sorted = [...markers].sort((a, b) => a.time - b.time);
    if (direction === 'prev') {
      const prevMarkers = sorted.filter((m) => m.time < currentTime - 0.05);
      if (prevMarkers.length > 0) {
        setCurrentTime(prevMarkers[prevMarkers.length - 1].time);
        showToast(`Nhảy về Marker: ${prevMarkers[prevMarkers.length - 1].label}`, 'info');
      }
    } else {
      const nextMarkers = sorted.filter((m) => m.time > currentTime + 0.05);
      if (nextMarkers.length > 0) {
        setCurrentTime(nextMarkers[0].time);
        showToast(`Nhảy tới Marker: ${nextMarkers[0].label}`, 'info');
      }
    }
  };

  // Drop on Empty State / Timeline
  const handleDropMedia = async (e: React.DragEvent<HTMLDivElement>, targetTrackId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragged from internal Media panel
    const mediaId = e.dataTransfer.getData('mediaId');
    if (mediaId) {
      try {
        const media = await db.media.get(mediaId);
        if (media) {
          const url = URL.createObjectURL(media.blob);
          const meta = await generateMediaMetadata(media.blob as File, url);
          const isAudio = media.type === 'audio';
          const isImage = media.type === 'image';
          addClip({
            track: (targetTrackId as any) || (isAudio ? 'audio' : 'video'),
            name: media.name,
            start: currentTime,
            duration: isAudio ? 12 : isImage ? 5 : 8,
            type: media.type,
            src: url,
            thumbnailUrl: meta.thumbnailUrl,
            waveformPeaks: meta.waveformPeaks
          });
          showToast(`Đã thêm "${media.name}" vào timeline!`, 'success');
          return;
        }
      } catch (err: any) {
        console.warn('Drop mediaId failed', err);
      }
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio');
      const isVideo = file.type.startsWith('video');
      const isImage = file.type.startsWith('image');
      const meta = await generateMediaMetadata(file, url);

      const newMediaId = 'media-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      await db.media.add({
        id: newMediaId,
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        blob: file,
        size: file.size,
        createdAt: Date.now()
      });

      addClip({
        track: (targetTrackId as any) || (isAudio ? 'audio' : 'video'),
        name: file.name,
        start: currentTime,
        duration: isAudio ? 12 : isImage ? 5 : 8,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        src: url,
        thumbnailUrl: meta.thumbnailUrl,
        waveformPeaks: meta.waveformPeaks
      });
    }

    showToast(`Đã thêm ${files.length} media vào timeline!`, 'success');
  };

  // Add Media at playhead via file picker
  const handleAddMediaAtPlayhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlusMenuOpen(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio');
    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');
    const meta = await generateMediaMetadata(file, url);

    await db.media.add({
      id: 'media-' + Date.now(),
      name: file.name,
      type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
      blob: file,
      size: file.size,
      createdAt: Date.now()
    });

    addClip({
      track: isAudio ? 'audio' : 'video',
      name: file.name,
      start: currentTime,
      duration: isAudio ? 12 : isImage ? 5 : 8,
      type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
      src: url,
      thumbnailUrl: meta.thumbnailUrl,
      waveformPeaks: meta.waveformPeaks
    });

    showToast(`Đã chèn "${file.name}" tại playhead!`, 'success');
  };

  // Voiceover Handlers
  const handleStartVoiceoverCountdown = () => {
    setVoiceoverCountdown(3);
    const countInt = setInterval(() => {
      setVoiceoverCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countInt);
          startActualVoiceover();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startActualVoiceover = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      });
      voChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      voMediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(voChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        const file = new File([audioBlob], `voiceover-${Date.now()}.webm`, { type: 'audio/webm' });
        const meta = await generateMediaMetadata(file, url);

        await db.media.add({
          id: 'media-' + Date.now(),
          name: 'Voiceover Recording',
          type: 'audio',
          blob: audioBlob,
          size: audioBlob.size,
          createdAt: Date.now()
        });

        addClip({
          track: 'audio',
          name: `Voiceover (${voTimer}s)`,
          start: currentTime,
          duration: Math.max(1, voTimer),
          type: 'audio',
          src: url,
          volume: 1.0,
          waveformPeaks: meta.waveformPeaks
        });

        stream.getTracks().forEach((t) => t.stop());
        setIsRecordingVo(false);
        setVoTimer(0);
        setVoiceoverOpen(false);
        showToast('Đã lưu đoạn ghi âm vào track Audio tại playhead!', 'success');
      };

      recorder.start();
      setIsRecordingVo(true);
      setVoTimer(0);
      voTimerRef.current = setInterval(() => {
        setVoTimer((t) => t + 1);
      }, 1000);
    } catch (err: any) {
      showToast('Lỗi truy cập micro: ' + err.message, 'error');
    }
  };

  const handleStopVoiceover = () => {
    if (voMediaRecorderRef.current && isRecordingVo) {
      clearInterval(voTimerRef.current);
      voMediaRecorderRef.current.stop();
    }
  };

  // Playhead Needle Scrubbing
  const updatePlayheadFromClientX = (clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left + timelineRef.current.scrollLeft;
    const totalPixelWidth = rect.width * timelineZoom;
    const targetTime = Math.max(0, Math.min(duration, (x / totalPixelWidth) * duration));
    setCurrentTime(targetTime);
  };

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsScrubbingPlayhead(true);
    updatePlayheadFromClientX(e.clientX);
  };

  const handlePlayheadPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
    setIsScrubbingPlayhead(true);
    updatePlayheadFromClientX(e.clientX);
  };

  const handlePlayheadPointerMove = (e: React.PointerEvent) => {
    if (isScrubbingPlayhead) {
      e.preventDefault();
      updatePlayheadFromClientX(e.clientX);
    }
  };

  const handlePlayheadPointerUp = (e: React.PointerEvent) => {
    if (isScrubbingPlayhead) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      setIsScrubbingPlayhead(false);
    }
  };

  // Timeline Canvas Click / Tool Handler
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const totalPixelWidth = rect.width * timelineZoom;
    const clickTime = Math.max(0, Math.min(duration, (clickX / totalPixelWidth) * duration));

    if (activeTool === 'razor') {
      const clickedClip = clips.find((c) => clickTime >= c.start && clickTime <= c.start + c.duration);
      if (clickedClip) {
        if (clickedClip.locked) {
          showToast('Clip này đang bị khóa!', 'warning');
          return;
        }
        splitClip(clickedClip.id, clickTime);
        showToast('Đã cắt clip bằng dao cắt (Razor Blade)!', 'success');
        return;
      }
    }

    setCurrentTime(clickTime);
  };

  // Timeline Mouse Move (Skimming preview & Scrubbing)
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const totalWidth = rect.width * timelineZoom;
    const hoverTime = Math.max(0, Math.min(duration, (hoverX / totalWidth) * duration));

    if (previewSkimming && !draggingClipId && !isScrubbingPlayhead) {
      setSkimmingTime(hoverTime);
      setCurrentTime(hoverTime);
    } else {
      setSkimmingTime(null);
    }
  };

  const handleTimelineMouseLeave = () => {
    setSkimmingTime(null);
  };

  // Hand / Pan Tool Dragging
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'hand' && timelineRef.current) {
      setIsPanning(true);
      setPanStartX(e.clientX);
      setPanStartScroll(timelineRef.current.scrollLeft);
    }
  };

  // Timeline Background Mouse Down (Marquee Lasso Selection or Deselect)
  const handleTimelineBgMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'hand') {
      handlePanMouseDown(e);
      return;
    }
    if (activeTool === 'razor') {
      handleTimelineClick(e);
      return;
    }

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      selectClip(null);
    }

    setIsMarqueeSelecting(true);
    setMarqueeStart({ x: e.clientX, y: e.clientY });
    setMarqueeCurrent({ x: e.clientX, y: e.clientY });
  };

  // Ctrl + Wheel to Zoom
  const handleTimelineWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const newZoom = Math.max(0.5, Math.min(4.0, timelineZoom + delta));
      setTimelineZoom(parseFloat(newZoom.toFixed(2)));
    }
  };

  // Touch Pinch-to-zoom & Pointer gestures for tablet/touch devices
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(timelineZoom);

  const handleTimelinePointerDown = (e: React.PointerEvent) => {
    touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touchPointersRef.current.size === 2) {
      const [p1, p2] = Array.from(touchPointersRef.current.values());
      initialPinchDistRef.current = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      initialZoomRef.current = timelineZoom;
    }
  };

  const handleTimelinePointerMove = (e: React.PointerEvent) => {
    if (touchPointersRef.current.has(e.pointerId)) {
      touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (touchPointersRef.current.size === 2 && initialPinchDistRef.current) {
      const [p1, p2] = Array.from(touchPointersRef.current.values());
      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const ratio = currentDist / Math.max(10, initialPinchDistRef.current);
      const targetZoom = Math.max(0.5, Math.min(4.0, initialZoomRef.current * ratio));
      setTimelineZoom(parseFloat(targetZoom.toFixed(2)));
    }
  };

  const handleTimelinePointerUp = (e: React.PointerEvent) => {
    touchPointersRef.current.delete(e.pointerId);
    if (touchPointersRef.current.size < 2) {
      initialPinchDistRef.current = null;
    }
  };

  // Fit timeline to window
  const handleFitTimeline = () => {
    setTimelineZoom(1.0);
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = 0;
    }
    showToast('Đã căn vừa Timeline vào khung nhìn', 'info');
  };

  // Clip Mouse Down (Select, Alt+Duplicate, Dragging)
  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    const parentTrack = tracks.find((t) => t.id === clip.track);
    const isLocked = clip.locked || parentTrack?.locked;

    if (activeTool === 'razor') {
      if (isLocked) {
        showToast('Clip hoặc Track này đang bị khóa!', 'warning');
        return;
      }
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0);
      const totalWidth = rect.width * timelineZoom;
      const cutTime = (clickX / totalWidth) * duration;
      splitClip(clip.id, cutTime);
      showToast('Đã cắt clip bằng dao cắt (Razor Blade)!', 'success');
      return;
    }

    // Multi-selection with Shift or Ctrl
    const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
    selectClip(clip.id, isMulti);

    if (isLocked) return;

    // Alt + Drag = Duplicate Clip
    if (e.altKey) {
      const duplicated: TimelineClip = {
        ...clip,
        id: 'clip-' + Date.now(),
        name: `${clip.name} (Copy)`,
        start: clip.start + 0.3
      };
      addClip(duplicated);
      selectClip(duplicated.id);
      setDraggingClipId(duplicated.id);
      setTrimmingHandle(null);
      setDragStartX(e.clientX);
      setOrigClipStart(duplicated.start);
      setOrigClipDuration(duplicated.duration);
      showToast('Đã nhân bản clip (Alt+Kéo)', 'info');
      return;
    }

    setDraggingClipId(clip.id);
    setTrimmingHandle(null);
    setDragStartX(e.clientX);
    setOrigClipStart(clip.start);
    setOrigClipDuration(clip.duration);
  };

  // Clip Pointer Down with 500ms Long-Press Timer for Mobile Context Menu
  const handleClipPointerDown = (e: React.PointerEvent, clip: TimelineClip) => {
    const parentTrack = tracks.find((t) => t.id === clip.track);
    const isLocked = clip.locked || parentTrack?.locked;

    isLongPressTriggeredRef.current = false;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };

    // 500ms long-press timer for touchscreens
    if (e.pointerType === 'touch') {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(50); } catch (_) {}
        }
        selectClip(clip.id);
        setContextMenu({
          open: true,
          x: Math.min(window.innerWidth - 230, Math.max(10, e.clientX)),
          y: Math.min(window.innerHeight - 380, Math.max(10, e.clientY)),
          clipId: clip.id
        });
        setDraggingClipId(null);
      }, 500);
    }

    if (activeTool === 'razor') return;

    if (!isLocked) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}

      selectClip(clip.id, e.shiftKey || e.ctrlKey || e.metaKey);
      setDraggingClipId(clip.id);
      setTrimmingHandle(null);
      setDragStartX(e.clientX);
      setOrigClipStart(clip.start);
      setOrigClipDuration(clip.duration);
    }
  };

  const handleClipPointerMove = (e: React.PointerEvent) => {
    // Cancel long press if finger movement exceeds 8px jitter threshold
    const dist = Math.hypot(e.clientX - touchStartPosRef.current.x, e.clientY - touchStartPosRef.current.y);
    if (dist > 8 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClipPointerUp = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  // Trim Start Pointer Handle
  const handleTrimStartPointerDown = (e: React.PointerEvent, clip: TimelineClip) => {
    e.stopPropagation();
    const parentTrack = tracks.find((t) => t.id === clip.track);
    if (clip.locked || parentTrack?.locked) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}

    selectClip(clip.id);
    setDraggingClipId(clip.id);
    setTrimmingHandle('start');
    setDragStartX(e.clientX);
    setOrigClipStart(clip.start);
    setOrigClipDuration(clip.duration);
    setTrimTooltip({ duration: clip.duration, delta: 0 });
  };

  // Trim Start Handle
  const handleTrimStartMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    const parentTrack = tracks.find((t) => t.id === clip.track);
    if (clip.locked || parentTrack?.locked) return;

    selectClip(clip.id);
    setDraggingClipId(clip.id);
    setTrimmingHandle('start');
    setDragStartX(e.clientX);
    setOrigClipStart(clip.start);
    setOrigClipDuration(clip.duration);
    setTrimTooltip({ duration: clip.duration, delta: 0 });
  };

  // Trim End Pointer Handle
  const handleTrimEndPointerDown = (e: React.PointerEvent, clip: TimelineClip) => {
    e.stopPropagation();
    const parentTrack = tracks.find((t) => t.id === clip.track);
    if (clip.locked || parentTrack?.locked) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}

    selectClip(clip.id);
    setDraggingClipId(clip.id);
    setTrimmingHandle('end');
    setDragStartX(e.clientX);
    setOrigClipStart(clip.start);
    setOrigClipDuration(clip.duration);
    setTrimTooltip({ duration: clip.duration, delta: 0 });
  };

  // Trim End Handle
  const handleTrimEndMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    const parentTrack = tracks.find((t) => t.id === clip.track);
    if (clip.locked || parentTrack?.locked) return;

    selectClip(clip.id);
    setDraggingClipId(clip.id);
    setTrimmingHandle('end');
    setDragStartX(e.clientX);
    setOrigClipStart(clip.start);
    setOrigClipDuration(clip.duration);
    setTrimTooltip({ duration: clip.duration, delta: 0 });
  };

  // Global Mouse Move for dragging / trimming / marquee / scrubbing
  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    // 1. Playhead scrubbing
    if (isScrubbingPlayhead) {
      updatePlayheadFromClientX(e.clientX);
      return;
    }

    // 2. Hand tool panning
    if (isPanning && timelineRef.current) {
      const dx = e.clientX - panStartX;
      timelineRef.current.scrollLeft = panStartScroll - dx;
      return;
    }

    // 3. Marquee selection
    if (isMarqueeSelecting && marqueeStart) {
      setMarqueeCurrent({ x: e.clientX, y: e.clientY });
      const x1 = Math.min(marqueeStart.x, e.clientX);
      const x2 = Math.max(marqueeStart.x, e.clientX);
      const y1 = Math.min(marqueeStart.y, e.clientY);
      const y2 = Math.max(marqueeStart.y, e.clientY);

      const hitIds: string[] = [];
      const clipEls = document.querySelectorAll('[data-clip-id]');
      clipEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right >= x1 && r.left <= x2 && r.bottom >= y1 && r.top <= y2) {
          const cid = el.getAttribute('data-clip-id');
          if (cid) hitIds.push(cid);
        }
      });
      if (hitIds.length > 0) {
        setSelectedClipIds(hitIds);
      }
      return;
    }

    // 4. Clip dragging & trimming
    if (!draggingClipId || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const totalPixelWidth = rect.width * timelineZoom;
    const deltaX = e.clientX - dragStartX;
    const deltaSeconds = (deltaX / totalPixelWidth) * duration;

    // Detect hovered track under mouse cursor
    const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
    const trackRowEl = elementUnder?.closest('[data-track-id]');
    if (trackRowEl) {
      const tid = trackRowEl.getAttribute('data-track-id');
      if (tid && tid !== hoveredTrackId) {
        setHoveredTrackId(tid);
      }
    }

    if (trimmingHandle === 'start') {
      const rawStart = origClipStart + deltaSeconds;
      const maxStart = origClipStart + origClipDuration - 0.5;
      const clamped = Math.max(0, Math.min(maxStart, rawStart));
      const snapped = snapTime(clamped, draggingClipId);
      trimClipStart(draggingClipId, snapped);
      const newDur = Math.max(0.5, origClipStart + origClipDuration - snapped);
      setTrimTooltip({ duration: newDur, delta: deltaSeconds });
    } else if (trimmingHandle === 'end') {
      const rawEnd = origClipStart + origClipDuration + deltaSeconds;
      const minEnd = origClipStart + 0.5;
      const clamped = Math.max(minEnd, rawEnd);
      const snapped = snapTime(clamped, draggingClipId);
      trimClipEnd(draggingClipId, snapped);
      const newDur = Math.max(0.5, snapped - origClipStart);
      setTrimTooltip({ duration: newDur, delta: deltaSeconds });
    } else {
      // Moving clip
      const rawStart = origClipStart + deltaSeconds;
      const snapped = snapTime(Math.max(0, rawStart), draggingClipId);
      const targetClip = clips.find((c) => c.id === draggingClipId);

      // Group moving: move all clips in the same group together
      if (targetClip?.groupId) {
        const offset = snapped - origClipStart;
        clips.forEach((c) => {
          if (c.groupId === targetClip.groupId) {
            updateClip(c.id, { start: Math.max(0, c.start + offset) });
          }
        });
      } else if (linkageEnabled && targetClip?.linkedGroupId) {
        const offset = snapped - origClipStart;
        clips.forEach((c) => {
          if (c.linkedGroupId === targetClip.linkedGroupId) {
            updateClip(c.id, { start: Math.max(0, c.start + offset) });
          }
        });
      } else {
        updateClip(draggingClipId, { start: snapped });
      }
    }
  };

  const handleGlobalMouseUp = () => {
    if (isScrubbingPlayhead) setIsScrubbingPlayhead(false);
    if (isPanning) setIsPanning(false);
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeCurrent(null);
    }
    setTrimTooltip(null);

    if (draggingClipId) {
      // Move clip to hovered track if dropped on another track
      if (hoveredTrackId) {
        const targetClip = clips.find((c) => c.id === draggingClipId);
        if (targetClip && targetClip.track !== hoveredTrackId) {
          updateClip(draggingClipId, { track: hoveredTrackId as any });
          showToast(`Đã chuyển clip sang track ${hoveredTrackId}`, 'info');
        }
      }

      // Main track magnet: snap adjacent clips together on main track if enabled
      if (mainTrackMagnet) {
        const mainClips = clips.filter((c) => c.track === 'video').sort((a, b) => a.start - b.start);
        let curHead = 0;
        mainClips.forEach((mc) => {
          if (Math.abs(mc.start - curHead) < 0.8) {
            updateClip(mc.id, { start: curHead });
            curHead += mc.duration;
          } else {
            curHead = mc.start + mc.duration;
          }
        });
      }

      setDraggingClipId(null);
      setTrimmingHandle(null);
      setHoveredTrackId(null);
    }
  };

  useEffect(() => {
    if (draggingClipId || trimmingHandle || isScrubbingPlayhead) {
      const handleWindowPointerMove = (e: PointerEvent) => {
        handleGlobalMouseMove(e as any);
      };
      const handleWindowPointerUp = () => {
        handleGlobalMouseUp();
      };
      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerUp);
      window.addEventListener('pointercancel', handleWindowPointerUp);
      return () => {
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerUp);
        window.removeEventListener('pointercancel', handleWindowPointerUp);
      };
    }
  }, [draggingClipId, trimmingHandle, isScrubbingPlayhead, dragStartX, origClipStart, origClipDuration, duration, timelineZoom, clips, tracks, hoveredTrackId]);

  // Context Menu Actions
  const handleClipContextMenu = (e: React.MouseEvent, clip: TimelineClip) => {
    e.preventDefault();
    e.stopPropagation();
    selectClip(clip.id);
    setContextMenu({
      open: true,
      x: Math.min(window.innerWidth - 230, e.clientX),
      y: Math.min(window.innerHeight - 380, e.clientY),
      clipId: clip.id
    });
  };

  // 1. Detach Audio
  const handleDetachAudio = (clipId: string) => {
    const target = clips.find((c) => c.id === clipId);
    if (!target || !target.src) return;
    updateClip(target.id, { volume: 0 });
    const audioClip: TimelineClip = {
      ...target,
      id: 'clip-audio-' + Date.now(),
      track: 'audio',
      type: 'audio',
      name: `${target.name} (Audio)`,
      volume: 1.0,
      linkedGroupId: target.linkedGroupId || `link-${Date.now()}`
    };
    if (!target.linkedGroupId) {
      updateClip(target.id, { linkedGroupId: audioClip.linkedGroupId });
    }
    addClip(audioClip);
    showToast('Đã tách âm thanh của video ra track Audio riêng!', 'success');
  };

  // 2. Freeze Frame
  const handleFreezeFrame = (clipId: string) => {
    const target = clips.find((c) => c.id === clipId);
    if (!target) return;
    const freezeClip: TimelineClip = {
      ...target,
      id: 'clip-freeze-' + Date.now(),
      name: `${target.name} (Freeze Frame)`,
      start: currentTime,
      duration: 3,
      inPoint: currentTime - target.start
    };
    addClip(freezeClip);
    showToast('Đã tạo khung hình tĩnh (Freeze Frame) 3s!', 'success');
  };

  // 3. Reverse Toggle
  const handleToggleReverse = (clipId: string) => {
    const target = clips.find((c) => c.id === clipId);
    if (!target) return;
    const nextRev = !target.reverse;
    updateClip(clipId, { reverse: nextRev });
    showToast(nextRev ? 'Đã bật tua ngược clip (Reverse)' : 'Đã tắt tua ngược', 'info');
  };

  // 4. Speed Setting
  const handleChangeSpeed = (clipId: string, spd: number) => {
    updateClip(clipId, { speed: spd });
    setSpeedSubmenuOpen(false);
    showToast(`Đã chỉnh tốc độ: ${spd}x`, 'info');
  };

  // 5. Group / Ungroup
  const handleGroupSelected = () => {
    const targets = selectedClipIds.length > 0 ? selectedClipIds : selectedClipId ? [selectedClipId] : [];
    if (targets.length < 2) {
      showToast('Cần chọn từ 2 clip trở lên để nhóm (Shift/Ctrl+Click)', 'info');
      return;
    }
    const gid = `grp-${Date.now()}`;
    targets.forEach((id) => updateClip(id, { groupId: gid }));
    showToast(`Đã nhóm ${targets.length} clip (Ctrl+G)`, 'success');
  };

  const handleUngroupSelected = () => {
    const targets = selectedClipIds.length > 0 ? selectedClipIds : selectedClipId ? [selectedClipId] : [];
    targets.forEach((id) => updateClip(id, { groupId: undefined }));
    showToast('Đã hủy nhóm (Ungroup)', 'info');
  };

  // 6. Create Compound Clip
  const handleCreateCompoundClip = () => {
    const targets = selectedClipIds.length > 0 ? selectedClipIds : selectedClipId ? [selectedClipId] : [];
    if (targets.length < 2) {
      showToast('Cần chọn từ 2 clip trở lên để tạo Compound Clip', 'info');
      return;
    }
    const compoundChildren = clips.filter((c) => targets.includes(c.id));
    const minStart = Math.min(...compoundChildren.map((c) => c.start));
    const maxEnd = Math.max(...compoundChildren.map((c) => c.start + c.duration));

    const compoundClip: TimelineClip = createClip({
      id: 'compound-' + Date.now(),
      name: `Compound Clip (${compoundChildren.length} clips)`,
      track: 'video',
      type: 'video',
      start: minStart,
      duration: Math.max(1, maxEnd - minStart),
      isCompound: true,
      compoundClips: compoundChildren
    });

    useEditorStore.setState({
      undoStack: [...undoStack, clips],
      redoStack: [],
      clips: [...clips.filter((c) => !targets.includes(c.id)), compoundClip],
      selectedClipId: compoundClip.id,
      selectedClipIds: [compoundClip.id]
    });
    showToast('Đã tạo Compound Clip (Subproject)!', 'success');
  };

  // Ruler SMPTE Timecode Formatter
  const formatRulerTimecode = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const f = Math.floor((sec % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={handleGlobalMouseUp}
      onMouseLeave={handleGlobalMouseUp}
      onPointerMove={(e) => handleGlobalMouseMove(e as any)}
      onPointerUp={handleGlobalMouseUp}
      onPointerCancel={handleGlobalMouseUp}
      className="h-full flex flex-col bg-[#141414] border-t border-[#333333] select-none text-xs text-[#E6E6E6]"
    >
      {/* ======================================================== */}
      {/* TIMELINE TOOLBAR (SECTION 6)                             */}
      {/* ======================================================== */}
      <div className="h-10 px-3 bg-[#1F1F1F] border-b border-[#333333] flex items-center justify-between z-30 shrink-0 overflow-x-auto scrollbar-none gap-4">
        {/* Left Side: + Menu, Tools, Undo/Redo, Split/Delete, Lock */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. "+" Button with Green Notification Dot */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlusMenuOpen(!plusMenuOpen);
              }}
              className="relative p-1.5 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] hover:border-[#1FC8DB] text-white transition-colors"
              title="Thêm Track, Marker hoặc Media"
            >
              <Plus className="w-3.5 h-3.5 text-[#1FC8DB]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#1F1F1F] animate-pulse" />
            </button>

            {/* "+" Dropdown Menu */}
            {plusMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-1 w-52 rounded-md bg-[#1F1F1F] border border-[#333333] shadow-2xl py-1.5 text-xs text-[#E6E6E6] z-50 flex flex-col gap-0.5"
              >
                <div className="px-3 py-1 text-[10px] text-[#8A8A8A] font-bold uppercase">Thêm Track mới</div>
                {[
                  { id: 'video', label: '+ Video track' },
                  { id: 'audio', label: '+ Audio track' },
                  { id: 'text', label: '+ Text track' },
                  { id: 'sticker', label: '+ Sticker track' },
                  { id: 'effect', label: '+ Effect track' },
                  { id: 'filter', label: '+ Filter track' },
                  { id: 'adjustment', label: '+ Adjustment track' }
                ].map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => handleAddTrack(tr.id)}
                    className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left transition-colors"
                  >
                    {tr.label}
                  </button>
                ))}

                <div className="h-[1px] bg-[#333333] my-1" />

                <button
                  onClick={() => {
                    setPlusMenuOpen(false);
                    handleAddMarkerAtPlayhead();
                  }}
                  className="px-3 py-1.5 hover:bg-[#262626] text-left flex items-center gap-1.5 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Thêm Marker tại playhead (M)</span>
                </button>

                <button
                  onClick={() => addMediaInputRef.current?.click()}
                  className="px-3 py-1.5 hover:bg-[#262626] text-left flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#1FC8DB]" />
                  <span>+ Thêm Media tại playhead</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden Media Input */}
          <input
            ref={addMediaInputRef}
            type="file"
            accept="video/*,audio/*,image/*"
            onChange={handleAddMediaAtPlayhead}
            className="hidden"
          />

          {/* 2. Tool Dropdown: Select (V) / Razor (B) / Hand (H) */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToolDropdownOpen(!toolDropdownOpen);
              }}
              className="px-2 py-1 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] text-white flex items-center gap-1.5 transition-colors"
              title="Công cụ chỉnh sửa (Select / Razor / Hand)"
            >
              {activeTool === 'select' && <MousePointer className="w-3.5 h-3.5 text-[#1FC8DB]" />}
              {activeTool === 'razor' && <Scissors className="w-3.5 h-3.5 text-rose-400" />}
              {activeTool === 'hand' && <Hand className="w-3.5 h-3.5 text-amber-400" />}
              <span className="capitalize text-[11px] font-semibold">
                {activeTool === 'select' ? 'Select (V)' : activeTool === 'razor' ? 'Razor (B)' : 'Hand (H)'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#8A8A8A]" />
            </button>

            {toolDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-1 w-40 rounded-md bg-[#1F1F1F] border border-[#333333] shadow-2xl py-1 text-xs text-[#E6E6E6] z-50 flex flex-col gap-0.5"
              >
                <button
                  onClick={() => {
                    setActiveTool('select');
                    setToolDropdownOpen(false);
                  }}
                  className={`px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] ${
                    activeTool === 'select' ? 'text-[#1FC8DB] font-bold' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MousePointer className="w-3.5 h-3.5" />
                    <span>Select (V)</span>
                  </span>
                  {activeTool === 'select' && <Check className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => {
                    setActiveTool('razor');
                    setToolDropdownOpen(false);
                  }}
                  className={`px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] ${
                    activeTool === 'razor' ? 'text-rose-400 font-bold' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-rose-400" />
                    <span>Razor (B)</span>
                  </span>
                  {activeTool === 'razor' && <Check className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => {
                    setActiveTool('hand');
                    setToolDropdownOpen(false);
                  }}
                  className={`px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] ${
                    activeTool === 'hand' ? 'text-amber-400 font-bold' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Hand className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hand (H)</span>
                  </span>
                  {activeTool === 'hand' && <Check className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-[#333333] mx-0.5" />

          {/* 3. Undo / Redo */}
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className={`p-1.5 rounded-md transition-colors ${
              undoStack.length > 0 ? 'hover:bg-[#262626] text-white hover:text-[#1FC8DB]' : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={undoStack.length === 0 ? 'Không có thao tác nào để hoàn tác (Ctrl+Z)' : 'Hoàn tác (Ctrl+Z)'}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className={`p-1.5 rounded-md transition-colors ${
              redoStack.length > 0 ? 'hover:bg-[#262626] text-white hover:text-[#1FC8DB]' : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={redoStack.length === 0 ? 'Không có thao tác nào để làm lại (Ctrl+Y)' : 'Làm lại (Ctrl+Shift+Z / Ctrl+Y)'}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-[#333333] mx-0.5" />

          {/* 4. Split (S / Ctrl+B) */}
          <button
            onClick={handleSplit}
            className="p-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-white rounded-md transition-colors"
            title="Tách clip tại playhead (Phím C hoặc S)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          {/* Delete Left (Q) */}
          <button
            onClick={handleDeleteLeft}
            disabled={!selectedClipId}
            className={`p-1.5 rounded-md transition-colors ${
              selectedClipId ? 'hover:bg-[#262626] hover:text-[#1FC8DB] text-white' : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={!selectedClipId ? 'Vui lòng chọn một clip trên timeline để cắt trái (Phím Q)' : 'Cắt bỏ phần bên trái playhead (Phím Q)'}
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
          </button>

          {/* Delete Right (W) */}
          <button
            onClick={handleDeleteRight}
            disabled={!selectedClipId}
            className={`p-1.5 rounded-md transition-colors ${
              selectedClipId ? 'hover:bg-[#262626] hover:text-[#1FC8DB] text-white' : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={!selectedClipId ? 'Vui lòng chọn một clip trên timeline để cắt phải (Phím W)' : 'Cắt bỏ phần bên phải playhead (Phím W)'}
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
          </button>

          {/* Delete (Del / Shift+Del = ripple delete) */}
          <button
            onClick={handleDelete}
            disabled={!selectedClipId && selectedClipIds.length === 0}
            className={`p-1.5 rounded-md transition-colors ${
              selectedClipId || selectedClipIds.length > 0 ? 'hover:bg-rose-950/40 text-rose-300' : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={!selectedClipId && selectedClipIds.length === 0 ? 'Vui lòng chọn một clip trên timeline để xóa' : 'Xóa clip (Del) / Giữ Shift+Del để xóa gập (Ripple Delete)'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-[#333333] mx-0.5" />

          {/* 5. Protect / Lock Clip Button */}
          <button
            onClick={handleToggleLockClip}
            disabled={!selectedClipId}
            className={`p-1.5 rounded-md transition-colors ${
              selectedClip?.locked
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : selectedClipId
                ? 'hover:bg-[#262626] text-white hover:text-amber-400'
                : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={!selectedClipId ? 'Vui lòng chọn một clip để khóa hoặc mở khóa' : selectedClip?.locked ? 'Mở khóa clip này' : 'Khóa clip bảo vệ không cho sửa/xóa nhầm'}
          >
            {selectedClip?.locked ? <Lock className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
          </button>

          <div className="h-4 w-[1px] bg-[#333333] mx-0.5" />

          {/* 6. CapCut Quick Actions: Freeze Frame, Reverse, Rotate 90°, Flip Horizontal */}
          <button
            onClick={() => selectedClipId && handleFreezeFrame(selectedClipId)}
            disabled={!selectedClipId}
            className={`p-1.5 rounded-md transition-colors ${
              selectedClip?.freezeFrame || selectedClip?.isFreeze
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : selectedClipId
                ? 'hover:bg-[#262626] text-white hover:text-sky-400'
                : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={!selectedClipId ? 'Chọn một clip để dừng hình' : 'Tạo đoạn dừng hình 3s (Freeze Frame)'}
          >
            <Snowflake className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (!selectedClipId || !selectedClip) return;
              const nextRev = !selectedClip.reverse;
              updateClip(selectedClipId, { reverse: nextRev, isReversed: nextRev });
              showToast(nextRev ? 'Đã bật tua ngược clip (Reverse)' : 'Đã tắt tua ngược', 'info');
            }}
            disabled={!selectedClipId}
            className={`p-1.5 rounded-md transition-colors ${
              selectedClip?.reverse
                ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]/40'
                : selectedClipId
                ? 'hover:bg-[#262626] text-white hover:text-[#1FC8DB]'
                : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={!selectedClipId ? 'Chọn một clip để tua ngược' : 'Tua ngược clip (Reverse)'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (!selectedClipId || !selectedClip) return;
              const curRot = selectedClip.rotation || selectedClip.transform?.rotation || 0;
              const nextRot = (curRot + 90) % 360;
              updateClip(selectedClipId, {
                rotation: nextRot,
                transform: { ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), rotation: nextRot }
              });
              showToast(`Đã xoay clip sang ${nextRot}°`, 'info');
            }}
            disabled={!selectedClipId}
            className={`p-1.5 rounded-md transition-colors ${
              selectedClipId
                ? 'hover:bg-[#262626] text-white hover:text-[#1FC8DB]'
                : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={!selectedClipId ? 'Chọn một clip để xoay' : 'Xoay clip 90° (Rotate 90°)'}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (!selectedClipId || !selectedClip) return;
              const nextFlip = !selectedClip.flipX;
              updateClip(selectedClipId, {
                flipX: nextFlip,
                transform: { ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), flipX: nextFlip }
              });
              showToast(nextFlip ? 'Đã lật gương ngang clip (Flip X)' : 'Đã khôi phục hướng lật', 'info');
            }}
            disabled={!selectedClipId}
            className={`p-1.5 rounded-md transition-colors ${
              selectedClip?.flipX
                ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]/40'
                : selectedClipId
                ? 'hover:bg-[#262626] text-white hover:text-[#1FC8DB]'
                : 'text-[#8A8A8A]/40 cursor-not-allowed'
            }`}
            title={!selectedClipId ? 'Chọn một clip để lật gương' : 'Lật gương ngang (Flip Horizontal)'}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Side: Voiceover, 4 Cyan Toggles, Zoom */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voiceover Mic Button */}
          <button
            onClick={() => setVoiceoverOpen(true)}
            className="p-1.5 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] hover:border-[#1FC8DB] text-[#1FC8DB] transition-colors"
            title="Ghi âm lồng tiếng tại playhead (Voiceover)"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-[#333333] mx-0.5" />

          {/* 4 Cyan Toggle Buttons */}

          {/* 1. Main Track Magnet */}
          <button
            onClick={() => {
              setMainTrackMagnet(!mainTrackMagnet);
              showToast(mainTrackMagnet ? 'Đã tắt Main track magnet' : 'Đã bật Main track magnet (tự dồn clip)', 'info');
            }}
            className={`p-1.5 rounded-md border transition-all ${
              mainTrackMagnet
                ? 'bg-[#1FC8DB]/20 border-[#1FC8DB] text-[#1FC8DB] shadow-[0_0_8px_rgba(31,200,219,0.3)]'
                : 'bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-white'
            }`}
            title="Main track magnet: Tự dồn clip không để hở trên track chính"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* 2. Auto Snapping */}
          <button
            onClick={toggleSnap}
            className={`p-1.5 rounded-md border transition-all ${
              snapEnabled
                ? 'bg-[#1FC8DB]/20 border-[#1FC8DB] text-[#1FC8DB] shadow-[0_0_8px_rgba(31,200,219,0.3)]'
                : 'bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-white'
            }`}
            title={snapEnabled ? 'Auto Snapping: BẬT (Hút playhead/đầu-cuối clip/marker)' : 'Auto Snapping: TẮT'}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* 3. Linkage with Dropdown */}
          <div className="relative flex items-center">
            <button
              onClick={() => {
                setLinkageEnabled(!linkageEnabled);
                showToast(linkageEnabled ? 'Đã tắt liên kết clip (Unlink)' : 'Đã bật liên kết clip (Linkage)', 'info');
              }}
              className={`p-1.5 rounded-l-md border-y border-l transition-all ${
                linkageEnabled
                  ? 'bg-[#1FC8DB]/20 border-[#1FC8DB] text-[#1FC8DB] shadow-[0_0_8px_rgba(31,200,219,0.3)]'
                  : 'bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-white'
              }`}
              title="Linkage: Video & Audio cùng clip di chuyển đồng bộ"
            >
              {linkageEnabled ? <Link className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLinkageDropdownOpen(!linkageDropdownOpen);
              }}
              className={`p-1 rounded-r-md border transition-all ${
                linkageEnabled
                  ? 'bg-[#1FC8DB]/20 border-[#1FC8DB] text-[#1FC8DB]'
                  : 'bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-white'
              }`}
              title="Tùy chọn Linkage"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {linkageDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full right-0 mt-1 w-48 rounded-md bg-[#1F1F1F] border border-[#333333] shadow-2xl py-1 text-xs text-[#E6E6E6] z-50 flex flex-col gap-0.5"
              >
                <button
                  onClick={() => {
                    setLinkageEnabled(!linkageEnabled);
                    setLinkageDropdownOpen(false);
                  }}
                  className="px-3 py-1.5 hover:bg-[#262626] text-left flex items-center justify-between"
                >
                  <span>{linkageEnabled ? 'Tắt Linkage (Unlink)' : 'Bật Linkage (Link)'}</span>
                  {linkageEnabled && <Check className="w-3 h-3 text-[#1FC8DB]" />}
                </button>
                <button
                  onClick={() => {
                    handleGroupSelected();
                    setLinkageDropdownOpen(false);
                  }}
                  className="px-3 py-1.5 hover:bg-[#262626] text-left"
                >
                  Liên kết clip đang chọn (Link selected)
                </button>
              </div>
            )}
          </div>

          {/* 4. Preview Axis / Skimming with Dropdown */}
          <div className="relative flex items-center">
            <button
              onClick={() => {
                setPreviewSkimming(!previewSkimming);
                showToast(previewSkimming ? 'Đã tắt Preview Skimming' : 'Đã bật Preview Skimming (rê chuột xem trước)', 'info');
              }}
              className={`p-1.5 rounded-l-md border-y border-l transition-all ${
                previewSkimming
                  ? 'bg-[#1FC8DB]/20 border-[#1FC8DB] text-[#1FC8DB] shadow-[0_0_8px_rgba(31,200,219,0.3)]'
                  : 'bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-white'
              }`}
              title="Preview axis: Rê chuột trên timeline để xem trước khung hình (Skimming)"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSkimmingDropdownOpen(!skimmingDropdownOpen);
              }}
              className={`p-1 rounded-r-md border transition-all ${
                previewSkimming
                  ? 'bg-[#1FC8DB]/20 border-[#1FC8DB] text-[#1FC8DB]'
                  : 'bg-[#262626] border-[#333333] text-[#8A8A8A] hover:text-white'
              }`}
              title="Tùy chọn Preview Axis"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {skimmingDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full right-0 mt-1 w-48 rounded-md bg-[#1F1F1F] border border-[#333333] shadow-2xl py-1 text-xs text-[#E6E6E6] z-50 flex flex-col gap-0.5"
              >
                <button
                  onClick={() => {
                    setPreviewSkimming(!previewSkimming);
                    setSkimmingDropdownOpen(false);
                  }}
                  className="px-3 py-1.5 hover:bg-[#262626] text-left flex items-center justify-between"
                >
                  <span>Preview Skimming</span>
                  {previewSkimming && <Check className="w-3 h-3 text-[#1FC8DB]" />}
                </button>
                <button
                  onClick={() => {
                    setShowWaveformInTimeline(!showWaveformInTimeline);
                    setSkimmingDropdownOpen(false);
                  }}
                  className="px-3 py-1.5 hover:bg-[#262626] text-left flex items-center justify-between"
                >
                  <span>Hiện Waveform âm thanh</span>
                  {showWaveformInTimeline && <Check className="w-3 h-3 text-[#1FC8DB]" />}
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-[#333333] mx-0.5" />

          {/* Fit Timeline to Window */}
          <button
            onClick={handleFitTimeline}
            className="p-1.5 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#333333] text-[#8A8A8A] hover:text-white transition-colors"
            title="Căn vừa Timeline vào màn hình (Fit)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => setTimelineZoom(Math.max(0.5, timelineZoom - 0.25))}
            className="p-1 text-[#8A8A8A] hover:text-white transition-colors"
            title="Thu nhỏ timeline (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Slider */}
          <input
            type="range"
            min="0.5"
            max="4.0"
            step="0.25"
            value={timelineZoom}
            onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
            className="w-16 accent-[#1FC8DB] cursor-pointer h-1"
            title={`Mức phóng to: ${Math.round(timelineZoom * 100)}% (Ctrl + Cuộn chuột)`}
          />

          {/* Zoom In */}
          <button
            onClick={() => setTimelineZoom(Math.min(4.0, timelineZoom + 0.25))}
            className="p-1 text-[#8A8A8A] hover:text-white transition-colors"
            title="Phóng to timeline (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN TRACKS & RULER AREA (SECTION 7)                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Track Headers (Left Column) */}
        <div className={`${trackHeaderCollapsed ? 'w-14' : 'w-48'} border-r border-[#333333] bg-[#1F1F1F] flex flex-col shrink-0 z-20 shadow-md transition-[width] duration-150`}>
          <div className="h-7 border-b border-[#333333] bg-[#262626] px-2 flex items-center justify-between text-[10px] text-[#8A8A8A] font-mono">
            {!trackHeaderCollapsed && <span>TRACKS</span>}
            {!trackHeaderCollapsed && <span className="text-[9px] opacity-70 font-sans">{tracks.length} tracks</span>}
            <button
              onClick={() => setTrackHeaderCollapsed(!trackHeaderCollapsed)}
              className="p-1 rounded hover:bg-[#333333] text-[#8A8A8A] hover:text-[#1FC8DB] transition-colors ml-auto min-w-[24px] min-h-[24px] flex items-center justify-center touch-target-40"
              title={trackHeaderCollapsed ? 'Mở rộng Track Header (w-48)' : 'Thu gọn Track Header (w-14)'}
            >
              {trackHeaderCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div ref={trackHeadersScrollRef} className="flex-1 overflow-y-auto scrollbar-none">
            {tracks.map((track) => {
              const Icon = track.icon;
              return (
                <div
                  key={track.id}
                  style={{ height: `${track.height || 44}px` }}
                  className={`border-b border-[#333333]/60 px-2 flex items-center text-xs font-semibold text-[#8A8A8A] hover:bg-[#262626]/50 transition-all group ${
                    trackHeaderCollapsed ? 'justify-center relative' : 'justify-between'
                  }`}
                >
                  {trackHeaderCollapsed ? (
                    /* Collapsed Icon-Only View (w-14) */
                    <div
                      className="relative flex items-center justify-center w-full h-full cursor-pointer"
                      onClick={() => toggleTrackMute(track.id)}
                      title={`${track.name} (Bấm để Mute, Đúp để Khóa)`}
                      onDoubleClick={() => toggleTrackLock(track.id)}
                    >
                      <Icon className="w-4 h-4 text-[#1FC8DB]" />
                      {/* Compact Status Indicator Badges */}
                      {track.muted && (
                        <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-black" />
                      )}
                      {track.locked && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-black" />
                      )}
                      {track.hidden && (
                        <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-slate-500 ring-1 ring-black" />
                      )}
                    </div>
                  ) : (
                    /* Expanded Track Header View (w-48) */
                    <>
                      <div className="flex items-center gap-1.5 min-w-0 mr-1 flex-1">
                        <Icon className="w-3.5 h-3.5 shrink-0 text-[#1FC8DB]" />
                        {editingTrackId === track.id ? (
                          <input
                            type="text"
                            value={editingTrackName}
                            onChange={(e) => setEditingTrackName(e.target.value)}
                            onBlur={() => handleSaveRenameTrack(track.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRenameTrack(track.id);
                              if (e.key === 'Escape') setEditingTrackId(null);
                            }}
                            autoFocus
                            className="bg-[#2E2E2E] text-white border border-[#1FC8DB] rounded px-1 py-0.5 text-[11px] w-full outline-none"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => handleStartRenameTrack(track.id, track.name)}
                            className="truncate text-[11px] text-[#CCCCCC] cursor-text hover:text-[#1FC8DB] transition-colors"
                            title="Nhấp đúp để đổi tên track"
                          >
                            {track.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Rename icon */}
                        <button
                          onClick={() => handleStartRenameTrack(track.id, track.name)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#333333] text-[#8A8A8A] hover:text-white transition-all touch-target-40"
                          title="Đổi tên track"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                        </button>

                        {/* Height Toggle */}
                        <button
                          onClick={() => toggleTrackHeight(track.id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#333333] text-[#8A8A8A] hover:text-[#1FC8DB] transition-all text-[9px] font-mono touch-target-40"
                          title={`Độ cao: ${track.height || 44}px (Bấm để đổi 36 / 52 / 68px)`}
                        >
                          {track.height === 36 ? 'S' : track.height === 68 ? 'L' : 'M'}
                        </button>

                        {/* Mute Toggle */}
                        {(track.id.startsWith('audio') || track.id.startsWith('video')) && (
                          <button
                            onClick={() => toggleTrackMute(track.id)}
                            className={`p-2 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded hover:bg-[#333333] transition-colors touch-manipulation touch-target-40 ${track.muted ? 'text-rose-400' : 'text-[#8A8A8A] hover:text-white'}`}
                            title={track.muted ? 'Bật âm thanh track' : 'Tắt âm thanh track (Mute)'}
                          >
                            {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Hide Toggle */}
                        <button
                          onClick={() => toggleTrackHidden(track.id)}
                          className={`p-2 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded hover:bg-[#333333] transition-colors touch-manipulation touch-target-40 ${track.hidden ? 'text-amber-400' : 'text-[#8A8A8A] hover:text-white'}`}
                          title={track.hidden ? 'Hiện track' : 'Ẩn track (Hide)'}
                        >
                          {track.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        {/* Lock Toggle */}
                        <button
                          onClick={() => toggleTrackLock(track.id)}
                          className={`p-2 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded hover:bg-[#333333] transition-colors touch-manipulation touch-target-40 ${track.locked ? 'text-amber-400' : 'text-[#8A8A8A] hover:text-white'}`}
                          title={track.locked ? 'Mở khóa track' : 'Khóa track (Lock)'}
                        >
                          {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Timeline Grid (Right Area) */}
        <div
          ref={timelineRef}
          onScroll={handleTimelineScroll}
          onMouseDown={handleTimelineBgMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          onWheel={handleTimelineWheel}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerUp}
          onPointerCancel={handleTimelinePointerUp}
          style={{ cursor: activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : activeTool === 'razor' ? 'crosshair' : 'default' }}
          className="flex-1 relative bg-[#141414] overflow-x-auto overflow-y-auto scrollbar-thin"
        >
          {/* Inner Canvas sized according to timelineZoom */}
          <div
            className="h-full relative min-h-full"
            style={{ width: `${Math.max(100, 100 * timelineZoom)}%`, minWidth: '100%' }}
          >
            {/* Top Ruler with SMPTE Timecode Ticks & Markers */}
            <div
              onMouseDown={handleRulerMouseDown}
              onPointerDown={handlePlayheadPointerDown}
              onPointerMove={handlePlayheadPointerMove}
              onPointerUp={handlePlayheadPointerUp}
              onPointerCancel={handlePlayheadPointerUp}
              className="h-7 border-b border-[#333333] bg-[#1F1F1F]/95 flex items-center text-[10px] font-mono text-[#8A8A8A] px-1 relative select-none cursor-ew-resize sticky top-0 z-30 backdrop-blur shadow-sm touch-none"
            >
              {Array.from({ length: Math.ceil(duration) + 1 }).map((_, sec) => {
                const isMajor = sec % (timelineZoom >= 2 ? 1 : timelineZoom >= 1 ? 2 : 5) === 0;
                return (
                  <div
                    key={sec}
                    style={{ left: `${(sec / duration) * 100}%` }}
                    className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                  >
                    {isMajor && (
                      <span className="text-[9px] text-[#A0A0A0] font-mono tracking-tight -mt-0.5">
                        {formatRulerTimecode(sec)}
                      </span>
                    )}
                    <div className={`w-[1px] ${isMajor ? 'h-3 bg-[#555]' : 'h-1.5 bg-[#333] mt-auto'}`} />
                  </div>
                );
              })}

              {/* Render Markers on Ruler */}
              {markers.map((m) => (
                <div
                  key={m.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentTime(m.time);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingMarker(m);
                  }}
                  style={{ left: `${(m.time / duration) * 100}%` }}
                  className="absolute top-0 bottom-0 z-30 flex flex-col items-center cursor-pointer group"
                  title={`Marker: ${m.label} (${m.time.toFixed(1)}s) - Nhấp đúp để sửa`}
                >
                  <Bookmark
                    className="w-3.5 h-3.5 fill-current filter drop-shadow"
                    style={{ color: m.color || '#1FC8DB' }}
                  />
                  <span
                    className="text-[8px] font-bold px-1 rounded -mt-0.5 shadow-md truncate max-w-[60px]"
                    style={{ backgroundColor: '#111', color: m.color || '#1FC8DB' }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Skimming Hover Indicator Line */}
            {skimmingTime !== null && previewSkimming && (
              <div
                className="absolute top-0 bottom-0 z-25 pointer-events-none flex flex-col items-center border-l border-dashed border-amber-400"
                style={{ left: `${(skimmingTime / duration) * 100}%` }}
              >
                <span className="bg-amber-400 text-black text-[8px] font-bold px-1 rounded-b shadow font-mono">
                  {skimmingTime.toFixed(1)}s
                </span>
              </div>
            )}

            {/* Needle Pin-head Playhead (Đầu hình ghim, kéo scrub được) */}
            <div
              onMouseDown={handleRulerMouseDown}
              onPointerDown={handlePlayheadPointerDown}
              onPointerMove={handlePlayheadPointerMove}
              onPointerUp={handlePlayheadPointerUp}
              onPointerCancel={handlePlayheadPointerUp}
              className="absolute top-0 bottom-0 z-35 flex flex-col items-center cursor-ew-resize group select-none pointer-events-auto touch-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              {/* Pin Head (40x40px Touch Hit Box) */}
              <div className="relative -mt-3 w-10 h-10 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none z-40 touch-target-40">
                <div className="w-3.5 h-4 rounded-t-sm bg-[#1FC8DB] shadow-[0_0_10px_rgba(31,200,219,0.7)] flex items-center justify-center hover:brightness-125 transition-all pointer-events-none">
                  <div className="w-1 h-1.5 rounded-full bg-slate-950/80" />
                </div>
                {/* Triangular down-pointing needle tip */}
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#1FC8DB] pointer-events-none" />
              </div>

              {/* Vertical stem with 24px Touch Hit Zone */}
              <div className="w-6 flex justify-center h-full touch-none cursor-ew-resize">
                <div className="w-[1.5px] h-full bg-[#1FC8DB] shadow-[0_0_8px_rgba(31,200,219,0.9)]" />
              </div>
            </div>

            {/* Empty State: Drag material here and start to create */}
            {clips.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleDropMedia}
                onClick={() => addMediaInputRef.current?.click()}
                className="m-6 p-10 border-2 border-dashed border-[#333333] hover:border-[#1FC8DB] rounded-xl flex flex-col items-center justify-center gap-3 text-center cursor-pointer bg-[#1A1A1A]/40 hover:bg-[#1A1A1A]/80 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#262626] group-hover:bg-[#1FC8DB]/20 border border-[#333] flex items-center justify-center transition-colors shadow-inner">
                  <Film className="w-7 h-7 text-[#8A8A8A] group-hover:text-[#1FC8DB] transition-colors" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-white group-hover:text-[#1FC8DB] transition-colors">
                    Drag material here and start to create
                  </span>
                  <span className="text-xs text-[#8A8A8A]">
                    Kéo thả video, ảnh, âm thanh từ máy tính vào đây hoặc nhấp để tải tệp
                  </span>
                </div>
              </div>
            ) : (
              /* Tracks Rows Container */
              tracks.map((track) => {
                const trackClips = clips.filter((c) => c.track === track.id).sort((a, b) => a.start - b.start);
                const isTrackHovered = hoveredTrackId === track.id;

                return (
                  <div
                    key={track.id}
                    data-track-id={track.id}
                    style={{ height: `${track.height || 44}px` }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => handleDropMedia(e, track.id)}
                    className={`border-b border-[#333333]/40 relative flex items-center px-1 transition-all ${
                      track.hidden
                        ? 'opacity-30 pointer-events-none bg-black/40'
                        : track.locked
                        ? 'bg-[#181818]/60'
                        : isTrackHovered
                        ? 'bg-[#1FC8DB]/10 ring-1 ring-inset ring-[#1FC8DB]/40'
                        : ''
                    }`}
                  >
                    {/* Transition Badges Between Adjacent Clips on the same track */}
                    {trackClips.map((c, i) => {
                      const next = trackClips[i + 1];
                      if (!next) return null;
                      const isAdjacent = Math.abs(c.start + c.duration - next.start) < 0.35;
                      if (!isAdjacent) return null;
                      const junctionPercent = ((c.start + c.duration) / duration) * 100;

                      return (
                        <button
                          key={`trans-${c.id}-${next.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const curTrans = next.transitionIn?.type;
                            const newTrans = curTrans ? undefined : { type: 'crossfade', duration: 0.5 };
                            updateClip(next.id, { transitionIn: newTrans });
                            showToast(newTrans ? 'Đã thêm chuyển cảnh Crossfade giữa 2 clip' : 'Đã xóa chuyển cảnh', 'info');
                          }}
                          style={{ left: `calc(${junctionPercent}% - 8px)` }}
                          className={`absolute z-25 top-1/2 -translate-y-1/2 w-4 h-4 rounded flex items-center justify-center transition-all ${
                            next.transitionIn
                              ? 'bg-[#1FC8DB] text-black ring-1 ring-white shadow-md'
                              : 'bg-[#2E2E2E] hover:bg-[#1FC8DB] text-[#8A8A8A] hover:text-black border border-[#444]'
                          }`}
                          title={next.transitionIn ? `Chuyển cảnh: ${next.transitionIn.type} (${next.transitionIn.duration}s)` : 'Bấm để thêm chuyển cảnh giữa 2 clip'}
                        >
                          <Layers className="w-2.5 h-2.5" />
                        </button>
                      );
                    })}

                    {/* Clips on Track (Virtualized: only renders clips within visible time range) */}
                    {trackClips.map((clip) => {
                      // Virtualization check: skip rendering if clip is completely out of view
                      if (clip.start + clip.duration < visibleTimeRange.start || clip.start > visibleTimeRange.end) {
                        return null;
                      }

                      const leftPercent = (clip.start / duration) * 100;
                      const widthPercent = (clip.duration / duration) * 100;
                      const isSelected = selectedClipId === clip.id || selectedClipIds.includes(clip.id);
                      const isGrouped = !!clip.groupId;
                      const clipHeight = Math.max(28, (track.height || 44) - 8);

                      return (
                        <div
                          key={clip.id}
                          data-clip-id={clip.id}
                          onMouseDown={(e) => handleClipMouseDown(e, clip)}
                          onPointerDown={(e) => handleClipPointerDown(e, clip)}
                          onPointerMove={handleClipPointerMove}
                          onPointerUp={handleClipPointerUp}
                          onPointerCancel={handleClipPointerUp}
                          onContextMenu={(e) => handleClipContextMenu(e, clip)}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(2.5, widthPercent)}%`,
                            height: `${clipHeight}px`,
                            touchAction: 'none'
                          }}
                          className={`absolute rounded-md border flex items-center justify-between text-xs font-semibold select-none group transition-all shadow-md touch-none ${
                            track.color
                          } ${
                            isSelected
                              ? 'ring-2 ring-white border-[#1FC8DB] brightness-110 z-20 shadow-[0_0_12px_rgba(31,200,219,0.4)]'
                              : 'hover:brightness-105 z-10'
                          } ${isGrouped ? 'border-dashed border-amber-400/80' : ''}`}
                        >
                          {/* CapCut Header Strip: Clip Name + SMPTE Timecode Duration */}
                          <div className="absolute top-0 left-0 right-0 h-4 bg-black/70 backdrop-blur-[2px] flex items-center px-1.5 gap-1.5 z-20 pointer-events-none text-[10px]">
                            <span className="font-semibold text-white truncate max-w-[130px]">
                              {clip.text || clip.name}
                            </span>
                            <span className="font-mono text-[#AAA] text-[9px]">
                              {formatSmpte(clip.duration)}
                            </span>
                          </div>

                          {/* Filmstrip Repeating Thumbnails for Video/Image (CapCut Desktop Style) */}
                          {clip.thumbnailUrl && (clip.type === 'video' || clip.type === 'image') && (
                            <div className="absolute inset-0 pt-4 flex overflow-hidden pointer-events-none opacity-90 select-none bg-black/40">
                              {Array.from({
                                length: Math.min(24, Math.max(1, Math.ceil((clip.duration / duration) * 40 * timelineZoom)))
                              }).map((_, idx) => (
                                <img
                                  key={idx}
                                  src={clip.thumbnailUrl}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-14 object-cover shrink-0 border-r border-black/40"
                                />
                              ))}
                            </div>
                          )}

                          {/* Audio Waveform Background */}
                          {clip.track === 'audio' && showWaveformInTimeline && (
                            <div className="absolute inset-0 flex items-center justify-around px-1 overflow-hidden pointer-events-none opacity-40">
                              {(clip.waveformPeaks || [0.3, 0.6, 0.9, 0.4, 0.7, 0.2, 0.8, 0.5, 0.9, 0.6, 0.3, 0.7, 0.4, 0.8, 0.5, 0.7]).map((peak, idx) => (
                                <div
                                  key={idx}
                                  className="w-[2px] bg-emerald-400 rounded-full"
                                  style={{ height: `${Math.max(15, peak * 90)}%` }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Trim Handle Left (Start) - Expanded Touch Area >= 40px */}
                          <div
                            onMouseDown={(e) => handleTrimStartMouseDown(e, clip)}
                            onPointerDown={(e) => handleTrimStartPointerDown(e, clip)}
                            title="Kéo để cắt đầu clip (Trim Start)"
                            className="absolute -left-3 top-0 bottom-0 w-9 min-w-[36px] z-30 flex items-center justify-start cursor-ew-resize touch-none select-none touch-target-40"
                          >
                            <div
                              className={`w-2 h-full rounded-l-md pointer-events-none transition-all ${
                                isSelected
                                  ? 'bg-white shadow-[0_0_6px_white]'
                                  : 'bg-white/40 sm:bg-white/20 opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
                              }`}
                            />
                          </div>

                          {/* Trim Tooltip (Floating duration display) */}
                          {trimTooltip && draggingClipId === clip.id && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1FC8DB] text-slate-950 font-bold font-mono text-[9px] px-1.5 py-0.5 rounded shadow-lg pointer-events-none z-40 whitespace-nowrap">
                              {trimTooltip.duration.toFixed(2)}s ({trimmingHandle === 'start' ? 'Start' : 'End'})
                            </div>
                          )}

                          {/* Transition In Badge Indicator */}
                          {clip.transitionIn && (
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-[#1FC8DB]/30 border-r border-[#1FC8DB] pointer-events-none flex items-center pl-1 z-10"
                              style={{ width: `${Math.min(50, ((clip.transitionIn.duration || 0.5) / clip.duration) * 100)}%` }}
                              title={`Chuyển cảnh: ${clip.transitionIn.type}`}
                            >
                              <Layers className="w-2.5 h-2.5 text-[#1FC8DB]" />
                            </div>
                          )}

                          {/* Lock Badge if locked */}
                          {clip.locked && (
                            <div className="absolute top-0.5 right-1 z-20">
                              <Lock className="w-2.5 h-2.5 text-amber-400" />
                            </div>
                          )}

                          {/* Compound Clip Badge */}
                          {clip.isCompound && (
                            <span className="bg-purple-500/80 text-white text-[8px] font-bold px-1 rounded mr-1 z-10">
                              COMPOUND
                            </span>
                          )}

                          {/* Relink Badge if clip has error or missing media */}
                          {(clip.hasError || clip.missingMedia) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerRelink(clip.id);
                              }}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded mr-1 z-30 flex items-center gap-1 shadow-sm animate-pulse cursor-pointer shrink-0"
                              title="Tệp phương tiện bị mất hoặc lỗi - Nhấp để kết nối lại (Relink)"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Relink</span>
                            </button>
                          )}

                          {/* Ghost Reference Warning Badge */}
                          {Boolean((clip as any).ghostRef || (clip as any).isGhostPlaceholder) && (
                            <span
                              className="bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded mr-1 z-30 flex items-center gap-0.5 shadow-sm border border-amber-300 animate-pulse shrink-0 cursor-help"
                              title={`Tài nguyên giữ chỗ (Ghost): ${(clip as any).ghostRef?.originalId || clip.name || 'Thiếu hiệu ứng'}`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-slate-950" />
                              <span>GHOST</span>
                            </span>
                          )}

                          {/* Reverse Indicator */}
                          {clip.reverse && (
                            <span className="bg-amber-500/80 text-black text-[8px] font-bold px-1 rounded mr-1 z-10 flex items-center gap-0.5">
                              <RotateCcw className="w-2 h-2" /> REV
                            </span>
                          )}

                          {/* Trim Handle Right (End) - Expanded Touch Area >= 40px */}
                          <div
                            onMouseDown={(e) => handleTrimEndMouseDown(e, clip)}
                            onPointerDown={(e) => handleTrimEndPointerDown(e, clip)}
                            title="Kéo để cắt đuôi clip (Trim End)"
                            className="absolute -right-3 top-0 bottom-0 w-9 min-w-[36px] z-30 flex items-center justify-end cursor-ew-resize touch-none select-none touch-target-40"
                          >
                            <div
                              className={`w-2 h-full rounded-r-md pointer-events-none transition-all ${
                                isSelected
                                  ? 'bg-white shadow-[0_0_6px_white]'
                                  : 'bg-white/40 sm:bg-white/20 opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}

            {/* Marquee Lasso Selection Box */}
            {isMarqueeSelecting && marqueeStart && marqueeCurrent && (
              <div
                style={{
                  left: `${Math.min(marqueeStart.x, marqueeCurrent.x) - (timelineRef.current?.getBoundingClientRect().left || 0) + (timelineRef.current?.scrollLeft || 0)}px`,
                  top: `${Math.min(marqueeStart.y, marqueeCurrent.y) - (timelineRef.current?.getBoundingClientRect().top || 0) + (timelineRef.current?.scrollTop || 0)}px`,
                  width: `${Math.abs(marqueeCurrent.x - marqueeStart.x)}px`,
                  height: `${Math.abs(marqueeCurrent.y - marqueeStart.y)}px`
                }}
                className="absolute border border-[#1FC8DB] bg-[#1FC8DB]/15 pointer-events-none z-40 rounded"
              />
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CONTEXT MENU (CHUỘT PHẢI / LONG-PRESS TRÊN CLIP)          */}
      {/* ======================================================== */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10 select-none"
            onPointerDown={() => setContextMenu(null)}
            onClick={() => setContextMenu(null)}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed z-50 bg-[#1F1F1F] border border-[#333333] shadow-2xl rounded-lg py-1.5 min-w-[210px] text-xs text-[#E6E6E6] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none divide-y divide-[#262626]"
          >
          {/* Section 1: Cut, Split, Delete */}
          <div className="py-1 flex flex-col gap-0.5">
            <button
              onClick={() => {
                handleSplit();
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5" /> Tách clip (Split)
              </span>
              <span className="text-[10px] text-[#8A8A8A] font-mono">S</span>
            </button>

            <button
              onClick={() => {
                handleDelete();
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-rose-400 text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Xóa (Delete)
              </span>
              <span className="text-[10px] text-[#8A8A8A] font-mono">Del</span>
            </button>

            <button
              onClick={() => {
                handleRippleDelete(contextMenu.clipId);
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <ArrowLeftToLine className="w-3.5 h-3.5" /> Xóa gập (Ripple delete)
              </span>
              <span className="text-[10px] text-[#8A8A8A] font-mono">Shift+Del</span>
            </button>
          </div>

          {/* Section 2: Copy, Paste, Duplicate */}
          <div className="py-1 flex flex-col gap-0.5">
            <button
              onClick={() => {
                copyClip();
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5" /> Sao chép (Copy)
              </span>
              <span className="text-[10px] text-[#8A8A8A] font-mono">Ctrl+C</span>
            </button>

            <button
              onClick={() => {
                pasteClip();
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 rotate-180" /> Dán (Paste)
              </span>
              <span className="text-[10px] text-[#8A8A8A] font-mono">Ctrl+V</span>
            </button>

            <button
              onClick={() => {
                duplicateClip(contextMenu.clipId);
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Nhân bản (Duplicate)
              </span>
              <span className="text-[10px] text-[#8A8A8A] font-mono">Ctrl+D</span>
            </button>
          </div>

          {/* Section 3: Audio, Freeze frame, Reverse, Speed */}
          <div className="py-1 flex flex-col gap-0.5">
            <button
              onClick={() => {
                handleDetachAudio(contextMenu.clipId);
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center gap-2"
            >
              <Music className="w-3.5 h-3.5 text-emerald-400" /> Tách âm thanh (Detach audio)
            </button>

            <button
              onClick={() => {
                handleFreezeFrame(contextMenu.clipId);
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center gap-2"
            >
              <Snowflake className="w-3.5 h-3.5 text-sky-400" /> Dừng hình 3s (Freeze frame)
            </button>

            <button
              onClick={() => {
                handleToggleReverse(contextMenu.clipId);
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Đảo chiều phát (Reverse)
            </button>

            {/* Speed Submenu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSpeedSubmenuOpen(!speedSubmenuOpen);
                }}
                className="w-full px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" /> Tốc độ (Speed)
                </span>
                <ChevronDown className="w-3 h-3 text-[#8A8A8A] -rotate-90" />
              </button>

              {speedSubmenuOpen && (
                <div className="absolute left-full top-0 ml-1 bg-[#222222] border border-[#333333] shadow-xl rounded-md py-1 min-w-[100px] flex flex-col">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        handleChangeSpeed(contextMenu.clipId, spd);
                        setContextMenu(null);
                      }}
                      className="px-3 py-1 hover:bg-[#2E2E2E] hover:text-[#1FC8DB] text-left text-xs font-mono"
                    >
                      {spd}x {spd === 1.0 && '(Chuẩn)'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Group & Compound Clip */}
          <div className="py-1 flex flex-col gap-0.5">
            <button
              onClick={() => {
                handleGroupSelected();
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center justify-between"
            >
              <span>Nhóm các clip (Group)</span>
              <span className="text-[10px] text-[#8A8A8A] font-mono">Ctrl+G</span>
            </button>

            <button
              onClick={() => {
                handleCreateCompoundClip();
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5 text-pink-400" /> Tạo Compound clip
            </button>

            <button
              onClick={() => {
                handleAddMarkerAtPlayhead();
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#262626] hover:text-[#1FC8DB] text-left flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" /> Thêm Marker
              </span>
              <span className="text-[10px] text-[#8A8A8A] font-mono">M</span>
            </button>
          </div>
        </div>
        </>
      )}

      {/* ======================================================== */}
      {/* MARKER EDIT MODAL                                        */}
      {/* ======================================================== */}
      {editingMarker && (
        <div
          onClick={() => setEditingMarker(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-[#1F1F1F] border border-[#333333] rounded-lg shadow-2xl p-4 flex flex-col gap-3 text-xs text-[#E6E6E6]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-[#1FC8DB]" /> Sửa Marker
              </span>
              <button onClick={() => setEditingMarker(null)} className="p-1 hover:text-white text-[#8A8A8A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-[#8A8A8A]">Tên Marker:</span>
              <input
                type="text"
                value={editingMarker.label}
                onChange={(e) => setEditingMarker({ ...editingMarker, label: e.target.value })}
                className="bg-[#2E2E2E] border border-[#333333] rounded p-2 text-white outline-none focus:border-[#1FC8DB]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-[#8A8A8A]">Màu sắc Marker:</span>
              <div className="flex items-center gap-2 pt-1">
                {['#1FC8DB', '#F59E0B', '#EC4899', '#10B981', '#8B5CF6'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditingMarker({ ...editingMarker, color: c })}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-transform ${editingMarker.color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#333333]">
              <button
                onClick={() => {
                  setMarkers((prev) => prev.filter((m) => m.id !== editingMarker.id));
                  setEditingMarker(null);
                  showToast('Đã xóa marker', 'info');
                }}
                className="px-3 py-1.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-semibold"
              >
                Xóa Marker
              </button>
              <button
                onClick={() => {
                  setMarkers((prev) => prev.map((m) => (m.id === editingMarker.id ? editingMarker : m)));
                  setEditingMarker(null);
                  showToast('Đã cập nhật marker!', 'success');
                }}
                className="px-4 py-1.5 rounded bg-[#1FC8DB] text-slate-950 font-bold"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VOICEOVER MODAL OVERLAY                                  */}
      {/* ======================================================== */}
      {voiceoverOpen && (
        <div
          onClick={() => {
            if (!isRecordingVo) setVoiceoverOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1F1F1F] border border-[#333333] rounded-lg shadow-2xl p-4 flex flex-col gap-3 text-xs text-[#E6E6E6]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                <Mic className="w-4 h-4 text-[#1FC8DB]" />
                Lồng tiếng tại Playhead (Voiceover)
              </span>
              {!isRecordingVo && (
                <button onClick={() => setVoiceoverOpen(false)} className="p-1 hover:text-white text-[#8A8A8A]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Countdown Overlay */}
            {voiceoverCountdown !== null ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <span className="text-5xl font-black text-[#1FC8DB] animate-ping font-mono">
                  {voiceoverCountdown}
                </span>
                <span className="text-xs text-[#8A8A8A]">Chuẩn bị bắt đầu nói...</span>
              </div>
            ) : isRecordingVo ? (
              <div className="py-5 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                  <span className="font-mono text-xl font-bold text-white">
                    00:{voTimer.toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={handleStopVoiceover}
                  className="px-6 py-2 rounded-md bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg transition-colors"
                >
                  Dừng & Chèn vào timeline
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#8A8A8A]">Chọn Micro:</span>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="bg-[#2E2E2E] border border-[#333333] rounded p-2 text-white outline-none text-xs"
                  >
                    {audioDevices.length > 0 ? (
                      audioDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Microphone ${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="">Microphone mặc định</option>
                    )}
                  </select>
                </div>

                <label className="flex items-center justify-between cursor-pointer pt-1">
                  <span className="text-[11px]">Giảm ồn tiếng gió & môi trường</span>
                  <input
                    type="checkbox"
                    checked={voNoiseReduction}
                    onChange={(e) => setVoNoiseReduction(e.target.checked)}
                    className="accent-[#1FC8DB]"
                  />
                </label>

                <button
                  onClick={handleStartVoiceoverCountdown}
                  className="w-full py-2.5 rounded-md bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Mic className="w-4 h-4" />
                  <span>Bắt đầu đếm ngược 3s & Ghi âm</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden input for relinking media */}
      <input
        type="file"
        ref={relinkInputRef}
        onChange={handleRelinkFileChosen}
        className="hidden"
        accept="video/*,audio/*,image/*"
      />
    </div>
  );
};
