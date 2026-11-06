import React, { useRef, useState } from 'react';
import { useEditorStore, type TimelineClip } from '../store/useEditorStore';
import { translations } from '../i18n';
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
  ZoomOut
} from 'lucide-react';

export const Timeline: React.FC = () => {
  const {
    language,
    clips,
    currentTime,
    setCurrentTime,
    duration,
    selectedClipId,
    selectClip,
    splitClip,
    duplicateClip,
    deleteClip,
    trimClipStart,
    trimClipEnd,
    updateClip,
    undo,
    redo,
    addClip,
    timelineZoom,
    setTimelineZoom,
    snapEnabled,
    toggleSnap,
    showToast
  } = useEditorStore();

  const t = translations[language];
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Dragging / Trimming state
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [trimmingHandle, setTrimmingHandle] = useState<'start' | 'end' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [origClipStart, setOrigClipStart] = useState<number>(0);
  const [origClipDuration, setOrigClipDuration] = useState<number>(0);

  const tracks = [
    { id: 'text', name: 'Text / Sub', icon: Type, color: 'border-amber-500/60 bg-amber-950/40 text-amber-300' },
    { id: 'sticker', name: 'Sticker', icon: Smile, color: 'border-pink-500/60 bg-pink-950/40 text-pink-300' },
    { id: 'video', name: 'Video 9:16', icon: Video, color: 'border-[#22D3EE]/60 bg-cyan-950/40 text-[#22D3EE]' },
    { id: 'audio', name: 'Audio / BGM', icon: Music, color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300' },
    { id: 'effect', name: 'Effects', icon: Sparkles, color: 'border-purple-500/60 bg-purple-950/40 text-purple-300' }
  ];

  // Helper for snapping
  const snapTime = (targetTime: number, clipId: number | string): number => {
    if (!snapEnabled) return targetTime;
    const SNAP_THRESHOLD = 0.35; // seconds

    // Snap to 0 or playhead
    if (Math.abs(targetTime - 0) < SNAP_THRESHOLD) return 0;
    if (Math.abs(targetTime - currentTime) < SNAP_THRESHOLD) return currentTime;

    // Snap to other clip boundaries
    for (const other of clips) {
      if (other.id === clipId) continue;
      const otherEnd = other.start + other.duration;
      if (Math.abs(targetTime - other.start) < SNAP_THRESHOLD) return other.start;
      if (Math.abs(targetTime - otherEnd) < SNAP_THRESHOLD) return otherEnd;
    }
    return targetTime;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / (rect.width * timelineZoom)));
    setCurrentTime(progress * duration);
  };

  // Start clip dragging (move along timeline)
  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    selectClip(clip.id);
    setDraggingClipId(clip.id);
    setTrimmingHandle(null);
    setDragStartX(e.clientX);
    setOrigClipStart(clip.start);
    setOrigClipDuration(clip.duration);
  };

  // Start trim start handle
  const handleTrimStartMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    selectClip(clip.id);
    setDraggingClipId(clip.id);
    setTrimmingHandle('start');
    setDragStartX(e.clientX);
    setOrigClipStart(clip.start);
    setOrigClipDuration(clip.duration);
  };

  // Start trim end handle
  const handleTrimEndMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    selectClip(clip.id);
    setDraggingClipId(clip.id);
    setTrimmingHandle('end');
    setDragStartX(e.clientX);
    setOrigClipStart(clip.start);
    setOrigClipDuration(clip.duration);
  };

  // Global mouse move & up
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingClipId || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const totalPixelWidth = rect.width * timelineZoom;
    const deltaX = e.clientX - dragStartX;
    const deltaSeconds = (deltaX / totalPixelWidth) * duration;

    const clip = clips.find((c) => c.id === draggingClipId);
    if (!clip) return;

    if (trimmingHandle === 'start') {
      let newStart = origClipStart + deltaSeconds;
      newStart = snapTime(newStart, clip.id);
      trimClipStart(clip.id, newStart);
    } else if (trimmingHandle === 'end') {
      let newEnd = origClipStart + origClipDuration + deltaSeconds;
      newEnd = snapTime(newEnd, clip.id);
      trimClipEnd(clip.id, newEnd);
    } else {
      // Reposition clip
      let newStart = Math.max(0, origClipStart + deltaSeconds);
      newStart = snapTime(newStart, clip.id);
      updateClip(clip.id, { start: newStart });
    }
  };

  const handleMouseUp = () => {
    if (draggingClipId) {
      setDraggingClipId(null);
      setTrimmingHandle(null);
    }
  };

  const handleSplit = () => {
    if (selectedClipId) {
      splitClip(selectedClipId, currentTime);
      showToast('Đã tách clip tại con trỏ (S)');
    }
  };

  const handleDuplicate = () => {
    if (selectedClipId) {
      duplicateClip(selectedClipId);
      showToast('Đã nhân bản clip');
    }
  };

  const handleDelete = () => {
    if (selectedClipId) {
      deleteClip(selectedClipId);
      showToast('Đã xóa clip (Del)');
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="h-64 bg-[#0E1320] border-t border-[#1F2937] flex flex-col select-none shrink-0"
    >
      {/* Timeline Toolbar Action Bar */}
      <div className="h-11 border-b border-[#1F2937] px-4 flex items-center justify-between text-xs text-[#E5E7EB] bg-[#0B0F19]">
        {/* Left: History & Edit Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            className="p-1.5 hover:bg-[#1F2937] rounded-xl text-[#9CA3AF] hover:text-white transition-all"
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            className="p-1.5 hover:bg-[#1F2937] rounded-xl text-[#9CA3AF] hover:text-white transition-all"
            title="Làm lại (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-[#1F2937] mx-1.5" />

          {/* Split (S) */}
          <button
            onClick={handleSplit}
            disabled={!selectedClipId}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium transition-all ${
              selectedClipId
                ? 'hover:bg-[#1F2937] text-white hover:text-[#22D3EE] cursor-pointer'
                : 'text-[#9CA3AF]/40 cursor-not-allowed'
            }`}
            title="Tách clip tại playhead (Phím tắt: S)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Tách (S)</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            disabled={!selectedClipId}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium transition-all ${
              selectedClipId
                ? 'hover:bg-[#1F2937] text-white hover:text-[#22D3EE] cursor-pointer'
                : 'text-[#9CA3AF]/40 cursor-not-allowed'
            }`}
            title="Nhân bản clip đã chọn"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Nhân bản</span>
          </button>

          {/* Delete (Del) */}
          <button
            onClick={handleDelete}
            disabled={!selectedClipId}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium transition-all ${
              selectedClipId
                ? 'hover:bg-rose-950/40 text-rose-300 cursor-pointer'
                : 'text-[#9CA3AF]/40 cursor-not-allowed'
            }`}
            title="Xóa clip đã chọn (Phím Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.delete}</span>
          </button>

          <div className="h-4 w-[1px] bg-[#1F2937] mx-1.5" />

          {/* Magnet / Snap Button */}
          <button
            onClick={toggleSnap}
            title={snapEnabled ? 'Hút nam châm đang BẬT (Snap ON)' : 'Hút nam châm đang TẮT (Snap OFF)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium transition-all ${
              snapEnabled
                ? 'bg-[#22D3EE]/20 border border-[#22D3EE]/40 text-[#22D3EE]'
                : 'bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>
        </div>

        {/* Center / Right: Zoom Timeline & Quick Adds */}
        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-[#111827] px-2.5 py-1 rounded-xl border border-[#1F2937]">
            <button
              onClick={() => setTimelineZoom(timelineZoom - 0.25)}
              className="p-0.5 text-[#9CA3AF] hover:text-white"
              title="Thu nhỏ timeline (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.25"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
              className="w-16 accent-[#22D3EE] cursor-pointer h-1"
            />
            <button
              onClick={() => setTimelineZoom(timelineZoom + 0.25)}
              className="p-0.5 text-[#9CA3AF] hover:text-white"
              title="Phóng to timeline (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-[#22D3EE] font-mono font-bold w-9 text-right">
              {Math.round(timelineZoom * 100)}%
            </span>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                addClip({
                  track: 'text',
                  name: 'Chữ mới',
                  start: currentTime,
                  duration: 3,
                  type: 'text',
                  text: 'VIẾT NỘI DUNG TẠI ĐÂY',
                  textAnimIn: 'pop'
                })
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all hover-lift"
            >
              <Plus className="w-3 h-3 text-amber-400" />
              <span>+ Text</span>
            </button>

            <button
              onClick={() =>
                addClip({
                  track: 'audio',
                  name: 'Nhạc hiệu ứng',
                  start: currentTime,
                  duration: 8,
                  type: 'audio',
                  volume: 0.8
                })
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all hover-lift"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>+ Audio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tracks Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Left Column) */}
        <div className="w-32 border-r border-[#1F2937] bg-[#0B0F19] flex flex-col shrink-0">
          {/* Header spacer aligned with ruler */}
          <div className="h-6 border-b border-[#1F2937] bg-[#070A10] px-3 flex items-center text-[10px] text-[#9CA3AF] font-mono">
            Tracks
          </div>
          {tracks.map((track) => {
            const Icon = track.icon;
            return (
              <div
                key={track.id}
                className="h-10 border-b border-[#1F2937]/70 px-3 flex items-center justify-between text-xs font-semibold text-[#9CA3AF]"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{track.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline Grid (Right Area) */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="flex-1 relative bg-[#070A10] overflow-x-auto overflow-y-hidden cursor-pointer scrollbar-thin"
        >
          {/* Inner Canvas sized according to timelineZoom */}
          <div
            className="h-full relative"
            style={{ width: `${Math.max(100, 100 * timelineZoom)}%`, minWidth: '100%' }}
          >
            {/* Top Ruler / Timecode Ticks */}
            <div className="h-6 border-b border-[#1F2937] bg-[#0B0F19]/80 flex items-center text-[10px] font-mono text-[#9CA3AF] px-1 relative">
              {Array.from({ length: Math.ceil(duration) + 1 }).map((_, sec) => (
                <div
                  key={sec}
                  style={{ left: `${(sec / duration) * 100}%` }}
                  className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                >
                  <span className="text-[9px] text-[#9CA3AF]">{sec}s</span>
                  <div className="w-[1px] h-2 bg-[#1F2937]" />
                </div>
              ))}
            </div>

            {/* Red / Cyan Playhead Vertical Line */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center transition-all duration-75"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <div className="w-3 h-3 bg-[#22D3EE] rotate-45 -mt-1 shadow-md shadow-[#22D3EE]/60" />
              <div className="w-[1.5px] h-full bg-[#22D3EE] shadow-sm" />
            </div>

            {/* Tracks Rows */}
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.track === track.id);
              return (
                <div
                  key={track.id}
                  className="h-10 border-b border-[#1F2937]/40 relative flex items-center px-1"
                >
                  {trackClips.map((clip) => {
                    const leftPercent = (clip.start / duration) * 100;
                    const widthPercent = (clip.duration / duration) * 100;
                    const isSelected = selectedClipId === clip.id;

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${Math.max(3, widthPercent)}%`
                        }}
                        className={`absolute h-8 rounded-xl border px-2 flex items-center justify-between text-xs font-semibold select-none group transition-all shadow-md ${
                          track.color
                        } ${
                          isSelected
                            ? 'ring-2 ring-[#22D3EE] border-[#22D3EE] brightness-125 z-20 shadow-cyan-500/30'
                            : 'hover:brightness-110 z-10'
                        }`}
                      >
                        {/* Trim Handle Left (Start) */}
                        <div
                          onMouseDown={(e) => handleTrimStartMouseDown(e, clip)}
                          title="Kéo để cắt đầu clip (Trim Start)"
                          className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-xl cursor-ew-resize transition-all ${
                            isSelected
                              ? 'bg-[#22D3EE] opacity-90'
                              : 'bg-white/20 opacity-0 group-hover:opacity-100'
                          }`}
                        />

                        {/* Clip Content Label */}
                        <span className="truncate px-1 text-[11px] font-medium pointer-events-none">
                          {clip.text || clip.name}
                        </span>

                        {/* Duration Badge */}
                        <span className="text-[10px] opacity-75 shrink-0 ml-1 font-mono pointer-events-none">
                          {clip.duration.toFixed(1)}s
                        </span>

                        {/* Trim Handle Right (End) */}
                        <div
                          onMouseDown={(e) => handleTrimEndMouseDown(e, clip)}
                          title="Kéo để cắt đuôi clip (Trim End)"
                          className={`absolute right-0 top-0 bottom-0 w-2 rounded-r-xl cursor-ew-resize transition-all ${
                            isSelected
                              ? 'bg-[#22D3EE] opacity-90'
                              : 'bg-white/20 opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
