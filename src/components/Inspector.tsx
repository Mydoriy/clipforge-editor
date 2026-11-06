import React, { useState, useEffect } from 'react';
import { useEditorStore, type Clip } from '../store/useEditorStore';
import { translations } from '../i18n';
import {
  Sliders,
  Volume2,
  Type,
  Sparkles,
  RotateCw,
  Move,
  Film,
  Sun,
  Contrast,
  Palette,
  PlaySquare,
  HelpCircle,
  Edit2,
  Check,
  X,
  Shield,
  Activity,
  Layers,
  Settings,
  Zap,
  Copy,
  Crop,
  Maximize2,
  Flame,
  Music,
  Smile,
  Scissors,
  Wand2,
  RefreshCw,
  Droplet,
  Radio,
  SlidersHorizontal,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Lock,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { FILTER_PRESETS } from '../utils/lutParser';

// Tooltip helper component
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-1">
      <HelpCircle
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-3.5 h-3.5 text-[#8A8A8A] hover:text-[#1FC8DB] cursor-help transition-colors"
      />
      {show && (
        <div className="absolute right-0 top-full mt-1 w-56 p-2 rounded-md bg-[#141414] border border-[#333333] shadow-2xl text-[10px] text-[#E6E6E6] z-50 pointer-events-none leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
};

export const Inspector: React.FC = () => {
  const {
    language,
    clips,
    selectedClipId,
    updateClip,
    duration,
    projectTitle,
    setProjectTitle,
    projectSettings,
    updateProjectSettings,
    settings,
    updateSettings,
    timelines,
    activeTimelineId,
    isProxyEnabled,
    toggleProxy,
    showToast,
    relinkClipMedia
  } = useEditorStore();

  const t = translations[language];
  const clip = clips.find((c) => c.id === selectedClipId);

  // Active timeline
  const activeTimeline = timelines.find((tl) => tl.id === activeTimelineId) || timelines[0];
  const timelineName = activeTimeline?.name || 'Timeline 01';

  // State for Project Modify Modal
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(projectTitle);
  const [editAspect, setEditAspect] = useState(projectSettings.aspect || '9:16');
  const [editResolution, setEditResolution] = useState(projectSettings.resolution || '1080p');
  const [editFps, setEditFps] = useState<number>(projectSettings.fps || 30);
  const [editColorSpace, setEditColorSpace] = useState<'sRGB' | 'Display P3' | 'Rec. 2020'>(projectSettings.colorSpace || 'sRGB');
  const [editImportMode, setEditImportMode] = useState<'original' | 'copy'>(projectSettings.importMode || 'original');
  const [editFloatingPoint, setEditFloatingPoint] = useState(projectSettings.floatingPoint || false);
  const [editArrangeLayers, setEditArrangeLayers] = useState(projectSettings.arrangeLayers ?? true);
  const [editProxy, setEditProxy] = useState(isProxyEnabled);

  // Inline project name edit state
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(projectTitle);

  // Check WebGL 16-bit Float support
  const [isFloatSupported, setIsFloatSupported] = useState(true);
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('OES_texture_half_float');
        setIsFloatSupported(!!ext);
      }
    } catch {
      setIsFloatSupported(false);
    }
  }, []);

  // Sync modal state when opening
  useEffect(() => {
    if (isModifyModalOpen) {
      setEditTitle(projectTitle);
      setEditAspect(projectSettings.aspect || '9:16');
      setEditResolution(projectSettings.resolution || '1080p');
      setEditFps(projectSettings.fps || 30);
      setEditColorSpace(projectSettings.colorSpace || 'sRGB');
      setEditImportMode(projectSettings.importMode || 'original');
      setEditFloatingPoint(projectSettings.floatingPoint || false);
      setEditArrangeLayers(projectSettings.arrangeLayers ?? true);
      setEditProxy(isProxyEnabled);
    }
  }, [isModifyModalOpen, projectTitle, projectSettings, isProxyEnabled]);

  // Handle Apply Project Settings
  const handleApplyProjectSettings = () => {
    if (editTitle.trim()) {
      setProjectTitle(editTitle.trim());
    }
    updateProjectSettings({
      aspect: editAspect as any,
      resolution: editResolution as any,
      fps: editFps as any,
      colorSpace: editColorSpace,
      importMode: editImportMode,
      floatingPoint: editFloatingPoint,
      arrangeLayers: editArrangeLayers,
      proxy: editProxy
    });
    updateSettings({
      defaultAspect: editAspect as any,
      defaultFps: editFps as any
    });
    if (editProxy !== isProxyEnabled) {
      toggleProxy();
    }
    setIsModifyModalOpen(false);
    showToast('Đã lưu cấu hình Project thành công!', 'success');
  };

  // Tabs for clip inspector
  const [activeClipTab, setActiveClipTab] = useState<string>('basic');

  // Reset tab to 'basic' when selected clip changes
  useEffect(() => {
    setActiveClipTab('basic');
  }, [selectedClipId]);

  return (
    <aside className="w-full h-full bg-[#1F1F1F] border-l border-[#333333] flex flex-col p-3 select-none overflow-y-auto scrollbar-none text-xs text-[#E6E6E6]">
      {/* Title Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#333333] text-[#E6E6E6]">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-[#1FC8DB]" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {clip ? `${clip.track?.toUpperCase() || 'CLIP'} DETAILS` : 'PROJECT DETAILS'}
          </span>
        </div>
        {clip && (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-[#262626] text-[#1FC8DB] border border-[#333333]">
            {clip.track || clip.type}
          </span>
        )}
      </div>

      {/* ======================================================== */}
      {/* CASE 1: KHI CHỌN CLIP -> HIỂN THỊ TABS THEO LOẠI CLIP     */}
      {/* ======================================================== */}
      {clip ? (
        <div className="flex flex-col gap-3 pt-2 text-xs text-[#E6E6E6]">
          {/* Clip Name */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[#8A8A8A] font-medium">Tên phân đoạn:</span>
            <input
              type="text"
              value={clip.name || ''}
              onChange={(e) => updateClip(clip.id, { name: e.target.value })}
              className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded-md px-2 py-1 text-[#E6E6E6] outline-none text-xs"
            />
          </div>

          {/* ==================================================== */}
          {/* TAB BAR FOR VIDEO / IMAGE / STICKER CLIPS            */}
          {/* ==================================================== */}
          {(clip.track === 'video' || clip.type === 'video' || clip.type === 'image' || clip.track === 'sticker' || clip.type === 'sticker') && (
            <div className="flex flex-col gap-2.5">
              {/* Relink Warning Banner if media is missing/corrupted */}
              {(clip.hasError || clip.missingMedia) && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-300 text-xs">Tệp nguồn bị thiếu hoặc mất kết nối</div>
                      <div className="text-[10px] text-amber-200/80">Không thể giải mã dữ liệu video/audio</div>
                    </div>
                  </div>
                  <label className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow shrink-0">
                    <span>Relink...</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="video/*,audio/*,image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await relinkClipMedia(clip.id, file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Tab Navigation Pills */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 border-b border-[#333333]">
                {[
                  { id: 'basic', label: 'Basic' },
                  { id: 'mask', label: 'Mask' },
                  { id: 'chroma', label: 'Chroma key' },
                  { id: 'background', label: 'Background' },
                  { id: 'animation', label: 'Animation' },
                  { id: 'speed', label: 'Speed' },
                  { id: 'adjustment', label: 'Adjustment' },
                  { id: 'filter', label: 'Filter' },
                  { id: 'effects', label: 'Effects' },
                  { id: 'ai', label: 'AI Tools' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveClipTab(t.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                      activeClipTab === t.id
                        ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] font-bold border-b border-[#1FC8DB]'
                        : 'text-[#8A8A8A] hover:text-white hover:bg-[#262626]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* 1. Tab: Basic (Position, Scale, Rotate, Flip, Opacity, Blend mode) */}
              {activeClipTab === 'basic' && (
                <div className="flex flex-col gap-3">
                  {/* Position X / Y */}
                  <div className="flex flex-col gap-1.5 p-2 rounded bg-[#262626] border border-[#333333]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-white">Vị trí (Position):</span>
                      <button
                        onClick={() => updateClip(clip.id, { x: 0, y: 0 })}
                        className="text-[10px] text-[#8A8A8A] hover:text-[#1FC8DB]"
                      >
                        Đặt lại (0, 0)
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 bg-[#1F1F1F] px-2 py-1 rounded border border-[#333333]">
                        <span className="text-[10px] text-[#8A8A8A] font-bold">X:</span>
                        <input
                          type="number"
                          value={Math.round(clip.x || clip.transform?.x || 0)}
                          onChange={(e) => updateClip(clip.id, { x: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent text-white font-mono text-xs outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#1F1F1F] px-2 py-1 rounded border border-[#333333]">
                        <span className="text-[10px] text-[#8A8A8A] font-bold">Y:</span>
                        <input
                          type="number"
                          value={Math.round(clip.y || clip.transform?.y || 0)}
                          onChange={(e) => updateClip(clip.id, { y: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent text-white font-mono text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Scale */}
                  <div className="flex flex-col gap-1 p-2 rounded bg-[#262626] border border-[#333333]">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#8A8A8A]">Tỉ lệ phóng to (Scale):</span>
                      <span className="font-mono text-[#1FC8DB] font-bold">
                        {(clip.scale || clip.transform?.scale || 1.0).toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="4.0"
                      step="0.05"
                      value={clip.scale || clip.transform?.scale || 1.0}
                      onChange={(e) => updateClip(clip.id, { scale: parseFloat(e.target.value) })}
                      className="accent-[#1FC8DB] cursor-pointer"
                    />
                  </div>

                  {/* Rotate & Flip */}
                  <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#8A8A8A]">Góc xoay (Rotate):</span>
                      <span className="font-mono text-[#1FC8DB] font-bold">
                        {clip.rotation || clip.transform?.rotation || 0}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={clip.rotation || clip.transform?.rotation || 0}
                      onChange={(e) => updateClip(clip.id, { rotation: parseInt(e.target.value) })}
                      className="accent-[#1FC8DB] cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 border-t border-[#333333]/60">
                      <span className="text-[10px] text-[#8A8A8A]">Lật hình (Flip):</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateClip(clip.id, { flipX: !clip.flipX })}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            clip.flipX ? 'bg-[#1FC8DB] text-black border-[#1FC8DB]' : 'bg-[#1F1F1F] text-white border-[#333333]'
                          }`}
                        >
                          Lật ngang (X)
                        </button>
                        <button
                          onClick={() => updateClip(clip.id, { flipY: !clip.flipY })}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            clip.flipY ? 'bg-[#1FC8DB] text-black border-[#1FC8DB]' : 'bg-[#1F1F1F] text-white border-[#333333]'
                          }`}
                        >
                          Lật dọc (Y)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opacity & Blend Mode */}
                  <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#8A8A8A]">Độ mờ đục (Opacity):</span>
                      <span className="font-mono text-[#1FC8DB] font-bold">
                        {Math.round((clip.opacity ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={clip.opacity ?? 1}
                      onChange={(e) => updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
                      className="accent-[#1FC8DB] cursor-pointer"
                    />

                    <div className="flex flex-col gap-1 pt-1 border-t border-[#333333]/60">
                      <span className="text-[10px] text-[#8A8A8A]">Chế độ hòa trộn (Blend Mode):</span>
                      <select
                        value={clip.blendMode || 'normal'}
                        onChange={(e) => updateClip(clip.id, { blendMode: e.target.value })}
                        className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none"
                      >
                        <option value="normal">Normal (Bình thường)</option>
                        <option value="screen">Screen (Làm sáng)</option>
                        <option value="multiply">Multiply (Nhân tối)</option>
                        <option value="overlay">Overlay (Phủ hạt)</option>
                        <option value="darken">Darken (Làm tối)</option>
                        <option value="lighten">Lighten (Làm sáng nét)</option>
                        <option value="color-dodge">Color Dodge</option>
                        <option value="color-burn">Color Burn</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Tab: Mask (Linear, Mirror, Circle, Rectangle, Heart, Star) */}
              {activeClipTab === 'mask' && (
                <div className="flex flex-col gap-2.5 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Mặt nạ cắt (Mask)</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'linear', label: 'Linear' },
                      { id: 'mirror', label: 'Mirror' },
                      { id: 'circle', label: 'Circle' },
                      { id: 'rect', label: 'Rectangle' },
                      { id: 'heart', label: 'Heart' },
                      { id: 'star', label: 'Star' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => updateClip(clip.id, { mask: m.id as any })}
                        className={`py-1 rounded text-[10px] font-semibold border ${
                          (typeof clip.mask === 'string' ? clip.mask : clip.mask?.type) === m.id
                            ? 'bg-[#1FC8DB] text-black border-[#1FC8DB]'
                            : 'bg-[#1F1F1F] text-[#8A8A8A] border-[#333333] hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#333333]/60">
                    <span className="text-[11px] text-[#8A8A8A]">Đảo ngược mặt nạ (Invert):</span>
                    <input
                      type="checkbox"
                      checked={typeof clip.mask === 'object' ? clip.mask?.invert : false}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          mask: {
                            type: typeof clip.mask === 'string' ? clip.mask : clip.mask?.type || 'circle',
                            invert: e.target.checked
                          }
                        })
                      }
                      className="accent-[#1FC8DB]"
                    />
                  </div>
                </div>
              )}

              {/* 3. Tab: Chroma Key */}
              {activeClipTab === 'chroma' && (
                <div className="flex flex-col gap-2.5 p-2 rounded bg-[#262626] border border-[#333333]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white uppercase">Tách phông xanh (Chroma Key)</span>
                    <input
                      type="checkbox"
                      checked={clip.chromaKey?.enabled || false}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          chromaKey: {
                            enabled: e.target.checked,
                            color: clip.chromaKey?.color || '#00FF00',
                            similarity: clip.chromaKey?.similarity || 40,
                            smoothness: clip.chromaKey?.smoothness || 10
                          }
                        })
                      }
                      className="accent-[#1FC8DB]"
                    />
                  </div>

                  {clip.chromaKey?.enabled && (
                    <div className="flex flex-col gap-2 pt-1 border-t border-[#333333]/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#8A8A8A]">Màu cần tách:</span>
                        <input
                          type="color"
                          value={clip.chromaKey?.color || '#00FF00'}
                          onChange={(e) =>
                            updateClip(clip.id, {
                              chromaKey: { ...clip.chromaKey, enabled: true, color: e.target.value }
                            })
                          }
                          className="w-7 h-6 rounded border border-[#333333] bg-transparent cursor-pointer"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[11px] text-[#8A8A8A]">
                          <span>Cường độ (Intensity):</span>
                          <span className="font-mono text-[#1FC8DB]">{clip.chromaKey?.similarity || 40}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={clip.chromaKey?.similarity || 40}
                          onChange={(e) =>
                            updateClip(clip.id, {
                              chromaKey: { ...clip.chromaKey, enabled: true, similarity: parseInt(e.target.value) }
                            })
                          }
                          className="accent-[#1FC8DB] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Tab: Background */}
              {activeClipTab === 'background' && (
                <div className="flex flex-col gap-2.5 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Nền video (Background)</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['none', 'blur', 'color'].map((b) => (
                      <button
                        key={b}
                        onClick={() =>
                          updateClip(clip.id, {
                            backgroundConfig: {
                              type: b as any,
                              color: clip.backgroundConfig?.color || '#1A1A1A',
                              blur: clip.backgroundConfig?.blur || 40
                            }
                          })
                        }
                        className={`py-1 rounded text-[10px] font-semibold uppercase border ${
                          (clip.backgroundConfig?.type || 'none') === b
                            ? 'bg-[#1FC8DB] text-black border-[#1FC8DB]'
                            : 'bg-[#1F1F1F] text-[#8A8A8A] border-[#333333] hover:text-white'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {clip.backgroundConfig?.type === 'color' && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#8A8A8A]">Chọn màu nền:</span>
                      <input
                        type="color"
                        value={clip.backgroundConfig?.color || '#1A1A1A'}
                        onChange={(e) =>
                          updateClip(clip.id, {
                            backgroundConfig: { ...clip.backgroundConfig, type: 'color', color: e.target.value }
                          })
                        }
                        className="w-7 h-6 rounded border border-[#333333] bg-transparent cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 5. Tab: Animation */}
              {activeClipTab === 'animation' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Hiệu ứng chuyển động (Animation)</span>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-[#8A8A8A]">Animation In:</span>
                    <select
                      value={clip.animation?.in || 'none'}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          animation: { ...clip.animation, in: e.target.value }
                        })
                      }
                      className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none"
                    >
                      <option value="none">Không có (None)</option>
                      <option value="fadeIn">Fade In (Mờ dần)</option>
                      <option value="zoomIn">Zoom In (Phóng to)</option>
                      <option value="slideUp">Slide Up (Trượt lên)</option>
                      <option value="pop">Pop In (Nảy)</option>
                    </select>

                    <span className="text-[10px] text-[#8A8A8A] pt-1">Animation Out:</span>
                    <select
                      value={clip.animation?.out || 'none'}
                      onChange={(e) =>
                        updateClip(clip.id, {
                          animation: { ...clip.animation, out: e.target.value }
                        })
                      }
                      className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none"
                    >
                      <option value="none">Không có (None)</option>
                      <option value="fadeOut">Fade Out (Mờ dần)</option>
                      <option value="zoomOut">Zoom Out (Thu nhỏ)</option>
                      <option value="slideDown">Slide Down (Trượt xuống)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 6. Tab: Speed (Normal 0.1x–100x, Curve) */}
              {activeClipTab === 'speed' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#8A8A8A]">Tốc độ phát (Speed):</span>
                    <span className="font-mono text-[#1FC8DB] font-bold">{(clip.speed || 1.0).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={clip.speed || 1.0}
                    onChange={(e) => updateClip(clip.id, { speed: parseFloat(e.target.value) })}
                    className="accent-[#1FC8DB] cursor-pointer"
                  />
                  <div className="flex items-center gap-1 pt-1">
                    {[0.5, 1.0, 1.5, 2.0, 5.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateClip(clip.id, { speed: s })}
                        className={`flex-1 py-1 rounded text-[10px] font-semibold border ${
                          clip.speed === s ? 'bg-[#1FC8DB] text-black border-[#1FC8DB]' : 'bg-[#1F1F1F] text-white border-[#333333]'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#333333]/60">
                    <span className="text-[11px] text-[#8A8A8A]">Phát ngược video (Reverse):</span>
                    <input
                      type="checkbox"
                      checked={clip.reverse || false}
                      onChange={(e) => updateClip(clip.id, { reverse: e.target.checked })}
                      className="accent-[#1FC8DB]"
                    />
                  </div>
                </div>
              )}

              {/* 7. Tab: Adjustment */}
              {activeClipTab === 'adjustment' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Chỉnh màu (Color Tuning)</span>
                  {[
                    { label: 'Độ sáng (Brightness)', key: 'brightness', min: -50, max: 50, def: 0 },
                    { label: 'Độ tương phản (Contrast)', key: 'contrast', min: -50, max: 50, def: 0 },
                    { label: 'Độ bão hòa (Saturation)', key: 'saturation', min: -50, max: 50, def: 0 }
                  ].map((p) => (
                    <div key={p.key} className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[11px] text-[#8A8A8A]">
                        <span>{p.label}:</span>
                        <span className="font-mono text-[#1FC8DB]">{(clip as any)[p.key] ?? p.def}</span>
                      </div>
                      <input
                        type="range"
                        min={p.min}
                        max={p.max}
                        value={(clip as any)[p.key] ?? p.def}
                        onChange={(e) => updateClip(clip.id, { [p.key]: parseInt(e.target.value) })}
                        className="accent-[#1FC8DB] cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 8. Tab: Filter */}
              {activeClipTab === 'filter' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Bộ lọc màu (LUT Filter)</span>
                  <select
                    value={typeof clip.filter === 'object' ? clip.filter?.id : (clip.filter || 'none')}
                    onChange={(e) => updateClip(clip.id, { filter: e.target.value as any })}
                    className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none"
                  >
                    {FILTER_PRESETS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 9. Tab: Effects */}
              {activeClipTab === 'effects' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Video Shader Effect</span>
                  <select
                    value={clip.effectType || 'none'}
                    onChange={(e) => updateClip(clip.id, { effectType: e.target.value })}
                    className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none"
                  >
                    <option value="none">Không có (None)</option>
                    <option value="blur">Mờ ảo (Blur)</option>
                    <option value="glitch">Nhiễu số (Glitch)</option>
                    <option value="vhs">Băng từ VHS</option>
                    <option value="rgb">Tách màu RGB Split</option>
                    <option value="shake">Rung lắc (Shake)</option>
                    <option value="pulse">Zoom Pulse</option>
                    <option value="vignette">Tối góc Vignette</option>
                    <option value="grain">Hạt phim Film Grain</option>
                  </select>
                </div>
              )}

              {/* 10. Tab: AI Tools */}
              {activeClipTab === 'ai' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-[#1FC8DB] uppercase">AI Tools (Công cụ AI)</span>
                  <button
                    onClick={() => showToast('Đang chạy tách nền video cục bộ...', 'info')}
                    className="w-full py-2 rounded bg-[#1FC8DB]/20 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Tách nền tự động (Remove Background)</span>
                  </button>
                  <button
                    onClick={() => showToast('Chống rung video (Stabilize) yêu cầu kết nối AI service.', 'warning')}
                    className="w-full py-2 rounded bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333333] text-[#8A8A8A] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Chống rung (Stabilize - Cloud AI)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB BAR FOR AUDIO CLIPS                              */}
          {/* ==================================================== */}
          {clip.track === 'audio' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 border-b border-[#333333]">
                {['Basic', 'Voice Changer', 'Noise Reduction', 'Equalizer', 'Speed'].map((tb) => (
                  <button
                    key={tb}
                    onClick={() => setActiveClipTab(tb.toLowerCase().replace(/\s+/g, ''))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                      activeClipTab === tb.toLowerCase().replace(/\s+/g, '')
                        ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] font-bold border-b border-[#1FC8DB]'
                        : 'text-[#8A8A8A] hover:text-white hover:bg-[#262626]'
                    }`}
                  >
                    {tb}
                  </button>
                ))}
              </div>

              {/* Audio Basic */}
              {(activeClipTab === 'basic' || activeClipTab === 'audio') && (
                <div className="flex flex-col gap-2.5 p-2 rounded bg-[#262626] border border-[#333333]">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#8A8A8A]">Âm lượng (Volume):</span>
                    <span className="font-mono text-[#1FC8DB] font-bold">
                      {Math.round((clip.volume ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={clip.volume ?? 1}
                    onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })}
                    className="accent-[#1FC8DB] cursor-pointer"
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[#8A8A8A]">Fade In (s):</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={clip.fadeIn || 0}
                        onChange={(e) => updateClip(clip.id, { fadeIn: parseFloat(e.target.value) })}
                        className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[#8A8A8A]">Fade Out (s):</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={clip.fadeOut || 0}
                        onChange={(e) => updateClip(clip.id, { fadeOut: parseFloat(e.target.value) })}
                        className="bg-[#1F1F1F] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Voice Changer */}
              {activeClipTab === 'voicechanger' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Biến đổi giọng nói (Voice Changer)</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Bình thường', 'Giọng trầm', 'Chipmunk', 'Robot', 'Monster', 'Echo'].map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          updateClip(clip.id, { voiceChanger: v });
                          showToast(`Đã chọn hiệu ứng giọng: ${v}`, 'info');
                        }}
                        className={`py-1 rounded text-[10px] font-semibold border ${
                          clip.voiceChanger === v
                            ? 'bg-[#1FC8DB] text-black border-[#1FC8DB]'
                            : 'bg-[#1F1F1F] text-[#8A8A8A] border-[#333333] hover:text-white'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio Noise Reduction */}
              {activeClipTab === 'noisereduction' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white uppercase">Giảm nhiễu (RNNoise WASM)</span>
                    <input
                      type="checkbox"
                      checked={clip.noiseReduction || false}
                      onChange={(e) => updateClip(clip.id, { noiseReduction: e.target.checked })}
                      className="accent-[#1FC8DB]"
                    />
                  </div>
                  <p className="text-[10px] text-[#8A8A8A]">
                    Lọc tạp âm môi trường và tiếng gió bằng thuật toán khử nhiễu RNNoise WASM trực tiếp trong trình duyệt.
                  </p>
                </div>
              )}

              {/* Audio Equalizer */}
              {activeClipTab === 'equalizer' && (
                <div className="flex flex-col gap-2 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Equalizer 10-Band</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['Bass Boost', 'Vocal', 'Acoustic', 'Pop', 'Rock'].map((eq) => (
                      <button
                        key={eq}
                        onClick={() => showToast(`Đã áp dụng EQ: ${eq}`, 'info')}
                        className="py-1 rounded text-[9px] font-semibold bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333333] text-white"
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB BAR FOR TEXT CLIPS                               */}
          {/* ==================================================== */}
          {clip.track === 'text' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 border-b border-[#333333]">
                {['Text', 'Stroke & Shadow', 'Background & Glow', 'Animation', 'Basic'].map((tb) => (
                  <button
                    key={tb}
                    onClick={() => setActiveClipTab(tb.toLowerCase().replace(/[^a-z]/g, ''))}
                    className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                      activeClipTab === tb.toLowerCase().replace(/[^a-z]/g, '')
                        ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] font-bold border-b border-[#1FC8DB]'
                        : 'text-[#8A8A8A] hover:text-white hover:bg-[#262626]'
                    }`}
                  >
                    {tb}
                  </button>
                ))}
              </div>

              {/* Text Content */}
              {(activeClipTab === 'text' || activeClipTab === 'basic') && (
                <div className="flex flex-col gap-2.5 p-2 rounded bg-[#262626] border border-[#333333]">
                  <span className="text-[10px] font-bold text-white uppercase">Nội dung chữ</span>
                  <textarea
                    rows={2}
                    value={clip.text || ''}
                    onChange={(e) => updateClip(clip.id, { text: e.target.value })}
                    className="bg-[#1F1F1F] border border-[#333333] focus:border-[#1FC8DB] rounded p-2 text-white outline-none resize-none text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[#8A8A8A]">Phông chữ:</span>
                      <select
                        value={clip.fontFamily || 'Inter'}
                        onChange={(e) => updateClip(clip.id, { fontFamily: e.target.value })}
                        className="bg-[#1F1F1F] border border-[#333333] rounded p-1 text-white text-xs outline-none"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Bebas Neue">Bebas Neue</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Oswald">Oswald</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[#8A8A8A]">Màu chữ:</span>
                      <input
                        type="color"
                        value={clip.textColor || '#FFFFFF'}
                        onChange={(e) => updateClip(clip.id, { textColor: e.target.value })}
                        className="w-full h-7 rounded border border-[#333333] bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* ADJUSTMENT & FILTER CLIPS INSPECTOR                 */}
          {/* ==================================================== */}
          {(clip.track === 'adjustment' || clip.track === 'filter' || clip.type === 'adjustment' || clip.type === 'filter') && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-2 rounded bg-[#262626] border border-[#333333]">
                <span className="text-[11px] font-bold text-[#1FC8DB] uppercase">
                  {clip.track === 'filter' || clip.type === 'filter' ? 'Bộ lọc màu (Filter Layer)' : 'Lớp chỉnh màu (Adjustment Layer)'}
                </span>
                <button
                  onClick={() => {
                    updateClip(clip.id, {
                      adjustments: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, sharpness: 0 },
                      filter: { id: 'none', intensity: 100 }
                    });
                    showToast('Đã đặt lại thông số chỉnh màu!', 'info');
                  }}
                  className="px-2 py-0.5 rounded bg-[#1F1F1F] hover:bg-[#333] text-[10px] text-[#8A8A8A] hover:text-white"
                >
                  Reset
                </button>
              </div>

              {/* Sliders */}
              <div className="flex flex-col gap-2.5 p-2.5 rounded bg-[#262626] border border-[#333333]">
                <span className="text-[10px] font-bold text-white uppercase">Thông số chỉnh màu</span>
                
                {/* Temperature */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#8A8A8A]">Temperature (Nhiệt độ):</span>
                    <span className="font-mono text-[#1FC8DB]">{clip.adjustments?.temperature || 0}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={clip.adjustments?.temperature || 0}
                    onChange={(e) => updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, temperature: parseInt(e.target.value) }
                    })}
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer"
                  />
                </div>

                {/* Tint */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#8A8A8A]">Tint (Sắc thái):</span>
                    <span className="font-mono text-[#1FC8DB]">{clip.adjustments?.tint || 0}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={clip.adjustments?.tint || 0}
                    onChange={(e) => updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, tint: parseInt(e.target.value) }
                    })}
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#8A8A8A]">Saturation (Bão hòa):</span>
                    <span className="font-mono text-[#1FC8DB]">{clip.adjustments?.saturation || 0}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={clip.adjustments?.saturation || 0}
                    onChange={(e) => updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, saturation: parseInt(e.target.value) }
                    })}
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer"
                  />
                </div>

                {/* Brightness */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#8A8A8A]">Brightness (Độ sáng):</span>
                    <span className="font-mono text-[#1FC8DB]">{clip.adjustments?.brightness || 0}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={clip.adjustments?.brightness || 0}
                    onChange={(e) => updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, brightness: parseInt(e.target.value) }
                    })}
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#8A8A8A]">Contrast (Tương phản):</span>
                    <span className="font-mono text-[#1FC8DB]">{clip.adjustments?.contrast || 0}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={clip.adjustments?.contrast || 0}
                    onChange={(e) => updateClip(clip.id, {
                      adjustments: { ...clip.adjustments, contrast: parseInt(e.target.value) }
                    })}
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* CASE 2: KHI KHÔNG CHỌN CLIP -> THÔNG TIN PROJECT          */
        /* ======================================================== */
        <div className="flex-1 flex flex-col justify-between pt-3 text-xs text-[#E6E6E6]">
          <div className="flex flex-col gap-2.5 divide-y divide-[#2A2A2A]">
            {/* 1. Name */}
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Name:</span>
                <InfoTooltip text="Tên của dự án hiện tại, được lưu vào IndexedDB của trình duyệt." />
              </div>
              {isRenamingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setProjectTitle(tempTitle);
                        setIsRenamingTitle(false);
                      }
                      if (e.key === 'Escape') setIsRenamingTitle(false);
                    }}
                    className="bg-[#2E2E2E] border border-[#1FC8DB] rounded px-1.5 py-0.5 text-white text-xs outline-none w-28"
                  />
                  <button
                    onClick={() => {
                      setProjectTitle(tempTitle);
                      setIsRenamingTitle(false);
                    }}
                    className="p-1 text-[#1FC8DB]"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{projectTitle}</span>
                  <button
                    onClick={() => {
                      setTempTitle(projectTitle);
                      setIsRenamingTitle(true);
                    }}
                    className="p-1 hover:text-[#1FC8DB] text-[#8A8A8A]"
                    title="Đổi tên dự án"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* 2. Path */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Path:</span>
                <InfoTooltip text="Vị trí lưu trữ dữ liệu project và cache video/audio." />
              </div>
              <span className="font-mono text-[#1FC8DB] text-[11px]">Browser storage (IndexedDB)</span>
            </div>

            {/* 3. Floating-point */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Floating-point:</span>
                <InfoTooltip text="Bật xử lý dấu phẩy động 16-bit (RGBA16F) giúp màu sắc và độ sáng mịn màng hơn." />
              </div>
              <button
                disabled={!isFloatSupported}
                onClick={() =>
                  updateProjectSettings({ floatingPoint: !projectSettings.floatingPoint })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  projectSettings.floatingPoint
                    ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border border-[#1FC8DB]/40'
                    : 'bg-[#262626] text-[#8A8A8A] border border-[#333333]'
                }`}
              >
                {projectSettings.floatingPoint ? 'Turned on' : 'Turned off'}
              </button>
            </div>

            {/* 4. Imported media */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Imported media:</span>
                <InfoTooltip text="Stay in original location: giữ file tại chỗ; Copy into project: chép vào IndexedDB." />
              </div>
              <span className="font-medium text-white text-[11px]">
                {projectSettings.importMode === 'copy' ? 'Copy into project' : 'Stay in original location'}
              </span>
            </div>

            {/* 5. Arrange layers */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Arrange layers:</span>
                <InfoTooltip text="Tự động sắp xếp các lớp hình ảnh theo thứ tự track trên timeline." />
              </div>
              <span className="font-medium text-white text-[11px]">
                {projectSettings.arrangeLayers ? 'Turned on' : 'Turned off'}
              </span>
            </div>

            {/* 6. Proxy */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Proxy:</span>
                <InfoTooltip text="Tạo bản sao 480p chạy nền để preview mượt mà cho video độ phân giải cao." />
              </div>
              <button
                onClick={toggleProxy}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  isProxyEnabled
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#262626] text-[#8A8A8A] border border-[#333333]'
                }`}
              >
                {isProxyEnabled ? 'Turned on (480p)' : 'Turned off'}
              </button>
            </div>

            {/* 7. Timeline name */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Timeline name:</span>
                <InfoTooltip text="Tên phân nhánh timeline (subproject) hiện tại." />
              </div>
              <span className="font-bold text-white text-[11px]">{timelineName}</span>
            </div>

            {/* 8. Aspect ratio */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Aspect ratio:</span>
                <InfoTooltip text="Tỉ lệ khung hình của video đầu ra." />
              </div>
              <span className="font-bold text-[#1FC8DB] text-[11px] uppercase">
                {projectSettings.aspect || '9:16'}
              </span>
            </div>

            {/* 9. Resolution */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Resolution:</span>
                <InfoTooltip text="Độ phân giải hiển thị và kết xuất của project." />
              </div>
              <span className="font-medium text-white text-[11px]">
                {typeof projectSettings.resolution === 'string'
                  ? projectSettings.resolution.toUpperCase()
                  : 'Adapted'}
              </span>
            </div>

            {/* 10. Frame rate */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Frame rate:</span>
                <InfoTooltip text="Tốc độ khung hình trên giây (FPS)." />
              </div>
              <span className="font-mono text-white text-[11px]">{(projectSettings.fps || 30).toFixed(2)}fps</span>
            </div>

            {/* 11. Color space */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <span className="text-[#8A8A8A]">Color space:</span>
                <InfoTooltip text="Không gian màu chuẩn hóa cho xuất bản video." />
              </div>
              <span className="font-medium text-white text-[11px]">
                {projectSettings.colorSpace || 'sRGB (Rec. 709)'}
              </span>
            </div>
          </div>

          {/* Bottom Modify Button */}
          <div className="pt-4 mt-auto flex justify-end">
            <button
              onClick={() => setIsModifyModalOpen(true)}
              className="px-4 py-2 rounded-md bg-[#262626] hover:bg-[#2E2E2E] border border-[#1FC8DB]/50 text-[#1FC8DB] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/10"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Modify (Sửa thông số)</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PROJECT MODIFY MODAL (SỬA TOÀN BỘ CẤU HÌNH DỰ ÁN)         */}
      {/* ======================================================== */}
      {isModifyModalOpen && (
        <div
          onClick={() => setIsModifyModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#1F1F1F] border border-[#333333] rounded-lg shadow-2xl p-5 flex flex-col gap-4 text-xs text-[#E6E6E6]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#1FC8DB]" />
                <span className="font-bold text-white text-sm">Chỉnh sửa thông số dự án (Project Settings)</span>
              </div>
              <button
                onClick={() => setIsModifyModalOpen(false)}
                className="p-1 hover:text-white text-[#8A8A8A] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Project Title */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-[#8A8A8A]">Tên dự án:</span>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-2 text-white outline-none text-xs"
                />
              </div>

              {/* Aspect Ratio */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-[#8A8A8A]">Tỉ lệ khung hình (Aspect ratio):</span>
                <select
                  value={editAspect}
                  onChange={(e) => setEditAspect(e.target.value as any)}
                  className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-2 text-white outline-none text-xs"
                >
                  <option value="9:16">9:16 (Dọc TikTok, Reels, Shorts)</option>
                  <option value="16:9">16:9 (Ngang YouTube, Desktop)</option>
                  <option value="1:1">1:1 (Vuông Instagram)</option>
                  <option value="4:3">4:3 (Chuẩn TV cũ)</option>
                  <option value="3:4">3:4 (Chân dung)</option>
                  <option value="21:9">21:9 (Điện ảnh Ultrawide)</option>
                  <option value="original">Original (Theo video đầu vào)</option>
                </select>
              </div>

              {/* Resolution & FPS */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#8A8A8A]">Độ phân giải:</span>
                  <select
                    value={typeof editResolution === 'string' ? editResolution : 'adapted'}
                    onChange={(e) => setEditResolution(e.target.value as any)}
                    className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-2 text-white outline-none text-xs"
                  >
                    <option value="adapted">Adapted (Tự thích ứng)</option>
                    <option value="720p">720p (HD)</option>
                    <option value="1080p">1080p (Full HD)</option>
                    <option value="2k">2K (QHD)</option>
                    <option value="4k">4K (Ultra HD)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#8A8A8A]">Tốc độ khung hình (FPS):</span>
                  <select
                    value={editFps}
                    onChange={(e) => setEditFps(parseInt(e.target.value))}
                    className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-2 text-white outline-none text-xs"
                  >
                    <option value={24}>24.00 fps</option>
                    <option value={25}>25.00 fps</option>
                    <option value={30}>30.00 fps</option>
                    <option value={50}>50.00 fps</option>
                    <option value={60}>60.00 fps</option>
                  </select>
                </div>
              </div>

              {/* Color Space */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-[#8A8A8A]">Không gian màu (Color space):</span>
                <select
                  value={editColorSpace}
                  onChange={(e) => setEditColorSpace(e.target.value as any)}
                  className="bg-[#2E2E2E] border border-[#333333] focus:border-[#1FC8DB] rounded p-2 text-white outline-none text-xs"
                >
                  <option value="sRGB">sRGB (Rec. 709)</option>
                  <option value="Display P3">Display P3</option>
                  <option value="Rec. 2020">Rec. 2020 (HDR Wide Gamut)</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2 pt-1 border-t border-[#333333]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px]">Floating-point (Dấu phẩy động 16-bit)</span>
                  <input
                    type="checkbox"
                    checked={editFloatingPoint}
                    onChange={(e) => setEditFloatingPoint(e.target.checked)}
                    className="accent-[#1FC8DB]"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px]">Arrange layers (Xếp lớp theo thứ tự track)</span>
                  <input
                    type="checkbox"
                    checked={editArrangeLayers}
                    onChange={(e) => setEditArrangeLayers(e.target.checked)}
                    className="accent-[#1FC8DB]"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px]">Proxy mode (Tạo proxy 480p xem trước)</span>
                  <input
                    type="checkbox"
                    checked={editProxy}
                    onChange={(e) => setEditProxy(e.target.checked)}
                    className="accent-[#1FC8DB]"
                  />
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#333333]">
              <button
                onClick={() => setIsModifyModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#2E2E2E] hover:bg-[#333333] text-[#8A8A8A] hover:text-white font-medium text-xs transition-colors"
              >
                Hủy (Cancel)
              </button>
              <button
                onClick={handleApplyProjectSettings}
                className="px-4 py-1.5 rounded bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs transition-colors shadow-md"
              >
                Áp dụng (Apply)
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
