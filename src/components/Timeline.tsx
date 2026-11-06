import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import {
  Scissors,
  Trash2,
  Undo2,
  Redo2,
  Plus,
  Type,
  Music,
  Smile,
  Video
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
    deleteClip,
    undo,
    redo,
    addClip
  } = useEditorStore();

  const t = translations[language];

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTime(progress * duration);
  };

  const handleSplit = () => {
    if (selectedClipId) {
      splitClip(selectedClipId, currentTime);
    }
  };

  const handleDelete = () => {
    if (selectedClipId) {
      deleteClip(selectedClipId);
    }
  };

  const tracks = [
    { id: 'text', name: 'Text', icon: Type, color: 'border-amber-500/50 bg-amber-950/40 text-amber-300' },
    { id: 'sticker', name: 'Sticker', icon: Smile, color: 'border-pink-500/50 bg-pink-950/40 text-pink-300' },
    { id: 'video', name: 'Video', icon: Video, color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300' },
    { id: 'audio', name: 'Audio', icon: Music, color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300' }
  ];

  return (
    <div className="h-56 bg-[#11141b] border-t border-[#1e2430] flex flex-col select-none shrink-0">
      {/* Timeline Action Bar */}
      <div className="h-10 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            title={t.undo}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            title={t.redo}
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1.5" />

          <button
            onClick={handleSplit}
            disabled={!selectedClipId}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              selectedClipId
                ? 'hover:bg-slate-800 text-slate-200 hover:text-cyan-400 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Tách clip tại vị trí con trỏ (Ctrl+B)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{t.split}</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={!selectedClipId}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              selectedClipId
                ? 'hover:bg-rose-950/50 text-rose-300 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Xóa clip đã chọn (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.delete}</span>
          </button>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              addClip({
                track: 'text',
                name: 'Chữ mới',
                start: currentTime,
                duration: 3,
                type: 'text',
                text: 'VIẾT NỘI DUNG TẠI ĐÂY'
              })
            }
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px]"
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span>+ Text</span>
          </button>

          <button
            onClick={() =>
              addClip({
                track: 'sticker',
                name: 'Emoji Sticker',
                start: currentTime,
                duration: 3,
                type: 'sticker',
                text: '🔥'
              })
            }
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px]"
          >
            <Plus className="w-3 h-3 text-pink-400" />
            <span>+ Sticker</span>
          </button>
        </div>
      </div>

      {/* Tracks Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Left) */}
        <div className="w-28 border-r border-slate-800 bg-[#0d1017] flex flex-col shrink-0">
          {tracks.map((track) => {
            const Icon = track.icon;
            return (
              <div
                key={track.id}
                className="h-10 border-b border-slate-800/60 px-3 flex items-center gap-2 text-xs font-medium text-slate-400"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{track.name}</span>
              </div>
            );
          })}
        </div>

        {/* Interactive Timeline Canvas & Clips (Right) */}
        <div
          onClick={handleTimelineClick}
          className="flex-1 relative bg-[#0a0d13] overflow-x-auto overflow-y-hidden cursor-pointer"
        >
          {/* Playhead Vertical Line */}
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="w-3 h-3 bg-cyan-400 rotate-45 -mt-1 shadow-md shadow-cyan-400/50" />
            <div className="w-[1.5px] h-full bg-cyan-400 shadow-sm" />
          </div>

          {/* Tracks Rows */}
          {tracks.map((track) => {
            const trackClips = clips.filter((c) => c.track === track.id);
            return (
              <div
                key={track.id}
                className="h-10 border-b border-slate-800/40 relative flex items-center px-1"
              >
                {trackClips.map((clip) => {
                  const leftPercent = (clip.start / duration) * 100;
                  const widthPercent = (clip.duration / duration) * 100;
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectClip(clip.id);
                      }}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(4, widthPercent)}%`
                      }}
                      className={`absolute h-7 rounded border px-2 flex items-center justify-between text-[11px] font-medium transition-all shadow-sm ${
                        track.color
                      } ${
                        isSelected
                          ? 'ring-2 ring-cyan-400 border-cyan-400 brightness-110 z-10'
                          : 'hover:brightness-105'
                      }`}
                    >
                      <span className="truncate">{clip.text || clip.name}</span>
                      <span className="text-[9px] opacity-70 shrink-0 ml-1 font-mono">
                        {clip.duration.toFixed(1)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

