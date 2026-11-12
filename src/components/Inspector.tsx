import React, { useState, useEffect } from 'react';
import { useEditorStore, type Clip } from '../store/useEditorStore';
import { translations } from '../i18n';
import {
  Sliders,
  Volume2,
  Type,
  Sparkles,
  RotateCw,
  RotateCcw,
  ChevronDown,
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
    currentTime,
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

  // Tabs for clip inspector (CapCut Desktop Hierarchy)
  const [activeMainTab, setActiveMainTab] = useState<'video' | 'animation' | 'adjust' | 'ai'>('video');
  const [activeVideoSubTab, setActiveVideoSubTab] = useState<'basic' | 'removeBg' | 'mask' | 'retouch'>('basic');
  const [isTransformOpen, setIsTransformOpen] = useState(true);
  const [isBlendOpen, setIsBlendOpen] = useState(true);
  const [isSpeedOpen, setIsSpeedOpen] = useState(true);
  const [isBlendEnabled, setIsBlendEnabled] = useState(true);
  const [uniformScale, setUniformScale] = useState(true);
  const [activeClipTab, setActiveClipTab] = useState<string>('basic');

  // Keyframe calculations at current playhead (CapCut Keyframe Diamond)
  const timeInClip = clip ? Math.max(0, currentTime - clip.start) : 0;
  const hasKeyframeAtPlayhead = Boolean(
    clip?.keyframes?.some((k) => Math.abs(k.time - timeInClip) < 0.15)
  );

  const toggleKeyframeAtPlayhead = () => {
    if (!clip) return;
    const currentKeyframes = clip.keyframes ? [...clip.keyframes] : [];
    const existingIdx = currentKeyframes.findIndex((k) => Math.abs(k.time - timeInClip) < 0.15);
    if (existingIdx >= 0) {
      currentKeyframes.splice(existingIdx, 1);
      showToast('Đã xóa keyframe tại vị trí con trỏ', 'info');
    } else {
      currentKeyframes.push({
        time: parseFloat(timeInClip.toFixed(2)),
        x: clip.x || clip.transform?.x || 0,
        y: clip.y || clip.transform?.y || 0,
        scale: clip.scale || clip.transform?.scale || 1.0,
        scaleX: clip.scaleX || clip.transform?.scaleX || 1.0,
        scaleY: clip.scaleY || clip.transform?.scaleY || 1.0,
        rotation: clip.rotation || clip.transform?.rotation || 0,
        opacity: clip.opacity ?? 1.0
      });
      currentKeyframes.sort((a, b) => a.time - b.time);
      showToast(`Đã thêm keyframe tại ${(timeInClip).toFixed(2)}s`, 'success');
    }
    updateClip(clip.id, { keyframes: currentKeyframes });
  };

  const renderKeyframeDiamond = (title = 'Keyframe') => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleKeyframeAtPlayhead();
      }}
      title={`${title} ${hasKeyframeAtPlayhead ? '(Đang ở keyframe - Bấm để xóa)' : '(Bấm để thêm keyframe)'}`}
      className={`p-0.5 leading-none transition-all touch-target-40 inline-flex items-center justify-center ${
        hasKeyframeAtPlayhead
          ? 'text-[#1FC8DB] font-bold drop-shadow-[0_0_6px_rgba(31,200,219,0.5)] scale-110'
          : 'text-[#666] hover:text-[#1FC8DB]'
      }`}
    >
      {hasKeyframeAtPlayhead ? '◆' : '◇'}
    </button>
  );

  // Reset tabs when selected clip changes
  useEffect(() => {
    setActiveMainTab('video');
    setActiveVideoSubTab('basic');
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

              {/* CapCut Primary Top Tabs: Video | Animation | Adjust | AI stylize */}
              <div className="flex items-center border-b border-[#262626] px-1 gap-5 text-xs font-semibold">
                {[
                  { id: 'video', label: 'Video' },
                  { id: 'animation', label: 'Animation' },
                  { id: 'adjust', label: 'Adjust' },
                  { id: 'ai', label: 'AI stylize' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveMainTab(t.id as any)}
                    className={`py-2 relative transition-colors touch-target-40 ${
                      activeMainTab === t.id ? 'text-[#1FC8DB] font-bold' : 'text-[#8A8A8A] hover:text-white'
                    }`}
                  >
                    {t.label}
                    {activeMainTab === t.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1FC8DB] rounded-full shadow-[0_0_6px_rgba(31,200,219,0.6)]" />
                    )}
                  </button>
                ))}
              </div>

              {/* TAB 1: VIDEO (Basic, Remove BG, Mask, Retouch) */}
              {activeMainTab === 'video' && (
                <div className="flex flex-col gap-2.5">
                  {/* CapCut Sub-tabs Pill Bar */}
                  <div className="flex items-center gap-1 p-1 bg-[#161616] rounded-md border border-[#262626] mt-1 mb-1">
                    {[
                      { id: 'basic', label: 'Basic' },
                      { id: 'removeBg', label: 'Remove BG' },
                      { id: 'mask', label: 'Mask' },
                      { id: 'retouch', label: 'Retouch' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setActiveVideoSubTab(st.id as any)}
                        className={`flex-1 py-1 text-center rounded text-[11px] font-medium transition-all touch-target-40 ${
                          activeVideoSubTab === st.id
                            ? 'bg-[#2A2A2A] text-white shadow-sm font-semibold'
                            : 'text-[#8A8A8A] hover:text-[#CCC]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* 1.1 SUB-TAB: BASIC */}
                  {activeVideoSubTab === 'basic' && (
                    <div className="flex flex-col gap-3">
                      {/* TRANSFORM ACCORDION (CapCut Layout) */}
                      <div className="flex flex-col gap-2 pb-3 border-b border-[#262626]">
                        <div className="flex items-center justify-between text-xs font-bold text-white cursor-pointer py-1">
                          <div
                            className="flex items-center gap-1.5 select-none"
                            onClick={() => setIsTransformOpen(!isTransformOpen)}
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-[#888] transition-transform ${
                                isTransformOpen ? '' : '-rotate-90'
                              }`}
                            />
                            <span>Transform</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateClip(clip.id, {
                                  x: 0,
                                  y: 0,
                                  scale: 1.0,
                                  scaleX: 1.0,
                                  scaleY: 1.0,
                                  rotation: 0,
                                  flipX: false,
                                  flipY: false,
                                  transform: { x: 0, y: 0, scale: 1.0, scaleX: 1.0, scaleY: 1.0, rotation: 0, flipX: false, flipY: false }
                                })
                              }
                              title="Reset transform (0, 0, 100%, 0°)"
                              className="p-1 rounded touch-target-40 text-[#888] hover:text-[#1FC8DB] transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            {renderKeyframeDiamond('Transform keyframe')}
                          </div>
                        </div>

                        {isTransformOpen && (
                          <div className="flex flex-col gap-2.5 pt-1">
                            {/* Scale (Uniform vs Separate X/Y) */}
                            {uniformScale ? (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-[#8A8A8A]">Scale</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center bg-[#141414] border border-[#333333] rounded px-1.5 py-0.5 text-xs font-mono">
                                      <input
                                        type="number"
                                        step="1"
                                        min="10"
                                        max="400"
                                        value={Math.round((clip.scale || clip.transform?.scale || 1.0) * 100)}
                                        onChange={(e) => {
                                          const val = Math.max(0.1, Math.min(4.0, (parseFloat(e.target.value) || 100) / 100));
                                          updateClip(clip.id, {
                                            scale: val,
                                            transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), scale: val }
                                          });
                                        }}
                                        className="w-10 bg-transparent text-right outline-none text-white text-[11px]"
                                      />
                                      <span className="text-[#888] ml-0.5">%</span>
                                    </div>
                                    {renderKeyframeDiamond('Scale keyframe')}
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="4.0"
                                  step="0.01"
                                  value={clip.scale || clip.transform?.scale || 1.0}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateClip(clip.id, {
                                      scale: val,
                                      transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), scale: val }
                                    });
                                  }}
                                  className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                  style={{ touchAction: 'none' }}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {/* Scale X */}
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[#8A8A8A]">Scale X</span>
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex items-center bg-[#141414] border border-[#333333] rounded px-1.5 py-0.5 text-xs font-mono">
                                        <input
                                          type="number"
                                          step="1"
                                          min="10"
                                          max="400"
                                          value={Math.round((clip.scaleX ?? clip.transform?.scaleX ?? 1.0) * 100)}
                                          onChange={(e) => {
                                            const val = Math.max(0.1, Math.min(4.0, (parseFloat(e.target.value) || 100) / 100));
                                            updateClip(clip.id, {
                                              scaleX: val,
                                              transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), scaleX: val }
                                            });
                                          }}
                                          className="w-10 bg-transparent text-right outline-none text-white text-[11px]"
                                        />
                                        <span className="text-[#888] ml-0.5">%</span>
                                      </div>
                                      {renderKeyframeDiamond('Scale X keyframe')}
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.1"
                                    max="4.0"
                                    step="0.01"
                                    value={clip.scaleX ?? clip.transform?.scaleX ?? 1.0}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      updateClip(clip.id, {
                                        scaleX: val,
                                        transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), scaleX: val }
                                      });
                                    }}
                                    className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                    style={{ touchAction: 'none' }}
                                  />
                                </div>

                                {/* Scale Y */}
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[#8A8A8A]">Scale Y</span>
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex items-center bg-[#141414] border border-[#333333] rounded px-1.5 py-0.5 text-xs font-mono">
                                        <input
                                          type="number"
                                          step="1"
                                          min="10"
                                          max="400"
                                          value={Math.round((clip.scaleY ?? clip.transform?.scaleY ?? 1.0) * 100)}
                                          onChange={(e) => {
                                            const val = Math.max(0.1, Math.min(4.0, (parseFloat(e.target.value) || 100) / 100));
                                            updateClip(clip.id, {
                                              scaleY: val,
                                              transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), scaleY: val }
                                            });
                                          }}
                                          className="w-10 bg-transparent text-right outline-none text-white text-[11px]"
                                        />
                                        <span className="text-[#888] ml-0.5">%</span>
                                      </div>
                                      {renderKeyframeDiamond('Scale Y keyframe')}
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.1"
                                    max="4.0"
                                    step="0.01"
                                    value={clip.scaleY ?? clip.transform?.scaleY ?? 1.0}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      updateClip(clip.id, {
                                        scaleY: val,
                                        transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), scaleY: val }
                                      });
                                    }}
                                    className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                    style={{ touchAction: 'none' }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Uniform scale toggle */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8A8A8A]">Uniform scale</span>
                              <button
                                onClick={() => setUniformScale(!uniformScale)}
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                                  uniformScale ? 'bg-[#1FC8DB]' : 'bg-[#333333]'
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                                    uniformScale ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Position X / Y */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8A8A8A]">Position</span>
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1 bg-[#141414] border border-[#333333] rounded px-1.5 py-0.5 text-[11px] font-mono">
                                  <span className="text-[#777]">X</span>
                                  <input
                                    type="number"
                                    value={Math.round(clip.x || clip.transform?.x || 0)}
                                    onChange={(e) => {
                                      const x = parseInt(e.target.value) || 0;
                                      updateClip(clip.id, {
                                        x,
                                        transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), x }
                                      });
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-white text-[11px]"
                                  />
                                </div>
                                <div className="flex items-center gap-1 bg-[#141414] border border-[#333333] rounded px-1.5 py-0.5 text-[11px] font-mono">
                                  <span className="text-[#777]">Y</span>
                                  <input
                                    type="number"
                                    value={Math.round(clip.y || clip.transform?.y || 0)}
                                    onChange={(e) => {
                                      const y = parseInt(e.target.value) || 0;
                                      updateClip(clip.id, {
                                        y,
                                        transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), y }
                                      });
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-white text-[11px]"
                                  />
                                </div>
                                {renderKeyframeDiamond('Position keyframe')}
                              </div>
                            </div>

                            {/* Rotate & Flip */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8A8A8A]">Rotate</span>
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1 bg-[#141414] border border-[#333333] rounded px-1.5 py-0.5 text-[11px] font-mono">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={parseFloat((clip.rotation || clip.transform?.rotation || 0).toFixed(2))}
                                    onChange={(e) => {
                                      const rot = parseFloat(e.target.value) || 0;
                                      updateClip(clip.id, {
                                        rotation: rot,
                                        transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), rotation: rot }
                                      });
                                    }}
                                    className="w-12 bg-transparent text-right outline-none text-white text-[11px]"
                                  />
                                  <span className="text-[#777]">°</span>
                                </div>
                                <div
                                  onClick={() => {
                                    const next = ((clip.rotation || clip.transform?.rotation || 0) + 90) % 360;
                                    updateClip(clip.id, {
                                      rotation: next,
                                      transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), rotation: next }
                                    });
                                  }}
                                  className="w-5 h-5 rounded-full border border-[#444] flex items-center justify-center cursor-pointer hover:border-[#1FC8DB] transition-colors"
                                  title="Rotate 90°"
                                >
                                  <div
                                    className="w-1 h-2 bg-[#1FC8DB] rounded-full"
                                    style={{ transform: `rotate(${clip.rotation || clip.transform?.rotation || 0}deg)` }}
                                  />
                                </div>
                                {renderKeyframeDiamond('Rotate keyframe')}
                              </div>
                            </div>

                            {/* Flip Controls (CapCut Mirror/Flip) */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8A8A8A]">Flip / Mirror</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => updateClip(clip.id, { flipX: !clip.flipX })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                    clip.flipX
                                      ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border-[#1FC8DB]'
                                      : 'bg-[#1F1F1F] text-[#888] border-[#333333] hover:text-white'
                                  }`}
                                  title="Lật ngang (Horizontal Flip)"
                                >
                                  ↔ Flip X
                                </button>
                                <button
                                  onClick={() => updateClip(clip.id, { flipY: !clip.flipY })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                    clip.flipY
                                      ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border-[#1FC8DB]'
                                      : 'bg-[#1F1F1F] text-[#888] border-[#333333] hover:text-white'
                                  }`}
                                  title="Lật dọc (Vertical Flip)"
                                >
                                  ↕ Flip Y
                                </button>
                              </div>
                            </div>

                            {/* 6 Alignment buttons in a sleek row (CapCut Image 2) */}
                            <div className="grid grid-cols-6 gap-1 bg-[#141414] p-1 rounded-md border border-[#333333] mt-1">
                              <button
                                onClick={() => {
                                  const x = -200;
                                  updateClip(clip.id, {
                                    x,
                                    transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), x }
                                  });
                                }}
                                title="Align Left (|←)"
                                className="p-1.5 rounded hover:bg-[#262626] text-[#888] hover:text-[#1FC8DB] flex items-center justify-center transition-colors touch-target-40"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="2.5" y1="2" x2="2.5" y2="14" />
                                  <rect x="4.5" y="4.5" width="8.5" height="7" rx="1" fill="currentColor" fillOpacity="0.25" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  updateClip(clip.id, {
                                    x: 0,
                                    transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), x: 0 }
                                  });
                                }}
                                title="Align Center (→|←)"
                                className="p-1.5 rounded hover:bg-[#262626] text-[#888] hover:text-[#1FC8DB] flex items-center justify-center transition-colors touch-target-40"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="8" y1="2" x2="8" y2="14" strokeDasharray="2 1.5" />
                                  <rect x="3.75" y="4.5" width="8.5" height="7" rx="1" fill="currentColor" fillOpacity="0.25" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  const x = 200;
                                  updateClip(clip.id, {
                                    x,
                                    transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), x }
                                  });
                                }}
                                title="Align Right (→|)"
                                className="p-1.5 rounded hover:bg-[#262626] text-[#888] hover:text-[#1FC8DB] flex items-center justify-center transition-colors touch-target-40"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="13.5" y1="2" x2="13.5" y2="14" />
                                  <rect x="3" y="4.5" width="8.5" height="7" rx="1" fill="currentColor" fillOpacity="0.25" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  const y = -350;
                                  updateClip(clip.id, {
                                    y,
                                    transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), y }
                                  });
                                }}
                                title="Align Top (⊤)"
                                className="p-1.5 rounded hover:bg-[#262626] text-[#888] hover:text-[#1FC8DB] flex items-center justify-center transition-colors touch-target-40"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="2" y1="2.5" x2="14" y2="2.5" />
                                  <rect x="4.5" y="4.5" width="7" height="8.5" rx="1" fill="currentColor" fillOpacity="0.25" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  updateClip(clip.id, {
                                    y: 0,
                                    transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), y: 0 }
                                  });
                                }}
                                title="Align Middle (⫧)"
                                className="p-1.5 rounded hover:bg-[#262626] text-[#888] hover:text-[#1FC8DB] flex items-center justify-center transition-colors touch-target-40"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="2" y1="8" x2="14" y2="8" strokeDasharray="2 1.5" />
                                  <rect x="4.5" y="3.75" width="7" height="8.5" rx="1" fill="currentColor" fillOpacity="0.25" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  const y = 350;
                                  updateClip(clip.id, {
                                    y,
                                    transform: { ...(clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 }), y }
                                  });
                                }}
                                title="Align Bottom (⊥)"
                                className="p-1.5 rounded hover:bg-[#262626] text-[#888] hover:text-[#1FC8DB] flex items-center justify-center transition-colors touch-target-40"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="2" y1="13.5" x2="14" y2="13.5" />
                                  <rect x="4.5" y="3" width="7" height="8.5" rx="1" fill="currentColor" fillOpacity="0.25" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* BLEND ACCORDION (CapCut Layout) */}
                      <div className="flex flex-col gap-2 pb-3 border-b border-[#262626]">
                        <div className="flex items-center justify-between text-xs font-bold text-white cursor-pointer py-1">
                          <div
                            className="flex items-center gap-1.5 select-none"
                            onClick={() => setIsBlendOpen(!isBlendOpen)}
                          >
                            <input
                              type="checkbox"
                              checked={isBlendEnabled}
                              onChange={(e) => setIsBlendEnabled(e.target.checked)}
                              className="accent-[#1FC8DB] w-3.5 h-3.5 rounded"
                            />
                            <span>Blend</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-[#888] transition-transform ${
                                isBlendOpen ? '' : '-rotate-90'
                              }`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateClip(clip.id, { blendMode: 'normal', opacity: 1.0 })}
                              title="Reset blend"
                              className="p-1 rounded touch-target-40 text-[#888] hover:text-[#1FC8DB] transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            {renderKeyframeDiamond('Blend keyframe')}
                          </div>
                        </div>

                        {isBlendOpen && (
                          <div className="flex flex-col gap-2.5 pt-1">
                            {/* Mode */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8A8A8A]">Mode</span>
                              <select
                                value={clip.blendMode || 'normal'}
                                onChange={(e) => updateClip(clip.id, { blendMode: e.target.value })}
                                className="bg-[#141414] border border-[#333333] focus:border-[#1FC8DB] rounded px-2 py-1 text-white text-[11px] outline-none"
                              >
                                <option value="normal">Normal</option>
                                <option value="darken">Darken</option>
                                <option value="multiply">Multiply</option>
                                <option value="color-burn">Color Burn</option>
                                <option value="lighten">Lighten</option>
                                <option value="screen">Screen</option>
                                <option value="color-dodge">Color Dodge</option>
                                <option value="overlay">Overlay</option>
                                <option value="soft-light">Soft Light</option>
                                <option value="hard-light">Hard Light</option>
                                <option value="difference">Difference</option>
                                <option value="exclusion">Exclusion</option>
                              </select>
                            </div>

                            {/* Opacity */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-[#8A8A8A]">Opacity</span>
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center bg-[#141414] border border-[#333333] rounded px-1.5 py-0.5 text-xs font-mono">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={Math.round((clip.opacity ?? 1) * 100)}
                                      onChange={(e) => {
                                        const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100;
                                        updateClip(clip.id, { opacity: val });
                                      }}
                                      className="w-8 bg-transparent text-right outline-none text-white text-[11px]"
                                    />
                                    <span className="text-[#888] ml-0.5">%</span>
                                  </div>
                                  {renderKeyframeDiamond('Opacity keyframe')}
                                </div>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={clip.opacity ?? 1}
                                onChange={(e) => updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
                                className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                style={{ touchAction: 'none' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SPEED & SPEED CURVES ACCORDION (CapCut Layout) */}
                      <div className="flex flex-col gap-2 pb-3 border-b border-[#262626]">
                        <div
                          className="flex items-center justify-between text-xs font-bold text-white cursor-pointer py-1 select-none"
                          onClick={() => setIsSpeedOpen(!isSpeedOpen)}
                        >
                          <div className="flex items-center gap-1.5">
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-[#888] transition-transform ${
                                isSpeedOpen ? '' : '-rotate-90'
                              }`}
                            />
                            <span>Speed & Curve (Tốc độ & Đồ thị)</span>
                          </div>
                          <span className="font-mono text-[#1FC8DB] text-[11px] font-semibold">
                            {clip.speed || 1.0}x
                          </span>
                        </div>

                        {isSpeedOpen && (
                          <div className="flex flex-col gap-2.5 pt-1">
                            {/* Speed Slider */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-[#8A8A8A]">Tốc độ:</span>
                                <div className="flex items-center gap-1 bg-[#141414] border border-[#333333] rounded px-1.5 py-0.5 text-xs font-mono">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max="10"
                                    value={clip.speed || 1.0}
                                    onChange={(e) => {
                                      const sp = Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 1.0));
                                      updateClip(clip.id, { speed: sp });
                                    }}
                                    className="w-10 bg-transparent text-right outline-none text-white text-[11px]"
                                  />
                                  <span className="text-[#888]">x</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="0.1"
                                max="5.0"
                                step="0.1"
                                value={clip.speed || 1.0}
                                onChange={(e) => updateClip(clip.id, { speed: parseFloat(e.target.value) })}
                                className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                style={{ touchAction: 'none' }}
                              />
                            </div>

                            {/* Speed Presets */}
                            <div className="grid grid-cols-5 gap-1">
                              {[0.5, 1.0, 2.0, 3.0, 5.0].map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => updateClip(clip.id, { speed: preset })}
                                  className={`py-0.5 rounded text-[10px] font-mono border transition-colors ${
                                    (clip.speed || 1.0) === preset
                                      ? 'bg-[#1FC8DB] text-slate-950 font-bold border-[#1FC8DB] shadow-[0_0_8px_rgba(31,200,219,0.35)]'
                                      : 'bg-[#262626] text-[#888] border-[#333333] hover:text-white hover:border-[#1FC8DB]/50'
                                  }`}
                                >
                                  {preset}x
                                </button>
                              ))}
                            </div>

                            {/* Speed Curve Presets */}
                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <span className="text-[#8A8A8A]">Speed Curve:</span>
                              <select
                                value={typeof clip.speedCurve === 'string' ? clip.speedCurve : 'standard'}
                                onChange={(e) => updateClip(clip.id, { speedCurve: e.target.value })}
                                className="bg-[#141414] border border-[#333333] focus:border-[#1FC8DB] rounded px-2 py-1 text-white text-[11px] outline-none"
                              >
                                <option value="standard">Tiêu chuẩn (Standard)</option>
                                <option value="montage">Montage (Đoạn phim)</option>
                                <option value="hero">Hero (Anh hùng)</option>
                                <option value="bullet">Bullet (Viên đạn)</option>
                                <option value="jumpCut">Jump Cut</option>
                                <option value="flashIn">Flash In</option>
                                <option value="flashOut">Flash Out</option>
                              </select>
                            </div>

                            {/* Smooth Slow-motion Toggle (CapCut Optical Flow) */}
                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <div className="flex flex-col">
                                <span className="text-[#8A8A8A]">Smooth Slow-motion</span>
                                <span className="text-[9px] text-[#555]">Optical Flow mượt mà</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={clip.smoothSlowMo || false}
                                onChange={(e) => {
                                  updateClip(clip.id, { smoothSlowMo: e.target.checked });
                                  showToast(e.target.checked ? 'Đã bật Smooth Slow-motion (Optical Flow)' : 'Đã tắt Smooth Slow-motion', 'info');
                                }}
                                className="accent-[#1FC8DB] cursor-pointer"
                              />
                            </div>

                            {/* Reverse & Freeze Frame Actions */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              <button
                                onClick={() => {
                                  const nextRev = !(clip.reverse || clip.isReversed);
                                  updateClip(clip.id, { reverse: nextRev, isReversed: nextRev });
                                  showToast(nextRev ? 'Đã bật tua ngược (Reverse)' : 'Đã tắt tua ngược', 'info');
                                }}
                                className={`py-1 rounded text-[10px] font-semibold border transition-colors ${
                                  clip.reverse || clip.isReversed
                                    ? 'bg-[#1FC8DB]/20 text-[#1FC8DB] border-[#1FC8DB]'
                                    : 'bg-[#262626] text-[#888] border-[#333333] hover:text-white hover:border-[#1FC8DB]/50'
                                }`}
                              >
                                ◀ Tua ngược
                              </button>
                              <button
                                onClick={() => {
                                  const nextFreeze = !(clip.freezeFrame || clip.isFreeze);
                                  updateClip(clip.id, { freezeFrame: nextFreeze, isFreeze: nextFreeze });
                                  showToast(nextFreeze ? 'Đã đóng băng khung hình (Freeze)' : 'Đã hủy đóng băng', 'success');
                                }}
                                className={`py-1 rounded text-[10px] font-semibold border transition-colors ${
                                  clip.freezeFrame || clip.isFreeze
                                    ? 'bg-amber-400/20 text-amber-300 border-amber-400'
                                    : 'bg-[#262626] text-[#888] border-[#333333] hover:text-white hover:border-amber-400/50'
                                }`}
                              >
                                ❄ Đóng băng
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ENHANCE QUALITY (CapCut VIP Diamond Header) */}
                      <div className="flex items-center justify-between text-xs font-bold text-white py-1">
                        <div className="flex items-center gap-1.5">
                          <span>Enhance quality</span>
                          <span className="text-purple-400 text-xs">💎▾</span>
                        </div>
                        <span className="text-[10px] text-purple-400 font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                          PRO
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 1.2 SUB-TAB: REMOVE BG (Chroma Key & Background) */}
                  {activeVideoSubTab === 'removeBg' && (
                    <div className="flex flex-col gap-3">
                      {/* Auto Cutout */}
                      <button
                        onClick={() => {
                          const nextState = !clip.removeBg;
                          updateClip(clip.id, {
                            removeBg: nextState,
                            chromaKey: nextState ? { enabled: true, color: '#00FF00', similarity: 45, smoothness: 15 } : clip.chromaKey,
                          });
                          showToast(nextState ? 'Đã bật Auto Cutout (Tách nền tự động)' : 'Đã tắt Auto Cutout', 'success');
                        }}
                        className={`w-full py-2 rounded-md font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border ${
                          clip.removeBg
                            ? 'bg-[#1FC8DB] text-slate-950 border-[#1FC8DB] shadow-[0_0_12px_rgba(31,200,219,0.35)]'
                            : 'bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-slate-950 border-[#1FC8DB]/30'
                        }`}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>{clip.removeBg ? 'Auto Cutout (Đang tách nền)' : 'Auto Cutout (Tách nền 1-Click)'}</span>
                      </button>

                      {/* Chroma Key */}
                      <div className="flex flex-col gap-2 p-2.5 rounded bg-[#141414] border border-[#262626]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white uppercase">Chroma key</span>
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
                          <div className="flex flex-col gap-2 pt-2 border-t border-[#262626]">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#8A8A8A]">Color picker:</span>
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
                                <span>Intensity:</span>
                                <span className="font-mono text-[#1FC8DB] font-semibold">{clip.chromaKey?.similarity || 40}%</span>
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
                                className="accent-[#1FC8DB] cursor-pointer touch-slider"
                                style={{ touchAction: 'none' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Background */}
                      <div className="flex flex-col gap-2 p-2.5 rounded bg-[#141414] border border-[#262626]">
                        <span className="text-[11px] font-bold text-white uppercase">Background</span>
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
                              className={`py-1 rounded text-[10px] font-semibold uppercase border transition-all ${
                                (clip.backgroundConfig?.type || 'none') === b
                                  ? 'bg-[#1FC8DB] text-slate-950 font-bold border-[#1FC8DB]'
                                  : 'bg-[#262626] text-[#8A8A8A] border-[#333333] hover:text-white'
                              }`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1.3 SUB-TAB: MASK (CapCut Advanced Mask Engine) */}
                  {activeVideoSubTab === 'mask' && (() => {
                    const currentMask = typeof clip.mask === 'string' ? { type: clip.mask } : (clip.mask || { type: 'none' });
                    const maskType = currentMask.type || 'none';
                    const hasActiveMask = maskType !== 'none';

                    const updateMaskProp = (props: any) => {
                      updateClip(clip.id, {
                        mask: {
                          invert: false,
                          feather: 0,
                          width: 500,
                          height: 350,
                          x: 0,
                          y: 0,
                          rotation: 0,
                          roundness: 30,
                          ...currentMask,
                          type: props.type || (maskType === 'none' ? 'circle' : maskType),
                          ...props
                        }
                      });
                    };

                    return (
                      <div className="flex flex-col gap-3 p-2.5 rounded bg-[#141414] border border-[#262626]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white uppercase">Mask Presets</span>
                          {hasActiveMask && (
                            <button
                              onClick={() => updateClip(clip.id, { mask: 'none' })}
                              className="text-[10px] text-[#888] hover:text-rose-400 transition-colors"
                            >
                              Xóa mask
                            </button>
                          )}
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'none', label: 'None' },
                            { id: 'split', label: 'Split' },
                            { id: 'filmstrip', label: 'Filmstrip' },
                            { id: 'circle', label: 'Circle' },
                            { id: 'rect', label: 'Rectangle' },
                            { id: 'heart', label: 'Heart' },
                            { id: 'star', label: 'Star' }
                          ].map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                if (m.id === 'none') {
                                  updateClip(clip.id, { mask: 'none' });
                                } else {
                                  updateMaskProp({ type: m.id });
                                }
                              }}
                              className={`py-1 rounded text-[10px] font-semibold border transition-all ${
                                maskType === m.id
                                  ? 'bg-[#1FC8DB] text-slate-950 font-bold border-[#1FC8DB] shadow-[0_0_8px_rgba(31,200,219,0.35)]'
                                  : 'bg-[#262626] text-[#8A8A8A] border-[#333333] hover:text-white hover:border-[#1FC8DB]/50'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>

                        {/* Advanced Mask Parameters */}
                        {hasActiveMask && (
                          <div className="flex flex-col gap-2.5 pt-2 border-t border-[#262626]">
                            {/* Invert Mask Toggle */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8A8A8A]">Invert mask (Đảo ngược)</span>
                              <button
                                onClick={() => updateMaskProp({ invert: !currentMask.invert })}
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                                  currentMask.invert ? 'bg-[#1FC8DB]' : 'bg-[#333333]'
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                                    currentMask.invert ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Feather (Viền mờ) */}
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-[#8A8A8A]">Feather (Độ nhòe viền):</span>
                                <div className="flex items-center bg-[#1F1F1F] border border-[#333333] rounded px-1.5 py-0.5 text-xs font-mono">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={currentMask.feather || 0}
                                    onChange={(e) => updateMaskProp({ feather: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-8 bg-transparent text-right outline-none text-white text-[11px]"
                                  />
                                  <span className="text-[#777] ml-0.5">px</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={currentMask.feather || 0}
                                onChange={(e) => updateMaskProp({ feather: parseInt(e.target.value) })}
                                className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                style={{ touchAction: 'none' }}
                              />
                            </div>

                            {/* Width & Height */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-[#8A8A8A]">Width:</span>
                                  <input
                                    type="number"
                                    min="20"
                                    max="2000"
                                    value={currentMask.width || 500}
                                    onChange={(e) => updateMaskProp({ width: parseInt(e.target.value) || 100 })}
                                    className="w-12 bg-[#1F1F1F] border border-[#333333] rounded px-1 text-right text-white text-[11px] font-mono outline-none"
                                  />
                                </div>
                                <input
                                  type="range"
                                  min="50"
                                  max="1200"
                                  value={currentMask.width || 500}
                                  onChange={(e) => updateMaskProp({ width: parseInt(e.target.value) })}
                                  className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                  style={{ touchAction: 'none' }}
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-[#8A8A8A]">Height:</span>
                                  <input
                                    type="number"
                                    min="20"
                                    max="2000"
                                    value={currentMask.height || 350}
                                    onChange={(e) => updateMaskProp({ height: parseInt(e.target.value) || 100 })}
                                    className="w-12 bg-[#1F1F1F] border border-[#333333] rounded px-1 text-right text-white text-[11px] font-mono outline-none"
                                  />
                                </div>
                                <input
                                  type="range"
                                  min="50"
                                  max="1200"
                                  value={currentMask.height || 350}
                                  onChange={(e) => updateMaskProp({ height: parseInt(e.target.value) })}
                                  className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                  style={{ touchAction: 'none' }}
                                />
                              </div>
                            </div>

                            {/* Roundness for Rectangle */}
                            {maskType === 'rect' && (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-[#8A8A8A]">Roundness (Bo góc):</span>
                                  <div className="flex items-center bg-[#1F1F1F] border border-[#333333] rounded px-1.5 py-0.5 text-xs font-mono">
                                    <input
                                      type="number"
                                      min="0"
                                      max="150"
                                      value={currentMask.roundness || 0}
                                      onChange={(e) => updateMaskProp({ roundness: Math.max(0, parseInt(e.target.value) || 0) })}
                                      className="w-8 bg-transparent text-right outline-none text-white text-[11px]"
                                    />
                                    <span className="text-[#777] ml-0.5">px</span>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="150"
                                  value={currentMask.roundness || 0}
                                  onChange={(e) => updateMaskProp({ roundness: parseInt(e.target.value) })}
                                  className="accent-[#1FC8DB] h-1.5 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                  style={{ touchAction: 'none' }}
                                />
                              </div>
                            )}

                            {/* Position X / Y */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8A8A8A]">Center Position:</span>
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1 bg-[#1F1F1F] border border-[#333333] rounded px-1.5 py-0.5 text-[11px] font-mono">
                                  <span className="text-[#777]">X</span>
                                  <input
                                    type="number"
                                    value={currentMask.x || 0}
                                    onChange={(e) => updateMaskProp({ x: parseInt(e.target.value) || 0 })}
                                    className="w-10 bg-transparent text-right outline-none text-white text-[11px]"
                                  />
                                </div>
                                <div className="flex items-center gap-1 bg-[#1F1F1F] border border-[#333333] rounded px-1.5 py-0.5 text-[11px] font-mono">
                                  <span className="text-[#777]">Y</span>
                                  <input
                                    type="number"
                                    value={currentMask.y || 0}
                                    onChange={(e) => updateMaskProp({ y: parseInt(e.target.value) || 0 })}
                                    className="w-10 bg-transparent text-right outline-none text-white text-[11px]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Rotation */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#8A8A8A]">Rotation:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="range"
                                  min="-180"
                                  max="180"
                                  value={currentMask.rotation || 0}
                                  onChange={(e) => updateMaskProp({ rotation: parseInt(e.target.value) })}
                                  className="accent-[#1FC8DB] h-1.5 w-24 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                                  style={{ touchAction: 'none' }}
                                />
                                <div className="flex items-center bg-[#1F1F1F] border border-[#333333] rounded px-1 py-0.5 text-xs font-mono">
                                  <input
                                    type="number"
                                    value={currentMask.rotation || 0}
                                    onChange={(e) => updateMaskProp({ rotation: parseInt(e.target.value) || 0 })}
                                    className="w-8 bg-transparent text-right outline-none text-white text-[11px]"
                                  />
                                  <span className="text-[#777]">°</span>
                                </div>
                                <button
                                  onClick={() => updateMaskProp({ rotation: ((currentMask.rotation || 0) + 90) % 360 })}
                                  className="p-1 rounded bg-[#262626] hover:bg-[#333333] text-[#1FC8DB] transition-colors"
                                  title="Xoay mask 90°"
                                >
                                  <RotateCw className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 1.4 SUB-TAB: RETOUCH */}
                  {activeVideoSubTab === 'retouch' && (
                    <div className="flex flex-col gap-2.5 p-2.5 rounded bg-[#141414] border border-[#262626]">
                      <span className="text-[11px] font-bold text-white uppercase">Facial Retouch</span>
                      {[
                        { key: 'smoothSkin', label: 'Smooth Skin' },
                        { key: 'slimFace', label: 'Slim Face' },
                        { key: 'whiteTeeth', label: 'White Teeth' },
                        { key: 'brightenEyes', label: 'Brighten Eyes' },
                      ].map(({ key, label }) => {
                        const val = Number(clip.retouch?.[key] ?? 0);
                        return (
                          <div key={key} className="flex flex-col gap-1">
                            <div className="flex justify-between text-[11px] text-[#8A8A8A]">
                              <span>{label}</span>
                              <span className="text-[#1FC8DB] font-mono font-semibold">{val}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={val}
                              onChange={(e) => {
                                const num = Number(e.target.value);
                                updateClip(clip.id, {
                                  retouch: {
                                    ...(clip.retouch || {}),
                                    [key]: num,
                                  },
                                });
                              }}
                              className="accent-[#1FC8DB] cursor-pointer touch-slider"
                              style={{ touchAction: 'none' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ANIMATION & TRANSITIONS (CapCut Transitions Engine) */}
              {activeMainTab === 'animation' && (
                <div className="flex flex-col gap-3">
                  {/* Animation Presets (In / Out) */}
                  <div className="flex flex-col gap-2.5 p-2.5 rounded bg-[#141414] border border-[#262626]">
                    <span className="text-[11px] font-bold text-white uppercase">Clip Animation</span>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8A8A8A]">In Animation:</span>
                        <select
                          value={clip.animation?.in || 'none'}
                          onChange={(e) =>
                            updateClip(clip.id, {
                              animation: { ...clip.animation, in: e.target.value }
                            })
                          }
                          className="bg-[#141414] border border-[#333333] focus:border-[#1FC8DB] rounded px-2 py-1 text-white text-[11px] outline-none"
                        >
                          <option value="none">None</option>
                          <option value="fadeIn">Fade In</option>
                          <option value="zoomIn">Zoom In</option>
                          <option value="slideUp">Slide Up</option>
                          <option value="pop">Pop In</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8A8A8A]">Out Animation:</span>
                        <select
                          value={clip.animation?.out || 'none'}
                          onChange={(e) =>
                            updateClip(clip.id, {
                              animation: { ...clip.animation, out: e.target.value }
                            })
                          }
                          className="bg-[#141414] border border-[#333333] focus:border-[#1FC8DB] rounded px-2 py-1 text-white text-[11px] outline-none"
                        >
                          <option value="none">None</option>
                          <option value="fadeOut">Fade Out</option>
                          <option value="zoomOut">Zoom Out</option>
                          <option value="slideDown">Slide Down</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Transition In & Transition Out */}
                  <div className="flex flex-col gap-2.5 p-2.5 rounded bg-[#141414] border border-[#262626]">
                    <span className="text-[11px] font-bold text-[#1FC8DB] uppercase">Transitions (Chuyển cảnh)</span>

                    {/* Transition In */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8A8A8A]">Transition In:</span>
                        <select
                          value={clip.transitionIn?.type || clip.transitionType || 'none'}
                          onChange={(e) =>
                            updateClip(clip.id, {
                              transitionType: e.target.value as any,
                              transitionIn: {
                                type: e.target.value,
                                duration: clip.transitionIn?.duration || clip.transitionDuration || 0.8
                              }
                            })
                          }
                          className="bg-[#141414] border border-[#333333] focus:border-[#1FC8DB] rounded px-2 py-1 text-white text-[11px] outline-none"
                        >
                          <option value="none">None</option>
                          <option value="fade">Fade (Mờ dần)</option>
                          <option value="dissolve">Dissolve (Hòa tan)</option>
                          <option value="whiteFlash">White Flash (Chớp trắng)</option>
                          <option value="slideLeft">Slide Left (Trượt trái)</option>
                          <option value="slideRight">Slide Right (Trượt phải)</option>
                          <option value="slideUp">Slide Up (Trượt lên)</option>
                          <option value="slideDown">Slide Down (Trượt xuống)</option>
                          <option value="zoomIn">Zoom In (Thu phóng vào)</option>
                          <option value="zoomOut">Zoom Out (Thu phóng ra)</option>
                          <option value="whipPan">Whip Pan (Lia nhanh)</option>
                          <option value="spin">Spin (Xoay tròn)</option>
                          <option value="glitch">Glitch (Nhiễu sóng)</option>
                          <option value="blur">Blur (Làm mờ)</option>
                          <option value="push">Push (Đẩy cảnh)</option>
                          <option value="wipe">Wipe (Quét cảnh)</option>
                          <option value="lightLeak">Light Leak (Rò sáng)</option>
                        </select>
                      </div>

                      {/* Transition In Duration */}
                      {(clip.transitionIn?.type || clip.transitionType) && (clip.transitionIn?.type !== 'none' && clip.transitionType !== 'none') && (
                        <div className="flex items-center justify-between text-[11px] pl-2 border-l border-[#1FC8DB]/40">
                          <span className="text-[#8A8A8A]">Thời lượng:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="range"
                              min="0.1"
                              max="3.0"
                              step="0.1"
                              value={clip.transitionIn?.duration || clip.transitionDuration || 0.8}
                              onChange={(e) => {
                                const dur = parseFloat(e.target.value);
                                updateClip(clip.id, {
                                  transitionDuration: dur,
                                  transitionIn: {
                                    type: clip.transitionIn?.type || clip.transitionType || 'fade',
                                    duration: dur
                                  }
                                });
                              }}
                              className="accent-[#1FC8DB] h-1.5 w-20 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                              style={{ touchAction: 'none' }}
                            />
                            <span className="font-mono text-white text-[11px]">
                              {(clip.transitionIn?.duration || clip.transitionDuration || 0.8).toFixed(1)}s
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transition Out */}
                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#262626]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8A8A8A]">Transition Out:</span>
                        <select
                          value={clip.transitionOut?.type || 'none'}
                          onChange={(e) =>
                            updateClip(clip.id, {
                              transitionOut: {
                                type: e.target.value,
                                duration: clip.transitionOut?.duration || 0.8
                              }
                            })
                          }
                          className="bg-[#141414] border border-[#333333] focus:border-[#1FC8DB] rounded px-2 py-1 text-white text-[11px] outline-none"
                        >
                          <option value="none">None</option>
                          <option value="fade">Fade Out</option>
                          <option value="dissolve">Dissolve Out</option>
                          <option value="zoomOut">Zoom Out</option>
                          <option value="slideLeft">Slide Left</option>
                          <option value="slideRight">Slide Right</option>
                        </select>
                      </div>

                      {clip.transitionOut?.type && clip.transitionOut.type !== 'none' && (
                        <div className="flex items-center justify-between text-[11px] pl-2 border-l border-[#1FC8DB]/40">
                          <span className="text-[#8A8A8A]">Thời lượng:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="range"
                              min="0.1"
                              max="3.0"
                              step="0.1"
                              value={clip.transitionOut?.duration || 0.8}
                              onChange={(e) => {
                                const dur = parseFloat(e.target.value);
                                updateClip(clip.id, {
                                  transitionOut: {
                                    type: clip.transitionOut?.type || 'fade',
                                    duration: dur
                                  }
                                });
                              }}
                              className="accent-[#1FC8DB] h-1.5 w-20 bg-[#2A2A2A] rounded cursor-pointer touch-slider"
                              style={{ touchAction: 'none' }}
                            />
                            <span className="font-mono text-white text-[11px]">
                              {(clip.transitionOut?.duration || 0.8).toFixed(1)}s
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Apply to All Clips Button */}
                    <button
                      onClick={() => {
                        const targetIn = clip.transitionIn || (clip.transitionType ? { type: clip.transitionType, duration: clip.transitionDuration || 0.8 } : undefined);
                        const targetOut = clip.transitionOut;
                        let count = 0;
                        clips.forEach((c) => {
                          if (c.track === 'video' || c.type === 'video' || c.type === 'image') {
                            updateClip(c.id, {
                              transitionIn: targetIn,
                              transitionOut: targetOut,
                              transitionType: targetIn?.type as any,
                              transitionDuration: targetIn?.duration
                            });
                            count++;
                          }
                        });
                        showToast(`Đã áp dụng chuyển cảnh cho ${count} phân đoạn!`, 'success');
                      }}
                      className="w-full mt-1 py-1.5 rounded bg-[#222] hover:bg-[#2A2A2A] border border-[#333] hover:border-[#1FC8DB]/50 text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3 text-[#1FC8DB]" />
                      <span>Áp dụng cho tất cả phân đoạn</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: ADJUST */}
              {activeMainTab === 'adjust' && (
                <div className="flex flex-col gap-3">
                  {/* Color Tuning */}
                  <div className="flex flex-col gap-2 p-2.5 rounded bg-[#141414] border border-[#262626]">
                    <span className="text-[11px] font-bold text-white uppercase">Color Adjustment</span>
                    {[
                      { label: 'Brightness', key: 'brightness', min: -50, max: 50, def: 0 },
                      { label: 'Contrast', key: 'contrast', min: -50, max: 50, def: 0 },
                      { label: 'Saturation', key: 'saturation', min: -50, max: 50, def: 0 }
                    ].map((p) => (
                      <div key={p.key} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[11px] text-[#8A8A8A]">
                          <span>{p.label}:</span>
                          <span className="font-mono text-[#1FC8DB] font-semibold">{(clip as any)[p.key] ?? p.def}</span>
                        </div>
                        <input
                          type="range"
                          min={p.min}
                          max={p.max}
                          value={(clip as any)[p.key] ?? p.def}
                          onChange={(e) => updateClip(clip.id, { [p.key]: parseInt(e.target.value) })}
                          className="accent-[#1FC8DB] cursor-pointer touch-slider"
                          style={{ touchAction: 'none' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* LUT Filter */}
                  <div className="flex flex-col gap-2 p-2.5 rounded bg-[#141414] border border-[#262626]">
                    <span className="text-[11px] font-bold text-white uppercase">LUT Filter</span>
                    <select
                      value={typeof clip.filter === 'object' ? clip.filter?.id : (clip.filter || 'none')}
                      onChange={(e) => updateClip(clip.id, { filter: e.target.value as any })}
                      className="bg-[#141414] border border-[#333333] focus:border-[#1FC8DB] rounded px-2 py-1 text-white text-xs outline-none"
                    >
                      {FILTER_PRESETS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Effects */}
                  <div className="flex flex-col gap-2 p-2.5 rounded bg-[#141414] border border-[#262626]">
                    <span className="text-[11px] font-bold text-white uppercase">Shader Effects</span>
                    <select
                      value={clip.effectType || 'none'}
                      onChange={(e) => updateClip(clip.id, { effectType: e.target.value })}
                      className="bg-[#141414] border border-[#333333] focus:border-[#1FC8DB] rounded px-2 py-1 text-white text-xs outline-none"
                    >
                      <option value="none">None</option>
                      <option value="blur">Blur</option>
                      <option value="glitch">Glitch</option>
                      <option value="vhs">VHS</option>
                      <option value="rgb">RGB Split</option>
                      <option value="shake">Shake</option>
                      <option value="pulse">Pulse</option>
                      <option value="vignette">Vignette</option>
                      <option value="grain">Film Grain</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 4: AI STYLIZE */}
              {activeMainTab === 'ai' && (
                <div className="flex flex-col gap-2.5 p-2.5 rounded bg-[#141414] border border-[#262626]">
                  <span className="text-[11px] font-bold text-[#1FC8DB] uppercase">AI Stylize & Effects</span>
                  <button
                    onClick={() => {
                      const isAnime = clip.filter === 'anime_manga';
                      updateClip(clip.id, {
                        filter: isAnime ? 'none' : 'anime_manga',
                        effectType: isAnime ? 'none' : 'vhs',
                      });
                      showToast(isAnime ? 'Đã tắt AI Anime / Manga Style' : 'Đã áp dụng AI Anime / Manga Style', 'success');
                    }}
                    className={`w-full py-2 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                      clip.filter === 'anime_manga'
                        ? 'bg-[#1FC8DB] text-slate-950 shadow-[0_0_12px_rgba(31,200,219,0.35)]'
                        : 'bg-[#1FC8DB]/20 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-slate-950'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{clip.filter === 'anime_manga' ? 'Anime / Manga (Đang bật)' : 'AI Anime / Manga Style'}</span>
                  </button>
                  <button
                    onClick={() => {
                      const nextTracking = !clip.motionTracking;
                      updateClip(clip.id, { motionTracking: nextTracking });
                      showToast(nextTracking ? 'Đã kích hoạt AI Motion Tracking' : 'Đã tắt AI Motion Tracking', 'info');
                    }}
                    className={`w-full py-2 rounded border font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                      clip.motionTracking
                        ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                        : 'bg-[#222] hover:bg-[#2A2A2A] border-[#333] text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{clip.motionTracking ? 'AI Motion Tracking (Đang theo dõi)' : 'AI Motion Tracking'}</span>
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
                    className="accent-[#1FC8DB] cursor-pointer touch-slider"
                    style={{ touchAction: 'none' }}
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
                    {['Bass Boost', 'Vocal', 'Acoustic', 'Pop', 'Rock'].map((eq) => {
                      const isActive = clip.equalizerPreset === eq;
                      return (
                        <button
                          key={eq}
                          onClick={() => {
                            const newEq = isActive ? undefined : eq;
                            const eqPresets: Record<string, { eqLow: number; eqMid: number; eqHigh: number }> = {
                              'Bass Boost': { eqLow: 8, eqMid: 0, eqHigh: -2 },
                              'Vocal': { eqLow: -3, eqMid: 6, eqHigh: 2 },
                              'Acoustic': { eqLow: 2, eqMid: 3, eqHigh: 4 },
                              'Pop': { eqLow: 4, eqMid: 2, eqHigh: 5 },
                              'Rock': { eqLow: 6, eqMid: -1, eqHigh: 6 },
                            };
                            const settings = newEq && eqPresets[newEq] ? eqPresets[newEq] : { eqLow: 0, eqMid: 0, eqHigh: 0 };
                            updateClip(clip.id, {
                              equalizerPreset: newEq,
                              ...settings,
                            });
                            showToast(newEq ? `Đã áp dụng EQ: ${eq}` : 'Đã tắt EQ preset', 'info');
                          }}
                          className={`py-1 rounded text-[9px] font-semibold border transition-colors ${
                            isActive
                              ? 'bg-[#1FC8DB]/20 border-[#1FC8DB] text-[#1FC8DB]'
                              : 'bg-[#1F1F1F] hover:bg-[#2A2A2A] border-[#333333] text-white'
                          }`}
                        >
                          {eq}
                        </button>
                      );
                    })}
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
                  className="px-2 py-0.5 rounded bg-[#1F1F1F] hover:bg-[#333] text-[10px] text-[#8A8A8A] hover:text-white touch-target-40"
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
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer touch-slider"
                    style={{ touchAction: 'none' }}
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
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer touch-slider"
                    style={{ touchAction: 'none' }}
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
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer touch-slider"
                    style={{ touchAction: 'none' }}
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
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer touch-slider"
                    style={{ touchAction: 'none' }}
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
                    className="w-full accent-[#1FC8DB] h-1.5 bg-[#1F1F1F] rounded cursor-pointer touch-slider"
                    style={{ touchAction: 'none' }}
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
