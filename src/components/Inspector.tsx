import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { Sliders, Volume2, Gauge, SunMedium, Type, Sparkles } from 'lucide-react';

export const Inspector: React.FC = () => {
  const {
    language,
    clips,
    selectedClipId,
    updateClip,
    projectTitle,
    duration
  } = useEditorStore();

  const t = translations[language];
  const clip = clips.find((c) => c.id === selectedClipId);

  return (
    <aside className="w-72 bg-[#10131b] border-l border-[#1e2430] flex flex-col p-4 select-none shrink-0 overflow-y-auto">
      {/* Title */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-slate-200">
        <Sliders className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold uppercase tracking-wider">{t.inspectorTitle}</span>
      </div>

      {clip ? (
        <div className="flex flex-col gap-5 pt-4 text-xs text-slate-300">
          {/* Clip Name */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Tên phân đoạn:</span>
            <input
              type="text"
              value={clip.name}
              onChange={(e) => updateClip(clip.id, { name: e.target.value })}
              className="bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-2.5 py-1.5 text-slate-100 outline-none"
            />
          </div>

          {/* Text Content (if text track) */}
          {clip.track === 'text' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                <Type className="w-3.5 h-3.5" />
                Nội dung phụ đề / chữ:
              </span>
              <textarea
                rows={2}
                value={clip.text || ''}
                onChange={(e) => updateClip(clip.id, { text: e.target.value })}
                className="bg-slate-900 border border-amber-600/50 focus:border-amber-400 rounded px-2.5 py-1.5 text-slate-100 outline-none text-xs resize-none"
              />
            </div>
          )}

          {/* Scale Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{t.scale}</span>
              <span className="font-mono text-cyan-400">{((clip.scale || 1) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.05"
              value={clip.scale || 1}
              onChange={(e) => updateClip(clip.id, { scale: parseFloat(e.target.value) })}
              className="accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Position Y Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Vị trí dọc (Y-Offset)</span>
              <span className="font-mono text-cyan-400">{clip.y || 0}px</span>
            </div>
            <input
              type="range"
              min="-300"
              max="300"
              step="5"
              value={clip.y || 0}
              onChange={(e) => updateClip(clip.id, { y: parseInt(e.target.value, 10) })}
              className="accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Opacity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <SunMedium className="w-3.5 h-3.5" />
                {t.opacity}
              </span>
              <span className="font-mono text-cyan-400">{((clip.opacity ?? 1) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={clip.opacity ?? 1}
              onChange={(e) => updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
              className="accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Speed Preset Buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              {t.speed}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1, 1.2, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => updateClip(clip.id, { speed })}
                  className={`py-1 rounded text-[11px] font-semibold border transition-colors ${
                    clip.speed === speed
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                {t.volume}
              </span>
              <span className="font-mono text-cyan-400">{((clip.volume ?? 1) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={clip.volume ?? 1}
              onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })}
              className="accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Filter Preset */}
          {clip.track === 'video' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                Bộ lọc màu (Color Grade):
              </span>
              <select
                value={clip.filter || 'none'}
                onChange={(e) => updateClip(clip.id, { filter: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 outline-none text-xs"
              >
                <option value="none">Gốc (Standard)</option>
                <option value="cinematic">Cinematic Moody</option>
                <option value="vhs">Retro VHS 90s</option>
                <option value="warm">Ấm áp (Warm Sun)</option>
                <option value="noir">Đen trắng (Noir)</option>
              </select>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 gap-2">
          <Sliders className="w-8 h-8 opacity-40 text-slate-600" />
          <span className="text-xs">Bấm chọn một clip trên dòng thời gian (Timeline) để chỉnh sửa thông số.</span>
        </div>
      )}

      {/* Project Metadata Footer */}
      <div className="mt-auto pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex flex-col gap-1">
        <div className="flex justify-between">
          <span>Khung hình:</span>
          <span className="text-slate-300 font-mono">1080 × 1920 (9:16)</span>
        </div>
        <div className="flex justify-between">
          <span>Tốc độ khung:</span>
          <span className="text-slate-300 font-mono">30 FPS</span>
        </div>
        <div className="flex justify-between">
          <span>Thời lượng:</span>
          <span className="text-slate-300 font-mono">{duration} giây</span>
        </div>
      </div>
    </aside>
  );
};

