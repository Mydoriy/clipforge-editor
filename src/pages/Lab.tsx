import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Link as LinkIcon,
  Upload,
  AlertTriangle,
  Play,
  Pause,
  Sliders,
  Scissors,
  Eye,
  Film,
  Layers,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  FolderPlus,
  ArrowRight,
  ShieldAlert,
  Save,
} from 'lucide-react';

import {
  classifyUrl,
  validateReferenceVideoFile,
} from '../engine/linkIntake.ts';

import {
  LAB_COPYRIGHT_NOTICE,
  type ReferenceVideoMetadata,
} from '../types/lab.ts';

import {
  buildReferenceTimeline,
  assignClipToSlot,
  autoFillSlotsByBeat,
  toggleSlotTechnique,
  updateSlotTechniqueParams,
  replaceSlotTechnique,
  addUserOverlayToSlot,
  resolveSlotAction,
  runExportPreflightCheck,
  applyRemixToProject,
  type ReferenceVideoMetadataInput,
} from '../engine/remixEngine.ts';

import type { ReferenceTimeline, RemixSlot, PreflightCheckResult } from '../types/remix.ts';
import { useEditorStore } from '../store/useEditorStore.ts';

export const Lab: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMediaInputRef = useRef<HTMLInputElement>(null);

  // Intake State
  const [urlInput, setUrlInput] = useState('');
  const [urlFeedback, setUrlFeedback] = useState<{
    type: 'social' | 'direct' | 'unsupported';
    message: string;
    domain?: string;
  } | null>(null);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Active Session State
  const [referenceVideo, setReferenceVideo] = useState<ReferenceVideoMetadata | null>(null);
  const [timeline, setTimeline] = useState<ReferenceTimeline | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'side_by_side' | 'before_after'>('side_by_side');
  const [isPlaying, setIsPlaying] = useState(false);

  // Preflight Dialog State
  const [preflightModalOpen, setPreflightModalOpen] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightCheckResult | null>(null);

  // Target Slot for User Media Import
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);

  // 1. Handle URL classification & Intake
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError(null);
    if (!urlInput.trim()) return;

    const classification = classifyUrl(urlInput);
    if (classification.type === 'social_platform') {
      setUrlFeedback({
        type: 'social',
        domain: classification.socialInfo?.domain,
        message:
          'ClipForge tuyệt đối không scrape hay tải video từ mạng xã hội. Vui lòng mở link tham khảo và thả tệp bạn sở hữu quyền sử dụng vào ô bên dưới.',
      });
    } else if (classification.type === 'direct_video') {
      setUrlFeedback({
        type: 'direct',
        message: 'Đã nhận diện tệp video trực tiếp. Nếu CORS bị chặn, vui lòng tải về máy và thả vào ô bên dưới.',
      });
    } else {
      setUrlFeedback({
        type: 'unsupported',
        message: 'Đường dẫn không hỗ trợ. Vui lòng dán file video (.mp4, .webm) hoặc thả tệp từ máy tính.',
      });
    }
  };

  // 2. Handle File Drop / Select
  const handleFileSelect = (file: File) => {
    setIntakeError(null);
    setIsLoading(true);

    const validation = validateReferenceVideoFile(file);
    if (!validation.valid) {
      setIntakeError(validation.error?.vi || 'Tệp không đạt yêu cầu giới hạn (<= 3 phút, <= 500MB).');
      setIsLoading(false);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = objectUrl;
    videoEl.preload = 'metadata';

    videoEl.onloadedmetadata = () => {
      const durationSec = videoEl.duration || 6.0;
      const aspect = videoEl.videoWidth >= videoEl.videoHeight ? '16:9' : '9:16';

      const refMeta: ReferenceVideoMetadata = {
        id: `ref_${Date.now()}`,
        name: file.name,
        sizeBytes: file.size,
        durationSec,
        width: videoEl.videoWidth,
        height: videoEl.videoHeight,
        importedAt: Date.now(),
      };

      setReferenceVideo(refMeta);

      // Build initial ReferenceTimeline
      const refInput: ReferenceVideoMetadataInput = {
        videoId: refMeta.id,
        name: refMeta.name,
        durationSec: refMeta.durationSec,
        aspectRatio: aspect as any,
        thumbnailUrl: objectUrl,
      };

      const initialTimeline = buildReferenceTimeline([], refInput);
      setTimeline(initialTimeline);
      setSelectedSlotId(initialTimeline.slots[0]?.id || null);
      setIsLoading(false);
    };

    videoEl.onerror = () => {
      setIntakeError('Không thể giải mã metadata video. Vui lòng chọn tệp MP4 hoặc WebM hợp lệ.');
      setIsLoading(false);
    };
  };

  // 3. User Media Clip Assignment into Slot
  const handleAssignUserMedia = (slotId: string, file: File) => {
    if (!timeline) return;
    const clipUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = clipUrl;
    videoEl.preload = 'metadata';

    videoEl.onloadedmetadata = () => {
      const userMedia = {
        mediaId: `user_m_${Date.now()}`,
        name: file.name,
        durationSec: videoEl.duration || 3.0,
        url: clipUrl,
      };

      const updated = assignClipToSlot(timeline, slotId, userMedia, {
        fitMode: 'trim',
        scaleMode: 'fill',
      });
      setTimeline(updated);
      setAssigningSlotId(null);
    };
  };

  // 4. Auto-Fill by Beat
  const handleAutoFill = () => {
    if (!timeline) return;
    // Mock user clips from media library
    const mockUserClips = [
      { mediaId: 'u_1', name: 'my_clip_1.mp4', durationSec: 3.5, url: 'mock_u1' },
      { mediaId: 'u_2', name: 'my_clip_2.mp4', durationSec: 4.2, url: 'mock_u2' },
      { mediaId: 'u_3', name: 'my_clip_3.mp4', durationSec: 2.8, url: 'mock_u3' },
    ];
    const autoFilled = autoFillSlotsByBeat(timeline, mockUserClips, { mode: 'beat_sync' });
    setTimeline(autoFilled);
  };

  // 5. Preflight Check Trigger
  const handleTriggerPreflight = () => {
    if (!timeline) return;
    const result = runExportPreflightCheck(timeline);
    setPreflightResult(result);
    setPreflightModalOpen(true);
  };

  // 6. Apply to Project
  const handleApplyToProject = () => {
    if (!timeline) return;
    const preflight = runExportPreflightCheck(timeline);
    if (!preflight.canExport) {
      setPreflightResult(preflight);
      setPreflightModalOpen(true);
      return;
    }

    const result = applyRemixToProject(timeline, 'new_project');
    if (result.success) {
      navigate(`/editor/${result.projectId}`);
    }
  };

  const selectedSlot = timeline?.slots.find((s) => s.id === selectedSlotId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] text-gray-100 overflow-hidden">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
        }}
      />
      <input
        ref={userMediaInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0] && assigningSlotId) {
            handleAssignUserMedia(assigningSlotId, e.target.files[0]);
          }
        }}
      />

      {/* Header Bar */}
      <div className="h-14 border-b border-gray-800 bg-[#0E1422] px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-[#1FC8DB] to-[#0070F3] rounded-lg shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Phòng Học & Remix
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
                LAB / REMIX
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">
              Trích xuất kỹ thuật, chỉnh trực tiếp trên khung cảnh tham chiếu, cam kết 0% rò rỉ nội dung gốc
            </p>
          </div>
        </div>

        {timeline && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAutoFill}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 rounded border border-gray-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Dựng lại theo nhịp
            </button>
            <button
              onClick={handleTriggerPreflight}
              className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800/80 text-xs text-indigo-300 rounded border border-indigo-700 flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              Kiểm tra xuất (Preflight)
            </button>
            <button
              onClick={handleApplyToProject}
              className="px-4 py-1.5 bg-gradient-to-r from-[#1FC8DB] to-[#0070F3] hover:brightness-110 text-xs font-semibold text-white rounded shadow-md flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Áp dụng vào dự án
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!timeline ? (
        /* INTAKE VIEW */
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
          <div className="max-w-2xl w-full space-y-6">
            {/* Legal Notice */}
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{LAB_COPYRIGHT_NOTICE.vi}</span>
              </div>
            </div>

            {/* URL Input Box */}
            <div className="bg-[#121829] border border-gray-800 p-6 rounded-2xl shadow-xl space-y-4">
              <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                Dán liên kết tham khảo hoặc thả tệp video
              </h2>
              <form onSubmit={handleUrlSubmit} className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://tiktok.com/@... hoặc link video trực tiếp..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 bg-[#0A0D16] border border-gray-700 rounded-lg px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-cyan-300 rounded-lg border border-gray-700"
                >
                  Kiểm tra link
                </button>
              </form>

              {urlFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    urlFeedback.type === 'social'
                      ? 'bg-blue-950/40 border-blue-800 text-blue-200'
                      : urlFeedback.type === 'direct'
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}
                >
                  {urlFeedback.message}
                </div>
              )}
            </div>

            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-cyan-500 bg-[#0E1424]/60 hover:bg-[#0E1424] p-10 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-cyan-400">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-200">
                  Thả tệp video tham chiếu của bạn vào đây hoặc click để chọn
                </p>
                <p className="text-xs text-gray-400 mt-1">Hỗ trợ MP4, WebM (≤ 3 phút, ≤ 500MB)</p>
              </div>
            </div>

            {intakeError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{intakeError}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* WORKBENCH VIEW */
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Slots Filmstrip & Timeline Overview */}
          <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
            {/* Top Preview Canvas & Comparison */}
            <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-4">
              {/* Synchronized Side-by-Side Canvas Mock */}
              <div className="w-full max-w-2xl aspect-[9/16] max-h-[60vh] bg-[#0A0D14] border border-gray-800 rounded-xl overflow-hidden flex relative shadow-2xl">
                {/* Reference Side (50%) */}
                <div className="w-1/2 h-full border-r border-gray-700/60 relative flex flex-col items-center justify-center bg-gray-950">
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-rose-600/90 text-white text-[10px] font-bold rounded shadow">
                    Tham chiếu – không xuất
                  </div>
                  <div className="text-xs text-gray-500 flex flex-col items-center">
                    <Film className="w-8 h-8 mb-1 text-gray-600" />
                    <span>Reference View (Mờ 35%)</span>
                  </div>
                </div>

                {/* User Remix Side (50%) */}
                <div className="w-1/2 h-full relative flex flex-col items-center justify-center bg-[#070A10]">
                  <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-cyan-600/90 text-white text-[10px] font-bold rounded shadow">
                    Clip của bạn (Remix)
                  </div>
                  {selectedSlot?.assignedClip ? (
                    <div className="text-xs text-cyan-300 text-center px-4">
                      <CheckCircle className="w-8 h-8 mb-1 text-cyan-400 mx-auto" />
                      <span className="font-semibold">{selectedSlot.assignedClip.name}</span>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Tốc độ: {selectedSlot.assignedClip.speed}x ({selectedSlot.assignedClip.fitMode})
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-400 text-center px-4 flex flex-col items-center">
                      <AlertTriangle className="w-8 h-8 mb-1 text-amber-500" />
                      <span>Chưa gán clip</span>
                      <button
                        onClick={() => {
                          setAssigningSlotId(selectedSlot?.id || null);
                          userMediaInputRef.current?.click();
                        }}
                        className="mt-2 px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-[10px] text-amber-200 border border-amber-600 rounded"
                      >
                        + Gán clip của bạn
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom: Slots Filmstrip Horizontal Scroll */}
            <div className="h-44 border-t border-gray-800 bg-[#0B0F19] p-3 flex flex-col">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span className="font-semibold text-gray-200">
                  Các phân cảnh kỹ thuật ({timeline.slots.length} cảnh)
                </span>
                <span className="text-[11px]">
                  Đã điền: {timeline.filledSlotsCount} / {timeline.totalSlots}
                </span>
              </div>

              <div className="flex-1 flex gap-3 overflow-x-auto pb-1">
                {timeline.slots.map((slot) => {
                  const isSelected = slot.id === selectedSlotId;
                  const isFilled = slot.status === 'filled';
                  const isBlack = slot.status === 'placeholder_black';
                  const isCut = slot.status === 'excluded';

                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`min-w-[160px] max-w-[180px] p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/30 shadow-lg'
                          : 'border-gray-800 bg-[#121829] hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-gray-400">#{slot.index + 1}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            isFilled
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : isBlack
                              ? 'bg-gray-800 text-gray-300'
                              : isCut
                              ? 'bg-rose-950 text-rose-400'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {isFilled ? 'Đã điền' : isBlack ? 'Đen' : isCut ? 'Cắt bỏ' : 'Chưa điền'}
                        </span>
                      </div>

                      <div className="my-1.5">
                        <div className="text-xs font-semibold text-gray-200 truncate">{slot.label.vi}</div>
                        <div className="text-[10px] text-gray-400">Thời lượng: {slot.durationSec}s</div>
                      </div>

                      <div className="flex gap-1 text-[9px] text-gray-400">
                        {slot.techniques.transition?.enabled && (
                          <span className="px-1 bg-gray-800 rounded">Chuyển cảnh</span>
                        )}
                        {slot.techniques.effect?.enabled && (
                          <span className="px-1 bg-gray-800 rounded">Hiệu ứng</span>
                        )}
                        {slot.techniques.look?.enabled && (
                          <span className="px-1 bg-gray-800 rounded">Màu</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Slot Technique Inspector Panel */}
          <div className="w-80 bg-[#0E1424] p-5 flex flex-col space-y-6 overflow-y-auto">
            {selectedSlot ? (
              <>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Cảnh #{selectedSlot.index + 1}: {selectedSlot.label.vi}</span>
                    <span className="text-xs font-normal text-gray-400">{selectedSlot.durationSec}s</span>
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Trạng thái: {selectedSlot.status === 'filled' ? 'Đã gán clip' : 'Chưa gán clip (Dùng tham chiếu)'}
                  </p>
                </div>

                {/* Slot User Clip Section */}
                <div className="p-3 bg-[#131B30] border border-gray-800 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-gray-200">Clip của bạn</span>
                  {selectedSlot.assignedClip ? (
                    <div className="text-xs text-emerald-300">
                      <p className="truncate font-medium">{selectedSlot.assignedClip.name}</p>
                      <p className="text-[10px] text-gray-400">
                        Tốc độ: {selectedSlot.assignedClip.speed}x | Chế độ: {selectedSlot.assignedClip.fitMode}
                      </p>
                      <button
                        onClick={() => {
                          setAssigningSlotId(selectedSlot.id);
                          userMediaInputRef.current?.click();
                        }}
                        className="mt-2 w-full py-1 bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-300 rounded border border-gray-700"
                      >
                        Đổi clip khác
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[11px] text-amber-300 mb-2">Chưa gán clip người dùng</p>
                      <button
                        onClick={() => {
                          setAssigningSlotId(selectedSlot.id);
                          userMediaInputRef.current?.click();
                        }}
                        className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white rounded shadow"
                      >
                        + Chọn clip từ máy
                      </button>
                    </div>
                  )}
                </div>

                {/* Technique Toggles & Sliders */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Kỹ thuật trích xuất
                  </h3>

                  {/* 1. Transition */}
                  {selectedSlot.techniques.transition && (
                    <div className="p-3 bg-[#131B30] border border-gray-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-200">Chuyển cảnh</span>
                        <input
                          type="checkbox"
                          checked={selectedSlot.techniques.transition.enabled}
                          onChange={(e) =>
                            setTimeline(
                              toggleSlotTechnique(timeline, selectedSlot.id, 'transition', e.target.checked)
                            )
                          }
                          className="rounded bg-gray-800 border-gray-700 text-cyan-500"
                        />
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {selectedSlot.techniques.transition.name.vi}
                      </div>
                    </div>
                  )}

                  {/* 2. Effect */}
                  {selectedSlot.techniques.effect && (
                    <div className="p-3 bg-[#131B30] border border-gray-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-200">Hiệu ứng</span>
                        <input
                          type="checkbox"
                          checked={selectedSlot.techniques.effect.enabled}
                          onChange={(e) =>
                            setTimeline(
                              toggleSlotTechnique(timeline, selectedSlot.id, 'effect', e.target.checked)
                            )
                          }
                          className="rounded bg-gray-800 border-gray-700 text-cyan-500"
                        />
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {selectedSlot.techniques.effect.name.vi}
                      </div>
                    </div>
                  )}

                  {/* 3. Look / Color Grade */}
                  {selectedSlot.techniques.look && (
                    <div className="p-3 bg-[#131B30] border border-gray-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-200">Bảng màu (Look)</span>
                        <input
                          type="checkbox"
                          checked={selectedSlot.techniques.look.enabled}
                          onChange={(e) =>
                            setTimeline(
                              toggleSlotTechnique(timeline, selectedSlot.id, 'look', e.target.checked)
                            )
                          }
                          className="rounded bg-gray-800 border-gray-700 text-cyan-500"
                        />
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Độ tương phản (Contrast)</span>
                          <span>{selectedSlot.techniques.look.params.contrast || 1.0}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.05"
                          value={selectedSlot.techniques.look.params.contrast || 1.0}
                          onChange={(e) =>
                            setTimeline(
                              updateSlotTechniqueParams(timeline, selectedSlot.id, 'look', {
                                contrast: parseFloat(e.target.value),
                              })
                            )
                          }
                          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500 text-center py-10">Chọn một cảnh để chỉnh sửa</div>
            )}
          </div>
        </div>
      )}

      {/* Preflight Modal */}
      {preflightModalOpen && preflightResult && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121829] border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Chốt Chặn Kiểm Tra Xuất Video (Preflight)</h3>
            </div>

            <p className="text-xs text-gray-300">
              {preflightResult.warningNotice?.vi ||
                'Toàn bộ cảnh đều phải được người dùng giải quyết để cam kết 0% rò rỉ nội dung tham chiếu.'}
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-800 rounded-lg p-2 bg-[#0A0D16]">
              {preflightResult.unresolvedSlots.map((slot) => (
                <div
                  key={slot.slotId}
                  className="p-2.5 bg-[#141C30] rounded border border-gray-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-gray-200">Cảnh #{slot.index + 1}</span>
                    <span className="text-[10px] text-gray-400 block">{slot.durationSec}s | Chưa gán clip</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        if (timeline) {
                          setTimeline(resolveSlotAction(timeline, slot.slotId, 'black'));
                        }
                      }}
                      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 rounded border border-gray-700"
                    >
                      Để đen
                    </button>
                    <button
                      onClick={() => {
                        if (timeline) {
                          setTimeline(resolveSlotAction(timeline, slot.slotId, 'cut'));
                        }
                      }}
                      className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-[10px] text-rose-300 rounded border border-rose-800"
                    >
                      Cắt bỏ
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreflightModalOpen(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 rounded"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lab;
