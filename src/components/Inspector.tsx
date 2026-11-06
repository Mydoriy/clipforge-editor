import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import {
  Sliders,
  Volume2,
  Gauge,
  SunMedium,
  Type,
  Sparkles,
  RotateCw,
  Move,
  Film,
  Sun,
  Contrast,
  Palette,
  PlaySquare
} from 'lucide-react';

export const Inspector: React.FC = () => {
  const {
    language,
    clips,
    selectedClipId,
    updateClip,
    duration
  } = useEditorStore();

  const t = translations[language];
  const clip = clips.find((c) => c.id === selectedClipId);

  return (
    <aside className="w-80 bg-[#0E1320] border-l border-[#1F2937] flex flex-col p-4 select-none shrink-0 overflow-y-auto scrollbar-none">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1F2937] text-white">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#22D3EE]" />
          <span className="text-xs font-bold uppercase tracking-wider">{t.inspectorTitle}</span>
        </div>
        {clip && (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-[#111827] text-[#22D3EE] border border-[#1F2937]">
            {clip.track}
          </span>
        )}
      </div>

      {clip ? (
        <div className="flex flex-col gap-5 pt-4 text-xs text-[#E5E7EB]">
          {/* Clip Name */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[#9CA3AF] font-medium">Tên phân đoạn:</span>
            <input
              type="text"
              value={clip.name}
              onChange={(e) => updateClip(clip.id, { name: e.target.value })}
              className="bg-[#111827] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-2.5 py-1.5 text-white outline-none"
            />
          </div>

          {/* Text Content & Animation In/Out (For Text Track) */}
          {clip.track === 'text' && (
            <div className="flex flex-col gap-3 p-3 rounded-2xl bg-[#111827] border border-amber-500/30">
              <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                Nội dung chữ & Animation
              </span>
              <textarea
                rows={2}
                value={clip.text || ''}
                onChange={(e) => updateClip(clip.id, { text: e.target.value })}
                className="bg-[#0B0F19] border border-amber-500/40 focus:border-amber-400 rounded-xl px-2.5 py-1.5 text-white outline-none text-xs resize-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#9CA3AF] font-medium">Hiệu ứng vào (In):</span>
                  <select
                    value={clip.textAnimIn || 'pop'}
                    onChange={(e) => updateClip(clip.id, { textAnimIn: e.target.value })}
                    className="bg-[#0B0F19] border border-[#1F2937] rounded-lg p-1.5 text-[11px] text-white outline-none"
                  >
                    <option value="none">Không (None)</option>
                    <option value="pop">Pop In (Nảy chữ)</option>
                    <option value="fadeIn">Fade In (Mờ dần)</option>
                    <option value="slideUp">Slide Up (Trượt lên)</option>
                    <option value="typewriter">Typewriter (Đánh máy)</option>
                    <option value="zoomIn">Zoom In (Phóng to)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#9CA3AF] font-medium">Hiệu ứng ra (Out):</span>
                  <select
                    value={clip.textAnimOut || 'fade'}
                    onChange={(e) => updateClip(clip.id, { textAnimOut: e.target.value })}
                    className="bg-[#0B0F19] border border-[#1F2937] rounded-lg p-1.5 text-[11px] text-white outline-none"
                  >
                    <option value="none">Không (None)</option>
                    <option value="fade">Fade Out (Mờ dần)</option>
                    <option value="slideDown">Slide Down (Trượt xuống)</option>
                    <option value="zoomOut">Zoom Out (Thu nhỏ)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: VỊ TRÍ / SCALE / XOAY (Transform) */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-[#22D3EE]" />
              Vị trí, Thu phóng & Góc xoay
            </span>

            {/* Scale */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <span>{t.scale}</span>
                <span className="font-mono text-[#22D3EE] font-bold">
                  {((clip.scale || 1) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={clip.scale || 1}
                onChange={(e) => updateClip(clip.id, { scale: parseFloat(e.target.value) })}
                className="accent-[#22D3EE] cursor-pointer"
              />
            </div>

            {/* Position X */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <span>Vị trí ngang (X-Offset)</span>
                <span className="font-mono text-[#22D3EE]">{clip.x || 0}px</span>
              </div>
              <input
                type="range"
                min="-300"
                max="300"
                step="5"
                value={clip.x || 0}
                onChange={(e) => updateClip(clip.id, { x: parseInt(e.target.value, 10) })}
                className="accent-[#22D3EE] cursor-pointer"
              />
            </div>

            {/* Position Y */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <span>Vị trí dọc (Y-Offset)</span>
                <span className="font-mono text-[#22D3EE]">{clip.y || 0}px</span>
              </div>
              <input
                type="range"
                min="-400"
                max="400"
                step="5"
                value={clip.y || 0}
                onChange={(e) => updateClip(clip.id, { y: parseInt(e.target.value, 10) })}
                className="accent-[#22D3EE] cursor-pointer"
              />
            </div>

            {/* Rotation */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <span className="flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  {t.rotation}
                </span>
                <span className="font-mono text-[#22D3EE]">{clip.rotation || 0}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={clip.rotation || 0}
                onChange={(e) => updateClip(clip.id, { rotation: parseInt(e.target.value, 10) })}
                className="accent-[#22D3EE] cursor-pointer"
              />
            </div>

            {/* Opacity */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <span className="flex items-center gap-1">
                  <SunMedium className="w-3 h-3" />
                  {t.opacity}
                </span>
                <span className="font-mono text-[#22D3EE]">{((clip.opacity ?? 1) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={clip.opacity ?? 1}
                onChange={(e) => updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
                className="accent-[#22D3EE] cursor-pointer"
              />
            </div>
          </div>

          {/* SECTION: TỐC ĐỘ (Speed 0.25x - 4x) */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
            <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
              <span className="font-bold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#22D3EE]" />
                Tốc độ phát (Speed)
              </span>
              <span className="font-mono text-[#22D3EE] font-bold">{(clip.speed || 1).toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="4"
              step="0.05"
              value={clip.speed || 1}
              onChange={(e) => updateClip(clip.id, { speed: parseFloat(e.target.value) })}
              className="accent-[#22D3EE] cursor-pointer"
            />
            <div className="grid grid-cols-6 gap-1">
              {[0.25, 0.5, 1, 1.5, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => updateClip(clip.id, { speed: s })}
                  className={`py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    clip.speed === s
                      ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-[#22D3EE]'
                      : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* SECTION: ÂM LƯỢNG & FADE IN / FADE OUT */}
          {(clip.track === 'audio' || clip.track === 'video') && (
            <div className="flex flex-col gap-2.5 pt-2 border-t border-[#1F2937]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                {t.volume} & Fade
              </span>

              {/* Volume */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                  <span>{t.volume}</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {((clip.volume ?? 1) * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={clip.volume ?? 1}
                  onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })}
                  className="accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Fade in / Fade out */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                    <span>{t.fadeIn}</span>
                    <span className="font-mono text-emerald-400">{clip.fadeIn || 0}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.2"
                    value={clip.fadeIn || 0}
                    onChange={(e) => updateClip(clip.id, { fadeIn: parseFloat(e.target.value) })}
                    className="accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                    <span>{t.fadeOut}</span>
                    <span className="font-mono text-emerald-400">{clip.fadeOut || 0}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.2"
                    value={clip.fadeOut || 0}
                    onChange={(e) => updateClip(clip.id, { fadeOut: parseFloat(e.target.value) })}
                    className="accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION: BRIGHTNESS / CONTRAST / SATURATION & BỘ LỌC */}
          {(clip.track === 'video' || clip.type === 'image') && (
            <div className="flex flex-col gap-2.5 pt-2 border-t border-[#1F2937]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                {t.filterLabel}
              </span>

              {/* Filter Preset Dropdown */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#9CA3AF]">{t.filterLabel}:</span>
                <select
                  value={clip.filter || 'none'}
                  onChange={(e) => updateClip(clip.id, { filter: e.target.value })}
                  className="bg-[#111827] border border-[#1F2937] rounded-xl px-2.5 py-1.5 text-white outline-none text-xs"
                >
                  <option value="none">Gốc (Standard)</option>
                  <option value="cinematic">Cinematic Moody (Teal & Orange)</option>
                  <option value="vhs">Retro VHS 1990</option>
                  <option value="warm">Warm Sunset (Ấm áp)</option>
                  <option value="noir">Noir Black & White (Đen trắng)</option>
                  <option value="cyberpunk">Cyberpunk Neon</option>
                  <option value="vintage">Vintage 70s</option>
                  <option value="vivid">Vivid Pop (Rực rỡ)</option>
                </select>
              </div>

              {/* Brightness */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3" />
                    {t.brightness}
                  </span>
                  <span className="font-mono text-[#22D3EE]">
                    {(clip.brightness || 0) > 0 ? `+${clip.brightness}` : clip.brightness || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={clip.brightness || 0}
                  onChange={(e) => updateClip(clip.id, { brightness: parseInt(e.target.value, 10) })}
                  className="accent-[#22D3EE] cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3 h-3" />
                    {t.contrast}
                  </span>
                  <span className="font-mono text-[#22D3EE]">
                    {(clip.contrast || 0) > 0 ? `+${clip.contrast}` : clip.contrast || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={clip.contrast || 0}
                  onChange={(e) => updateClip(clip.id, { contrast: parseInt(e.target.value, 10) })}
                  className="accent-[#22D3EE] cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                  <span className="flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    {t.saturation}
                  </span>
                  <span className="font-mono text-[#22D3EE]">
                    {(clip.saturation || 0) > 0 ? `+${clip.saturation}` : clip.saturation || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={clip.saturation || 0}
                  onChange={(e) => updateClip(clip.id, { saturation: parseInt(e.target.value, 10) })}
                  className="accent-[#22D3EE] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-[#9CA3AF] gap-2.5">
          <Sliders className="w-8 h-8 opacity-30 text-[#22D3EE]" />
          <span className="text-xs">
            Bấm chọn một clip trên Timeline bên dưới để tinh chỉnh vị trí, scale, xoay, tốc độ, bộ lọc hoặc hiệu ứng.
          </span>
        </div>
      )}

      {/* Project Metadata Footer */}
      <div className="mt-auto pt-4 border-t border-[#1F2937] text-[11px] text-[#9CA3AF] flex flex-col gap-1">
        <div className="flex justify-between">
          <span>Khung hình:</span>
          <span className="text-white font-mono">1080 × 1920 (9:16)</span>
        </div>
        <div className="flex justify-between">
          <span>Tốc độ khung:</span>
          <span className="text-white font-mono">30 FPS</span>
        </div>
        <div className="flex justify-between">
          <span>Thời lượng:</span>
          <span className="text-white font-mono">{duration} giây</span>
        </div>
      </div>
    </aside>
  );
};
