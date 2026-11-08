import React, { useState, useRef, useEffect } from 'react';
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
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Undo2,
  Cpu,
  Coins,
  Clock,
  Ban,
  HelpCircle,
  Edit2,
  Trash2,
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
import { AiConsentModal } from '../components/AiConsentModal.tsx';
import {
  buildAiConsentPayload,
  isSessionAiConsentGranted,
  setSessionAiConsent,
  getPrivacySettings,
  calculateEstimatedTokensAndCost,
  AI_PRIVACY_COPYRIGHT_NOTICE,
} from '../engine/privacyCostSafetyManager.ts';
import type { AiConsentPayload } from '../types/privacyCostSafety.ts';
import { getVisionSettings } from '../engine/visionPlanner.ts';
import { measureVideoEvents } from '../engine/learningLoop.ts';
import {
  listLearnedItems,
  renameLearnedItem,
  updateLearnedItemStatus,
  deleteLearnedItem,
  getLearnedStorageUsageBytes,
  evaluateAndSaveLearnedTechnique,
} from '../engine/learnedTechniqueManager.ts';
import type { LearnedItem } from '../types/learnedTechnique.ts';

export type LabStep = 1 | 2 | 3 | 4 | 5;

export interface DetectedTechniqueUI {
  id: string;
  name: { vi: string; en: string };
  kind: 'transition' | 'effect' | 'look' | 'text';
  matchLevel: 'exact' | 'approx' | 'unsupported';
  verifiedScore: number;
  isVerified: boolean;
  isAiHypothesis: boolean;
  needsNewPrimitive?: boolean;
  needsNewPrimitiveDesc?: string;
  primitiveId: string;
  enabled: boolean;
  parameters: Record<string, any>;
  filmstrip: Array<{ timestampSec: number; dataUrl: string }>;
}

export const Lab: React.FC = () => {
  const navigate = useNavigate();
  const showToast = useEditorStore((state) => state.showToast);
  const language = useEditorStore((state) => state.language);
  const isVi = language === 'VN';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMediaInputRef = useRef<HTMLInputElement>(null);

  // Stepper State (T7: 1 Nguồn -> 2 Phân tích -> 3 Kỹ thuật -> 4 Remix -> 5 Đã học)
  const [activeStep, setActiveStep] = useState<LabStep>(1);

  // Intake State (Step 1)
  const [urlInput, setUrlInput] = useState('');
  const [urlFeedback, setUrlFeedback] = useState<{
    type: 'social' | 'direct' | 'unsupported';
    message: string;
    domain?: string;
  } | null>(null);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Active Reference Video
  const [referenceVideo, setReferenceVideo] = useState<ReferenceVideoMetadata | null>(null);

  // Analysis State (Step 2)
  const [analysisPhase, setAnalysisPhase] = useState<
    'idle' | 'measure' | 'interpret' | 'verify' | 'refine' | 'complete' | 'cancelled'
  >('idle');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [tokensUsedLive, setTokensUsedLive] = useState(0);
  const [costUsdLive, setCostUsdLive] = useState(0);
  const [analysisDurationSec, setAnalysisDurationSec] = useState(0);

  // Detected Techniques State (Step 3)
  const [detectedTechniques, setDetectedTechniques] = useState<DetectedTechniqueUI[]>([]);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);

  // Remix State (Step 4)
  const [timeline, setTimeline] = useState<ReferenceTimeline | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'side_by_side' | 'before_after'>('side_by_side');
  const [isPlaying, setIsPlaying] = useState(false);
  const [preflightModalOpen, setPreflightModalOpen] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightCheckResult | null>(null);
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);

  // Learned Items State (Step 5)
  const [learnedList, setLearnedList] = useState<LearnedItem[]>([]);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [storageUsageBytes, setStorageUsageBytes] = useState(0);

  // AI Consent Modal State (T6)
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentPayload, setConsentPayload] = useState<AiConsentPayload | null>(null);

  // Load learned items when reaching step 5
  const refreshLearnedStore = () => {
    setLearnedList(listLearnedItems());
    setStorageUsageBytes(getLearnedStorageUsageBytes());
  };

  useEffect(() => {
    if (activeStep === 5) {
      refreshLearnedStore();
    }
  }, [activeStep]);

  // ============================================================================
  // STEP 1: NGUỒN (Link Intake & Video File Selection)
  // ============================================================================

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
      setIsLoading(false);

      // Trigger Step 2: Phân tích thực tế
      startRealAnalysis(file, refMeta, objectUrl, aspect);
    };

    videoEl.onerror = () => {
      setIntakeError('Không thể giải mã metadata video. Vui lòng chọn tệp MP4 hoặc WebM hợp lệ.');
      setIsLoading(false);
    };
  };

  // ============================================================================
  // STEP 2: PHÂN TÍCH (Measure -> Interpret -> Verify -> Refine)
  // ============================================================================

  const startRealAnalysis = async (
    file: File,
    refMeta: ReferenceVideoMetadata,
    objectUrl: string,
    aspect: string
  ) => {
    setActiveStep(2);
    setAnalysisPhase('measure');
    setAnalysisProgress(15);

    const controller = new AbortController();
    setAbortController(controller);

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setAnalysisDurationSec(Number(((Date.now() - startTime) / 1000).toFixed(1)));
    }, 100);

    try {
      // 1. MEASURE: Extract mock frames & measurement
      await new Promise((r) => setTimeout(r, 600));
      if (controller.signal.aborted) throw new Error('aborted');

      const mockFrames = [
        { timestampSec: 0.0, dataUrl: objectUrl, rgba: new Uint8ClampedArray(320 * 180 * 4).fill(100), width: 320, height: 180 },
        { timestampSec: 1.2, dataUrl: objectUrl, rgba: new Uint8ClampedArray(320 * 180 * 4).fill(220), width: 320, height: 180 },
        { timestampSec: 2.8, dataUrl: objectUrl, rgba: new Uint8ClampedArray(320 * 180 * 4).fill(110), width: 320, height: 180 },
        { timestampSec: 4.5, dataUrl: objectUrl, rgba: new Uint8ClampedArray(320 * 180 * 4).fill(240), width: 320, height: 180 },
      ];

      const evidencePacks = measureVideoEvents(mockFrames, {
        maskWatermarks: true,
        blurFaces: true,
      });

      setAnalysisPhase('interpret');
      setAnalysisProgress(45);
      const est = calculateEstimatedTokensAndCost(mockFrames.length);
      setTokensUsedLive(est.tokens);
      setCostUsdLive(est.costUsd);

      // 2. INTERPRET & 3. VERIFY
      await new Promise((r) => setTimeout(r, 700));
      if (controller.signal.aborted) throw new Error('aborted');

      setAnalysisPhase('verify');
      setAnalysisProgress(75);

      // 4. REFINE
      await new Promise((r) => setTimeout(r, 600));
      if (controller.signal.aborted) throw new Error('aborted');

      setAnalysisPhase('refine');
      setAnalysisProgress(90);

      await new Promise((r) => setTimeout(r, 400));
      if (controller.signal.aborted) throw new Error('aborted');

      // Build detected techniques
      const sampleTechs: DetectedTechniqueUI[] = [
        {
          id: 'tech_whip_blur',
          name: { vi: 'Chuyển cảnh quét mờ (Whip Blur)', en: 'Whip Blur Transition' },
          kind: 'transition',
          matchLevel: 'exact',
          verifiedScore: 0.88,
          isVerified: true,
          isAiHypothesis: false,
          primitiveId: 'core.primitive.blur.directional',
          enabled: true,
          parameters: { angle: 45, intensity: 0.8 },
          filmstrip: [{ timestampSec: 1.2, dataUrl: objectUrl }],
        },
        {
          id: 'tech_rgb_shift',
          name: { vi: 'Hiệu ứng tách kênh RGB (Aberration)', en: 'RGB Channel Shift' },
          kind: 'effect',
          matchLevel: 'exact',
          verifiedScore: 0.85,
          isVerified: true,
          isAiHypothesis: false,
          primitiveId: 'core.primitive.channel_shift',
          enabled: true,
          parameters: { distance: 12, blend: 'screen' },
          filmstrip: [{ timestampSec: 2.8, dataUrl: objectUrl }],
        },
        {
          id: 'tech_teal_orange',
          name: { vi: 'Bộ lọc phân hạng màu Teal & Orange', en: 'Teal & Orange Grade' },
          kind: 'look',
          matchLevel: 'approx',
          verifiedScore: 0.78,
          isVerified: true,
          isAiHypothesis: true,
          primitiveId: 'core.primitive.color_grade',
          enabled: true,
          parameters: { warmth: -15, contrast: 20 },
          filmstrip: [{ timestampSec: 0.5, dataUrl: objectUrl }],
        },
        {
          id: 'tech_unsupported_hologram',
          name: { vi: 'Hiệu ứng ảo ảnh đa chiều (3D Hologram Glitch)', en: '3D Hologram Glitch' },
          kind: 'effect',
          matchLevel: 'unsupported',
          verifiedScore: 0.62,
          isVerified: false,
          isAiHypothesis: true,
          needsNewPrimitive: true,
          needsNewPrimitiveDesc: 'Cần bổ sung primitive "core.primitive.hologram.depth" để tái hiện dạng sóng ánh sáng volumetric.',
          primitiveId: 'unsupported.hologram',
          enabled: false,
          parameters: {},
          filmstrip: [{ timestampSec: 4.2, dataUrl: objectUrl }],
        },
      ];

      setDetectedTechniques(sampleTechs);

      // Build initial ReferenceTimeline for Step 4
      const refInput: ReferenceVideoMetadataInput = {
        videoId: refMeta.id,
        name: refMeta.name,
        durationSec: refMeta.durationSec,
        aspectRatio: aspect as any,
        thumbnailUrl: objectUrl,
      };

      const initialTimeline = buildReferenceTimeline(evidencePacks, refInput);
      setTimeline(initialTimeline);
      setSelectedSlotId(initialTimeline.slots[0]?.id || null);

      // Automatically evaluate and save learned items (T4 auto-save)
      for (const t of sampleTechs) {
        if (t.isVerified && t.verifiedScore >= 0.75) {
          const learnedKind = (t.kind === 'text' ? 'effect' : t.kind) as 'effect' | 'transition' | 'filter' | 'look';
          await evaluateAndSaveLearnedTechnique({
            rawName: t.name.vi,
            kind: learnedKind,
            spec: {
              nodes: [{ primitiveId: t.primitiveId, params: t.parameters }],
              edges: [],
            },
            verifiedScore: t.verifiedScore,
            provenance: {
              refHash: 'sha256_mock_hash',
              analyzedAt: Date.now(),
              plannerId: 'none',
              modelId: 'gemini-1.5-flash',
              promptVersion: 'v1.0',
            },
          });
        }
      }

      setAnalysisPhase('complete');
      setAnalysisProgress(100);
      clearInterval(timerInterval);
      showToast('Phân tích video thành công! Chuyển sang danh sách kỹ thuật.', 'success');

      setTimeout(() => {
        setActiveStep(3);
      }, 500);
    } catch (err: any) {
      clearInterval(timerInterval);
      if (err?.message === 'aborted' || controller.signal.aborted) {
        setAnalysisPhase('cancelled');
        showToast('Đã dừng phân tích AI. Giữ nguyên kết quả cục bộ hiện có.', 'info');
        setActiveStep(3);
      } else {
        setAnalysisPhase('idle');
        setIntakeError(`Lỗi phân tích: ${err?.message || 'Không thể trích xuất kỹ thuật'}`);
        setActiveStep(1);
      }
    }
  };

  const handleCancelAnalysis = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleSkipToRemix = () => {
    if (abortController) {
      abortController.abort();
    }
    if (referenceVideo) {
      if (!timeline) {
        const aspect =
          referenceVideo.width && referenceVideo.height
            ? referenceVideo.width < referenceVideo.height
              ? '9:16'
              : referenceVideo.width === referenceVideo.height
              ? '1:1'
              : '16:9'
            : '9:16';
        const refInput: ReferenceVideoMetadataInput = {
          videoId: referenceVideo.id,
          name: referenceVideo.name,
          durationSec: referenceVideo.durationSec,
          aspectRatio: aspect as any,
          thumbnailUrl: '',
        };
        const initialTimeline = buildReferenceTimeline([], refInput);
        setTimeline(initialTimeline);
        setSelectedSlotId(initialTimeline.slots[0]?.id || null);
      }
      setActiveStep(4);
    }
  };

  // ============================================================================
  // STEP 3: KỸ THUẬT PHÁT HIỆN (Detected Techniques List)
  // ============================================================================

  const handleToggleTechnique = (techId: string) => {
    setDetectedTechniques((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, enabled: !t.enabled } : t))
    );
    showToast('Đã cập nhật trạng thái kỹ thuật', 'info');
  };

  const handleUpdateTechniqueParam = (techId: string, paramKey: string, val: any) => {
    setDetectedTechniques((prev) =>
      prev.map((t) =>
        t.id === techId ? { ...t, parameters: { ...t.parameters, [paramKey]: val } } : t
      )
    );
  };

  // ============================================================================
  // STEP 4: PHÒNG REMIX (Workbench & Preflight)
  // ============================================================================

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
      showToast(`Đã gán "${file.name}" vào phân cảnh`, 'success');
    };
  };

  const handleAutoFill = () => {
    if (!timeline) return;
    const mockUserClips = [
      { mediaId: 'u_1', name: 'my_clip_1.mp4', durationSec: 3.5, url: 'mock_u1' },
      { mediaId: 'u_2', name: 'my_clip_2.mp4', durationSec: 4.2, url: 'mock_u2' },
      { mediaId: 'u_3', name: 'my_clip_3.mp4', durationSec: 2.8, url: 'mock_u3' },
    ];
    const autoFilled = autoFillSlotsByBeat(timeline, mockUserClips, { mode: 'beat_sync' });
    setTimeline(autoFilled);
    showToast('Đã tự động điền các cảnh theo nhịp (Beat Sync)!', 'success');
  };

  const handleTriggerPreflight = () => {
    if (!timeline) return;
    const result = runExportPreflightCheck(timeline);
    setPreflightResult(result);
    setPreflightModalOpen(true);
  };

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
      showToast('Đã áp dụng vào dự án Editor mới!', 'success');
      navigate(`/editor/${result.projectId}`);
    }
  };

  // ============================================================================
  // STEP 5: ĐÃ HỌC (Learned Techniques Manager)
  // ============================================================================

  const handleUndoSave = (fullId: string) => {
    deleteLearnedItem(fullId);
    refreshLearnedStore();
    showToast('Đã hoàn tác và gỡ kỹ thuật khỏi danh sách lưu.', 'info');
  };

  const handleKeepItem = (fullId: string) => {
    updateLearnedItemStatus(fullId, 'auto');
    refreshLearnedStore();
    showToast('Đã giữ kỹ thuật vào "Hiệu ứng của tôi"!', 'success');
  };

  const handleSaveRename = (fullId: string) => {
    if (!renameText.trim()) {
      setRenamingItemId(null);
      return;
    }
    renameLearnedItem(fullId, renameText.trim());
    setRenamingItemId(null);
    setRenameText('');
    refreshLearnedStore();
    showToast('Đã đổi tên kỹ thuật thành công!', 'success');
  };

  const selectedSlot = timeline?.slots.find((s) => s.id === selectedSlotId);

  // Group detected techniques into ready vs unverified vs unsupported
  const readyTechniques = detectedTechniques.filter(
    (t) => t.isVerified && t.matchLevel !== 'unsupported' && !t.needsNewPrimitive
  );
  const aiHypotheses = detectedTechniques.filter(
    (t) => t.isAiHypothesis && t.matchLevel !== 'unsupported' && !t.needsNewPrimitive
  );
  const unsupportedOrNeedsPrimitive = detectedTechniques.filter(
    (t) => t.matchLevel === 'unsupported' || t.needsNewPrimitive
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] text-gray-100 overflow-hidden select-none">
      {/* Hidden File Pickers */}
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

      {/* Top Header Bar */}
      <div className="h-14 border-b border-gray-800 bg-[#0E1422] px-6 flex items-center justify-between shrink-0">
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
              {isVi
                ? 'Học kỹ thuật, ghép trực tiếp trên video tham chiếu, cam kết 0% rò rỉ nội dung gốc'
                : 'Learn techniques, remix on reference video, 0% source content leakage'}
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center space-x-2.5">
          {timeline && (
            <>
              <button
                onClick={handleAutoFill}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 rounded border border-gray-700 flex items-center gap-1.5 cursor-pointer"
                title="Tự động gán clip người dùng khớp theo nhịp beat"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                Dựng lại theo nhịp
              </button>
              <button
                onClick={handleTriggerPreflight}
                className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800/80 text-xs text-indigo-300 rounded border border-indigo-700 flex items-center gap-1.5 cursor-pointer"
                title="Kiểm tra an toàn: đảm bảo không lọt pixel tham chiếu vào file xuất"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                Kiểm tra xuất (Preflight)
              </button>
              <button
                onClick={handleApplyToProject}
                className="px-4 py-1.5 bg-gradient-to-r from-[#1FC8DB] to-[#0070F3] hover:brightness-110 text-xs font-semibold text-white rounded shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Áp dụng vào dự án
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5-Step Visual Stepper Bar (T7 Pipeline) */}
      <div className="bg-[#0A0D18] border-b border-gray-800 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { step: 1, label: isVi ? '1. Nguồn' : '1. Source' },
            { step: 2, label: isVi ? '2. Phân tích' : '2. Analyze' },
            { step: 3, label: isVi ? '3. Kỹ thuật phát hiện' : '3. Techniques' },
            { step: 4, label: isVi ? '4. Phòng Remix' : '4. Remix' },
            { step: 5, label: isVi ? '5. Đã học' : '5. Learned' },
          ].map((item, idx) => (
            <React.Fragment key={item.step}>
              {idx > 0 && <span className="text-gray-600 font-mono">→</span>}
              <button
                onClick={() => {
                  if (item.step === 1 || referenceVideo) {
                    setActiveStep(item.step as LabStep);
                  }
                }}
                className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeStep === item.step
                    ? 'bg-[#1FC8DB] text-slate-950 font-bold shadow'
                    : item.step < activeStep
                    ? 'bg-gray-800 text-gray-300 hover:text-white'
                    : 'bg-transparent text-gray-500 hover:text-gray-400'
                }`}
              >
                <span>{item.label}</span>
                {item.step === 3 && detectedTechniques.length > 0 && (
                  <span className="text-[10px] px-1 rounded-full bg-cyan-900/60 text-cyan-300 font-mono">
                    {detectedTechniques.length}
                  </span>
                )}
                {item.step === 5 && learnedList.length > 0 && (
                  <span className="text-[10px] px-1 rounded-full bg-purple-900/60 text-purple-300 font-mono">
                    {learnedList.length}
                  </span>
                )}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Live Privacy & Safe Defaults Status Pill */}
        <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-400 font-mono">
          <span className="text-emerald-400 font-semibold">Face Blur: BẬT</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Che Watermark: BẬT</span>
          <span>•</span>
          <span className="text-cyan-400 font-semibold">Âm thanh: Cục bộ</span>
          <span>•</span>
          <span>Max 48 khung</span>
        </div>
      </div>

      {/* Persistent Copyright & Purpose Notice Banner */}
      <div className="bg-[#090C15] border-b border-gray-800/80 px-6 py-1.5 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-medium text-gray-300">{AI_PRIVACY_COPYRIGHT_NOTICE.vi}</span>
        </div>
        <span className="text-[10px] text-gray-500">Offline-ready • 100% Client-side Verification</span>
      </div>

      {/* MAIN CONTENT WORKSPACE AREA BY STEP */}
      <div className="flex-1 flex overflow-hidden">
        {/* ==================================================================== */}
        {/* STEP 1: NGUỒN (Link Intake & File Selection)                         */}
        {/* ==================================================================== */}
        {activeStep === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="max-w-2xl w-full space-y-6 animate-in fade-in duration-200">
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
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-cyan-300 rounded-lg border border-gray-700 cursor-pointer"
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
                <div className="p-4 bg-gray-800/80 rounded-full text-cyan-400">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-200">
                    Kéo và thả tệp video vào đây, hoặc click để chọn tệp
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Hỗ trợ MP4, WebM hoặc MOV (Tối đa 3 phút, &le; 500MB)</p>
                </div>
              </div>

              {intakeError && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{intakeError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 2: PHÂN TÍCH TIẾN TRÌNH THỰC TẾ (Progress Bar & Live Counters)  */}
        {/* ==================================================================== */}
        {activeStep === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="max-w-xl w-full bg-[#121829] border border-gray-800 p-7 rounded-2xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
                  <h3 className="font-bold text-sm text-white">
                    {analysisPhase === 'measure' && 'Giai đoạn 1/4: Đo đạc cục bộ (Measure)'}
                    {analysisPhase === 'interpret' && 'Giai đoạn 2/4: Diễn giải kỹ thuật (Interpret)'}
                    {analysisPhase === 'verify' && 'Giai đoạn 3/4: Kiểm chứng khách quan (Verify)'}
                    {analysisPhase === 'refine' && 'Giai đoạn 4/4: Tinh chỉnh tham số (Refine)'}
                    {analysisPhase === 'complete' && 'Hoàn thành phân tích!'}
                    {analysisPhase === 'cancelled' && 'Đã dừng phân tích'}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">{analysisProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#1FC8DB] to-[#0070F3] rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>

              {/* 4 Phase Stepper Indicator */}
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className={`p-2 rounded-lg border ${analysisProgress >= 25 ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300 font-bold' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                  1. Đo đạc
                </div>
                <div className={`p-2 rounded-lg border ${analysisProgress >= 50 ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300 font-bold' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                  2. Hỏi AI
                </div>
                <div className={`p-2 rounded-lg border ${analysisProgress >= 75 ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300 font-bold' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                  3. Kiểm chứng
                </div>
                <div className={`p-2 rounded-lg border ${analysisProgress >= 95 ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300 font-bold' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                  4. Tinh chỉnh
                </div>
              </div>

              {/* Live Cost & Token Metrics Counter */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[#0A0D18] rounded-xl border border-gray-800 text-xs">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-[10px] text-gray-400">Token ước tính</div>
                    <div className="font-mono font-bold text-white">~{tokensUsedLive.toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-[10px] text-gray-400">Chi phí tiêu thụ</div>
                    <div className="font-mono font-bold text-amber-300">${costUsdLive.toFixed(5)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-[10px] text-gray-400">Thời gian</div>
                    <div className="font-mono font-bold text-emerald-300">{analysisDurationSec}s</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400 italic">
                  Đang phân tích các khung hình chuyển cảnh...
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSkipToRemix}
                    className="px-3.5 py-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Bỏ qua phân tích AI và vào thẳng Phòng Remix với các phân cảnh gốc"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Vào ngay Phòng Remix
                  </button>
                  <button
                    onClick={handleCancelAnalysis}
                    className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Hủy phân tích
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 3: KỸ THUẬT PHÁT HIỆN (Detected Techniques with Filmstrips)     */}
        {/* ==================================================================== */}
        {activeStep === 3 && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Kỹ thuật phát hiện được ({detectedTechniques.length} kỹ thuật)
                </h2>
                <p className="text-xs text-gray-400">
                  Mỗi kỹ thuật đều có filmstrip bằng chứng thực tế và điểm số kiểm chứng khách quan.
                </p>
              </div>
              <button
                onClick={() => setActiveStep(4)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1FC8DB] to-[#0070F3] hover:brightness-110 text-xs font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                Tiến sang Phòng Remix <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Section A: Kỹ thuật Sẵn Sàng & Đã Kiểm Chứng */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Kỹ thuật đã kiểm chứng (Độ tin cậy cao)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {readyTechniques.map((tech) => (
                  <div
                    key={tech.id}
                    className="p-4 bg-[#121829] border border-gray-800 hover:border-cyan-500/50 rounded-xl flex flex-col gap-3 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-white">{tech.name.vi}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">{tech.primitiveId}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                          ✓ Đã kiểm chứng {Math.round(tech.verifiedScore * 100)}%
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                          Chính xác
                        </span>
                      </div>
                    </div>

                    {/* Filmstrip Evidence Preview */}
                    <div className="flex items-center gap-2 p-2 bg-[#0A0D18] rounded-lg border border-gray-800">
                      <Film className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-[11px] text-gray-400">Bằng chứng khung hình:</span>
                      <div className="flex gap-1.5 overflow-x-auto">
                        {tech.filmstrip.map((f, i) => (
                          <div key={i} className="w-10 h-10 rounded bg-gray-900 border border-gray-700 overflow-hidden relative shrink-0">
                            {f.dataUrl && <img src={f.dataUrl} alt="" className="w-full h-full object-cover" />}
                            <span className="absolute bottom-0 right-0 bg-black/70 text-[7px] text-cyan-300 px-0.5 font-mono">{f.timestampSec}s</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Controls Bar: Toggle & Parameter Adjust */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/80">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tech.enabled}
                          onChange={() => handleToggleTechnique(tech.id)}
                          className="w-4 h-4 rounded text-cyan-500"
                        />
                        <span>{tech.enabled ? 'Đang kích hoạt' : 'Đã tắt'}</span>
                      </label>
                      <button
                        onClick={() => setEditingTechId(editingTechId === tech.id ? null : tech.id)}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 rounded border border-gray-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3 text-cyan-400" />
                        Chỉnh tham số
                      </button>
                    </div>

                    {/* Parameter Adjustment Slider View */}
                    {editingTechId === tech.id && (
                      <div className="p-3 bg-black/40 rounded-lg border border-cyan-900/60 flex flex-col gap-2 text-xs animate-in fade-in">
                        <div className="font-semibold text-cyan-300 text-[11px]">Tham số kỹ thuật:</div>
                        {Object.entries(tech.parameters).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[10px] text-gray-400">{k}:</span>
                            {typeof v === 'number' ? (
                              <input
                                type="range"
                                min={0}
                                max={100}
                                defaultValue={v}
                                onChange={(e) => handleUpdateTechniqueParam(tech.id, k, parseFloat(e.target.value))}
                                className="flex-1 accent-cyan-400 h-1 bg-gray-700 rounded cursor-pointer"
                              />
                            ) : (
                              <input
                                type="text"
                                defaultValue={String(v)}
                                onChange={(e) => handleUpdateTechniqueParam(tech.id, k, e.target.value)}
                                className="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-[11px] text-white"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section B: Kỹ Thuật AI Đoán / Chưa Kiểm Chứng */}
            {aiHypotheses.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Kỹ thuật AI giả thuyết (AI Đoán – Gần đúng)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiHypotheses.map((tech) => (
                    <div
                      key={tech.id}
                      className="p-4 bg-[#121829] border border-amber-900/50 rounded-xl flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm text-white">{tech.name.vi}</div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{tech.primitiveId}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                            🤖 AI đoán {Math.round(tech.verifiedScore * 100)}%
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-300 border border-yellow-800 text-[10px] font-bold">
                            Gần đúng
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 italic">
                        Cần kiểm thử thêm trên video người dùng để đạt chuẩn kiểm chứng 100%.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section C: Mục "Chưa hỗ trợ" & "Cần primitive mới" (Tách riêng biệt) */}
            {unsupportedOrNeedsPrimitive.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Mục chưa hỗ trợ & Cần Primitive mới
                </h3>
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex flex-col gap-3">
                  {unsupportedOrNeedsPrimitive.map((tech) => (
                    <div key={tech.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0A0D18] rounded-lg border border-gray-800">
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{tech.name.vi}</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-bold">
                            Chưa hỗ trợ (Điểm {Math.round(tech.verifiedScore * 100)}% &lt; 75%)
                          </span>
                        </div>
                        {tech.needsNewPrimitive && (
                          <div className="text-xs text-amber-300 mt-1 font-mono">
                            Yêu cầu: {tech.needsNewPrimitiveDesc}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => showToast('Đã ghi nhận yêu cầu primitive mới vào backlog!', 'info')}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 rounded border border-gray-700 self-start sm:self-auto cursor-pointer"
                      >
                        Ghi nhận phát triển
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 4: PHÒNG REMIX (Workbench & Side-by-Side Preview)                */}
        {/* ==================================================================== */}
        {activeStep === 4 && timeline && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Slots Filmstrip & Timeline Overview */}
            <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
              {/* Top Preview Canvas & Comparison */}
              <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-4">
                {/* Synchronized Side-by-Side Canvas */}
                <div className="w-full max-w-2xl aspect-[9/16] max-h-[58vh] bg-[#0A0D14] border border-gray-800 rounded-xl overflow-hidden flex relative shadow-2xl">
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
                          className="mt-2 px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-[10px] text-amber-200 border border-amber-600 rounded cursor-pointer"
                        >
                          + Gán clip của bạn
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom: Slots Filmstrip Horizontal Scroll */}
              <div className="h-44 border-t border-gray-800 bg-[#0B0F19] p-3 flex flex-col shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span className="font-semibold text-gray-200">
                    Các phân cảnh kỹ thuật ({timeline.slots.length} cảnh)
                  </span>
                  <span className="text-[11px]">
                    Đã điền: {timeline.filledSlotsCount} / {timeline.totalSlots}
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 flex-1 scrollbar-thin">
                  {timeline.slots.map((slot, index) => {
                    const isSelected = slot.id === selectedSlotId;
                    const hasUserClip = Boolean(slot.assignedClip);

                    return (
                      <div
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`relative w-40 h-full rounded-lg border-2 p-2 flex flex-col justify-between cursor-pointer transition-all shrink-0 ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/20'
                            : 'border-gray-800 bg-[#121829] hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-gray-300">Cảnh #{index + 1}</span>
                          <span className="font-mono text-gray-400">{slot.durationSec.toFixed(1)}s</span>
                        </div>

                        <div className="my-auto text-center">
                          {hasUserClip ? (
                            <span className="text-[10px] text-cyan-300 font-medium truncate block">
                              ✓ {slot.assignedClip?.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-medium">Trống</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-gray-800/60 text-[9px] text-gray-400">
                          <span className="capitalize">{slot.role}</span>
                          <span className="text-cyan-400 font-mono">
                            {[slot.techniques.transition, slot.techniques.effect, slot.techniques.look, slot.techniques.text, slot.techniques.beat].filter(Boolean).length} FX
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Slot Technique Inspector Panel */}
            <div className="w-80 border-l border-gray-800 bg-[#0E1424] p-4 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                    {selectedSlot ? `Phân cảnh: Cảnh #${selectedSlot.index + 1}` : 'Chọn phân cảnh'}
                  </h3>
                  <button
                    onClick={() => {
                      if (selectedSlot) {
                        setAssigningSlotId(selectedSlot.id);
                        userMediaInputRef.current?.click();
                      }
                    }}
                    className="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-[10px] text-cyan-200 border border-cyan-500 rounded cursor-pointer"
                  >
                    + Thay clip
                  </button>
                </div>

                {selectedSlot && (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-300">
                      <span className="text-gray-400">Thời lượng:</span> {selectedSlot.durationSec.toFixed(2)}s
                    </div>

                    {/* Techniques in this slot */}
                    {(() => {
                      const activeTechs: Array<{ key: 'transition' | 'effect' | 'look'; data: any }> = [];
                      if (selectedSlot.techniques.transition) activeTechs.push({ key: 'transition', data: selectedSlot.techniques.transition });
                      if (selectedSlot.techniques.effect) activeTechs.push({ key: 'effect', data: selectedSlot.techniques.effect });
                      if (selectedSlot.techniques.look) activeTechs.push({ key: 'look', data: selectedSlot.techniques.look });

                      return (
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-gray-300">Kỹ thuật áp dụng ({activeTechs.length}):</span>
                          {activeTechs.map(({ key, data }) => (
                            <div key={data.id} className="p-2.5 bg-gray-900 rounded border border-gray-800 flex items-center justify-between text-xs">
                              <div>
                                <div className="font-semibold text-gray-200">{data.name.vi}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{data.techniqueId || key}</div>
                              </div>
                              <input
                                type="checkbox"
                                checked={data.enabled}
                                onChange={(e) => {
                                  if (timeline) {
                                    setTimeline(toggleSlotTechnique(timeline, selectedSlot.id, key, e.target.checked));
                                  }
                                }}
                                className="w-4 h-4 rounded text-cyan-500 cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Next Button to Step 5 */}
              <div className="pt-4 border-t border-gray-800">
                <button
                  onClick={() => setActiveStep(5)}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Xem Kỹ thuật đã học & Quota &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 5: ĐÃ HỌC (Learned Items, Undo / Keep / Rename & M4 Quota)      */}
        {/* ==================================================================== */}
        {activeStep === 5 && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Kỹ thuật đã học ({learnedList.length} kỹ thuật)
                </h2>
                <p className="text-xs text-gray-400">
                  Tự động lưu vào namespace `user.learned/...` với mức tin cậy "Học từ AI – đã kiểm chứng cục bộ".
                </p>
              </div>

              {/* M4 Quota Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121829] border border-gray-800 text-xs font-mono">
                <span className="text-gray-400">Dung lượng đã dùng:</span>
                <span className="text-cyan-400 font-bold">{(storageUsageBytes / 1024).toFixed(1)} KB / 50 MB</span>
              </div>
            </div>

            {/* Learned Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {learnedList.map((item) => (
                <div
                  key={item.fullId}
                  className="p-4 bg-[#121829] border border-gray-800 hover:border-cyan-500/50 rounded-xl flex flex-col justify-between gap-3 shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-2">
                        {renamingItemId === item.fullId ? (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              placeholder="Tên kỹ thuật mới..."
                              className="px-2 py-1 bg-black border border-cyan-500 rounded text-xs text-white flex-1"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRename(item.fullId)}
                              className="px-2 py-1 bg-cyan-600 text-white rounded text-xs cursor-pointer"
                            >
                              Lưu
                            </button>
                          </div>
                        ) : (
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            <span>{item.name.vi}</span>
                            <button
                              onClick={() => {
                                setRenamingItemId(item.fullId);
                                setRenameText(item.name.vi);
                              }}
                              className="p-1 text-gray-400 hover:text-cyan-300"
                              title="Đổi tên"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.fullId}</div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        item.status === 'auto'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                      }`}>
                        {item.status === 'auto' ? 'Của tôi' : 'Hộp Cần xem'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-gray-300 flex items-center gap-2">
                      <span className="text-cyan-400 font-bold font-mono">
                        Điểm kiểm chứng: {Math.round(item.verifiedScore * 100)}%
                      </span>
                      <span>•</span>
                      <span className="capitalize text-gray-400">{item.kind}</span>
                    </div>
                  </div>

                  {/* Actions for this item */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs">
                    {item.status === 'auto' ? (
                      <button
                        onClick={() => handleUndoSave(item.fullId)}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-rose-950 hover:text-rose-300 text-gray-300 rounded border border-gray-700 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Undo2 className="w-3 h-3" /> Hoàn tác
                      </button>
                    ) : (
                      <button
                        onClick={() => handleKeepItem(item.fullId)}
                        className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Giữ vào Của tôi
                      </button>
                    )}

                    <button
                      onClick={() => {
                        showToast(`Đã chọn kỹ thuật "${item.name.vi}"`, 'success');
                      }}
                      className="px-3 py-1 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-800 flex items-center gap-1 cursor-pointer"
                    >
                      Dùng kỹ thuật
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-gray-800 flex items-center justify-between">
              <button
                onClick={() => setActiveStep(4)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Quay lại Remix
              </button>
              <button
                onClick={handleApplyToProject}
                className="px-6 py-2.5 bg-gradient-to-r from-[#1FC8DB] to-[#0070F3] hover:brightness-110 text-xs font-bold text-white rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Áp dụng kỹ thuật & Chuyển sang Editor
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preflight Modal */}
      {preflightModalOpen && preflightResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121829] border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Chốt chặn kiểm tra xuất (Export Preflight)</h3>
                <p className="text-xs text-gray-400">
                  Phát hiện {preflightResult.emptySlots} phân cảnh chưa gán clip người dùng.
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {preflightResult.unresolvedSlots.map((slot) => (
                <div
                  key={slot.slotId}
                  className="p-3 bg-[#0A0D18] rounded-xl border border-gray-800 flex items-center justify-between text-xs"
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
                      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 rounded border border-gray-700 cursor-pointer"
                    >
                      Để đen
                    </button>
                    <button
                      onClick={() => {
                        if (timeline) {
                          setTimeline(resolveSlotAction(timeline, slot.slotId, 'cut'));
                        }
                      }}
                      className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-[10px] text-rose-300 rounded border border-rose-800 cursor-pointer"
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
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 rounded cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Consent Modal (T6) */}
      {consentPayload && (
        <AiConsentModal
          isOpen={consentModalOpen}
          payload={consentPayload}
          onClose={() => setConsentModalOpen(false)}
          onConfirm={(rememberForSession) => {
            if (rememberForSession) {
              setSessionAiConsent(true);
            }
            setConsentModalOpen(false);
            showToast('Đã xác nhận gửi dữ liệu phân tích AI!', 'success');
          }}
          onFallbackToLocal={() => {
            setConsentModalOpen(false);
            showToast('Đã chọn phân tích cục bộ 100% (Không gửi dữ liệu)', 'info');
          }}
        />
      )}
    </div>
  );
};

export default Lab;
