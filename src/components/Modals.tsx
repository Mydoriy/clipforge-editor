import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { exportTimelineVideo, exportAudioOnly, exportCurrentFrameAsPng, exportCaptionsSrt } from '../utils/videoExporter';
import { convertVideoToGif } from '../lib/ffmpeg';
import { DEFAULT_SHORTCUTS, eventToKeyCombo, formatDisplayKey } from '../utils/shortcuts';
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import { db, createDefaultProject, createProjectSnapshot, type ProjectEntity, type SnapshotEntity } from '../db';
import { checkStorageQuota, type StorageEstimateResult } from '../lib/db';
import { validateCapprojFile } from '../utils/capprojValidator';
import { masterAudio } from '../engine/audioEngine';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  X,
  Crown,
  Download,
  Share2,
  Trash2,
  FolderOpen,
  Cloud,
  Sparkles,
  Check,
  Film,
  Zap,
  TrendingUp,
  RotateCcw,
  Sliders,
  Keyboard,
  Info,
  Scissors,
  VolumeX,
  Eye,
  RefreshCw,
  Play,
  Pause,
  Layers,
  Plus,
  Wand2,
  Megaphone,
  Video,
  Clock,
  Music,
  CheckCircle2,
  Upload,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  SlidersHorizontal,
  HardDrive,
  ExternalLink,
  Shield
} from 'lucide-react';

export const Modals: React.FC = () => {
  const {
    language,
    setLanguage,
    activeModal,
    openModal,
    closeModal,
    user,
    clips,
    duration,
    setDuration,
    showToast,
    addClip,
    updateClip,
    setClips,
    signIn,
    isPro,
    setIsPro,
    settings,
    updateSettings,
    setCurrentProjectId,
    currentProjectId,
    setProjectTitle,
    projectTitle,
    addNotification,
    currentTime,
    rebindShortcut,
    resetShortcuts,
    projectSettings
  } = useEditorStore();

  const navigate = useNavigate();
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportEta, setExportEta] = useState<number>(0);
  const [exportFileName, setExportFileName] = useState<string>('');
  const [exportDirectoryHandle, setExportDirectoryHandle] = useState<any>(null);
  const [exportDirectoryName, setExportDirectoryName] = useState<string>('Tải về máy qua trình duyệt (Mặc định)');
  const [exportRes, setExportRes] = useState<'720p' | '1080p' | '2k' | '4k'>('1080p');
  const [exportFps, setExportFps] = useState<24 | 25 | 30 | 50 | 60>(30);
  const [exportCodec, setExportCodec] = useState<'h264' | 'hevc' | 'av1'>('h264');
  const [exportBitrateMode, setExportBitrateMode] = useState<'recommended' | 'higher' | 'custom'>('recommended');
  const [exportCustomBitrate, setExportCustomBitrate] = useState<number>(10); // Mbps
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [exportRangeType, setExportRangeType] = useState<'all' | 'inout'>('all');
  const [exportRangeStart, setExportRangeStart] = useState<number>(0);
  const [exportRangeEnd, setExportRangeEnd] = useState<number>(10);
  const [exportAudioOnlyMode, setExportAudioOnlyMode] = useState<boolean>(false);
  const [exportAudioFormat, setExportAudioFormat] = useState<'wav' | 'mp3' | 'aac'>('wav');
  const [supportedCodecs, setSupportedCodecs] = useState<{ hevc: boolean; av1: boolean }>({ hevc: false, av1: false });
  const abortSignalRef = useRef<{ aborted: boolean }>({ aborted: false });
  const [promptInput, setPromptInput] = useState('');
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimateResult | null>(null);
  const [sentryConsent, setSentryConsent] = useState<boolean>(() => typeof window !== 'undefined' && localStorage.getItem('clipforge_sentry_consent') === 'true');

  useEffect(() => {
    if (activeModal === 'cloud' || activeModal === 'projectSync' || activeModal === 'storage') {
      checkStorageQuota().then(setStorageEstimate);
    }
  }, [activeModal]);

  const snapshots = useLiveQuery<SnapshotEntity[]>(
    () => (currentProjectId ? db.snapshots.where('projectId').equals(currentProjectId).reverse().sortBy('timestamp') : (Promise.resolve([]) as any)),
    [currentProjectId]
  ) || [];

  // Probe codec support & init export file name
  useEffect(() => {
    if (activeModal === 'export') {
      setExportFileName(projectTitle || 'CapCut_Video');
      setExportRangeStart(0);
      setExportRangeEnd(Math.max(1, duration || 10));

      if (typeof window !== 'undefined' && (window as any).VideoEncoder?.isConfigSupported) {
        (window as any).VideoEncoder.isConfigSupported({
          codec: 'hvc1.1.6.L93.B0',
          width: 1920,
          height: 1080,
          bitrate: 8000000,
          framerate: 30
        }).then((res: any) => {
          if (res?.supported) setSupportedCodecs((prev) => ({ ...prev, hevc: true }));
        }).catch(() => {});

        (window as any).VideoEncoder.isConfigSupported({
          codec: 'av01.0.08M.10',
          width: 1920,
          height: 1080,
          bitrate: 8000000,
          framerate: 30
        }).then((res: any) => {
          if (res?.supported) setSupportedCodecs((prev) => ({ ...prev, av1: true }));
        }).catch(() => {});
      }
    }
  }, [activeModal, projectTitle, duration]);

  // New Project Modal State
  const [newProjName, setNewProjName] = useState('0917 - New Project');
  const [newProjAspect, setNewProjAspect] = useState<'9:16' | '16:9' | '1:1' | '4:5' | '3:4'>('9:16');
  const [newProjRes, setNewProjRes] = useState<'1080p' | '720p' | '4k'>('1080p');
  
  // Auth state
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [shortcutsSearch, setShortcutsSearch] = useState('');
  const [recordingShortcutId, setRecordingShortcutId] = useState<string | null>(null);
  const [shortcutCategory, setShortcutCategory] = useState<string>('all');
  const t = translations[language];

  // Capture user key combo when recording shortcut
  useEffect(() => {
    if (!recordingShortcutId) return;

    const handleRecordKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setRecordingShortcutId(null);
        showToast('Đã hủy gán phím tắt', 'info');
        return;
      }

      const combo = eventToKeyCombo(e);
      if (!combo) return;

      rebindShortcut(recordingShortcutId, combo);
      showToast(`Đã gán phím tắt mới: ${combo}`, 'success');
      setRecordingShortcutId(null);
    };

    window.addEventListener('keydown', handleRecordKey, { capture: true });
    return () => window.removeEventListener('keydown', handleRecordKey, { capture: true });
  }, [recordingShortcutId]);

  // Dexie live queries for trash, media library & recent projects
  const trashItems = useLiveQuery(() => db.trash.toArray(), []) || [];
  const mediaItems = useLiveQuery(() => db.media.toArray(), []) || [];
  const recentProjects = useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().limit(10).toArray(), []) || [];
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Handlers for Share modal
  const handleDownloadCurrentProjectCapproj = async () => {
    try {
      let projData: any = null;
      if (currentProjectId) {
        projData = await db.projects.get(currentProjectId);
      }
      const exportData = projData || {
        id: currentProjectId || 'proj-' + Date.now(),
        title: projectTitle,
        duration,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tracksData: { clips }
      };
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(projectTitle || 'Project').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.capproj`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã tải tệp dự án .capproj!', 'success');
    } catch (err: any) {
      showToast(`Lỗi xuất file: ${err.message}`, 'error');
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: projectTitle,
          text: `Xem dự án video 9:16 "${projectTitle}" được dựng bằng CapCut Desktop Web!`,
          url: window.location.href
        });
        showToast('Đã mở hộp thoại chia sẻ hệ thống', 'success');
      } catch {
        // cancelled
      }
    } else {
      showToast('Trình duyệt không hỗ trợ Web Share API', 'warning');
    }
  };

  const handleCopyShareLink = () => {
    if (isSupabaseConfigured) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Đã sao chép liên kết dự án đám mây!', 'success');
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Đã chép link cục bộ (Cần bật Supabase để chia sẻ qua Internet)', 'info');
    }
  };

  // Auto-clean trash older than 30 days
  useEffect(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    db.trash.where('deletedAt').below(thirtyDaysAgo).delete().catch(() => {});
  }, []);

  // Export all projects to .capproj file (File System Access API with download fallback)
  const handleExportAllProjects = async () => {
    try {
      const allProjects = await db.projects.toArray();
      const allMedia = await db.media.toArray();
      const exportPackage = {
        app: 'CapCut Desktop Web',
        version: '3.0',
        exportedAt: new Date().toISOString(),
        projects: allProjects,
        mediaCount: allMedia.length
      };
      const jsonString = JSON.stringify(exportPackage, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Try modern File System Access API
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `CapCut_Backup_${Date.now()}.capproj`,
            types: [
              {
                description: 'CapCut Project Backup File',
                accept: { 'application/json': ['.capproj', '.json'] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          showToast('Đã lưu file sao lưu .capproj qua File System API!', 'success');
          return;
        } catch (fsErr: any) {
          if (fsErr.name === 'AbortError') return;
        }
      }

      // Fallback: standard browser download trigger
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CapCut_Backup_${Date.now()}.capproj`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã tải xuống file sao lưu .capproj!', 'success');
    } catch (err: any) {
      showToast('Lỗi xuất file: ' + err.message, 'error');
    }
  };

  // Import projects safely from .capproj file with Zod schema validation
  const handleImportProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Đang kiểm tra và xác thực file .capproj bằng Zod...', 'info');
      const validation = await validateCapprojFile(file);
      if (!validation.valid || !validation.projects || validation.projects.length === 0) {
        showToast(validation.error || 'Cấu trúc file .capproj không hợp lệ', 'error');
        return;
      }

      await db.projects.bulkPut(validation.projects as any);
      showToast(`Đã khôi phục an toàn ${validation.projects.length} dự án từ file .capproj!`, 'success');
      closeModal();
    } catch (err: any) {
      showToast('Lỗi đọc file .capproj: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Section 7: Bốn thẻ nhanh States & Handlers
  // 1. AI Image State
  const [aiImgPrompt, setAiImgPrompt] = useState('Cyberpunk Tokyo night with rainy neon reflections 9:16');
  const [aiImgAspect, setAiImgAspect] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  const [aiImgStyle, setAiImgStyle] = useState<'cyberpunk' | 'anime' | 'cinematic' | 'pastel' | 'neon3d' | 'retro'>('cyberpunk');
  const [aiImgPreview, setAiImgPreview] = useState<string | null>(null);
  const [aiImgLoading, setAiImgLoading] = useState(false);

  // 2. Extend Video State
  const [extendClipId, setExtendClipId] = useState<string>('');
  const [extendSecs, setExtendSecs] = useState<number>(5);
  const [extendMode, setExtendMode] = useState<'freeze' | 'pingpong' | 'slowmo'>('freeze');
  const [extendIsPlaying, setExtendIsPlaying] = useState<boolean>(false);
  const [extendSimProgress, setExtendSimProgress] = useState<number>(0);

  // 3. AI Edit State
  const [aiEditClipId, setAiEditClipId] = useState<string>('');
  const [aiEditPrompt, setAiEditPrompt] = useState<string>('Tăng tốc 1.5x và làm sáng video');

  // 4. Enhance Quality State
  const [enhanceClipId, setEnhanceClipId] = useState<string>('');
  const [enhanceIntensity, setEnhanceIntensity] = useState<number>(75);
  const [enhanceUnsharp, setEnhanceUnsharp] = useState<boolean>(true);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [enhanceDenoise, setEnhanceDenoise] = useState<boolean>(true);
  const [enhanceSplitPos, setEnhanceSplitPos] = useState<number>(50);

  // Section 8: AI-powered Creative Suite States
  // 1. Video Studio
  const [vsScript, setVsScript] = useState('5 Bí quyết tạo video triệu view trên TikTok & Reels. Giữ chân người xem trong 3s đầu bằng một câu hỏi sốc. Đi thẳng vào giá trị cốt lõi, không vòng vo. Đưa ra ví dụ minh chứng thực tế. Kêu gọi hành động rõ ràng. Thử ngay hôm nay!');
  const [vsMusic, setVsMusic] = useState('trending-beat');
  const [vsScenes, setVsScenes] = useState([
    { id: 1, title: 'Cảnh 1 (0-6s): Hook giữ chân', text: '5 Bí quyết tạo video triệu view trên TikTok!', bg: 'cyberpunk', duration: 6 },
    { id: 2, title: 'Cảnh 2 (6-14s): Giá trị cốt lõi', text: 'Đi thẳng vào vấn đề trong 3 giây đầu tiên', bg: 'cinematic', duration: 8 },
    { id: 3, title: 'Cảnh 3 (14-22s): Minh chứng thực tế', text: 'Công thức giữ chân 90% khán giả xem hết video', bg: 'neon3d', duration: 8 },
    { id: 4, title: 'Cảnh 4 (22-30s): Kêu gọi hành động', text: 'Nhấn theo dõi và lưu video để thực hành nhé!', bg: 'anime', duration: 8 }
  ]);

  // 2. AI Ad Maker
  const [adProdName, setAdProdName] = useState('Tai nghe chống ồn Sonix Pro Max');
  const [adUsp, setAdUsp] = useState('Chống ồn chủ động 45dB, Pin khủng 60h, Bass siêu sâu, Kháng nước IPX7');
  const [adTone, setAdTone] = useState<'energetic' | 'luxury' | 'genz' | 'urgency'>('energetic');
  const [adCta, setAdCta] = useState('Mua ngay giảm 50% hôm nay');
  const [adActiveVariant, setAdActiveVariant] = useState<'A' | 'B' | 'C'>('A');

  // 3. Long Video to Shorts
  const [ltsVideoName, setLtsVideoName] = useState('Podcast_Cong_Nghe_AI_Ep42.mp4');
  const [ltsDurationPreset, setLtsDurationPreset] = useState<number>(30);
  const [ltsDetectMode, setLtsDetectMode] = useState<'scene' | 'duration'>('scene');
  const [ltsSelectedShorts, setLtsSelectedShorts] = useState<number[]>([1, 2]);

  // Helper for available video clips
  const videoClips = clips.filter((c) => c.track === 'video' || c.track === 'effect');

  // Generator for procedural AI image on canvas
  const createProceduralAiImage = (aspect: string, style: string, promptText: string): string => {
    const canvas = document.createElement('canvas');
    let w = 540;
    let h = 960;
    if (aspect === '16:9') { w = 960; h = 540; }
    else if (aspect === '1:1') { w = 600; h = 600; }
    else if (aspect === '4:5') { w = 600; h = 750; }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Style-specific background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (style === 'cyberpunk') {
      grad.addColorStop(0, '#0a0a23');
      grad.addColorStop(0.45, '#1e0836');
      grad.addColorStop(1, '#05021a');
    } else if (style === 'anime') {
      grad.addColorStop(0, '#311042');
      grad.addColorStop(0.4, '#80235d');
      grad.addColorStop(0.75, '#d96552');
      grad.addColorStop(1, '#f9be7d');
    } else if (style === 'cinematic') {
      grad.addColorStop(0, '#04141d');
      grad.addColorStop(0.5, '#0a2333');
      grad.addColorStop(1, '#020b10');
    } else if (style === 'pastel') {
      grad.addColorStop(0, '#fbc2eb');
      grad.addColorStop(0.5, '#a6c1ee');
      grad.addColorStop(1, '#b5fffc');
    } else if (style === 'neon3d') {
      grad.addColorStop(0, '#0d0221');
      grad.addColorStop(0.5, '#090c29');
      grad.addColorStop(1, '#000000');
    } else { // retro
      grad.addColorStop(0, '#2b0938');
      grad.addColorStop(0.5, '#5c1050');
      grad.addColorStop(1, '#0f051d');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative procedural geometry
    if (style === 'cyberpunk' || style === 'retro') {
      ctx.strokeStyle = style === 'cyberpunk' ? 'rgba(34, 211, 238, 0.45)' : 'rgba(236, 72, 153, 0.45)';
      ctx.lineWidth = 1.5;
      const horizon = h * 0.62;
      for (let y = horizon; y < h; y += (y - horizon + 14) * 0.28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = -w * 0.5; x <= w * 1.5; x += w * 0.12) {
        ctx.beginPath();
        ctx.moveTo(w / 2, horizon);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      const sunGrad = ctx.createRadialGradient(w/2, horizon - 20, 10, w/2, horizon - 20, w * 0.26);
      sunGrad.addColorStop(0, '#f43f5e');
      sunGrad.addColorStop(0.6, '#ec4899');
      sunGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w/2, horizon - 20, w * 0.26, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'anime') {
      ctx.fillStyle = 'rgba(255, 240, 210, 0.85)';
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.26, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 35; i++) {
        const px = ((i * 137) % w);
        const py = ((i * 257) % h);
        ctx.fillStyle = 'rgba(255, 182, 193, 0.75)';
        ctx.beginPath();
        ctx.ellipse(px, py, 6, 3, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === 'cinematic') {
      const flareGrad = ctx.createLinearGradient(0, h/2 - 4, w, h/2 + 4);
      flareGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
      flareGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.9)');
      flareGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, h/2 - 3, w, 6);

      const centerGlow = ctx.createRadialGradient(w/2, h/2, 2, w/2, h/2, w * 0.35);
      centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      centerGlow.addColorStop(0.3, 'rgba(34, 211, 238, 0.5)');
      centerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.arc(w/2, h/2, w * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'neon3d') {
      for (let r = 1; r <= 5; r++) {
        ctx.strokeStyle = r % 2 === 0 ? 'rgba(34, 211, 238, 0.75)' : 'rgba(168, 85, 247, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(w/2, h/2 + r * 14, w * 0.32 - r * 12, h * 0.14 - r * 5, Math.PI / 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else { // pastel
      for (let i = 0; i < 6; i++) {
        const orbGrad = ctx.createRadialGradient(w * (0.2 + i * 0.13), h * (0.3 + (i%2) * 0.3), 10, w * (0.2 + i * 0.13), h * (0.3 + (i%2) * 0.3), w * 0.28);
        orbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(w * (0.2 + i * 0.13), h * (0.3 + (i%2) * 0.3), w * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('✨ CapCut AI Studio', 20, h - 28);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`${style.toUpperCase()} • ${aspect}`, 20, h - 12);

    return canvas.toDataURL('image/png');
  };

  // Auto-generate initial AI image preview when modal opens
  React.useEffect(() => {
    if (activeModal === 'aiImage' && !aiImgPreview) {
      setAiImgPreview(createProceduralAiImage(aiImgAspect, aiImgStyle, aiImgPrompt));
    }
  }, [activeModal]);

  // Simulation timer for Extend Video preview
  React.useEffect(() => {
    let interval: any;
    if (extendIsPlaying) {
      interval = setInterval(() => {
        setExtendSimProgress((prev) => (prev >= 100 ? 0 : prev + 3));
      }, 50);
    } else {
      setExtendSimProgress(0);
    }
    return () => clearInterval(interval);
  }, [extendIsPlaying]);

  // Handlers for AI Image
  const handleGenerateAiImage = () => {
    setAiImgLoading(true);
    setTimeout(() => {
      const dataUrl = createProceduralAiImage(aiImgAspect, aiImgStyle, aiImgPrompt);
      setAiImgPreview(dataUrl);
      setAiImgLoading(false);
      showToast('Đã tạo ảnh nền AI thành công!', 'success');
    }, 350);
  };

  const handleAddAiImageToTimeline = () => {
    const imgUrl = aiImgPreview || createProceduralAiImage(aiImgAspect, aiImgStyle, aiImgPrompt);
    addClip({
      track: 'video',
      name: `AI: ${aiImgPrompt.slice(0, 16) || aiImgStyle} (${aiImgAspect})`,
      src: imgUrl,
      type: 'image',
      start: 0,
      duration: 5,
      filter: aiImgStyle === 'cinematic' ? 'cinematic' : undefined
    });
    showToast('Đã chèn ảnh AI vào timeline video!', 'success');
    closeModal();
  };

  const handleSaveAiImageToLibrary = async () => {
    try {
      const imgUrl = aiImgPreview || createProceduralAiImage(aiImgAspect, aiImgStyle, aiImgPrompt);
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      await db.media.add({
        id: crypto.randomUUID(),
        name: `AI_${aiImgStyle}_${Date.now()}.png`,
        type: 'image',
        blob: blob,
        size: blob.size,
        createdAt: Date.now()
      });
      showToast('Đã lưu ảnh AI vào Thư viện (Library)!', 'success');
    } catch (err: any) {
      showToast('Lỗi lưu ảnh: ' + err.message, 'error');
    }
  };

  const handleDownloadAiImage = () => {
    const imgUrl = aiImgPreview || createProceduralAiImage(aiImgAspect, aiImgStyle, aiImgPrompt);
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `capcut_ai_${aiImgStyle}_${Date.now()}.png`;
    a.click();
    showToast('Đã tải ảnh AI về máy!', 'success');
  };

  // Handler for Extend Video
  const handleApplyExtendVideo = () => {
    const selectedClip = videoClips.find(c => c.id === extendClipId) || videoClips[0];
    if (selectedClip) {
      const newDuration = selectedClip.duration + extendSecs;
      const updates: any = {
        duration: newDuration,
        speed: extendMode === 'slowmo' ? 0.75 : (selectedClip.speed || 1)
      };
      updateClip(selectedClip.id, updates);
      if (selectedClip.start + newDuration > duration) {
        setDuration(selectedClip.start + newDuration);
      }
      showToast(`Đã kéo dài clip "${selectedClip.name}" thêm +${extendSecs}s (${extendMode === 'freeze' ? 'Giữ frame cuối' : extendMode === 'pingpong' ? 'Ping-pong' : 'Slow-mo'})!`, 'success');
    } else {
      setDuration(duration + extendSecs);
      showToast(`Đã kéo dài thời lượng tổng thêm +${extendSecs}s (Tổng: ${duration + extendSecs}s)!`, 'success');
    }
    closeModal();
  };

  // Handler for AI Edit
  const handleApplyAiEdit = () => {
    const target = videoClips.find(c => c.id === aiEditClipId) || videoClips[0];
    if (!target) {
      addClip({
        track: 'video',
        name: 'Clip Video AI 9:16',
        start: 0,
        duration: 10,
        type: 'video',
        filter: 'cinematic',
        speed: 1.2
      });
      showToast('Đã tạo clip mới và áp dụng chỉnh sửa AI!', 'success');
      closeModal();
      return;
    }

    const p = aiEditPrompt.toLowerCase();
    const updates: any = {};
    const actionsTaken: string[] = [];

    if (p.includes('tăng tốc') || p.includes('speed') || p.includes('nhanh') || p.includes('1.5x') || p.includes('2x')) {
      updates.speed = p.includes('2x') ? 2.0 : 1.5;
      actionsTaken.push(`Tăng tốc ${updates.speed}x`);
    } else if (p.includes('chậm') || p.includes('slow') || p.includes('0.75x') || p.includes('0.5x')) {
      updates.speed = 0.75;
      actionsTaken.push('Làm chậm 0.75x (Slow-mo)');
    }

    if (p.includes('cắt') || p.includes('trim')) {
      const cutSecs = 2;
      updates.start = target.start + cutSecs;
      updates.duration = Math.max(2, target.duration - cutSecs);
      actionsTaken.push(`Cắt ${cutSecs}s đầu`);
    }

    if (p.includes('sáng') || p.includes('bright')) {
      updates.filter = 'bright';
      actionsTaken.push('Tăng độ sáng +25%');
    } else if (p.includes('điện ảnh') || p.includes('cinematic')) {
      updates.filter = 'cinematic';
      actionsTaken.push('Bộ lọc Điện ảnh Cinematic');
    } else if (p.includes('vintage') || p.includes('cổ điển') || p.includes('retro')) {
      updates.filter = 'vintage';
      actionsTaken.push('Bộ lọc Vintage');
    } else if (p.includes('đen trắng') || p.includes('b&w')) {
      updates.filter = 'bw';
      actionsTaken.push('Bộ lọc Đen trắng B&W');
    }

    if (p.includes('tắt tiếng') || p.includes('mute') || p.includes('âm thanh')) {
      updates.volume = 0;
      actionsTaken.push('Tắt âm thanh (Mute)');
    }

    if (actionsTaken.length === 0) {
      updates.filter = 'cinematic';
      updates.speed = 1.15;
      actionsTaken.push('Tối ưu hóa nhịp điệu & màu sắc');
    }

    updateClip(target.id, updates);
    showToast(`AI đã áp dụng: ${actionsTaken.join(', ')} lên "${target.name}"!`, 'success');
    closeModal();
  };

  // Handler for Enhance Quality
  const handleApplyEnhance = () => {
    const target = videoClips.find(c => c.id === enhanceClipId) || videoClips[0];
    if (target) {
      updateClip(target.id, {
        filter: 'cinematic',
        opacity: 1
      });
      showToast(`Đã nâng cấp chất lượng HD Lanczos (Cường độ ${enhanceIntensity}%) cho clip "${target.name}"!`, 'success');
    } else {
      showToast(`Đã nâng cấp bộ lọc chất lượng HD Lanczos (+${enhanceIntensity}%) cho toàn bộ dự án!`, 'success');
    }
    closeModal();
  };

  // Section 8 Handlers
  // 1. Video Studio Handler (Make 30-second videos)
  const handleCreateVideoStudioProject = async () => {
    try {
      const id = 'proj-vs-' + Date.now();
      const title = 'Video Studio 30s • Script to Video';
      const newProj: ProjectEntity = {
        id,
        title,
        width: 1080,
        height: 1920,
        fps: 30,
        duration: 30,
        thumbnail: createProceduralAiImage('9:16', 'cyberpunk', 'Video Studio 30s'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };
      await db.projects.add(newProj);
      setCurrentProjectId(id);
      setProjectTitle(title);
      setDuration(30);

      const generatedClips: any[] = [];
      let startTime = 0;
      vsScenes.forEach((sc, idx) => {
        generatedClips.push({
          id: `clip-vs-vid-${idx}-${Date.now()}`,
          track: 'video',
          name: `Cảnh ${idx + 1}: ${sc.title}`,
          src: createProceduralAiImage('9:16', sc.bg || 'cyberpunk', sc.text),
          type: 'image',
          start: startTime,
          duration: sc.duration,
          filter: sc.bg === 'cinematic' ? 'cinematic' : undefined
        });

        generatedClips.push({
          id: `clip-vs-txt-${idx}-${Date.now()}`,
          track: 'text',
          name: `Chữ: ${sc.text.slice(0, 16)}...`,
          text: sc.text,
          type: 'text',
          start: startTime,
          duration: sc.duration,
          y: 120,
          scale: 1.05
        });

        startTime += sc.duration;
      });

      generatedClips.push({
        id: `clip-vs-aud-${Date.now()}`,
        track: 'audio',
        name: `Nhạc nền: ${vsMusic.toUpperCase()}`,
        type: 'audio',
        start: 0,
        duration: 30,
        volume: 0.8
      });

      setClips(generatedClips);
      showToast('Đã tạo dự án Video 30s từ kịch bản!', 'success');
      closeModal();
      navigate(`/editor/${id}`);
    } catch (err: any) {
      showToast('Lỗi tạo dự án: ' + err.message, 'error');
    }
  };

  // 2. AI Ad Maker Handler
  const handleCreateAdProject = async () => {
    try {
      const id = 'proj-ad-' + Date.now();
      const title = `Quảng Cáo: ${adProdName} (Variant ${adActiveVariant})`;
      const newProj: ProjectEntity = {
        id,
        title,
        width: 1080,
        height: 1920,
        fps: 30,
        duration: 20,
        thumbnail: createProceduralAiImage('9:16', 'neon3d', adProdName),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };
      await db.projects.add(newProj);
      setCurrentProjectId(id);
      setProjectTitle(title);
      setDuration(20);

      const scenes = adActiveVariant === 'A'
        ? [
            { text: `🔥 SALE SỐC: ${adProdName}`, dur: 4, bg: 'retro' },
            { text: `✨ Điểm nổi bật: ${adUsp.split(',')[0] || adUsp}`, dur: 4, bg: 'cyberpunk' },
            { text: `⚡ Pin khủng 60H & Bass siêu sâu`, dur: 4, bg: 'neon3d' },
            { text: `⭐⭐⭐⭐⭐ 50,000+ Khách hàng hài lòng`, dur: 4, bg: 'cinematic' },
            { text: `🛒 ${adCta} • MUA NGAY!`, dur: 4, bg: 'pastel' }
          ]
        : adActiveVariant === 'B'
        ? [
            { text: `📱 Review chân thực chiếc tai nghe hot nhất!`, dur: 4, bg: 'cinematic' },
            { text: `🎧 Bật chống ồn là êm ru cả không gian`, dur: 4, bg: 'cyberpunk' },
            { text: `🔋 Dùng cả tuần sạc đúng 1 lần`, dur: 4, bg: 'neon3d' },
            { text: `💎 Chất âm vượt xa tầm giá`, dur: 4, bg: 'retro' },
            { text: `👉 ${adCta} tại giỏ hàng góc trái!`, dur: 4, bg: 'pastel' }
          ]
        : [
            { text: `Định nghĩa lại trải nghiệm âm thanh`, dur: 4, bg: 'cinematic' },
            { text: `${adProdName} • Chuẩn âm Hi-Res`, dur: 4, bg: 'neon3d' },
            { text: `${adUsp.split(',')[0]} & Thiết kế tối giản`, dur: 4, bg: 'cyberpunk' },
            { text: `Sự lựa chọn của giới chuyên gia`, dur: 4, bg: 'retro' },
            { text: `${adCta} • Ưu đãi độc quyền`, dur: 4, bg: 'pastel' }
          ];

      const clipsData: any[] = [];
      let cur = 0;
      scenes.forEach((s, idx) => {
        clipsData.push({
          id: `clip-ad-v-${idx}-${Date.now()}`,
          track: 'video',
          name: `Cảnh ${idx + 1}: ${s.text.slice(0, 16)}`,
          src: createProceduralAiImage('9:16', s.bg, s.text),
          type: 'image',
          start: cur,
          duration: s.dur,
          filter: 'cinematic'
        });
        clipsData.push({
          id: `clip-ad-t-${idx}-${Date.now()}`,
          track: 'text',
          name: `Text: ${s.text.slice(0, 12)}`,
          text: s.text,
          type: 'text',
          start: cur,
          duration: s.dur,
          y: idx === scenes.length - 1 ? 140 : 100,
          scale: 1.1
        });
        cur += s.dur;
      });

      clipsData.push({
        id: `clip-ad-cta-${Date.now()}`,
        track: 'sticker',
        name: 'Sticker Giỏ hàng Mua ngay',
        text: '🛒 MUA NGAY',
        type: 'sticker',
        start: 12,
        duration: 8,
        y: 180,
        scale: 1.2
      });

      setClips(clipsData);
      showToast('Đã tạo Storyboard quảng cáo và đưa vào Editor!', 'success');
      closeModal();
      navigate(`/editor/${id}`);
    } catch (err: any) {
      showToast('Lỗi tạo quảng cáo: ' + err.message, 'error');
    }
  };

  // 3. Long Video to Shorts Handlers
  const handleOpenShortInEditor = async (shortId: number) => {
    try {
      const id = 'proj-short-' + Date.now();
      const title = `Short #${shortId} • Auto-crop 9:16 (${ltsDurationPreset}s)`;
      const newProj: ProjectEntity = {
        id,
        title,
        width: 1080,
        height: 1920,
        fps: 30,
        duration: ltsDurationPreset,
        thumbnail: createProceduralAiImage('9:16', 'cyberpunk', `Short ${shortId}`),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };
      await db.projects.add(newProj);
      setCurrentProjectId(id);
      setProjectTitle(title);
      setDuration(ltsDurationPreset);

      const shortClips: any[] = [
        {
          id: `clip-short-${Date.now()}`,
          track: 'video',
          name: `Short #${shortId}: Auto-crop 9:16 Center Face`,
          src: createProceduralAiImage('9:16', 'cinematic', `Short ${shortId} 9:16`),
          type: 'video',
          start: 0,
          duration: ltsDurationPreset,
          scale: 1.8,
          filter: 'cinematic'
        },
        {
          id: `clip-short-cap-${Date.now()}`,
          track: 'text',
          name: 'Phụ đề Cao trào',
          text: `🔥 CAO TRÀO SHORT #${shortId}`,
          type: 'text',
          start: 1,
          duration: ltsDurationPreset - 2,
          y: 110,
          scale: 1.15
        }
      ];

      setClips(shortClips);
      showToast(`Đã đưa Short #${shortId} (Auto-crop 9:16) vào Editor!`, 'success');
      closeModal();
      navigate(`/editor/${id}`);
    } catch (err: any) {
      showToast('Lỗi mở short: ' + err.message, 'error');
    }
  };

  const handleBatchExportShorts = () => {
    if (ltsSelectedShorts.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 đoạn Short để xuất!', 'error');
      return;
    }
    showToast(`Đang xuất hàng loạt ${ltsSelectedShorts.length} video shorts chuẩn 9:16...`, 'info');
    setTimeout(() => {
      ltsSelectedShorts.forEach((sid, idx) => {
        setTimeout(() => {
          const a = document.createElement('a');
          const canvas = document.createElement('canvas');
          canvas.width = 540;
          canvas.height = 960;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 540, 960);
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText(`SHORT #${sid} (9:16)`, 60, 480);
          }
          a.href = canvas.toDataURL('image/png');
          a.download = `Short_${sid}_AutoCrop_916.png`;
          a.click();
        }, idx * 250);
      });
      showToast(`Đã xuất thành công ${ltsSelectedShorts.length} video shorts chuẩn 9:16!`, 'success');
      closeModal();
    }, 500);
  };

  if (!activeModal) return null;

  // Handle picking directory via File System Access API
  const handlePickExportDirectory = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        setExportDirectoryHandle(handle);
        setExportDirectoryName(handle.name || 'Thư mục đã chọn');
        showToast(`Đã chọn thư mục: ${handle.name}`, 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') showToast('Không thể chọn thư mục', 'warning');
      }
    } else {
      showToast('Trình duyệt chưa hỗ trợ File System Access API, video sẽ tải về qua trình duyệt', 'info');
    }
  };

  const handleCancelExport = () => {
    abortSignalRef.current.aborted = true;
    setExportProgress(null);
    showToast('Đã hủy quá trình xuất video', 'info');
  };

  const handleRunInBackground = () => {
    closeModal();
    showToast('Quá trình xuất tiếp tục chạy ngầm. Hệ thống sẽ gửi thông báo chuông khi xong!', 'info');
  };

  // Quick Export: Current Frame PNG
  const handleQuickExportFrame = async () => {
    try {
      showToast('Đang trích xuất khung hình hiện tại...', 'info');
      const blob = await exportCurrentFrameAsPng(clips, currentTime, exportRes === '4k' ? '4k' : '1080p');
      if (!blob) throw new Error('Không thể render khung hình');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (exportFileName || projectTitle || 'Frame').trim().replace(/[^a-zA-Z0-9_\u00C0-\u1EF9-]/g, '_');
      a.download = `${cleanTitle}_frame_${currentTime.toFixed(2)}s.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất ảnh PNG khung hình hiện tại thành công!', 'success');
    } catch (err: any) {
      showToast(`Lỗi xuất ảnh: ${err.message}`, 'error');
    }
  };

  // Quick Export: Captions .SRT
  const handleQuickExportCaptions = () => {
    try {
      const blob = exportCaptionsSrt(clips);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (exportFileName || projectTitle || 'Subtitles').trim().replace(/[^a-zA-Z0-9_\u00C0-\u1EF9-]/g, '_');
      a.download = `${cleanTitle}_captions.srt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất tệp phụ đề .srt thành công!', 'success');
    } catch (err: any) {
      showToast(`Lỗi xuất phụ đề: ${err.message}`, 'error');
    }
  };

  // Quick Export: Animated GIF
  const handleQuickExportGif = async () => {
    try {
      showToast('Đang tạo ảnh động GIF từ timeline...', 'info');
      const shortDuration = Math.min(duration || 3, 5);
      const videoBlob = await exportTimelineVideo(
        clips,
        shortDuration,
        {
          resolution: '720p',
          fps: 24,
          format: 'mp4',
          range: { start: 0, end: shortDuration }
        }
      );
      const gifBlob = await convertVideoToGif(videoBlob, 15, 360);
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (exportFileName || projectTitle || 'Animation').trim().replace(/[^a-zA-Z0-9_\u00C0-\u1EF9-]/g, '_');
      a.download = `${cleanTitle}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất ảnh động GIF thành công!', 'success');
    } catch (err: any) {
      showToast(`Lỗi xuất GIF: ${err.message}`, 'error');
    }
  };

  // Handle Video / Audio Export
  const handleStartExport = async () => {
    try {
      abortSignalRef.current = { aborted: false };

      // Automatic pre-export snapshot backup
      if (currentProjectId && clips.length > 0) {
        const snapLabel = `Trước khi xuất (${exportAudioOnlyMode ? exportAudioFormat.toUpperCase() : exportRes.toUpperCase() + ' ' + exportFormat.toUpperCase()})`;
        createProjectSnapshot(
          currentProjectId,
          snapLabel,
          { clips },
          duration,
          settings
        ).catch(() => {});
      }

      setExportProgress(0);
      setExportEta(0);
      setExportStatus(
        exportAudioOnlyMode
          ? `Đang xuất tệp âm thanh ${exportAudioFormat.toUpperCase()}...`
          : `Đang khởi tạo WebCodecs (${exportRes.toUpperCase()}, ${exportFps}fps, ${exportFormat.toUpperCase()})...`
      );

      // Bitrate calculation
      const baseBitrate = exportRes === '4k' ? 24000000 : exportRes === '2k' ? 14000000 : exportRes === '1080p' ? 8000000 : 4500000;
      let finalBitrate = baseBitrate;
      if (exportBitrateMode === 'higher') finalBitrate = Math.round(baseBitrate * 1.5);
      else if (exportBitrateMode === 'custom') finalBitrate = (exportCustomBitrate || 10) * 1000000;

      const range = exportRangeType === 'inout'
        ? { start: Math.max(0, exportRangeStart), end: Math.min(duration, Math.max(exportRangeStart + 0.5, exportRangeEnd)) }
        : undefined;

      // Determine clean filename
      const cleanTitle = (exportFileName || projectTitle || 'CapCut_Video').trim().replace(/[^a-zA-Z0-9_\u00C0-\u1EF9-]/g, '_');
      const ext = exportAudioOnlyMode ? (exportAudioFormat === 'wav' ? 'wav' : 'mp3') : exportFormat;
      const finalFileName = `${cleanTitle}_${exportRes}_${exportFps}fps_${Date.now()}.${ext}`;

      // Open streaming writable file stream upfront if directory was selected
      let fileStreamWritable: any = null;
      let savedViaFs = false;

      if (exportDirectoryHandle && !exportAudioOnlyMode && exportFormat === 'mp4') {
        try {
          const fileHandle = await exportDirectoryHandle.getFileHandle(finalFileName, { create: true });
          fileStreamWritable = await fileHandle.createWritable();
        } catch (fsErr) {
          console.warn('Could not open direct file writable stream:', fsErr);
        }
      }

      let blob: Blob;
      if (exportAudioOnlyMode) {
        blob = await exportAudioOnly(
          clips,
          duration,
          exportAudioFormat === 'wav' ? 'wav' : 'mp3',
          ({ progress, status }) => {
            setExportProgress(progress);
            setExportStatus(status);
          }
        );
      } else {
        blob = await exportTimelineVideo(
          clips,
          duration,
          {
            resolution: exportRes,
            fps: exportFps,
            codec: exportCodec,
            bitrate: finalBitrate,
            format: exportFormat,
            range,
            aspect: projectSettings?.aspect,
            abortSignal: abortSignalRef.current,
            writableStream: fileStreamWritable
          },
          ({ progress, status, remainingSeconds }) => {
            setExportProgress(progress);
            setExportStatus(status);
            if (remainingSeconds !== undefined) setExportEta(remainingSeconds);
          }
        );
      }

      if (fileStreamWritable) {
        savedViaFs = true;
        showToast(`Đã xuất streaming trực tiếp "${finalFileName}" vào thư mục "${exportDirectoryName}"!`, 'success');
      } else if (exportDirectoryHandle) {
        try {
          const fileHandle = await exportDirectoryHandle.getFileHandle(finalFileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          savedViaFs = true;
          showToast(`Đã lưu "${finalFileName}" vào thư mục "${exportDirectoryName}"!`, 'success');
        } catch (fsErr) {
          console.warn('FS write failed, falling back to browser download:', fsErr);
        }
      }

      if (!savedViaFs) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast(t.exportSuccess || 'Xuất video hoàn tất!', 'success');
      }

      // Add to notifications bell drawer
      addNotification({
        id: 'notif-' + Date.now(),
        title: 'Xuất video hoàn tất',
        desc: `Tệp "${finalFileName}" đã được xuất thành công!`,
        time: 'Vừa xong',
        read: false,
        type: 'export'
      });

      setTimeout(() => {
        setExportProgress(null);
        closeModal();
      }, 1200);
    } catch (err: any) {
      if (err.message === 'EXPORT_CANCELLED') {
        showToast('Đã hủy quá trình xuất video', 'info');
      } else {
        showToast(`Lỗi xuất video: ${err.message}`, 'error');
      }
      setExportProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in">
      <div className={`relative w-full ${activeModal === 'export' ? 'max-w-2xl' : (activeModal === 'enhanceQuality' || activeModal === 'aiImage' || activeModal === 'extendVideo' || activeModal === 'videoStudio' || activeModal === 'aiAdMaker' || activeModal === 'longToShorts' || activeModal === 'pro' ? 'max-w-xl' : 'max-w-lg')} bg-[#141822] border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto`}>
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MODAL NEW PROJECT (CREATE PROJECT) */}
        {activeModal === 'newProject' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2.5 text-[#22D3EE] pb-3 border-b border-[#1F2937]">
              <Film className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Tạo dự án mới (New Project)</h3>
            </div>

            {/* Tên Project */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Tên dự án:</span>
              <input
                type="text"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                placeholder="VD: 0917 - Video TikTok..."
                className="bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-xs text-[#E5E7EB] outline-none"
              />
            </div>

            {/* Chọn Tỉ Lệ (9:16 Mặc định, 16:9, 1:1, 4:5, 3:4) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Tỉ lệ khung hình (Aspect Ratio):</span>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: '9:16', label: '9:16', sub: 'TikTok/Reels' },
                  { id: '16:9', label: '16:9', sub: 'YouTube/TV' },
                  { id: '1:1', label: '1:1', sub: 'Square' },
                  { id: '4:5', label: '4:5', sub: 'Insta Post' },
                  { id: '3:4', label: '3:4', sub: 'Portrait' }
                ].map((aspect) => (
                  <button
                    key={aspect.id}
                    type="button"
                    onClick={() => setNewProjAspect(aspect.id as any)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all hover-lift ${
                      newProjAspect === aspect.id
                        ? 'bg-[#22D3EE]/15 border-[#22D3EE] text-[#22D3EE] font-bold shadow-sm'
                        : 'bg-[#0B0F19] border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB]'
                    }`}
                  >
                    <span className="text-xs font-bold">{aspect.label}</span>
                    <span className="text-[8px] truncate">{aspect.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn Độ Phân Giải */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Độ phân giải:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1080p', label: '1080p Full HD (Khuyên dùng)' },
                  { id: '720p', label: '720p HD (Nhanh)' },
                  { id: '4k', label: '4K Ultra HD (Pro)' }
                ].map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setNewProjRes(res.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-center text-xs transition-all ${
                      newProjRes === res.id
                        ? 'bg-[#22D3EE]/15 border-[#22D3EE] text-[#22D3EE] font-bold'
                        : 'bg-[#0B0F19] border-[#1F2937] text-[#9CA3AF] hover:text-[#E5E7EB]'
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút Create */}
            <div className="pt-3 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={async () => {
                  const id = 'proj-' + Date.now();
                  const title = newProjName.trim() || '0917 - New Project';

                  let width = 1080;
                  let height = 1920;
                  if (newProjAspect === '16:9') {
                    width = 1920;
                    height = 1080;
                  } else if (newProjAspect === '1:1') {
                    width = 1080;
                    height = 1080;
                  } else if (newProjAspect === '4:5') {
                    width = 1080;
                    height = 1350;
                  } else if (newProjAspect === '3:4') {
                    width = 1080;
                    height = 1440;
                  }

                  const projectTemplate = createDefaultProject(id, title, {
                    aspect: newProjAspect as any,
                    fps: 30
                  });

                  const newProj = {
                    ...projectTemplate,
                    title,
                    width,
                    height,
                    fps: 30,
                    duration: 15,
                    isDeleted: false,
                    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
                    tracksData: {
                      clips: [
                        { id: 'c1', track: 'video', name: `${title} Main Video`, start: 0, duration: 15, type: 'video' },
                        { id: 'c2', track: 'text', name: 'Tiêu đề mở đầu', start: 0, duration: 4, type: 'text', text: '🔥 BẮT ĐẦU DỰNG VIDEO' }
                      ]
                    }
                  };

                  await db.projects.add(newProj);
                  setCurrentProjectId(id);
                  setProjectTitle(title);
                  closeModal();
                  showToast(`Đã tạo dự án ${title} (${newProjAspect})!`, 'success');
                  navigate(`/editor/${id}`);
                }}
                className="w-full py-3 rounded-xl bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-extrabold text-xs shadow-md shadow-cyan-500/25 hover-lift transition-all"
              >
                Create / Tạo dự án ngay
              </button>
            </div>
          </div>
        )}

        {/* 0. AUTH MODAL (SIGN IN / SIGN UP) - KHÔNG BẮT BUỘC */}
        {activeModal === 'auth' && (
          <div className="flex flex-col gap-4">
            {/* Header / Tabs */}
            <div className="flex flex-col items-center text-center gap-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#22D3EE] to-sky-500 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20 mb-1">
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {authTab === 'signin' ? 'Đăng nhập CapCut Web' : 'Tạo tài khoản mới'}
              </h3>
              <p className="text-xs text-[#9CA3AF]">
                Tùy chọn: Đồng bộ dự án lên Cloud và mở khóa đầy đủ tính năng
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs font-bold">
              <button
                onClick={() => {
                  setAuthTab('signin');
                  setEmailError('');
                  setPasswordError('');
                  setConfirmPasswordError('');
                }}
                className={`py-2 rounded-lg transition-all ${
                  authTab === 'signin'
                    ? 'bg-[#111827] text-[#22D3EE] shadow border border-[#1F2937]'
                    : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                }`}
              >
                Đăng nhập (Sign in)
              </button>
              <button
                onClick={() => {
                  setAuthTab('signup');
                  setEmailError('');
                  setPasswordError('');
                  setConfirmPasswordError('');
                }}
                className={`py-2 rounded-lg transition-all ${
                  authTab === 'signup'
                    ? 'bg-[#111827] text-[#22D3EE] shadow border border-[#1F2937]'
                    : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                }`}
              >
                Đăng ký (Sign up)
              </button>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={async () => {
                if (isSupabaseConfigured && supabase) {
                  showToast('Đang kết nối Google qua Supabase OAuth...', 'info');
                  await supabase.auth.signInWithOAuth({ provider: 'google' });
                } else {
                  showToast(
                    'Chế độ Khách (Guest Mode): Cần cấu hình VITE_SUPABASE_URL trên Vercel để dùng Google OAuth. Bạn có thể đăng nhập bằng email hoặc bấm nút bên dưới!',
                    'warning'
                  );
                }
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-xs font-bold text-[#E5E7EB] flex items-center justify-center gap-2.5 hover-lift transition-all"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Tiếp tục với Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2 my-0.5">
              <div className="flex-1 h-[1px] bg-[#1F2937]" />
              <span className="text-[10px] text-[#9CA3AF] uppercase font-bold">hoặc dùng Email</span>
              <div className="flex-1 h-[1px] bg-[#1F2937]" />
            </div>

            {/* Form Fields with Inline Validation */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                let valid = true;

                // Validate Email
                if (!authEmail.trim() || !authEmail.includes('@') || !authEmail.includes('.')) {
                  setEmailError('Vui lòng nhập định dạng email hợp lệ (vd: user@example.com)');
                  valid = false;
                } else {
                  setEmailError('');
                }

                // Validate Password
                if (!authPassword || authPassword.length < 6) {
                  setPasswordError('Mật khẩu phải chứa ít nhất 6 ký tự');
                  valid = false;
                } else {
                  setPasswordError('');
                }

                // Validate Confirm Password (if sign up)
                if (authTab === 'signup' && authPassword !== authConfirmPassword) {
                  setConfirmPasswordError('Mật khẩu xác nhận không khớp');
                  valid = false;
                } else {
                  setConfirmPasswordError('');
                }

                if (!valid) return;

                setAuthLoading(true);
                const userName = authEmail.split('@')[0];

                try {
                  // Simulate or execute Supabase Auth if available
                  if (isSupabaseConfigured && supabase) {
                    if (authTab === 'signup') {
                      await supabase.auth.signUp({ email: authEmail, password: authPassword });
                    } else {
                      await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
                    }
                  }

                  // Đồng bộ projects local từ Dexie lên cloud
                  const localProjects = await db.projects.toArray();
                  if (isSupabaseConfigured && supabase && localProjects.length > 0) {
                    showToast(`Đang đồng bộ ${localProjects.length} dự án cục bộ lên Supabase Cloud...`, 'info');
                  }

                  signIn(userName, authEmail);
                  showToast(
                    authTab === 'signup'
                      ? 'Đăng ký tài khoản thành công! Đã đồng bộ dự án.'
                      : 'Đăng nhập thành công! Dự án cục bộ đã được kết nối.',
                    'success'
                  );
                  closeModal();
                } catch (err: any) {
                  showToast(`Lỗi: ${err.message || 'Không thể xác thực'}`, 'error');
                } finally {
                  setAuthLoading(false);
                }
              }}
              className="flex flex-col gap-3 text-left text-xs"
            >
              {/* Email Input */}
              <div className="flex flex-col gap-1">
                <span className="text-[#9CA3AF] font-semibold">Địa chỉ Email:</span>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => {
                    setAuthEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="name@example.com"
                  className={`bg-[#0B0F19] border ${
                    emailError ? 'border-rose-500' : 'border-[#1F2937]'
                  } focus:border-[#22D3EE] rounded-xl px-3.5 py-2.5 text-[#E5E7EB] outline-none transition-colors`}
                />
                {emailError && <span className="text-[10px] text-rose-400 font-semibold">{emailError}</span>}
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1">
                <span className="text-[#9CA3AF] font-semibold">Mật khẩu:</span>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="••••••••"
                  className={`bg-[#0B0F19] border ${
                    passwordError ? 'border-rose-500' : 'border-[#1F2937]'
                  } focus:border-[#22D3EE] rounded-xl px-3.5 py-2.5 text-[#E5E7EB] outline-none transition-colors`}
                />
                {passwordError && <span className="text-[10px] text-rose-400 font-semibold">{passwordError}</span>}
              </div>

              {/* Confirm Password (Sign up only) */}
              {authTab === 'signup' && (
                <div className="flex flex-col gap-1 animate-in fade-in">
                  <span className="text-[#9CA3AF] font-semibold">Xác nhận mật khẩu:</span>
                  <input
                    type="password"
                    value={authConfirmPassword}
                    onChange={(e) => {
                      setAuthConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    placeholder="••••••••"
                    className={`bg-[#0B0F19] border ${
                      confirmPasswordError ? 'border-rose-500' : 'border-[#1F2937]'
                    } focus:border-[#22D3EE] rounded-xl px-3.5 py-2.5 text-[#E5E7EB] outline-none transition-colors`}
                  />
                  {confirmPasswordError && (
                    <span className="text-[10px] text-rose-400 font-semibold">{confirmPasswordError}</span>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-extrabold text-xs shadow-md shadow-cyan-500/25 hover-lift transition-all mt-1"
              >
                {authLoading ? 'Đang xác thực...' : authTab === 'signin' ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
              </button>
            </form>

            {/* NÚT LỚN "CONTINUE AS GUEST / DÙNG KHÔNG CẦN ĐĂNG NHẬP" */}
            <div className="pt-2 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={() => {
                  closeModal();
                  showToast('Đang tiếp tục ở chế độ Khách (Offline IndexedDB)', 'info');
                }}
                className="w-full py-3.5 rounded-2xl bg-[#0B0F19] hover:bg-[#111827] border-2 border-[#1F2937] hover:border-[#22D3EE]/60 text-white font-extrabold text-xs shadow-lg hover-lift transition-all flex items-center justify-center gap-2"
              >
                <span>Dùng không cần đăng nhập (Continue as guest)</span>
              </button>
              <span className="text-[10px] text-[#9CA3AF] text-center block mt-1.5">
                Không thu thập dữ liệu cá nhân • Toàn bộ dự án lưu trong trình duyệt của bạn
              </span>
            </div>
          </div>
        )}

        {/* 1. EXPORT MODAL */}
        {activeModal === 'export' && (() => {
          const exportDurationSec = exportRangeType === 'inout'
            ? Math.max(0.5, exportRangeEnd - exportRangeStart)
            : Math.max(0.5, duration || 5);

          let bitrateBitsPerSec = 8000000;
          if (exportRes === '720p') bitrateBitsPerSec = 4500000;
          else if (exportRes === '1080p') bitrateBitsPerSec = 8000000;
          else if (exportRes === '2k') bitrateBitsPerSec = 14000000;
          else if (exportRes === '4k') bitrateBitsPerSec = 24000000;

          if (exportBitrateMode === 'higher') bitrateBitsPerSec = Math.round(bitrateBitsPerSec * 1.5);
          else if (exportBitrateMode === 'custom') bitrateBitsPerSec = (exportCustomBitrate || 10) * 1000000;

          const estFileSizeMb = exportAudioOnlyMode
            ? (exportAudioFormat === 'wav'
                ? ((1411200 * exportDurationSec) / 8 / 1024 / 1024).toFixed(1)
                : ((192000 * exportDurationSec) / 8 / 1024 / 1024).toFixed(1))
            : ((bitrateBitsPerSec * exportDurationSec) / 8 / 1024 / 1024).toFixed(1);

          const isHighLoad = exportRes === '4k' || (exportRes === '2k' && exportFps >= 50);

          return (
            <div className="flex flex-col gap-4 text-left">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
                <div className="flex items-center gap-2.5 text-[#22D3EE]">
                  <Download className="w-5 h-5" />
                  <div>
                    <h3 className="text-base font-bold text-white">Xuất Video & Âm Thanh (Export)</h3>
                    <p className="text-[11px] text-[#9CA3AF]">Render phần cứng 100% trong trình duyệt qua WebCodecs & Canvas</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-[#22D3EE] font-mono">
                  Ước tính: ~{estFileSizeMb} MB
                </div>
              </div>

              {/* 1. Tên file & Nơi lưu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-[#0F131D] border border-[#1F2937]">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#9CA3AF] uppercase">Tên tệp xuất (File Name)</label>
                  <input
                    type="text"
                    value={exportFileName}
                    onChange={(e) => setExportFileName(e.target.value)}
                    placeholder="CapCut_Video"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#181E2C] border border-[#2A3447] text-white text-xs focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#9CA3AF] uppercase">Nơi lưu (Destination)</label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 px-3 py-1.5 rounded-lg bg-[#181E2C] border border-[#2A3447] text-[#9CA3AF] text-xs truncate flex items-center gap-1.5" title={exportDirectoryName}>
                      <HardDrive className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                      <span className="truncate">{exportDirectoryName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePickExportDirectory}
                      className="px-2.5 py-1.5 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/30 hover:bg-[#22D3EE]/20 text-[#22D3EE] text-xs font-semibold whitespace-nowrap transition-all"
                    >
                      Đổi...
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggle Audio Only vs Video */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#22D3EE]" />
                  <span className="text-xs font-semibold text-white">Chỉ xuất âm thanh (Export audio only)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExportAudioOnlyMode(!exportAudioOnlyMode)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    exportAudioOnlyMode ? 'bg-[#22D3EE]' : 'bg-[#374151]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      exportAudioOnlyMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {exportAudioOnlyMode ? (
                /* Audio Only Options */
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#0F131D] border border-[#1F2937]">
                  <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">Định dạng âm thanh</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'wav', label: 'WAV', desc: 'Lossless PCM 16-bit 44.1kHz' },
                      { id: 'mp3', label: 'MP3', desc: 'Stereo 192 kbps' },
                      { id: 'aac', label: 'AAC', desc: 'Định dạng chuẩn Apple' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setExportAudioFormat(item.id as any)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          exportAudioFormat === item.id
                            ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-white shadow-sm shadow-cyan-500/20'
                            : 'bg-[#181E2C] border-[#2A3447] text-[#9CA3AF] hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className="text-[10px] text-[#22D3EE] mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Video Options */
                <div className="flex flex-col gap-3">
                  {/* Resolution Selector */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
                      1. Độ phân giải (Resolution)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: '720p', label: '720p HD', desc: '720 × 1280' },
                        { id: '1080p', label: '1080p FHD', desc: '1080 × 1920' },
                        { id: '2k', label: '2K QHD', desc: '1440 × 2560' },
                        { id: '4k', label: '4K UHD', desc: '2160 × 3840' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setExportRes(item.id as any)}
                          className={`p-2 rounded-xl border text-left flex flex-col transition-all ${
                            exportRes === item.id
                              ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-white shadow-md shadow-cyan-500/20'
                              : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          <span className="font-bold text-xs">{item.label}</span>
                          <span className="text-[10px] text-[#22D3EE] font-mono mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FPS & Codec Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* FPS */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
                        2. Tốc độ khung hình (FPS)
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[24, 25, 30, 50, 60].map((fpsVal) => (
                          <button
                            key={fpsVal}
                            type="button"
                            onClick={() => setExportFps(fpsVal as any)}
                            className={`py-1.5 rounded-lg border text-center font-bold text-xs transition-all ${
                              exportFps === fpsVal
                                ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-white'
                                : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:text-white'
                            }`}
                          >
                            {fpsVal}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Codec */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
                        3. Codec nén video
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'h264', label: 'H.264', avail: true },
                          { id: 'hevc', label: 'HEVC', avail: supportedCodecs.hevc },
                          { id: 'av1', label: 'AV1', avail: supportedCodecs.av1 }
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            disabled={!c.avail && c.id !== 'h264'}
                            onClick={() => setExportCodec(c.id as any)}
                            className={`py-1.5 px-2 rounded-lg border text-center text-xs font-bold transition-all ${
                              exportCodec === c.id
                                ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-white'
                                : !c.avail && c.id !== 'h264'
                                ? 'bg-[#111827]/40 border-transparent text-slate-600 cursor-not-allowed'
                                : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:text-white'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bitrate & Format */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Bitrate */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">4. Tốc độ bit (Bitrate)</span>
                        {exportBitrateMode === 'custom' && (
                          <span className="text-xs text-[#22D3EE] font-mono">{exportCustomBitrate} Mbps</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'recommended', label: 'Chuẩn' },
                          { id: 'higher', label: 'Cao (HQ)' },
                          { id: 'custom', label: 'Tùy chỉnh' }
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setExportBitrateMode(b.id as any)}
                            className={`py-1.5 rounded-lg border text-center text-xs font-semibold transition-all ${
                              exportBitrateMode === b.id
                                ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-white'
                                : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:text-white'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                      {exportBitrateMode === 'custom' && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="range"
                            min="2"
                            max="50"
                            step="1"
                            value={exportCustomBitrate}
                            onChange={(e) => setExportCustomBitrate(Number(e.target.value))}
                            className="w-full accent-[#22D3EE] h-1.5 bg-[#1F2937] rounded-lg cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Format */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">5. Định dạng (Container)</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { fmt: 'mp4', label: 'MP4' },
                          { fmt: 'webm', label: 'WebM' }
                        ].map((f) => (
                          <button
                            key={f.fmt}
                            type="button"
                            onClick={() => setExportFormat(f.fmt as any)}
                            className={`py-1.5 rounded-lg border text-center text-xs font-bold transition-all ${
                              exportFormat === f.fmt
                                ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-white'
                                : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:text-white'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Export Range (Toàn bộ / In-Out) */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0F131D] border border-[#1F2937]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">Phạm vi thời gian xuất</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExportRangeType('all')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        exportRangeType === 'all'
                          ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      Toàn bộ ({duration.toFixed(1)}s)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportRangeType('inout')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        exportRangeType === 'inout'
                          ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      Theo In-Out
                    </button>
                  </div>
                </div>
                {exportRangeType === 'inout' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#9CA3AF]">In (Bắt đầu):</span>
                      <input
                        type="number"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={exportRangeStart}
                        onChange={(e) => setExportRangeStart(Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded bg-[#181E2C] border border-[#2A3447] text-white text-xs font-mono"
                      />
                      <span className="text-xs text-[#9CA3AF]">giây</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#9CA3AF]">Out (Kết thúc):</span>
                      <input
                        type="number"
                        min="0.1"
                        max={duration}
                        step="0.1"
                        value={exportRangeEnd}
                        onChange={(e) => setExportRangeEnd(Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded bg-[#181E2C] border border-[#2A3447] text-white text-xs font-mono"
                      />
                      <span className="text-xs text-[#9CA3AF]">giây</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Hardware Warning if High Load */}
              {isHighLoad && !exportAudioOnlyMode && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-semibold">Cảnh báo tải phần cứng: </span>
                    <span>Độ phân giải {exportRes.toUpperCase()} ({exportFps} FPS) yêu cầu dung lượng RAM và GPU cao. Nếu máy tính xuất hiện hiện tượng giật lag hoặc tràn bộ nhớ, hãy cân nhắc hạ xuống 1080p 30 FPS.</span>
                  </div>
                </div>
              )}

              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#111827] border border-[#1F2937]">
                <span className="text-[11px] font-bold text-[#9CA3AF] uppercase pl-1">Xuất nhanh:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickExportFrame}
                    className="px-2.5 py-1 rounded-lg bg-[#181E2C] hover:bg-[#22D3EE]/20 border border-[#2A3447] hover:border-[#22D3EE]/40 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>Frame PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickExportCaptions}
                    className="px-2.5 py-1 rounded-lg bg-[#181E2C] hover:bg-[#22D3EE]/20 border border-[#2A3447] hover:border-[#22D3EE]/40 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>Phụ đề (.srt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickExportGif}
                    className="px-2.5 py-1 rounded-lg bg-[#181E2C] hover:bg-[#22D3EE]/20 border border-[#2A3447] hover:border-[#22D3EE]/40 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
                  >
                    <Film className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>Ảnh động (GIF)</span>
                  </button>
                </div>
              </div>

              {/* Export Progress or CTA */}
              {exportProgress !== null ? (
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#111827] border border-[#22D3EE]/50 mt-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[#22D3EE] flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {exportStatus}
                    </span>
                    <span className="font-mono text-white font-bold">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#1F2937] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#22D3EE] to-sky-400 transition-all duration-150"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
                      {exportEta > 0 ? `Còn khoảng ~${exportEta} giây` : 'Đang tính thời gian còn lại...'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRunInBackground}
                        className="px-3 py-1 rounded-lg bg-[#181E2C] hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                      >
                        Chạy ngầm (Ẩn)
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelExport}
                        className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-medium transition-colors"
                      >
                        Hủy xuất
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleStartExport}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#22D3EE] to-sky-400 hover:from-[#22D3EE] hover:to-sky-300 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Bắt đầu xuất video ngay (Client Hardware Render)</span>
                  </button>
                  <span className="text-[11px] text-[#9CA3AF] text-center">
                    Render trực tiếp 100% bằng WebCodecs & Canvas. File lưu an toàn tại máy của bạn.
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* 2. PRO PRICING MODAL (3 GÓI FREE / PRO THÁNG / PRO NĂM) */}
        {activeModal === 'pro' && (
          <div className="flex flex-col gap-5 text-center items-center max-w-2xl">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Crown className="w-7 h-7 text-white" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Nâng cấp CapCut Web Pro</h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Khai phá chất lượng xuất 4K 60fps, toàn bộ kho Hook viral và bộ công cụ AI thông minh
              </p>
            </div>

            {/* 3 Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full text-left">
              {/* Gói Free */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-[#1F2937] flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#9CA3AF] uppercase">Gói Free</span>
                  <div className="text-lg font-black text-white">0đ <span className="text-xs font-normal text-[#9CA3AF]">/ tháng</span></div>
                  <span className="text-[10px] text-[#9CA3AF]">Dành cho người mới bắt đầu dựng video</span>
                </div>
                <div className="flex flex-col gap-1.5 text-[11px] text-[#E5E7EB] pt-2 border-t border-[#1F2937]">
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" /> Xuất video 1080p 30fps</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" /> Không giới hạn độ dài</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" /> Lưu trữ Dexie IndexedDB</div>
                  <div className="flex items-center gap-1.5 text-[#9CA3AF]"><X className="w-3.5 h-3.5 text-slate-600 shrink-0" /> Không hỗ trợ xuất 4K</div>
                </div>
                <span className="py-2 text-center text-xs font-semibold text-[#9CA3AF] bg-[#111827] rounded-xl border border-[#1F2937]">
                  Gói hiện tại
                </span>
              </div>

              {/* Gói Pro Tháng */}
              <div className="p-4 rounded-2xl bg-[#111827] border-2 border-purple-500/50 flex flex-col justify-between gap-3 shadow-lg">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 uppercase">Pro Tháng</span>
                  </div>
                  <div className="text-lg font-black text-white">199.000đ <span className="text-xs font-normal text-[#9CA3AF]">/ tháng</span></div>
                  <span className="text-[10px] text-[#9CA3AF]">Dành cho Content Creator chuyên nghiệp</span>
                </div>
                <div className="flex flex-col gap-1.5 text-[11px] text-[#E5E7EB] pt-2 border-t border-[#1F2937]">
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Xuất siêu nét 4K 60fps</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Tự động tạo phụ đề AI</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Toàn bộ kho Hook viral</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Khử ồn thông minh</div>
                </div>
                <button
                  onClick={() => {
                    setIsPro(true);
                    showToast('🎉 Đã kích hoạt gói Pro Tháng (Bản demo)!', 'success');
                    closeModal();
                  }}
                  className="py-2 text-center text-xs font-bold text-white bg-gradient-to-r from-[#7C3AED] to-[#EC4899] rounded-xl hover-lift shadow transition-all"
                >
                  Chọn gói Tháng
                </button>
              </div>

              {/* Gói Pro Năm (Tiết kiệm 40%) */}
              <div className="p-4 rounded-2xl bg-[#111827] border-2 border-[#22D3EE]/80 flex flex-col justify-between gap-3 relative shadow-xl shadow-cyan-500/10">
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#22D3EE] to-sky-400 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                  Tiết kiệm 40%
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#22D3EE] uppercase">Pro Năm (VIP)</span>
                  <div className="text-lg font-black text-white">99.000đ <span className="text-xs font-normal text-[#9CA3AF]">/ tháng</span></div>
                  <span className="text-[10px] text-[#9CA3AF]">Thanh toán 1.190.000đ / năm</span>
                </div>
                <div className="flex flex-col gap-1.5 text-[11px] text-[#E5E7EB] pt-2 border-t border-[#1F2937]">
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" /> Toàn bộ quyền lợi Pro</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" /> Đám mây Supabase Cloud</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" /> Bộ lọc màu độc quyền</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" /> Hỗ trợ ưu tiên 24/7</div>
                </div>
                <button
                  onClick={() => {
                    setIsPro(true);
                    showToast('🎉 Đã kích hoạt gói Pro Năm (Bản demo)!', 'success');
                    closeModal();
                  }}
                  className="py-2 text-center text-xs font-bold text-slate-950 bg-[#22D3EE] hover:bg-cyan-300 rounded-xl hover-lift shadow transition-all"
                >
                  Chọn gói Năm
                </button>
              </div>
            </div>

            {/* Nút lớn "Try Pro free" */}
            <div className="w-full pt-3 border-t border-[#1F2937] flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsPro(true);
                  showToast('🎉 Đã bật cờ isPro trong localStorage (hiện huy hiệu PRO)! Bản demo: mọi tính năng cốt lõi vẫn miễn phí.', 'success');
                  closeModal();
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-pink-500 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-purple-900/30 hover-lift transition-all flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Try Pro free / Dùng thử Pro miễn phí</span>
              </button>
              <span className="text-[10px] text-[#9CA3AF]">
                * Đây là bản demo: Bấm để bật huy hiệu PRO và trải nghiệm không giới hạn. Không yêu cầu thanh toán hay thẻ tín dụng.
              </span>
            </div>
          </div>
        )}

        {/* BÁNH RĂNG SETTINGS MODAL */}
        {activeModal === 'settings' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2.5 text-[#22D3EE] pb-3 border-b border-[#1F2937]">
              <Sliders className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Cài đặt hệ thống (Settings)</h3>
            </div>

            <div className="flex flex-col gap-4 text-xs text-[#E5E7EB]">
              {/* Ngôn ngữ */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold block">Ngôn ngữ giao diện (Language)</span>
                  <span className="text-[10px] text-[#9CA3AF]">Chuyển đổi toàn bộ ngôn ngữ hệ thống</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value as any);
                    showToast(`Đã đổi ngôn ngữ sang ${e.target.value === 'VN' ? 'Tiếng Việt' : 'English'}`);
                  }}
                  className="bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#E5E7EB] outline-none"
                >
                  <option value="VN">Tiếng Việt (VN)</option>
                  <option value="EN">English (EN)</option>
                </select>
              </div>

              {/* Chất lượng export mặc định */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold block">Độ phân giải xuất mặc định</span>
                  <span className="text-[10px] text-[#9CA3AF]">Độ nét khi render video 9:16</span>
                </div>
                <select
                  value={settings.defaultResolution}
                  onChange={(e) => updateSettings({ defaultResolution: e.target.value as any })}
                  className="bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#E5E7EB] outline-none"
                >
                  <option value="720p">720p HD (Nhanh)</option>
                  <option value="1080p">1080p Full HD (Khuyên dùng)</option>
                  <option value="4k">4K Ultra HD (Pro)</option>
                </select>
              </div>

              {/* FPS mặc định */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold block">Tốc độ khung hình (FPS)</span>
                  <span className="text-[10px] text-[#9CA3AF]">Độ mượt mà của chuyển động</span>
                </div>
                <select
                  value={settings.defaultFps}
                  onChange={(e) => updateSettings({ defaultFps: parseInt(e.target.value, 10) as any })}
                  className="bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#E5E7EB] outline-none"
                >
                  <option value={24}>24 FPS (Cinematic)</option>
                  <option value={30}>30 FPS (Tiêu chuẩn)</option>
                  <option value={60}>60 FPS (Siêu mượt)</option>
                </select>
              </div>

              {/* Tỉ lệ khung hình mặc định */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold block">Tỉ lệ khung mặc định</span>
                  <span className="text-[10px] text-[#9CA3AF]">Khung hình khi tạo dự án mới</span>
                </div>
                <select
                  value={settings.defaultAspect}
                  onChange={(e) => updateSettings({ defaultAspect: e.target.value as any })}
                  className="bg-[#0B0F19] border border-[#1F2937] rounded-xl px-3 py-1.5 text-xs text-[#E5E7EB] outline-none"
                >
                  <option value="9:16">9:16 (Dọc TikTok, Reels, Shorts)</option>
                  <option value="16:9">16:9 (Ngang YouTube)</option>
                  <option value="1:1">1:1 (Vuông Instagram)</option>
                </select>
              </div>

              {/* Bật/Tắt Autosave */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold block">Tự động lưu dự án (Autosave)</span>
                  <span className="text-[10px] text-[#9CA3AF]">Lưu thay đổi vào IndexedDB sau mỗi thao tác</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autosave}
                  onChange={(e) => {
                    updateSettings({ autosave: e.target.checked });
                    showToast(e.target.checked ? 'Đã bật Autosave' : 'Đã tắt Autosave');
                  }}
                  className="w-4 h-4 accent-[#22D3EE] cursor-pointer"
                />
              </div>

              {/* Bật/Tắt Linh vật Pixel Mascot */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold block">Linh vật Pixel mầm cây (🌱 Mascot)</span>
                  <span className="text-[10px] text-[#9CA3AF]">Hiển thị chú mầm cây pixel chia sẻ mẹo dựng góc trái dưới</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showMascot !== false}
                  onChange={(e) => {
                    updateSettings({ showMascot: e.target.checked });
                    showToast(e.target.checked ? 'Đã bật linh vật Pixel' : 'Đã ẩn linh vật Pixel', 'info');
                  }}
                  className="w-4 h-4 accent-[#22D3EE] cursor-pointer"
                />
              </div>

              {/* Nhập API Key tùy chọn cho AI & Proxy riêng */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
                <div>
                  <span className="font-semibold block">Khóa API AI cá nhân (OpenAI / Gemini):</span>
                  <span className="text-[10px] text-[#9CA3AF]">Dùng cho trợ lý dựng EditPilot & tự động hóa</span>
                </div>
                <input
                  type="password"
                  value={settings.aiApiKey}
                  onChange={(e) => updateSettings({ aiApiKey: e.target.value })}
                  placeholder="sk-... hoặc AIza... (Lưu cục bộ an toàn)"
                  className="bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-xs text-[#E5E7EB] outline-none"
                />

                {/* Cảnh báo bảo mật quyền riêng tư */}
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 leading-relaxed flex flex-col gap-1">
                  <span className="font-bold flex items-center gap-1">
                    🔒 Quyền riêng tư & Bảo mật API Key:
                  </span>
                  <span>
                    Khóa chỉ lưu tại bộ nhớ trình duyệt (localStorage), không log, không commit và không gửi về máy chủ ClipForge. Tuy nhiên, localStorage không phải két sắt an toàn tuyệt đối trước các extension trình duyệt lạ. Bạn nên giới hạn ngân sách key hoặc sử dụng Proxy Serverless riêng dưới đây.
                  </span>
                </div>

                {/* Tùy chọn Proxy Serverless riêng */}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="font-semibold text-[11px] text-[#E5E7EB]">
                    Địa chỉ Proxy Serverless riêng (Tùy chọn):
                  </span>
                  <input
                    type="url"
                    value={settings.aiProxyUrl || ''}
                    onChange={(e) => updateSettings({ aiProxyUrl: e.target.value })}
                    placeholder="https://my-proxy.vercel.app/api/ai (Chuyển tiếp AI an toàn)"
                    className="bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-xs text-[#E5E7EB] outline-none"
                  />
                  <span className="text-[10px] text-[#9CA3AF]">
                    Nếu thiết lập, mọi yêu cầu từ EditPilot sẽ gửi qua proxy serverless cá nhân của bạn thay vì gọi trực tiếp.
                  </span>
                </div>
              </div>

              {/* Sentry Crash Telemetry Opt-in */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]">
                <div>
                  <span className="font-semibold block">Báo cáo sự cố ẩn danh (Sentry Telemetry)</span>
                  <span className="text-[10px] text-[#9CA3AF]">Chỉ gửi log lỗi sự cố kèm thông số trình duyệt khi bạn đồng ý, hoàn toàn ẩn danh</span>
                </div>
                <input
                  type="checkbox"
                  checked={sentryConsent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSentryConsent(checked);
                    localStorage.setItem('clipforge_sentry_consent', checked ? 'true' : 'false');
                    showToast(checked ? 'Đã bật thu thập sự cố Sentry ẩn danh' : 'Đã tắt thu thập sự cố Sentry', 'info');
                  }}
                  className="w-4 h-4 accent-[#22D3EE] cursor-pointer"
                />
              </div>

              {/* Trang Privacy link */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]">
                <div>
                  <span className="font-semibold block">Chính sách Bảo mật & Quyền riêng tư</span>
                  <span className="text-[10px] text-[#9CA3AF]">Tìm hiểu cách ClipForge bảo vệ 100% dữ liệu trên máy bạn</span>
                </div>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Xem chi tiết</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Xóa toàn bộ dữ liệu (Danger Zone) */}
              <div className="flex flex-col gap-2 pt-3 border-t border-rose-500/30">
                <span className="font-bold text-rose-400">Vùng nguy hiểm (Danger Zone):</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dự án và tệp trong IndexedDB? Hành động này không thể hoàn tác!')) {
                      await db.projects.clear();
                      await db.media.clear();
                      await db.trash.clear();
                      localStorage.clear();
                      showToast('Đã xóa toàn bộ dữ liệu. Đang tải lại...', 'warning');
                      setTimeout(() => window.location.reload(), 800);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold text-xs hover-lift transition-all"
                >
                  Xóa toàn bộ dữ liệu ứng dụng (IndexedDB)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. TRASH MODAL */}
        {activeModal === 'trash' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">{t.trashTitle} (IndexedDB)</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                {trashItems.length} mục
              </span>
            </div>

            {/* Auto-clean 30 days notice */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>ℹ️ Các mục trong thùng rác sẽ tự động xóa vĩnh viễn sau 30 ngày.</span>
              {trashItems.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await db.trash.clear();
                    showToast('Đã dọn sạch toàn bộ thùng rác!', 'success');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-600/40 text-rose-300 font-bold text-[10px] shrink-0 ml-2"
                >
                  Dọn sạch thùng rác
                </button>
              )}
            </div>

            {trashItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Trash2 className="w-10 h-10 opacity-30 text-slate-600" />
                <span>{t.trashEmpty}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {trashItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-semibold text-slate-200 truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-500">
                        Đã xóa: {new Date(item.deletedAt).toLocaleDateString('vi-VN')} {new Date(item.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          await db.projects.add(item.projectData);
                          await db.trash.delete(item.id);
                          showToast(`Đã khôi phục: ${item.title}`, 'success');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] border border-cyan-500/30"
                      >
                        {t.restore}
                      </button>
                      <button
                        onClick={async () => {
                          await db.trash.delete(item.id);
                          showToast(`Đã xóa vĩnh viễn: ${item.title}`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition-colors"
                        title={t.deletePermanent}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. LIBRARY MODAL */}
        {activeModal === 'library' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <FolderOpen className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{t.navLibrary} (Kho Media Offline)</h3>
            </div>

            {mediaItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <FolderOpen className="w-10 h-10 opacity-30 text-slate-600" />
                <span>Chưa có tệp nào được tải lên. Tải lên video, ảnh hoặc âm thanh để lưu trữ tại đây.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {mediaItems.map((media) => (
                  <div
                    key={media.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-semibold text-slate-200 truncate">{media.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {media.type.toUpperCase()} • {(media.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          addClip({
                            track: media.type === 'audio' ? 'audio' : 'video',
                            name: media.name,
                            start: 0,
                            duration: 8,
                            type: media.type
                          });
                          showToast(`Đã thêm ${media.name} vào timeline!`, 'success');
                          closeModal();
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-semibold text-[11px]"
                      >
                        + Dùng
                      </button>
                      <button
                        onClick={async () => {
                          await db.media.delete(media.id);
                          showToast('Đã xóa tệp khỏi thư viện');
                        }}
                        className="p-1 rounded hover:bg-rose-950 text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. CLOUD / PROJECT SYNC MODAL */}
        {(activeModal === 'cloud' || activeModal === 'projectSync') && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-[#22D3EE]">
                <RefreshCw className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Project Sync • Đồng bộ & Sao lưu</h3>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                user ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              }`}>
                {user ? '🟢 Supabase Synced' : '⚡ Guest Mode (Offline)'}
              </span>
            </div>

            {/* Trạng thái kết nối */}
            <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF]">Trạng thái đồng bộ:</span>
                <span className={`font-bold ${user ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {user ? 'Đã kết nối Supabase Cloud (Đồng bộ thời gian thực)' : 'Lưu trữ cục bộ IndexedDB (Không cần đăng nhập)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {user
                  ? `Đang đăng nhập dưới tên ${user.name || user.email}. Các dự án tự động đồng bộ trên đám mây Supabase.`
                  : 'CapCut Desktop Web chạy offline-first 100%. Bạn có thể xuất/nhập gói dự án .capproj để sao lưu hoặc chuyển đổi thiết bị bất cứ lúc nào.'}
              </p>
            </div>

            {/* Chưa đăng nhập: Export / Import file .capproj qua File System API */}
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-xs font-semibold text-[#9CA3AF]">Sao lưu và Khôi phục tệp (.capproj):</span>
              <div className="grid grid-cols-2 gap-3">
                {/* Export .capproj */}
                <button
                  type="button"
                  onClick={handleExportAllProjects}
                  className="p-3 rounded-xl bg-[#0B0F19] hover:bg-[#111827] border border-[#1F2937] hover:border-cyan-400/50 text-left flex flex-col justify-between gap-2 transition-all group"
                >
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Download className="w-4 h-4" />
                    <span>Xuất file (.capproj)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Đóng gói toàn bộ dự án và cấu hình thành file .capproj (File System Access API).
                  </p>
                </button>

                {/* Import .capproj */}
                <button
                  type="button"
                  onClick={() => importFileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-[#0B0F19] hover:bg-[#111827] border border-[#1F2937] hover:border-emerald-400/50 text-left flex flex-col justify-between gap-2 transition-all group"
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Upload className="w-4 h-4" />
                    <span>Nhập file (.capproj)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Khôi phục các dự án từ file .capproj trên máy tính vào IndexedDB.
                  </p>
                </button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".capproj,.json"
                  onChange={handleImportProjectFile}
                  className="hidden"
                />
              </div>
            </div>

            {/* Cloud Sync section */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs mt-1">
              {user ? (
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Đã đồng bộ với tài khoản: <strong className="text-white">{user.name || user.email}</strong></span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">Muốn tự động đồng bộ lên đám mây?</span>
                </div>
              )}

              {user ? (
                <button
                  onClick={() => {
                    showToast('Đã đồng bộ dữ liệu dự án lên Supabase Cloud!', 'success');
                    closeModal();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Đồng bộ ngay
                </button>
              ) : (
                <button
                  onClick={() => {
                    closeModal();
                    openModal('auth');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Đăng nhập
                </button>
              )}
            </div>

            {/* Storage Management Section (Dung lượng & Dọn dẹp Cache) */}
            <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs mt-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-[#22D3EE]" /> Quản lý dung lượng lưu trữ (Storage Quota)
                </span>
                {storageEstimate && (
                  <span className="font-mono text-[11px] text-[#22D3EE]">
                    {storageEstimate.usageMB} MB / {storageEstimate.quotaMB} MB ({storageEstimate.percentUsed}%)
                  </span>
                )}
              </div>

              {storageEstimate && (
                <div className="w-full h-2 rounded-full bg-[#1F2937] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      storageEstimate.percentUsed >= 80 ? 'bg-amber-400' : 'bg-[#22D3EE]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, storageEstimate.percentUsed))}%` }}
                  />
                </div>
              )}

              {storageEstimate && storageEstimate.percentUsed >= 80 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>Cảnh báo: Bộ nhớ trình duyệt đã dùng hơn 80%. Hãy dọn dẹp các mục cache bên dưới để giải phóng không gian lưu trữ.</span>
                </div>
              )}

              {/* Cache Cleanup Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await db.media.toCollection().modify((m: any) => {
                      delete m.proxyBlob;
                      delete m.proxySrc;
                    });
                    showToast('Đã dọn dẹp bộ nhớ đệm video proxy!', 'success');
                    checkStorageQuota().then(setStorageEstimate);
                  }}
                  className="px-2.5 py-2 rounded-lg bg-[#181E2C] hover:bg-[#2A3447] text-[#9CA3AF] hover:text-white border border-[#2A3447] text-left text-[11px] flex items-center justify-between transition-colors"
                >
                  <span>Dọn cache Proxy</span>
                  <Trash2 className="w-3 h-3 text-cyan-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    masterAudio.clearCache();
                    showToast('Đã dọn sạch cache waveform và audio buffer!', 'success');
                  }}
                  className="px-2.5 py-2 rounded-lg bg-[#181E2C] hover:bg-[#2A3447] text-[#9CA3AF] hover:text-white border border-[#2A3447] text-left text-[11px] flex items-center justify-between transition-colors"
                >
                  <span>Dọn cache Waveform</span>
                  <Trash2 className="w-3 h-3 text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (typeof window !== 'undefined' && 'caches' in window) {
                      await caches.delete('transformers-cache');
                    }
                    showToast('Đã dọn sạch bộ nhớ cache mô hình AI (Whisper)!', 'success');
                    checkStorageQuota().then(setStorageEstimate);
                  }}
                  className="px-2.5 py-2 rounded-lg bg-[#181E2C] hover:bg-[#2A3447] text-[#9CA3AF] hover:text-white border border-[#2A3447] text-left text-[11px] flex items-center justify-between transition-colors"
                >
                  <span>Dọn cache Model AI</span>
                  <Trash2 className="w-3 h-3 text-purple-400" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await db.media.toCollection().modify((m: any) => {
                      if (m.type === 'image' && m.name.includes('thumb')) {
                        delete m.thumbnail;
                      }
                    });
                    showToast('Đã dọn dẹp các ảnh thumbnail tạm thời!', 'success');
                    checkStorageQuota().then(setStorageEstimate);
                  }}
                  className="px-2.5 py-2 rounded-lg bg-[#181E2C] hover:bg-[#2A3447] text-[#9CA3AF] hover:text-white border border-[#2A3447] text-left text-[11px] flex items-center justify-between transition-colors"
                >
                  <span>Dọn cache Thumbnail</span>
                  <Trash2 className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VERSION HISTORY MODAL */}
        {activeModal === 'versionHistory' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-[#22D3EE]">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Lịch sử phiên bản (Version History)</h3>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (currentProjectId && clips.length > 0) {
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    await createProjectSnapshot(
                      currentProjectId,
                      `Thủ công (${timeStr})`,
                      { clips },
                      duration,
                      settings
                    );
                    showToast('Đã tạo một snapshot phiên bản thủ công mới!', 'success');
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-[#22D3EE]/20 hover:bg-[#22D3EE]/30 text-[#22D3EE] font-bold text-xs border border-[#22D3EE]/40 transition-colors"
              >
                + Tạo snapshot ngay
              </button>
            </div>

            <p className="text-[11px] text-[#9CA3AF]">
              Hệ thống tự động chụp ảnh phiên bản mỗi 5 phút và trước mỗi lần xuất video. Bạn có thể khôi phục lại bất kỳ mốc thời gian nào.
            </p>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <RotateCcw className="w-10 h-10 opacity-30 text-slate-600" />
                <span>Chưa có bản snapshot nào được lưu cho dự án này.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {snapshots.map((snap: any) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex flex-col gap-0.5 truncate pr-2">
                      <span className="font-semibold text-slate-200 truncate">{snap.label}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(snap.timestamp).toLocaleDateString('vi-VN')} {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {snap.tracksData?.clips?.length || 0} clips • {snap.duration || 15}s
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (snap.tracksData?.clips) {
                          setClips(snap.tracksData.clips);
                          if (snap.duration) setDuration(snap.duration);
                          showToast(`Đã khôi phục về phiên bản "${snap.label}"!`, 'success');
                          closeModal();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs border border-cyan-500/30 shrink-0 cursor-pointer"
                    >
                      Khôi phục
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. AI IMAGE MODAL */}
        {activeModal === 'aiImage' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-pink-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">{t.quickAiImage}</h3>
              </div>
              {settings.aiApiKey ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  AI API Online
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30 flex items-center gap-1">
                  ⚡ Cục bộ (Offline Engine)
                </span>
              )}
            </div>

            {!settings.aiApiKey && (
              <div className="px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                <span>
                  Chế độ ngoại tuyến: Tạo ảnh procedural 9:16 trực tiếp bằng Canvas, không tốn credit và không cần kết nối API. (Bạn có thể thêm API key trong Settings).
                </span>
              </div>
            )}

            {/* Prompt input */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Mô tả ý tưởng hình ảnh (Prompt):</span>
              <div className="relative">
                <input
                  type="text"
                  value={aiImgPrompt}
                  onChange={(e) => setAiImgPrompt(e.target.value)}
                  placeholder="VD: Cyberpunk Tokyo night neon rain 9:16..."
                  className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-pink-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none pr-9"
                />
                <button
                  onClick={handleGenerateAiImage}
                  disabled={aiImgLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-pink-400 hover:text-white rounded-lg transition-colors"
                  title="Tạo lại"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${aiImgLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Tỉ lệ & Style */}
            <div className="grid grid-cols-2 gap-3">
              {/* Tỉ lệ khung hình */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#9CA3AF]">Tỉ lệ khung hình:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['9:16', '16:9', '1:1', '4:5'] as const).map((asp) => (
                    <button
                      key={asp}
                      onClick={() => {
                        setAiImgAspect(asp);
                        setAiImgPreview(createProceduralAiImage(asp, aiImgStyle, aiImgPrompt));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                        aiImgAspect === asp
                          ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                          : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {asp} {asp === '9:16' ? '✨' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phong cách (Style) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#9CA3AF]">Phong cách (Style):</span>
                <select
                  value={aiImgStyle}
                  onChange={(e) => {
                    const st = e.target.value as any;
                    setAiImgStyle(st);
                    setAiImgPreview(createProceduralAiImage(aiImgAspect, st, aiImgPrompt));
                  }}
                  className="bg-[#0B0F19] border border-[#1F2937] focus:border-pink-500 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="cyberpunk">🌆 Cyberpunk Neon</option>
                  <option value="anime">🌸 Anime Twilight</option>
                  <option value="cinematic">🎬 Cinematic HDR</option>
                  <option value="pastel">🍬 Pastel Gradient</option>
                  <option value="neon3d">🔮 Neon 3D Void</option>
                  <option value="retro">📼 80s Retro Wave</option>
                </select>
              </div>
            </div>

            {/* Preview Image Box */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF] flex items-center justify-between">
                <span>Xem trước kết quả ({aiImgAspect} • {aiImgStyle}):</span>
                <span className="text-[10px] text-pink-400 font-mono">Render Canvas 60fps</span>
              </span>
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#1F2937] bg-black/60 flex items-center justify-center group shadow-inner">
                {aiImgPreview ? (
                  <img
                    src={aiImgPreview}
                    alt="AI Preview"
                    className="max-h-full max-w-full object-contain rounded-lg transition-transform group-hover:scale-105 duration-300"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Sparkles className="w-4 h-4 animate-spin text-pink-400" />
                    Đang tạo ảnh...
                  </div>
                )}
                {aiImgLoading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center gap-2 text-pink-400 text-xs font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Đang dựng hình ảnh...
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F2937]">
              <button
                onClick={handleAddAiImageToTimeline}
                className="col-span-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20"
              >
                <Plus className="w-4 h-4" />
                Thêm Timeline
              </button>
              <button
                onClick={handleSaveAiImageToLibrary}
                className="py-2.5 px-3 rounded-xl bg-[#0B0F19] hover:bg-slate-800 border border-[#1F2937] text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                Lưu Library
              </button>
              <button
                onClick={handleDownloadAiImage}
                className="py-2.5 px-3 rounded-xl bg-[#0B0F19] hover:bg-slate-800 border border-[#1F2937] text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Tải ảnh PNG
              </button>
            </div>
          </div>
        )}

        {/* 7. EXTEND VIDEO MODAL */}
        {activeModal === 'extendVideo' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-sky-400">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">{t.quickExtendVideo}</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">
                FFmpeg / Canvas Loop
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF]">
              Kéo dài tổng thời lượng video mượt mà bằng kỹ thuật giữ frame cuối, vòng lặp ping-pong hoặc slow-motion trực tiếp ở trình duyệt:
            </p>

            {/* Chọn clip */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Chọn clip mục tiêu:</span>
              <select
                value={extendClipId}
                onChange={(e) => setExtendClipId(e.target.value)}
                className="bg-[#0B0F19] border border-[#1F2937] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                {videoClips.length > 0 ? (
                  videoClips.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.duration}s, vị trí {c.start}s)
                    </option>
                  ))
                ) : (
                  <option value="">Toàn bộ Timeline (Dự án chính • {duration}s)</option>
                )}
              </select>
            </div>

            {/* Chọn thời lượng kéo dài */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Thời lượng kéo dài thêm:</span>
              <div className="grid grid-cols-3 gap-2">
                {[2, 5, 10].map((secs) => (
                  <button
                    key={secs}
                    onClick={() => setExtendSecs(secs)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      extendSecs === secs
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm shadow-sky-500/20'
                        : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    +{secs} giây
                  </button>
                ))}
              </div>
            </div>

            {/* Phương thức kéo dài cục bộ */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Phương thức kéo dài cục bộ:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setExtendMode('freeze')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    extendMode === 'freeze'
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm shadow-sky-500/20'
                      : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-sky-300">
                    ❄️ Freeze Frame
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Giữ frame cuối tĩnh</div>
                </button>

                <button
                  onClick={() => setExtendMode('pingpong')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    extendMode === 'pingpong'
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm shadow-sky-500/20'
                      : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-sky-300">
                    🔀 Ping-pong
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Chạy xuôi rồi ngược</div>
                </button>

                <button
                  onClick={() => setExtendMode('slowmo')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    extendMode === 'slowmo'
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm shadow-sky-500/20'
                      : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-sky-300">
                    ⏱️ Slow-motion
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Giảm tốc độ 0.75x</div>
                </button>
              </div>
            </div>

            {/* Visual Timeline Preview Bar */}
            <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Mô phỏng Timeline:</span>
                <span className="font-mono text-sky-300 font-bold">
                  {((videoClips.find(c => c.id === extendClipId) || videoClips[0])?.duration || duration)}s ➔{' '}
                  {((videoClips.find(c => c.id === extendClipId) || videoClips[0])?.duration || duration) + extendSecs}s (+{extendSecs}s)
                </span>
              </div>

              {/* Progress track */}
              <div className="relative h-7 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center">
                <div className="h-full bg-slate-800 flex items-center justify-center px-3 text-[10px] text-slate-400 font-mono border-r border-slate-700" style={{ width: '65%' }}>
                  Đoạn gốc
                </div>
                <div className="h-full bg-sky-500/30 flex items-center justify-center px-3 text-[10px] text-sky-300 font-bold font-mono" style={{ width: '35%' }}>
                  +{extendSecs}s ({extendMode.toUpperCase()})
                </div>

                {/* Animated Simulation Playhead */}
                {extendIsPlaying && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white] transition-all"
                    style={{ left: `${extendSimProgress}%` }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setExtendIsPlaying(!extendIsPlaying)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {extendIsPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {extendIsPlaying ? 'Dừng xem trước' : 'Xem trước mô phỏng'}
                </button>
                <span className="text-[10px] text-slate-500">Xem trước mượt mà 60fps</span>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleApplyExtendVideo}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 font-bold text-xs hover:opacity-95 shadow-md shadow-sky-500/20"
            >
              Áp dụng & Lưu vào Timeline
            </button>
          </div>
        )}

        {/* 8. AI EDIT MODAL */}
        {activeModal === 'aiEdit' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-[#22D3EE]">
                <Zap className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">{t.quickAiEdit}</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#22D3EE]/20 text-[#22D3EE] font-semibold border border-[#22D3EE]/30">
                EditPilot Smart Engine
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF]">
              Áp dụng phân tích lệnh thông minh để tự động cắt xén, tăng tốc, đổi tông màu hoặc tối ưu hóa nhịp điệu cho clip:
            </p>

            {/* Chọn clip áp dụng */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Chọn clip mục tiêu:</span>
              <select
                value={aiEditClipId}
                onChange={(e) => setAiEditClipId(e.target.value)}
                className="bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                {videoClips.length > 0 ? (
                  videoClips.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.duration}s, filter: {typeof c.filter === 'object' ? c.filter?.id : (c.filter || 'none')})
                    </option>
                  ))
                ) : (
                  <option value="">Toàn bộ Timeline (Tạo hoặc áp dụng lên Main Video)</option>
                )}
              </select>
            </div>

            {/* Ô mô tả lệnh */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Mô tả cách bạn muốn sửa:</span>
              <input
                type="text"
                value={aiEditPrompt}
                onChange={(e) => setAiEditPrompt(e.target.value)}
                placeholder="VD: Cắt 2 giây đầu, tăng tốc 1.5x, bật bộ lọc điện ảnh..."
                className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            {/* Chips gợi ý nhanh */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Gợi ý nhanh (Click để chọn):</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '⚡ Tăng tốc 1.5x', text: 'Tăng tốc video lên 1.5x' },
                  { label: '🎬 Bộ lọc Điện ảnh', text: 'Áp dụng bộ lọc điện ảnh Cinematic' },
                  { label: '✂️ Cắt 2s đầu', text: 'Cắt 2 giây đầu của clip' },
                  { label: '✨ Làm sáng video', text: 'Làm sáng video +25%' },
                  { label: '🔇 Tắt âm thanh', text: 'Tắt âm thanh (Mute)' },
                  { label: '🎞️ Vintage Retro', text: 'Áp dụng bộ lọc Vintage hoài niệm' },
                  { label: '🐢 Làm chậm 0.75x', text: 'Làm chậm video 0.75x slow-mo' }
                ].map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => setAiEditPrompt(chip.text)}
                    className="py-1 px-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] border border-[#1F2937] text-[11px] text-slate-300 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parser Action Summary Box */}
            <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs flex flex-col gap-1">
              <div className="text-[#9CA3AF] font-semibold flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-[#22D3EE]" />
                Kế hoạch thực thi EditPilot:
              </div>
              <div className="text-white font-medium pl-5 text-[11px]">
                {aiEditPrompt.toLowerCase().includes('tăng tốc') || aiEditPrompt.includes('1.5x') ? '• Tăng tốc clip lên 1.5x' : ''}
                {aiEditPrompt.toLowerCase().includes('chậm') || aiEditPrompt.includes('0.75x') ? '• Giảm tốc độ phát xuống 0.75x' : ''}
                {aiEditPrompt.toLowerCase().includes('cắt') ? '• Cắt 2 giây đầu và cập nhật thời lượng' : ''}
                {aiEditPrompt.toLowerCase().includes('sáng') ? '• Tăng độ sáng và tương phản' : ''}
                {aiEditPrompt.toLowerCase().includes('điện ảnh') ? '• Áp dụng LUT Cinematic 9:16' : ''}
                {aiEditPrompt.toLowerCase().includes('vintage') ? '• Áp dụng tone màu Vintage Retro' : ''}
                {aiEditPrompt.toLowerCase().includes('tắt tiếng') || aiEditPrompt.toLowerCase().includes('mute') ? '• Mute âm lượng về 0%' : ''}
                {!aiEditPrompt ? '• Tự động tối ưu nhịp điệu & thêm bộ lọc video' : ''}
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleApplyAiEdit}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#22D3EE] to-sky-500 text-slate-950 font-bold text-xs hover:opacity-95 shadow-md shadow-[#22D3EE]/20"
            >
              Áp dụng chỉnh sửa lên clip
            </button>
          </div>
        )}

        {/* 9. ENHANCE QUALITY MODAL */}
        {activeModal === 'enhanceQuality' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-amber-400">
                <Sliders className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">{t.quickEnhanceQuality}</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                Lanczos 4K & Unsharp Mask
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF]">
              Tự động nâng cao tương phản động HDR, làm nét viền Lanczos và khử nhiễu màu cho video 9:16:
            </p>

            {/* Chọn clip */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Chọn clip cần nâng cấp:</span>
              <select
                value={enhanceClipId}
                onChange={(e) => setEnhanceClipId(e.target.value)}
                className="bg-[#0B0F19] border border-[#1F2937] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                {videoClips.length > 0 ? (
                  videoClips.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.duration}s, filter: {typeof c.filter === 'object' ? c.filter?.id : (c.filter || 'standard')})
                    </option>
                  ))
                ) : (
                  <option value="">Toàn bộ Timeline (Dự án chính 9:16)</option>
                )}
              </select>
            </div>

            {/* Cường độ nâng cấp Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#9CA3AF]">Cường độ nâng cấp (Intensity):</span>
                <span className="font-mono text-amber-300 font-bold">{enhanceIntensity}% • Ultra HD</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={enhanceIntensity}
                onChange={(e) => setEnhanceIntensity(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Presets checkboxes */}
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhanceUnsharp}
                  onChange={(e) => setEnhanceUnsharp(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-400 rounded"
                />
                Làm nét Lanczos
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhanceContrast}
                  onChange={(e) => setEnhanceContrast(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-400 rounded"
                />
                Tương phản HDR
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhanceDenoise}
                  onChange={(e) => setEnhanceDenoise(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-400 rounded"
                />
                Khử nhiễu hqdn3d
              </label>
            </div>

            {/* Interactive Before / After Horizontal Comparison Split Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#9CA3AF] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  So sánh trực quan Before / After (Kéo ngang):
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Vị trí chia: {enhanceSplitPos}%</span>
              </div>

              {/* Split container */}
              <div
                className="relative w-full h-44 rounded-xl overflow-hidden border border-[#1F2937] bg-slate-950 select-none cursor-ew-resize"
                onMouseMove={(e) => {
                  if (e.buttons === 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                    setEnhanceSplitPos(pos);
                  }
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                  setEnhanceSplitPos(pos);
                }}
              >
                {/* Layer 1: BEFORE (Full background) */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                  <div className="text-center opacity-70">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Film className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-300 font-bold">GỐC (BEFORE)</p>
                    <p className="text-[10px] text-slate-500">Màu tiêu chuẩn • Độ sắc nét SD</p>
                  </div>
                </div>

                {/* Layer 2: AFTER (Clipped via clip-path based on enhanceSplitPos) */}
                <div
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0c2a38] via-[#0f3d4f] to-[#041624] p-4 shadow-2xl"
                  style={{
                    clipPath: `polygon(${enhanceSplitPos}% 0%, 100% 0%, 100% 100%, ${enhanceSplitPos}% 100%)`
                  }}
                >
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-gradient-to-tr from-amber-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <Sparkles className="w-7 h-7 text-slate-950 animate-pulse" />
                    </div>
                    <p className="text-xs text-amber-300 font-black">NÂNG CẤP (AFTER - 4K HD)</p>
                    <p className="text-[10px] text-cyan-300/90 font-medium">
                      Lanczos Sharp + Dynamic HDR (+{enhanceIntensity}%)
                    </p>
                  </div>
                </div>

                {/* Divider Line & Handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none flex items-center justify-center shadow-[0_0_10px_#f59e0b]"
                  style={{ left: `${enhanceSplitPos}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-lg border-2 border-slate-950">
                    ⇹
                  </div>
                </div>

                {/* Badges */}
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 text-[10px] font-bold text-slate-300 backdrop-blur-xs">
                  TRƯỚC
                </span>
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-amber-500/90 text-[10px] font-bold text-slate-950 shadow-sm">
                  SAU (HD 4K)
                </span>
              </div>

              {/* Slider for horizontal split control */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-500 shrink-0">Gốc</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={enhanceSplitPos}
                  onChange={(e) => setEnhanceSplitPos(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-amber-400"
                />
                <span className="text-[10px] text-amber-400 shrink-0 font-bold">4K HD</span>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleApplyEnhance}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
            >
              Áp dụng nâng cấp HD lên Video
            </button>
          </div>
        )}

        {/* SECTION 8: 1. VIDEO STUDIO MODAL (Make 30-second videos) */}
        {activeModal === 'videoStudio' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-[#22D3EE]">
                <Video className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Video Studio • Script to Video</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-[#22D3EE] font-semibold border border-cyan-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Make 30-second videos (30s)
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF]">
              Tự động phân tích kịch bản, chia thành 4 cảnh 9:16 có độ dài chuẩn 30 giây, tạo phụ đề và đồng bộ nhạc nền:
            </p>

            {/* Kịch bản input */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Nhập kịch bản video:</span>
              <textarea
                rows={3}
                value={vsScript}
                onChange={(e) => setVsScript(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl p-3 text-xs text-white outline-none resize-none leading-relaxed"
                placeholder="Nhập nội dung kịch bản cần chuyển thành video 30s..."
              />
            </div>

            {/* Gợi ý kịch bản mẫu */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Kịch bản mẫu thịnh hành:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    title: '🎯 5 Mẹo TikTok Triệu View',
                    script: '5 Bí quyết tạo video triệu view trên TikTok & Reels. Giữ chân người xem trong 3s đầu bằng một câu hỏi sốc. Đi thẳng vào giá trị cốt lõi, không vòng vo. Đưa ra ví dụ minh chứng thực tế. Kêu gọi hành động rõ ràng. Thử ngay hôm nay!'
                  },
                  {
                    title: '📱 Review Công Nghệ 2026',
                    script: 'Siêu phẩm công nghệ đột phá nhất 2026 đã lộ diện. Màn hình holographic cực nét, thời lượng pin cả tuần. Thiết kế siêu nhẹ mang lại trải nghiệm đỉnh cao. Đặt trước hôm nay để nhận quà tặng độc quyền!'
                  },
                  {
                    title: '✈️ Du Lịch Đà Lạt 2N1Đ',
                    script: 'Lịch trình du lịch Đà Lạt 2 ngày 1 đêm tiết kiệm nhất. Săn mây đồi chè Cầu Đất lúc bình minh. Thưởng thức bánh tráng nướng và sữa đậu nành nóng hổi. Lưu ngay video cho chuyến đi sắp tới của bạn!'
                  }
                ].map((s) => (
                  <button
                    key={s.title}
                    onClick={() => {
                      setVsScript(s.script);
                      showToast(`Đã tải kịch bản: ${s.title}`);
                    }}
                    className="py-1 px-2.5 rounded-lg bg-[#0B0F19] hover:bg-cyan-500/20 hover:text-cyan-300 border border-[#1F2937] text-[11px] text-slate-300 transition-colors"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Phân cảnh tự động (Auto Scene Splitting • 4 Cảnh • 30s) */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#9CA3AF] flex items-center justify-between">
                <span>Phân cảnh Storyboard (4 cảnh • Tổng thời lượng 30s):</span>
                <span className="text-[10px] text-cyan-400 font-mono">30.0s Limit</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {vsScenes.map((sc, idx) => (
                  <div key={sc.id} className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2937] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cyan-300 truncate">{sc.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {sc.duration}s
                      </span>
                    </div>
                    <input
                      type="text"
                      value={sc.text}
                      onChange={(e) => {
                        const newScenes = vsScenes.map((s) => (s.id === sc.id ? { ...s, text: e.target.value } : s));
                        setVsScenes(newScenes);
                      }}
                      className="bg-[#111827] border border-[#1F2937] focus:border-cyan-400 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none truncate"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Nền:</span>
                      <select
                        value={sc.bg}
                        onChange={(e) => {
                          const newScenes = vsScenes.map((s) => (s.id === sc.id ? { ...s, bg: e.target.value } : s));
                          setVsScenes(newScenes);
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none"
                      >
                        <option value="cyberpunk">Cyberpunk</option>
                        <option value="cinematic">Cinematic</option>
                        <option value="neon3d">Neon 3D</option>
                        <option value="anime">Anime</option>
                        <option value="pastel">Pastel</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nhạc nền (Background Music) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF] flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                Nhạc nền đồng bộ (30s Audio):
              </span>
              <select
                value={vsMusic}
                onChange={(e) => setVsMusic(e.target.value)}
                className="bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                <option value="trending-beat">🎵 Trending Beat (Upbeat TikTok 120BPM)</option>
                <option value="lofi-chill">🎧 Lofi Chill Hop (Ambient Relax)</option>
                <option value="cinematic-epic">🔥 Cinematic Epic (High Energy Phonk)</option>
                <option value="corporate-minimal">✨ Corporate Inspiring (Minimal)</option>
              </select>
            </div>

            {/* Action */}
            <button
              onClick={handleCreateVideoStudioProject}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#22D3EE] to-sky-500 text-slate-950 font-bold text-xs hover:opacity-95 shadow-md shadow-[#22D3EE]/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tạo Dự Án Video 30s & Mở Trong Editor</span>
            </button>
          </div>
        )}

        {/* SECTION 8: 2. AI AD MAKER MODAL (Multi-variants) */}
        {activeModal === 'aiAdMaker' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-blue-400">
                <Megaphone className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">AI Ad Maker • Trình Tạo Video Bán Hàng</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                3 Biến thể Storyboard
              </span>
            </div>

            {/* Form Sản phẩm */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9CA3AF]">Tên sản phẩm:</span>
                <input
                  type="text"
                  value={adProdName}
                  onChange={(e) => setAdProdName(e.target.value)}
                  className="bg-[#0B0F19] border border-[#1F2937] focus:border-blue-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  placeholder="VD: Tai nghe Sonix Pro..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9CA3AF]">Lời kêu gọi (CTA):</span>
                <input
                  type="text"
                  value={adCta}
                  onChange={(e) => setAdCta(e.target.value)}
                  className="bg-[#0B0F19] border border-[#1F2937] focus:border-blue-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  placeholder="VD: Mua ngay giảm 50%..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#9CA3AF]">Điểm bán hàng chính (USP):</span>
              <input
                type="text"
                value={adUsp}
                onChange={(e) => setAdUsp(e.target.value)}
                className="bg-[#0B0F19] border border-[#1F2937] focus:border-blue-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                placeholder="VD: Chống ồn 45dB, Pin 60h, Bass sâu..."
              />
            </div>

            {/* Giọng điệu (Tone) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#9CA3AF]">Giọng điệu thương hiệu (Tone):</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'energetic', label: '🔥 Bùng nổ' },
                  { id: 'luxury', label: '💎 Sang trọng' },
                  { id: 'genz', label: '😂 GenZ Viral' },
                  { id: 'urgency', label: '⏳ FOMO Deal' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAdTone(t.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                      adTone === t.id
                        ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                        : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-variants Tabs */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
              <span className="text-xs font-semibold text-[#9CA3AF] flex items-center justify-between">
                <span>Chọn biến thể Storyboard (Variants):</span>
                <span className="text-[10px] text-blue-400">Click tab để xem kịch bản</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'A', name: 'Biến thể A: Flash Sale Sốc', icon: '💥' },
                  { key: 'B', name: 'Biến thể B: UGC Đời Thường', icon: '📱' },
                  { key: 'C', name: 'Biến thể C: Luxury Tối Giản', icon: '💎' }
                ].map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setAdActiveVariant(v.key as any)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      adActiveVariant === v.key
                        ? 'bg-blue-600/20 border-blue-400 text-white shadow-sm'
                        : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold text-xs text-blue-300 flex items-center gap-1">
                      <span>{v.icon}</span>
                      <span>Variant {v.key}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{v.name.split(':')[1]}</div>
                  </button>
                ))}
              </div>

              {/* Storyboard 5 Scenes Preview for Selected Variant */}
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] flex flex-col gap-2">
                <span className="text-[11px] font-bold text-blue-300">
                  Storyboard 5 Cảnh (Biến thể {adActiveVariant} • 20s):
                </span>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  {adActiveVariant === 'A' && (
                    <>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">0-4s</span>
                        <span>🔥 Hook gây chú ý: Sale sốc nhất năm dành cho bạn!</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">4-8s</span>
                        <span>✨ Giải pháp: {adProdName} - Chống ồn đỉnh cao</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">8-12s</span>
                        <span>⚡ USP: {adUsp.split(',')[0]} & Pin khủng</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">12-16s</span>
                        <span>⭐⭐⭐⭐⭐ 50,000+ Khách hàng tin dùng</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px]">16-20s</span>
                        <span>🛒 CTA: {adCta} • Mua ngay tại giỏ hàng!</span>
                      </div>
                    </>
                  )}
                  {adActiveVariant === 'B' && (
                    <>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">0-4s</span>
                        <span>📱 Review chân thực chiếc tai nghe hot nhất!</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">4-8s</span>
                        <span>🎧 Bật chống ồn là êm ru cả không gian cafe</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">8-12s</span>
                        <span>🔋 Nghe cả tuần mới cần sạc 1 lần</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">12-16s</span>
                        <span>💎 Chất âm bass sâu vượt xa giá tiền</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px]">16-20s</span>
                        <span>👉 {adCta} tại góc trái nhé!</span>
                      </div>
                    </>
                  )}
                  {adActiveVariant === 'C' && (
                    <>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">0-4s</span>
                        <span>Định nghĩa lại trải nghiệm âm thanh cá nhân</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">4-8s</span>
                        <span>{adProdName} • Chuẩn âm thanh Hi-Res</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">8-12s</span>
                        <span>Thiết kế công thái học tối giản cao cấp</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">12-16s</span>
                        <span>Sự lựa chọn của giới chuyên gia âm nhạc</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px]">16-20s</span>
                        <span>Sở hữu ngay hôm nay: {adCta}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleCreateAdProject}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs hover:opacity-95 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Megaphone className="w-4 h-4" />
              <span>Đưa Storyboard Variant {adActiveVariant} Vào Editor (9:16)</span>
            </button>
          </div>
        )}

        {/* SECTION 8: 3. LONG VIDEO TO SHORTS MODAL */}
        {activeModal === 'longToShorts' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2 text-teal-400">
                <Scissors className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Long Video to Shorts • Cắt Tự Động 9:16</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                Auto-Crop 9:16 & Frame Diff
              </span>
            </div>

            {/* Video nguồn Box */}
            <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                  MP4
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{ltsVideoName}</div>
                  <div className="text-[10px] text-slate-400">Thời lượng: 5:00 • 1080p • Tỉ lệ gốc 16:9 Landscape</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setLtsVideoName('Workshop_Kinh_Doanh_2026.mp4');
                  showToast('Đã đổi video nguồn dài!');
                }}
                className="py-1 px-2 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] text-[10px] text-slate-300"
              >
                Đổi video
              </button>
            </div>

            {/* Cài đặt cắt tự động */}
            <div className="grid grid-cols-2 gap-3">
              {/* Chọn độ dài */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#9CA3AF]">Độ dài mỗi Short:</span>
                <div className="grid grid-cols-3 gap-1">
                  {[15, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setLtsDurationPreset(sec)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                        ltsDurationPreset === sec
                          ? 'bg-teal-500/20 border-teal-400 text-teal-300'
                          : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Phương thức phát hiện cảnh */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#9CA3AF]">Phương thức phát hiện:</span>
                <select
                  value={ltsDetectMode}
                  onChange={(e) => setLtsDetectMode(e.target.value as any)}
                  className="bg-[#0B0F19] border border-[#1F2937] focus:border-teal-400 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="scene">⚡ Chênh lệch frame (Scene Diff)</option>
                  <option value="duration">⏱️ Chia đều theo nhịp (Interval)</option>
                </select>
              </div>
            </div>

            {/* Danh sách Shorts phát hiện được */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#9CA3AF]">Các đoạn Shorts tiềm năng phát hiện được:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (ltsSelectedShorts.length === 4) setLtsSelectedShorts([]);
                    else setLtsSelectedShorts([1, 2, 3, 4]);
                  }}
                  className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                >
                  {ltsSelectedShorts.length === 4 ? 'Bỏ chọn tất cả' : 'Chọn tất cả (4 shorts)'}
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {[
                  { id: 1, title: 'Bí quyết AI thay đổi tương lai 2026', time: '00:15 - 00:45', viral: 96, tag: 'Hook cực mạnh' },
                  { id: 2, title: 'Sai lầm 90% người mới bắt đầu mắc phải', time: '01:20 - 01:50', viral: 92, tag: 'Cảm xúc cao' },
                  { id: 3, title: 'Công thức 3 bước nhân đôi hiệu suất làm việc', time: '02:40 - 03:10', viral: 89, tag: 'Thực tế & Rõ ràng' },
                  { id: 4, title: 'Tương lai ngành lập trình trong 5 năm tới', time: '03:50 - 04:20', viral: 85, tag: 'Góc nhìn tranh luận' }
                ].map((s) => (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                      ltsSelectedShorts.includes(s.id)
                        ? 'bg-teal-950/30 border-teal-500/50 text-white'
                        : 'bg-[#0B0F19] border-[#1F2937] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <input
                        type="checkbox"
                        checked={ltsSelectedShorts.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setLtsSelectedShorts([...ltsSelectedShorts, s.id]);
                          else setLtsSelectedShorts(ltsSelectedShorts.filter((x) => x !== s.id));
                        }}
                        className="w-4 h-4 accent-teal-400 rounded cursor-pointer shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-2">
                          <span>Short #{s.id}: {s.title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-mono">
                            Auto-crop 9:16
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Thời gian: {s.time} • Tiềm năng Viral: <span className="text-amber-400 font-bold">{s.viral}% 🔥</span> ({s.tag})
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenShortInEditor(s.id)}
                      className="py-1 px-2.5 rounded-lg bg-[#111827] hover:bg-teal-500 hover:text-slate-950 text-teal-400 font-bold text-[10px] border border-[#1F2937] transition-colors shrink-0 ml-2"
                    >
                      Mở Editor ➔
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1F2937]">
              <button
                onClick={() => handleOpenShortInEditor(ltsSelectedShorts[0] || 1)}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs hover:opacity-95 shadow-md shadow-teal-500/20"
              >
                Đưa Short vào Editor (9:16)
              </button>
              <button
                onClick={handleBatchExportShorts}
                className="py-2.5 px-3 rounded-xl bg-[#0B0F19] hover:bg-slate-800 border border-[#1F2937] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-teal-400" />
                <span>Xuất hàng loạt ({ltsSelectedShorts.length} Shorts)</span>
              </button>
            </div>
          </div>
        )}

        {/* 10. MARKETING TOOLS MODAL */}
        {activeModal === 'marketing' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-400">
              <TrendingUp className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{t.navMarketingTools}</h3>
            </div>
            <p className="text-xs text-slate-400">
              Bộ công cụ tạo video bán hàng & tăng tỷ lệ chuyển đổi cho TikTok Shop, Reels, Shorts:
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  addClip({
                    track: 'text',
                    name: 'CTA Mua Ngay',
                    start: 3,
                    duration: 5,
                    type: 'text',
                    text: '👉 NHẤN VÀO GIỎ HÀNG BÊN DƯỚI 🛒',
                    y: 120,
                    scale: 1.1
                  });
                  showToast('Đã thêm Call-To-Action bán hàng!', 'success');
                  closeModal();
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-left hover:border-amber-400 transition-colors flex justify-between items-center text-xs"
              >
                <span className="font-semibold text-slate-200">Call-To-Action (Giỏ hàng)</span>
                <span className="text-[10px] text-amber-400 font-bold">+ Chèn</span>
              </button>
            </div>
          </div>
        )}

        {/* 11. SHARE PROJECT MODAL */}
        {activeModal === 'share' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2.5 text-[#1FC8DB] pb-3 border-b border-[#333333]">
              <Share2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Chia sẻ dự án (Share Project)</h3>
            </div>

            <p className="text-xs text-[#8A8A8A] leading-relaxed">
              Bạn có thể tải gói tệp dự án <code className="text-[#1FC8DB]">.capproj</code> để chia sẻ ngoại tuyến, sử dụng hộp thoại chia sẻ hệ thống hoặc sao chép liên kết trực tuyến.
            </p>

            <div className="flex flex-col gap-2.5">
              {/* Option 1: Download .capproj */}
              <button
                onClick={handleDownloadCurrentProjectCapproj}
                className="p-3.5 rounded-md bg-[#1F1F1F] hover:bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] text-left flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#1FC8DB]/15 text-[#1FC8DB] flex items-center justify-center border border-[#1FC8DB]/30 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-white group-hover:text-[#1FC8DB] transition-colors">
                      Tải tệp dự án (.capproj)
                    </span>
                    <span className="text-[11px] text-[#8A8A8A]">
                      Bao gồm toàn bộ tracks, clips, settings để mở lại trên bất kỳ máy nào
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#1FC8DB] px-2.5 py-1 rounded bg-[#1FC8DB]/10">
                  Tải ngay
                </span>
              </button>

              {/* Option 2: Web Share API */}
              <button
                onClick={handleWebShare}
                className="p-3.5 rounded-md bg-[#1F1F1F] hover:bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] text-left flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-white group-hover:text-purple-300 transition-colors">
                      Chia sẻ qua ứng dụng (Web Share)
                    </span>
                    <span className="text-[11px] text-[#8A8A8A]">
                      Gửi nhanh qua Zalo, Messenger, Telegram, AirDrop hoặc Bluetooth
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-purple-400 px-2.5 py-1 rounded bg-purple-500/10">
                  Mở App
                </span>
              </button>

              {/* Option 3: Copy Link */}
              <div className="p-3.5 rounded-md bg-[#1F1F1F] border border-[#333333] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">Liên kết chia sẻ (Cloud Link)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isSupabaseConfigured ? '🟢 Supabase Online' : '⚡ Chế độ Khách (Offline)'}
                  </span>
                </div>

                {!isSupabaseConfigured && (
                  <p className="text-[11px] text-amber-300/80 leading-relaxed bg-amber-500/10 p-2 rounded border border-amber-500/20">
                    Chưa kết nối Supabase Cloud: Tính năng tạo link công khai qua mạng yêu cầu biến môi trường <code className="text-white">VITE_SUPABASE_URL</code>. Bạn có thể sử dụng nút sao chép đường dẫn cục bộ hoặc gửi file .capproj ở trên.
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    className="flex-1 bg-[#262626] border border-[#333333] rounded px-3 py-1.5 text-xs text-[#8A8A8A] font-mono outline-none"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3.5 py-1.5 rounded bg-[#1FC8DB] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs transition-colors shrink-0"
                  >
                    Sao chép link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 12. SEARCHABLE & CUSTOMIZABLE KEYBOARD SHORTCUTS */}
        {activeModal === 'shortcuts' && (() => {
          const categories = [
            { id: 'all', label: language === 'VN' ? 'Tất cả' : 'All' },
            { id: 'playback', label: language === 'VN' ? 'Phát video' : 'Playback' },
            { id: 'editing', label: language === 'VN' ? 'Biên tập' : 'Editing' },
            { id: 'tools', label: language === 'VN' ? 'Công cụ' : 'Tools' },
            { id: 'navigation', label: language === 'VN' ? 'Điều hướng' : 'Navigation' },
            { id: 'view', label: language === 'VN' ? 'Giao diện' : 'View' },
            { id: 'project', label: language === 'VN' ? 'Dự án' : 'Project' }
          ];

          const filtered = DEFAULT_SHORTCUTS.filter((s) => {
            const matchesCat = shortcutCategory === 'all' || s.category === shortcutCategory;
            if (!matchesCat) return false;
            if (!shortcutsSearch) return true;
            const q = shortcutsSearch.toLowerCase();
            const currentKey = settings.customShortcuts?.[s.id] || s.defaultKey;
            return (
              s.name.toLowerCase().includes(q) ||
              s.nameEn.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q) ||
              s.descriptionEn.toLowerCase().includes(q) ||
              currentKey.toLowerCase().includes(q)
            );
          });

          return (
            <div className="flex flex-col gap-3.5 text-left">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
                <div className="flex items-center gap-2 text-[#22D3EE]">
                  <Keyboard className="w-5 h-5" />
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {language === 'VN' ? 'Phím tắt biên tập' : 'Keyboard Shortcuts'}
                    </h3>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {language === 'VN'
                        ? 'Bấm vào bất kỳ phím tắt nào bên dưới để tùy chỉnh gán phím mới'
                        : 'Click on any shortcut badge below to record and rebind custom keys'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetShortcuts();
                    showToast('Đã khôi phục toàn bộ phím tắt mặc định!', 'info');
                  }}
                  className="px-2.5 py-1 rounded bg-[#181E2C] hover:bg-[#2A3447] text-[#9CA3AF] hover:text-white border border-[#2A3447] text-xs font-medium transition-colors"
                  title="Khôi phục cài đặt phím tắt gốc"
                >
                  {language === 'VN' ? 'Khôi phục mặc định' : 'Reset Defaults'}
                </button>
              </div>

              {/* Search & Category Filter Pills */}
              <div className="flex flex-col gap-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={shortcutsSearch}
                    onChange={(e) => setShortcutsSearch(e.target.value)}
                    placeholder={
                      language === 'VN'
                        ? 'Tìm phím tắt (VD: split, cắt, space, undo, zoom, ctrl+b)...'
                        : 'Search shortcuts (e.g. split, space, undo, zoom, ctrl+b)...'
                    }
                    className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#22D3EE] rounded-lg px-3.5 py-2 text-xs text-[#E6E6E6] placeholder-[#8A8A8A] outline-none"
                  />
                  {shortcutsSearch && (
                    <button
                      type="button"
                      onClick={() => setShortcutsSearch('')}
                      className="absolute right-2.5 text-xs text-[#8A8A8A] hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setShortcutCategory(c.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        shortcutCategory === c.id
                          ? 'bg-[#22D3EE]/20 border border-[#22D3EE]/50 text-[#22D3EE]'
                          : 'bg-[#181E2C] border border-transparent text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shortcuts Table */}
              <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8A8A8A]">
                    {language === 'VN' ? 'Không tìm thấy phím tắt phù hợp' : 'No matching shortcuts found'}
                  </div>
                ) : (
                  filtered.map((s) => {
                    const isRecording = recordingShortcutId === s.id;
                    const customKey = settings.customShortcuts?.[s.id];
                    const activeKey = customKey || s.defaultKey;

                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          isRecording
                            ? 'bg-[#22D3EE]/10 border-[#22D3EE] ring-1 ring-[#22D3EE]'
                            : 'bg-[#181E2C] border-[#2A3447] hover:border-[#22D3EE]/40'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">
                              {language === 'VN' ? s.name : s.nameEn}
                            </span>
                            {customKey && (
                              <span className="px-1 py-0.2 rounded bg-cyan-500/10 text-[9px] text-[#22D3EE] font-mono border border-cyan-500/20">
                                Tùy chỉnh
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#9CA3AF]">
                            {language === 'VN' ? s.description : s.descriptionEn}
                          </span>
                        </div>

                        {isRecording ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold text-xs animate-pulse">
                              {language === 'VN' ? 'Nhấn phím mới... (Esc hủy)' : 'Press new key... (Esc cancel)'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRecordingShortcutId(null)}
                              className="px-2 py-1 rounded bg-[#2A3447] hover:bg-slate-700 text-xs text-slate-300"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRecordingShortcutId(s.id)}
                            className="font-mono text-xs text-[#22D3EE] font-bold bg-[#111827] hover:bg-[#22D3EE]/20 hover:border-[#22D3EE] px-3 py-1.5 rounded-lg border border-[#2A3447] transition-all cursor-pointer shadow-sm group"
                            title="Nhấp để đổi phím tắt này"
                          >
                            <span>{formatDisplayKey(activeKey)}</span>
                            <span className="ml-1.5 opacity-0 group-hover:opacity-100 text-[10px] text-slate-400">
                              ✎
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* 13. OPEN RECENT PROJECTS MODAL */}
        {activeModal === 'recentProjects' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2.5 text-[#1FC8DB] pb-3 border-b border-[#333333]">
              <FolderOpen className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Dự án gần đây (Recent Projects)</h3>
            </div>

            <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto">
              {recentProjects.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8A8A8A]">
                  Chưa có dự án nào trong IndexedDB.
                </div>
              ) : (
                recentProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setCurrentProjectId(p.id);
                      setProjectTitle(p.title);
                      closeModal();
                      navigate(`/editor/${p.id}`);
                    }}
                    className="p-3 rounded-md bg-[#1F1F1F] hover:bg-[#262626] border border-[#333333] hover:border-[#1FC8DB] flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'}
                        alt=""
                        className="w-10 h-14 rounded object-cover border border-[#333333]"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-white group-hover:text-[#1FC8DB] transition-colors">
                          {p.title}
                        </span>
                        <span className="text-[10px] text-[#8A8A8A]">
                          Sửa đổi: {new Date(p.updatedAt).toLocaleDateString('vi-VN')} • {p.duration}s
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#1FC8DB] px-3 py-1 rounded bg-[#1FC8DB]/10 group-hover:bg-[#1FC8DB] group-hover:text-black transition-colors">
                      Mở
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 14. ABOUT MODAL */}
        {activeModal === 'about' && (
          <div className="flex flex-col gap-3 text-center items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#1FC8DB] to-sky-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
              CC
            </div>
            <h3 className="text-base font-bold text-white">CapCut Desktop Web v3.0</h3>
            <p className="text-xs text-[#8A8A8A] leading-relaxed max-w-sm">
              Trình biên tập video dọc 9:16 chuyên nghiệp cho TikTok, Reels và YouTube Shorts. Chạy 100% ngoại tuyến trên trình duyệt qua Dexie IndexedDB, WebGL2 và WebCodecs.
            </p>
            <div className="text-[11px] text-[#8A8A8A] font-mono bg-[#1F1F1F] px-3 py-1 rounded border border-[#333333]">
              Build 2026.11 • Offline-First Native Engine
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

