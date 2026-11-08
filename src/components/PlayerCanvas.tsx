import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore, type Clip } from '../store/useEditorStore';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Menu,
  Maximize,
  Minimize,
  Grid,
  Ruler,
  Check,
  Volume2,
  Activity,
  Sliders,
  Eye,
  Repeat,
  Square,
  Type,
  X
} from 'lucide-react';
import { db } from '../db';
import { sharedCompositor } from '../engine/compositor';
import { masterAudio } from '../engine/audioEngine';
import { generateMediaMetadata } from '../engine/storageProxy';

export const PlayerCanvas: React.FC = () => {
  const {
    currentTime,
    setCurrentTime,
    duration,
    isPlaying,
    setIsPlaying,
    safeZoneEnabled,
    toggleSafeZone,
    isProxyEnabled,
    toggleProxy,
    clips,
    addClip,
    updateClip,
    selectedClipId,
    selectClip,
    projectSettings,
    updateProjectSettings,
    settings,
    updateSettings,
    timelines,
    activeTimelineId,
    showToast
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

  // Drag over canvas state
  const [isDragOver, setIsDragOver] = useState(false);

  // Canvas Viewport Zoom & Pan states (CapCut style)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; originX: number; originY: number }>({ x: 0, y: 0, originX: 0, originY: 0 });

  // Top Bar ☰ Menu states
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [bgColor, setBgColor] = useState<'black' | 'dark' | 'checker' | 'white' | 'green'>('black');
  const [loopPlayback, setLoopPlayback] = useState(false);
  const [showWaveform, setShowWaveform] = useState(false);
  const [showColorScale, setShowColorScale] = useState(false);

  // Performance & Debug FPS / Dropped Frames states
  const [showDebugFps, setShowDebugFps] = useState(false);
  const [currentFps, setCurrentFps] = useState<number>(30);
  const [droppedFrames, setDroppedFrames] = useState<number>(0);
  const [showProxyPrompt, setShowProxyPrompt] = useState(false);
  const hasPromptedProxyRef = useRef(false);

  // Bottom Controls states
  const [previewQuality, setPreviewQuality] = useState<'full' | 'half' | 'quarter'>('full');
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');
  const [timecodeDisplayMode, setTimecodeDisplayMode] = useState<'smpte' | 'frames'>('smpte');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dropdowns in bottom bar
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false);
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false);
  const [ratioDropdownOpen, setRatioDropdownOpen] = useState(false);

  // Direct Manipulation States
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [dragAction, setDragAction] = useState<'move' | 'scale' | 'rotate' | null>(null);
  const [scaleCorner, setScaleCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialClipPos, setInitialClipPos] = useState<{ x: number; y: number; scale: number; rotation: number }>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  });
  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);

  // Inline text editing state
  const [isEditingInlineText, setIsEditingInlineText] = useState(false);
  const [inlineTextValue, setInlineTextValue] = useState('');
  const inlineInputRef = useRef<HTMLInputElement | null>(null);

  // Current active timeline
  const activeTimeline = timelines.find((t) => t.id === activeTimelineId) || timelines[0];
  const timelineTitle = activeTimeline?.name || 'Timeline 01';

  // Current aspect ratio
  const currentAspect = projectSettings?.aspect || settings?.defaultAspect || '9:16';
  const fps = projectSettings?.fps || 30;

  // Compute Base Dimensions & CSS Aspect Ratio
  const getAspectConfig = (aspect: string) => {
    switch (aspect) {
      case '16:9':
        return { w: 960, h: 540, cssRatio: '16/9', label: '16:9 (Ngang)' };
      case '1:1':
        return { w: 720, h: 720, cssRatio: '1/1', label: '1:1 (Vuông)' };
      case '4:3':
        return { w: 960, h: 720, cssRatio: '4/3', label: '4:3 (Truyền thống)' };
      case '3:4':
        return { w: 720, h: 960, cssRatio: '3/4', label: '3:4 (Chân dung)' };
      case '21:9':
        return { w: 1120, h: 480, cssRatio: '21/9', label: '21:9 (Ultrawide)' };
      case 'original':
        return { w: 540, h: 960, cssRatio: '9/16', label: 'Gốc (Theo media)' };
      case 'custom':
        return { w: 540, h: 960, cssRatio: '9/16', label: 'Tùy chỉnh' };
      case '9:16':
      default:
        return { w: 540, h: 960, cssRatio: '9/16', label: '9:16 (Dọc TikTok/Reels)' };
    }
  };

  const aspectConfig = getAspectConfig(currentAspect);

  // Quality scaling factor for preview rendering
  const qualityFactor = previewQuality === 'quarter' ? 0.25 : previewQuality === 'half' ? 0.5 : 1.0;
  const canvasWidth = Math.round(aspectConfig.w * qualityFactor);
  const canvasHeight = Math.round(aspectConfig.h * qualityFactor);

  // Master Playback Timer Loop with Live FPS, Dropped Frames tracking, and Auto-Proxy Suggestion
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();
    let frameTimes: number[] = [];
    let localDropped = 0;
    let lowFpsSeconds = 0;
    let lastSecondCheck = performance.now();

    const loop = (timestamp: number) => {
      if (isPlaying) {
        const delta = (timestamp - lastTimestamp) / 1000;
        const targetFps = fps || 30;
        const expectedDelta = 1 / targetFps;

        // Detect dropped frames if delta exceeds 1.5x expected interval
        if (delta > expectedDelta * 1.5 && lastTimestamp > 0) {
          const dropped = Math.floor((delta - expectedDelta) / expectedDelta);
          localDropped += dropped;
          setDroppedFrames(localDropped);
        }

        frameTimes.push(timestamp);
        if (frameTimes.length > 30) frameTimes.shift();
        if (frameTimes.length >= 2) {
          const dur = (frameTimes[frameTimes.length - 1] - frameTimes[0]) / 1000;
          const measuredFps = dur > 0 ? Math.round(((frameTimes.length - 1) / dur) * 10) / 10 : targetFps;
          setCurrentFps(measuredFps);

          // If low FPS (< 24) on 1080p+ for 3 consecutive seconds, auto suggest Proxy
          if (timestamp - lastSecondCheck >= 1000) {
            lastSecondCheck = timestamp;
            if (measuredFps < 24 && !isProxyEnabled) {
              lowFpsSeconds++;
              if (lowFpsSeconds >= 3 && !hasPromptedProxyRef.current) {
                hasPromptedProxyRef.current = true;
                setShowProxyPrompt(true);
              }
            } else {
              lowFpsSeconds = 0;
            }
          }
        }

        const nextTime = currentTime + delta;
        if (nextTime >= duration) {
          if (loopPlayback && duration > 0) {
            setCurrentTime(0);
          } else {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        } else {
          setCurrentTime(nextTime);
        }
      }
      lastTimestamp = timestamp;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, currentTime, setCurrentTime, setIsPlaying, loopPlayback, fps, isProxyEnabled]);

  // Synchronize audio playback with currentTime and isPlaying
  useEffect(() => {
    masterAudio.syncClips(clips, currentTime, isPlaying);
    return () => {
      if (!isPlaying) {
        masterAudio.pauseAll();
      }
    };
  }, [clips, currentTime, isPlaying]);

  // Master Compositor Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check active clips at currentTime
    const activeClips = clips.filter((c) => currentTime >= c.start && currentTime <= c.start + c.duration);

    if (activeClips.length === 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (bgColor === 'dark') ctx.fillStyle = '#1F1F1F';
        else if (bgColor === 'white') ctx.fillStyle = '#FFFFFF';
        else if (bgColor === 'green') ctx.fillStyle = '#00FF00';
        else ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      sharedCompositor.renderFrame(canvas, clips, currentTime, {
        showSafeZone: safeZoneEnabled,
        isProxy: isProxyEnabled
      });
    }
  }, [currentTime, clips, safeZoneEnabled, isProxyEnabled, bgColor, canvasWidth, canvasHeight]);

  // Currently selected clip if active at playhead
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const isSelectedClipActive =
    selectedClip && currentTime >= selectedClip.start && currentTime <= selectedClip.start + selectedClip.duration;

  // Handle Drag & Drop media file onto canvas
  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
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

      masterAudio.playSynthesizer('click');
      showToast(`Đã thêm "${file.name}" vào vị trí playhead!`, 'success');
    }
  };

  // SMPTE Timecode Formatter: HH:MM:SS:FF
  const formatTimecode = (seconds: number) => {
    const totalFrames = Math.floor(seconds * fps);
    const ff = (totalFrames % fps).toString().padStart(2, '0');
    const ss = (Math.floor(seconds) % 60).toString().padStart(2, '0');
    const mm = (Math.floor(seconds / 60) % 60).toString().padStart(2, '0');
    const hh = Math.floor(seconds / 3600).toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  // Keyboard Shortcuts listener (Space, Left, Right, Shift+Left, Shift+Right, Home, End, Arrows nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (selectedClip && !e.altKey && !e.ctrlKey) {
          // Nudge selected clip left
          const step = e.shiftKey ? 10 : 1;
          const curX = selectedClip.x || selectedClip.transform?.x || 0;
          updateClip(selectedClip.id, {
            x: curX - step,
            transform: { ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), x: curX - step }
          });
        } else {
          // Step back 1 frame or 1 second
          const stepTime = e.shiftKey ? 1.0 : 1 / fps;
          setCurrentTime(Math.max(0, currentTime - stepTime));
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (selectedClip && !e.altKey && !e.ctrlKey) {
          // Nudge selected clip right
          const step = e.shiftKey ? 10 : 1;
          const curX = selectedClip.x || selectedClip.transform?.x || 0;
          updateClip(selectedClip.id, {
            x: curX + step,
            transform: { ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), x: curX + step }
          });
        } else {
          // Step forward 1 frame or 1 second
          const stepTime = e.shiftKey ? 1.0 : 1 / fps;
          setCurrentTime(Math.min(duration, currentTime + stepTime));
        }
      } else if (e.code === 'ArrowUp') {
        if (selectedClip) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const curY = selectedClip.y || selectedClip.transform?.y || 0;
          updateClip(selectedClip.id, {
            y: curY - step,
            transform: { ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), y: curY - step }
          });
        }
      } else if (e.code === 'ArrowDown') {
        if (selectedClip) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const curY = selectedClip.y || selectedClip.transform?.y || 0;
          updateClip(selectedClip.id, {
            y: curY + step,
            transform: { ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), y: curY + step }
          });
        }
      } else if (e.code === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        setCurrentTime(duration);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, fps, selectedClip, updateClip, setCurrentTime, setIsPlaying]);

  // Fullscreen Change Listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => {
      setMenuOpen(false);
      setQualityDropdownOpen(false);
      setZoomDropdownOpen(false);
      setRatioDropdownOpen(false);
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Space key detection for canvas panning (CapCut style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Non-passive wheel event on viewport for smooth CapCut-style zooming
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoomMode((prev) => {
        const current = typeof prev === 'number' ? prev : 1.0;
        const next = Math.max(0.15, Math.min(6.0, current * zoomFactor));
        return parseFloat(next.toFixed(2));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Viewport Pan Start (Middle click or Space + Left click)
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        originX: panOffset.x,
        originY: panOffset.y
      };
    }
  };

  // Double click viewport to reset zoom & pan to Fit
  const handleViewportDoubleClick = (e: React.MouseEvent) => {
    if (e.target === viewportRef.current || (canvasWrapperRef.current && !canvasWrapperRef.current.contains(e.target as Node))) {
      setZoomMode('fit');
      setPanOffset({ x: 0, y: 0 });
      showToast('Đã đặt lại khung hình (Fit)', 'info');
    }
  };

  // Mouse Handlers for Direct Manipulation on Canvas (8-point handles)
  const handleMouseDownOnClip = (
    e: React.MouseEvent,
    action: 'move' | 'scale' | 'rotate',
    corner?: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'
  ) => {
    e.stopPropagation();
    if (!selectedClip) return;

    setIsDraggingClip(true);
    setDragAction(action);
    setScaleCorner(corner || null);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialClipPos({
      x: selectedClip.x || selectedClip.transform?.x || 0,
      y: selectedClip.y || selectedClip.transform?.y || (selectedClip.type === 'text' ? -110 : 0),
      scale: selectedClip.scale || selectedClip.transform?.scale || 1.0,
      rotation: selectedClip.rotation || selectedClip.transform?.rotation || 0
    });
  };

  // Window MouseMove / MouseUp for Direct Manipulation & Panning
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPanOffset({
          x: panStartRef.current.originX + dx,
          y: panStartRef.current.originY + dy
        });
        return;
      }

      if (!isDraggingClip || !selectedClip || !dragAction) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (dragAction === 'move') {
        let newX = initialClipPos.x + deltaX;
        let newY = initialClipPos.y + deltaY;

        // Snapping: Center Snap lines
        if (Math.abs(newX) < 8) {
          newX = 0;
          setSnapX(true);
        } else {
          setSnapX(false);
        }

        if (Math.abs(newY) < 8) {
          newY = 0;
          setSnapY(true);
        } else {
          setSnapY(false);
        }

        updateClip(selectedClip.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          transform: {
            ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }),
            x: Math.round(newX),
            y: Math.round(newY)
          }
        });
      } else if (dragAction === 'scale') {
        let distChange = 0;
        if (scaleCorner === 'tl') distChange = (-deltaX - deltaY) / 150;
        else if (scaleCorner === 'tr') distChange = (deltaX - deltaY) / 150;
        else if (scaleCorner === 'bl') distChange = (-deltaX + deltaY) / 150;
        else if (scaleCorner === 'br') distChange = (deltaX + deltaY) / 150;
        else if (scaleCorner === 't') distChange = -deltaY / 120;
        else if (scaleCorner === 'b') distChange = deltaY / 120;
        else if (scaleCorner === 'l') distChange = -deltaX / 120;
        else if (scaleCorner === 'r') distChange = deltaX / 120;
        else distChange = (deltaX + deltaY) / 150;

        let newScale = Math.max(0.1, Math.min(6.0, initialClipPos.scale + distChange));
        updateClip(selectedClip.id, {
          scale: parseFloat(newScale.toFixed(2)),
          transform: {
            ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }),
            scale: parseFloat(newScale.toFixed(2))
          }
        });
      } else if (dragAction === 'rotate') {
        // Rotation handle
        const rotationDelta = Math.round(deltaX * 0.8);
        let newRot = (initialClipPos.rotation + rotationDelta) % 360;
        if (Math.abs(newRot) < 4) newRot = 0;
        if (Math.abs(newRot - 90) < 4) newRot = 90;
        if (Math.abs(newRot - 180) < 4) newRot = 180;
        if (Math.abs(newRot - 270) < 4) newRot = 270;

        updateClip(selectedClip.id, {
          rotation: newRot,
          transform: {
            ...(selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }),
            rotation: newRot
          }
        });
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
      if (isDraggingClip) {
        setIsDraggingClip(false);
        setDragAction(null);
        setScaleCorner(null);
        setSnapX(false);
        setSnapY(false);
      }
    };

    if (isDraggingClip || isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingClip, isPanning, dragAction, dragStart, initialClipPos, selectedClip, updateClip, scaleCorner]);

  // Double click text to edit inline
  const handleDoubleClickText = (clip: Clip) => {
    if (clip.type === 'text') {
      setIsEditingInlineText(true);
      setInlineTextValue(clip.text || '');
      setTimeout(() => {
        inlineInputRef.current?.focus();
        inlineInputRef.current?.select();
      }, 50);
    }
  };

  // Submit inline text edit
  const handleSaveInlineText = () => {
    if (selectedClip && isEditingInlineText) {
      updateClip(selectedClip.id, { text: inlineTextValue });
      setIsEditingInlineText(false);
      showToast('Đã lưu nội dung chữ!', 'success');
    }
  };

  // Change project aspect ratio
  const handleChangeAspect = (aspectKey: string) => {
    updateProjectSettings({ aspect: aspectKey as any });
    updateSettings({ defaultAspect: aspectKey as any });
    showToast(`Đã đổi tỉ lệ khung hình sang: ${aspectKey}`, 'info');
  };

  // Background style helper
  const getBackgroundStyle = () => {
    switch (bgColor) {
      case 'dark':
        return 'bg-[#1F1F1F]';
      case 'white':
        return 'bg-white';
      case 'green':
        return 'bg-[#00FF00]';
      case 'checker':
        return 'bg-[linear-gradient(45deg,#222_25%,transparent_25%),linear-gradient(-45deg,#222_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#222_75%),linear-gradient(-45deg,transparent_75%,#222_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-[#111]';
      case 'black':
      default:
        return 'bg-black';
    }
  };

  return (
    <div
      id="player-canvas-container"
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleCanvasDrop}
      className={`flex-1 flex flex-col h-full bg-[#141414] relative overflow-hidden select-none transition-colors ${
        isDragOver ? 'ring-2 ring-[#1FC8DB] ring-inset' : ''
      }`}
    >
      {/* ======================================================== */}
      {/* 1. TOP BAR: Title & Menu ☰                               */}
      {/* ======================================================== */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#262626] bg-[#181818] z-30 shrink-0">
        <div className="flex items-center gap-2">
          {/* Menu ☰ Icon */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className={`p-1.5 rounded-md hover:bg-[#262626] text-[#E6E6E6] hover:text-white transition-colors ${
                menuOpen ? 'bg-[#262626] text-[#1FC8DB]' : ''
              }`}
              title="Menu Player (☰)"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Menu Dropdown */}
            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-1 w-60 rounded-md bg-[#1F1F1F] border border-[#333333] shadow-2xl py-1.5 text-xs text-[#E6E6E6] z-50 flex flex-col gap-0.5"
              >
                {/* 1. Safe Zones */}
                <button
                  onClick={toggleSafeZone}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#1FC8DB]" />
                    <span>Safe zones (Khung an toàn)</span>
                  </span>
                  {safeZoneEnabled && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                </button>

                {/* 2. Grid 3x3 */}
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-[#1FC8DB]" />
                    <span>Grid (Lưới 3x3)</span>
                  </span>
                  {showGrid && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                </button>

                {/* 3. Rulers */}
                <button
                  onClick={() => setShowRulers(!showRulers)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-[#1FC8DB]" />
                    <span>Rulers (Thước đo pixel)</span>
                  </span>
                  {showRulers && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                </button>

                <div className="h-[1px] bg-[#333333] my-1" />

                {/* 4. Background Color Submenu */}
                <div className="px-3 py-1 text-[10px] text-[#8A8A8A] uppercase font-bold">Màu nền Player</div>
                <div className="px-3 py-1 flex items-center gap-1.5">
                  {[
                    { id: 'black', label: 'Đen', color: '#000000' },
                    { id: 'dark', label: 'Xám', color: '#1F1F1F' },
                    { id: 'white', label: 'Trắng', color: '#FFFFFF' },
                    { id: 'green', label: 'Chroma', color: '#00FF00' },
                    { id: 'checker', label: 'Trong suốt', color: '#444444' }
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setBgColor(bg.id as any)}
                      className={`w-5 h-5 rounded border transition-transform ${
                        bgColor === bg.id ? 'ring-2 ring-[#1FC8DB] scale-110' : 'border-[#333333] hover:scale-105'
                      }`}
                      style={{ backgroundColor: bg.color }}
                      title={`Nền: ${bg.label}`}
                    />
                  ))}
                </div>

                <div className="h-[1px] bg-[#333333] my-1" />

                {/* 5. Loop Playback */}
                <button
                  onClick={() => setLoopPlayback(!loopPlayback)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-[#1FC8DB]" />
                    <span>Phát lặp lại (Loop)</span>
                  </span>
                  {loopPlayback && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                </button>

                {/* 6. Show Waveform */}
                <button
                  onClick={() => setShowWaveform(!showWaveform)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-[#1FC8DB]" />
                    <span>Hiển thị Waveform</span>
                  </span>
                  {showWaveform && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                </button>

                {/* 7. Color Scale */}
                <button
                  onClick={() => setShowColorScale(!showColorScale)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-[#1FC8DB]" />
                    <span>Thang đo màu (Color scale)</span>
                  </span>
                  {showColorScale && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                </button>

                {/* 8. Debug FPS & Dropped frames counter */}
                <button
                  onClick={() => setShowDebugFps(!showDebugFps)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-[#262626] text-left transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Debug FPS & Drop frames</span>
                  </span>
                  {showDebugFps && <Check className="w-3.5 h-3.5 text-[#1FC8DB]" />}
                </button>
              </div>
            )}
          </div>

          {/* Title: Player-Timeline 01 */}
          <span className="text-xs font-semibold text-white tracking-wide">
            Player-{timelineTitle}
          </span>
        </div>

        {/* Right Status Badge */}
        <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A]">
          <span className="px-1.5 py-0.5 rounded bg-[#262626] border border-[#333333] text-[#1FC8DB] font-mono text-[10px]">
            {aspectConfig.label.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN VIEWPORT: Canvas with Rulers & Guides            */}
      {/* ======================================================== */}
      <div
        ref={viewportRef}
        onClick={() => selectClip(null)}
        onDoubleClick={handleViewportDoubleClick}
        onMouseDown={handleViewportMouseDown}
        className={`flex-1 relative flex items-center justify-center p-3 overflow-hidden bg-[#0D0D0D] select-none ${
          isPanning ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : ''
        }`}
      >
        {/* Rulers: Top & Left */}
        {showRulers && (
          <>
            <div className="absolute top-0 left-0 right-0 h-4 bg-[#181818] border-b border-[#262626] flex items-center text-[8px] font-mono text-[#8A8A8A] px-2 overflow-hidden pointer-events-none z-20">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="flex-1 border-r border-[#333333] h-full flex items-end pb-0.5">
                  {i % 2 === 0 ? i * 50 : ''}
                </div>
              ))}
            </div>
            <div className="absolute top-4 left-0 bottom-0 w-4 bg-[#181818] border-r border-[#262626] flex flex-col text-[8px] font-mono text-[#8A8A8A] py-2 overflow-hidden pointer-events-none z-20">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="flex-1 border-b border-[#333333] w-full flex items-center justify-center">
                  {i % 2 === 0 ? i * 50 : ''}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Canvas Display Wrapper (CapCut Zoom & Pan) */}
        <div
          ref={canvasWrapperRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            aspectRatio: aspectConfig.cssRatio,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${typeof zoomMode === 'number' ? zoomMode : 1.0})`,
            transformOrigin: 'center center',
            transition: isPanning || isDraggingClip ? 'none' : 'transform 0.12s ease-out'
          }}
          className={`relative max-h-[92%] max-w-[94%] rounded border border-[#2E2E2E] shadow-2xl flex items-center justify-center overflow-hidden ${getBackgroundStyle()}`}
        >
          {/* Main Rendering Canvas */}
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-full object-contain pointer-events-auto"
          />

          {/* Live Debug FPS & Dropped Frames HUD */}
          {showDebugFps && (
            <div className="absolute top-2.5 right-2.5 z-30 px-2 py-1 rounded bg-black/85 backdrop-blur border border-white/20 text-[10px] font-mono flex items-center gap-2 pointer-events-none select-none shadow-lg">
              <div
                className={`w-2 h-2 rounded-full ${
                  currentFps >= 28 ? 'bg-emerald-400' : currentFps >= 20 ? 'bg-amber-400' : 'bg-rose-500'
                } animate-pulse`}
              />
              <span className="text-white font-bold">{currentFps.toFixed(1)} FPS</span>
              <span className="text-[#555]">|</span>
              <span className={droppedFrames > 0 ? 'text-amber-300 font-semibold' : 'text-[#888]'}>
                Drops: {droppedFrames}
              </span>
              <span className="text-[#555]">|</span>
              <span className={isProxyEnabled ? 'text-[#1FC8DB] font-bold' : 'text-[#777]'}>
                {isProxyEnabled ? 'Proxy: ON (480p)' : 'Proxy: OFF'}
              </span>
            </div>
          )}

          {/* Auto-suggest Proxy banner when FPS drops during 1080p playback */}
          {showProxyPrompt && !isProxyEnabled && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#161B26]/95 border border-amber-500/50 rounded-lg px-3.5 py-2 flex items-center gap-3 text-xs text-amber-200 shadow-2xl backdrop-blur animate-in fade-in">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                FPS sụt giảm (<strong>{currentFps.toFixed(0)} FPS</strong>, {droppedFrames} drops). Bật Proxy (480p) để xem trước mượt mà?
              </span>
              <button
                onClick={() => {
                  toggleProxy();
                  setShowProxyPrompt(false);
                  showToast('Đã bật chế độ Proxy (480p) xem trước siêu mượt!', 'success');
                }}
                className="px-2.5 py-1 rounded bg-[#1FC8DB] text-slate-950 font-bold hover:brightness-110 cursor-pointer transition-all"
              >
                Bật Proxy
              </button>
              <button
                onClick={() => setShowProxyPrompt(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Grid 3x3 Overlay (Rule of Thirds) */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 border border-white/10">
              <div className="border-r border-b border-white/20 border-dashed" />
              <div className="border-r border-b border-white/20 border-dashed" />
              <div className="border-b border-white/20 border-dashed" />
              <div className="border-r border-b border-white/20 border-dashed" />
              <div className="border-r border-b border-white/20 border-dashed" />
              <div className="border-b border-white/20 border-dashed" />
              <div className="border-r border-white/20 border-dashed" />
              <div className="border-r border-white/20 border-dashed" />
              <div />
            </div>
          )}

          {/* Center Snap Lines */}
          {snapX && (
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#1FC8DB] shadow-[0_0_8px_#1FC8DB] pointer-events-none z-20" />
          )}
          {snapY && (
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[#1FC8DB] shadow-[0_0_8px_#1FC8DB] pointer-events-none z-20" />
          )}

          {/* 9:16 Safe Zone Overlay */}
          {safeZoneEnabled && currentAspect === '9:16' && (
            <div className="absolute inset-0 pointer-events-none border border-dashed border-[#1FC8DB]/50 m-4 rounded flex flex-col justify-between p-3 z-10">
              <div className="text-[9px] text-[#1FC8DB] font-mono bg-black/80 px-1.5 py-0.5 rounded w-max border border-[#1FC8DB]/30">
                Safe Zone: Header & Search
              </div>

              {/* Right Action Icons simulated zone */}
              <div className="self-end flex flex-col gap-1.5 items-center bg-black/80 p-1.5 rounded border border-[#333333]">
                <div className="w-5 h-5 rounded-full bg-rose-500/30 flex items-center justify-center text-[9px] text-rose-300">♥</div>
                <div className="w-5 h-5 rounded-full bg-slate-700/40 flex items-center justify-center text-[9px] text-slate-300">💬</div>
                <div className="w-5 h-5 rounded-full bg-slate-700/40 flex items-center justify-center text-[9px] text-slate-300">🔖</div>
                <div className="w-5 h-5 rounded-full bg-slate-700/40 flex items-center justify-center text-[9px] text-slate-300">↗</div>
              </div>

              <div className="text-[9px] text-[#1FC8DB] font-mono bg-black/80 px-1.5 py-0.5 rounded w-max border border-[#1FC8DB]/30">
                Safe Zone: Caption & Audio
              </div>
            </div>
          )}

          {/* Audio Waveform Bar at Bottom */}
          {showWaveform && (
            <div className="absolute bottom-2 left-4 right-4 h-6 bg-black/70 backdrop-blur rounded border border-white/10 flex items-end gap-1 px-2 py-1 z-10 pointer-events-none">
              {Array.from({ length: 32 }).map((_, i) => {
                const h = Math.abs(Math.sin(currentTime * 8 + i * 0.4)) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-[#1FC8DB] to-[#4BD9E8] rounded-t-sm transition-all duration-75"
                    style={{ height: `${Math.max(15, h)}%` }}
                  />
                );
              })}
            </div>
          )}

          {/* Color Scale (RGB Parade / Histogram Indicator) */}
          {showColorScale && (
            <div className="absolute top-2 right-2 p-1.5 bg-black/80 backdrop-blur rounded border border-[#333333] flex flex-col gap-1 z-10 pointer-events-none">
              <span className="text-[8px] font-mono text-[#8A8A8A]">RGB SCOPE</span>
              <div className="flex items-center gap-1 h-8 w-14">
                <div className="flex-1 bg-red-500/80 h-[80%] rounded-sm" />
                <div className="flex-1 bg-emerald-500/80 h-[92%] rounded-sm" />
                <div className="flex-1 bg-sky-500/80 h-[75%] rounded-sm" />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* DIRECT MANIPULATION BOUNDING BOX & HANDLES               */}
          {/* ======================================================== */}
          {isSelectedClipActive && (
            <div
              onMouseDown={(e) => handleMouseDownOnClip(e, 'move')}
              onDoubleClick={() => handleDoubleClickText(selectedClip)}
              style={{
                position: 'absolute',
                left: `calc(50% + ${(selectedClip.x || selectedClip.transform?.x || 0) * 0.5}px)`,
                top: `calc(50% + ${(selectedClip.y || selectedClip.transform?.y || (selectedClip.type === 'text' ? -110 : 0)) * 0.5}px)`,
                transform: `translate(-50%, -50%) rotate(${selectedClip.rotation || selectedClip.transform?.rotation || 0}deg) scale(${selectedClip.scale || selectedClip.transform?.scale || 1.0})`,
                width: selectedClip.type === 'text' ? `${Math.max(160, (selectedClip.text?.length || 10) * 14)}px` : '75%',
                height: selectedClip.type === 'text' ? '54px' : '65%'
              }}
              className="border-2 border-[#1FC8DB] cursor-move z-20 group pointer-events-auto shadow-[0_0_12px_rgba(31,200,219,0.3)]"
            >
              {/* Rotation Handle (Stem & Circle) */}
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'rotate')}
                className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing"
                title="Kéo để xoay góc"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#1FC8DB] shadow-md hover:scale-125 transition-transform" />
                <div className="w-[1.5px] h-3.5 bg-[#1FC8DB]" />
              </div>

              {/* 4 Corner Scale Handles */}
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'scale', 'tl')}
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#1FC8DB] rounded-sm cursor-nwse-resize shadow hover:scale-125 transition-transform z-30"
                title="Kéo góc trên-trái"
              />
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'scale', 'tr')}
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#1FC8DB] rounded-sm cursor-nesw-resize shadow hover:scale-125 transition-transform z-30"
                title="Kéo góc trên-phải"
              />
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'scale', 'bl')}
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#1FC8DB] rounded-sm cursor-nesw-resize shadow hover:scale-125 transition-transform z-30"
                title="Kéo góc dưới-trái"
              />
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'scale', 'br')}
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#1FC8DB] rounded-sm cursor-nwse-resize shadow hover:scale-125 transition-transform z-30"
                title="Kéo góc dưới-phải"
              />

              {/* 4 Edge Center Scale Handles (CapCut style) */}
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'scale', 't')}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-[#1FC8DB] rounded-sm cursor-ns-resize shadow hover:scale-125 transition-transform z-30"
                title="Kéo cạnh trên"
              />
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'scale', 'b')}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-[#1FC8DB] rounded-sm cursor-ns-resize shadow hover:scale-125 transition-transform z-30"
                title="Kéo cạnh dưới"
              />
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'scale', 'l')}
                className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#1FC8DB] rounded-sm cursor-ew-resize shadow hover:scale-125 transition-transform z-30"
                title="Kéo cạnh trái"
              />
              <div
                onMouseDown={(e) => handleMouseDownOnClip(e, 'scale', 'r')}
                className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#1FC8DB] rounded-sm cursor-ew-resize shadow hover:scale-125 transition-transform z-30"
                title="Kéo cạnh phải"
              />

              {/* Inline Text Editing Input */}
              {isEditingInlineText && selectedClip.type === 'text' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute inset-0 bg-black/90 p-1 flex items-center justify-center z-30"
                >
                  <input
                    ref={inlineInputRef}
                    type="text"
                    value={inlineTextValue}
                    onChange={(e) => setInlineTextValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveInlineText();
                      if (e.key === 'Escape') setIsEditingInlineText(false);
                    }}
                    onBlur={handleSaveInlineText}
                    className="w-full bg-[#1A1A1A] border border-[#1FC8DB] rounded px-2 py-1 text-center font-bold text-white text-xs outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM CONTROLS BAR                                   */}
      {/* ======================================================== */}
      <div className="h-11 px-3 bg-[#181818] border-t border-[#262626] flex items-center justify-between z-30 shrink-0 text-[#E6E6E6]">
        {/* Left Side: Timecode / Frame Display & Step Controls */}
        <div className="flex items-center gap-1.5">
          {/* Timecode Toggle Button (HH:MM:SS:FF <-> Frame count) */}
          <button
            onClick={() => setTimecodeDisplayMode(timecodeDisplayMode === 'smpte' ? 'frames' : 'smpte')}
            className={`px-2 py-1 rounded bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] font-mono text-[11px] font-medium transition-all ${
              duration === 0 || clips.length === 0 ? 'opacity-40' : 'text-[#E6E6E6]'
            }`}
            title="Bấm để chuyển đổi giữa Timecode (HH:MM:SS:FF) và Số Frame"
          >
            {timecodeDisplayMode === 'smpte' ? (
              <>
                <span className="text-[#1FC8DB] font-bold">{formatTimecode(currentTime)}</span>
                <span className="text-[#8A8A8A]"> / </span>
                <span>{formatTimecode(duration)}</span>
              </>
            ) : (
              <>
                <span className="text-[#1FC8DB] font-bold">F {Math.floor(currentTime * fps)}</span>
                <span className="text-[#8A8A8A]"> / </span>
                <span>F {Math.floor(duration * fps)}</span>
              </>
            )}
          </button>

          {/* Step -1 Frame (Left) */}
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 1 / fps))}
            className="p-1.5 hover:text-[#1FC8DB] hover:bg-[#262626] rounded transition-colors"
            title="Lùi 1 frame (←)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Rewind 1s */}
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 1))}
            className="p-1.5 hover:text-[#1FC8DB] hover:bg-[#262626] rounded transition-colors"
            title="Lùi 1 giây (Shift+←)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Center: Prominent Master Play / Pause Button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              masterAudio.playSynthesizer('click');
              setIsPlaying(!isPlaying);
            }}
            className="px-4 py-1.5 bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-md shadow-cyan-500/20"
            title={isPlaying ? 'Tạm dừng (Space)' : 'Phát video (Space)'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Forward 1s */}
          <button
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 1))}
            className="p-1.5 hover:text-[#1FC8DB] hover:bg-[#262626] rounded transition-colors"
            title="Tiến 1 giây (Shift+→)"
          >
            <RotateCw className="w-3 h-3" />
          </button>

          {/* Step +1 Frame (Right) */}
          <button
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 1 / fps))}
            className="p-1.5 hover:text-[#1FC8DB] hover:bg-[#262626] rounded transition-colors"
            title="Tiến 1 frame (→)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Side: Quality, Zoom, Ratio & Fullscreen */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Quality Dropdown: Full / Half / Quarter */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setQualityDropdownOpen(!qualityDropdownOpen);
              }}
              className="px-2 py-1 rounded bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] text-[11px] font-semibold text-white flex items-center gap-1 transition-colors"
              title="Chất lượng Preview"
            >
              <span>{previewQuality === 'full' ? 'Full' : previewQuality === 'half' ? 'Half (1/2)' : 'Quarter (1/4)'}</span>
            </button>
            {qualityDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-0 mb-1 w-28 rounded bg-[#1F1F1F] border border-[#333333] shadow-2xl py-1 text-[11px] text-[#E6E6E6] flex flex-col z-50"
              >
                {[
                  { id: 'full', label: 'Full (100%)' },
                  { id: 'half', label: 'Half (50%)' },
                  { id: 'quarter', label: 'Quarter (25%)' }
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setPreviewQuality(q.id as any);
                      setQualityDropdownOpen(false);
                      showToast(`Chất lượng preview: ${q.label}`, 'info');
                    }}
                    className={`px-2.5 py-1 text-left hover:bg-[#262626] flex items-center justify-between ${
                      previewQuality === q.id ? 'text-[#1FC8DB] font-bold' : ''
                    }`}
                  >
                    <span>{q.label}</span>
                    {previewQuality === q.id && <Check className="w-3 h-3 text-[#1FC8DB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom / Fit Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomDropdownOpen(!zoomDropdownOpen);
              }}
              className="px-2 py-1 rounded bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] text-[11px] font-semibold text-white flex items-center gap-1 transition-colors"
              title="Mức phóng to Player (Fit / 25-400%)"
            >
              <span>{zoomMode === 'fit' ? 'Fit' : `${Math.round(zoomMode * 100)}%`}</span>
            </button>
            {zoomDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-0 mb-1 w-28 rounded bg-[#1F1F1F] border border-[#333333] shadow-2xl py-1 text-[11px] text-[#E6E6E6] flex flex-col z-50 max-h-48 overflow-y-auto"
              >
                {[
                  { id: 'fit', label: 'Fit' },
                  { id: 0.25, label: '25%' },
                  { id: 0.5, label: '50%' },
                  { id: 0.75, label: '75%' },
                  { id: 1.0, label: '100%' },
                  { id: 1.5, label: '150%' },
                  { id: 2.0, label: '200%' },
                  { id: 4.0, label: '400%' }
                ].map((z) => (
                  <button
                    key={String(z.id)}
                    onClick={() => {
                      if (z.id === 'fit') {
                        setZoomMode('fit');
                        setPanOffset({ x: 0, y: 0 });
                      } else {
                        setZoomMode(z.id as any);
                      }
                      setZoomDropdownOpen(false);
                    }}
                    className={`px-2.5 py-1 text-left hover:bg-[#262626] flex items-center justify-between ${
                      zoomMode === z.id ? 'text-[#1FC8DB] font-bold' : ''
                    }`}
                  >
                    <span>{z.label}</span>
                    {zoomMode === z.id && <Check className="w-3 h-3 text-[#1FC8DB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ratio Dropdown: Original, 9:16, 16:9, 1:1, 4:3, 3:4, 21:9, Custom */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRatioDropdownOpen(!ratioDropdownOpen);
              }}
              className="px-2 py-1 rounded bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] text-[11px] font-semibold text-[#1FC8DB] flex items-center gap-1 transition-colors"
              title="Đổi tỉ lệ khung hình (Ratio)"
            >
              <span>{currentAspect}</span>
            </button>
            {ratioDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-0 mb-1 w-44 rounded bg-[#1F1F1F] border border-[#333333] shadow-2xl py-1 text-[11px] text-[#E6E6E6] flex flex-col z-50"
              >
                <div className="px-2.5 py-1 text-[10px] text-[#8A8A8A] uppercase font-bold">Tỉ lệ khung hình</div>
                {[
                  { id: '9:16', label: '9:16 (TikTok, Reels)' },
                  { id: '16:9', label: '16:9 (YouTube ngang)' },
                  { id: '1:1', label: '1:1 (Vuông Instagram)' },
                  { id: '4:3', label: '4:3 (Truyền thống)' },
                  { id: '3:4', label: '3:4 (Chân dung)' },
                  { id: '21:9', label: '21:9 (Ultrawide)' },
                  { id: 'original', label: 'Original (Gốc)' },
                  { id: 'custom', label: 'Custom (Tùy chỉnh)' }
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      handleChangeAspect(r.id);
                      setRatioDropdownOpen(false);
                    }}
                    className={`px-2.5 py-1 text-left hover:bg-[#262626] flex items-center justify-between ${
                      currentAspect === r.id ? 'text-[#1FC8DB] font-bold' : ''
                    }`}
                  >
                    <span>{r.label}</span>
                    {currentAspect === r.id && <Check className="w-3 h-3 text-[#1FC8DB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] text-white transition-colors"
            title={isFullscreen ? 'Thu nhỏ (Thoát toàn màn hình)' : 'Toàn màn hình (Fullscreen)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
