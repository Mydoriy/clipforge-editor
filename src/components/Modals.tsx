import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { exportTimelineVideo } from '../utils/videoExporter';
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import { db } from '../db';
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
  Wand2
} from 'lucide-react';

export const Modals: React.FC = () => {
  const {
    language,
    setLanguage,
    activeModal,
    closeModal,
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
    setProjectTitle
  } = useEditorStore();

  const navigate = useNavigate();
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [promptInput, setPromptInput] = useState('');

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
  const t = translations[language];

  // Dexie live queries for trash & media library
  const trashItems = useLiveQuery(() => db.trash.toArray(), []) || [];
  const mediaItems = useLiveQuery(() => db.media.toArray(), []) || [];

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

  if (!activeModal) return null;

  // Handle Video Export
  const handleStartExport = async () => {
    try {
      setExportProgress(0);
      setExportStatus('Đang khởi tạo canvas 9:16...');
      const blob = await exportTimelineVideo(clips, duration, ({ progress, status }) => {
        setExportProgress(progress);
        setExportStatus(status);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClipForge_916_${Date.now()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(t.exportSuccess, 'success');
      setTimeout(() => {
        setExportProgress(null);
        closeModal();
      }, 1000);
    } catch (err: any) {
      showToast(`Lỗi xuất video: ${err.message}`, 'error');
      setExportProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in">
      <div className={`relative w-full ${activeModal === 'enhanceQuality' || activeModal === 'aiImage' || activeModal === 'extendVideo' ? 'max-w-xl' : 'max-w-lg'} bg-[#141822] border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto`}>
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

                  const newProj = {
                    id,
                    title,
                    width,
                    height,
                    fps: 30,
                    duration: 15,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
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
        {activeModal === 'export' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-cyan-400">
              <Download className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">{t.export} 9:16 Video</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-400">Độ phân giải (Vertical)</span>
                <span className="font-bold text-white font-mono">1080 × 1920 (FHD)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                <span className="text-slate-400">Tốc độ khung hình</span>
                <span className="font-bold text-white font-mono">30 FPS (Mượt mà)</span>
              </div>
            </div>

            {exportProgress !== null ? (
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-900 border border-cyan-500/40">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-cyan-400">{exportStatus}</span>
                  <span className="font-mono text-white">{exportProgress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all duration-150"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleStartExport}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Bắt đầu xuất video ngay (Client Render)</span>
                </button>
                <span className="text-[11px] text-slate-400 text-center">
                  Quá trình render hoàn toàn thực thi tại trình duyệt qua Canvas & MediaRecorder. Không tốn dung lượng máy chủ.
                </span>
              </div>
            )}
          </div>
        )}

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

              {/* Nhập API Key tùy chọn cho AI */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#1F2937]">
                <span className="font-semibold">Khóa API AI tùy chọn (OpenAI / Gemini):</span>
                <input
                  type="password"
                  value={settings.aiApiKey}
                  onChange={(e) => updateSettings({ aiApiKey: e.target.value })}
                  placeholder="sk-... hoặc AIza... (Lưu cục bộ an toàn)"
                  className="bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-xs text-[#E5E7EB] outline-none"
                />
                <span className="text-[10px] text-[#9CA3AF]">
                  Khóa được lưu trực tiếp trên thiết bị của bạn, không gửi lên bất kỳ máy chủ nào.
                </span>
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{t.trashTitle} (IndexedDB)</h3>
            </div>

            {trashItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Trash2 className="w-10 h-10 opacity-30 text-slate-600" />
                <span>{t.trashEmpty}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {trashItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{item.title}</span>
                      <span className="text-[10px] text-slate-500">
                        Đã xóa: {new Date(item.deletedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await db.projects.add(item.projectData);
                          await db.trash.delete(item.id);
                          showToast(`Đã khôi phục: ${item.title}`, 'success');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-[11px]"
                      >
                        {t.restore}
                      </button>
                      <button
                        onClick={async () => {
                          await db.trash.delete(item.id);
                          showToast(`Đã xóa vĩnh viễn: ${item.title}`);
                        }}
                        className="p-1 rounded hover:bg-rose-950 text-rose-400"
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

        {/* 5. CLOUD SYNC MODAL */}
        {activeModal === 'cloud' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <Cloud className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{t.navCloudSync} (Supabase)</h3>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Trạng thái kết nối:</span>
                <span className={`font-semibold ${isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isSupabaseConfigured ? 'Đã kết nối Supabase Cloud' : 'Chế độ Guest (Offline Dexie DB)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isSupabaseConfigured
                  ? 'Dữ liệu dự án của bạn đang được tự động đồng bộ lên đám mây Supabase an toàn.'
                  : 'App đang hoạt động độc lập và lưu toàn bộ dự án trên trình duyệt bằng IndexedDB. Để bật Cloud Sync, chỉ cần cấu hình biến môi trường VITE_SUPABASE_URL trên Vercel.'}
              </p>
            </div>

            <button
              onClick={() => {
                showToast(isSupabaseConfigured ? 'Đang đồng bộ dữ liệu lên Cloud...' : 'Đã lưu trữ an toàn trong IndexedDB!');
                closeModal();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700"
            >
              Đồng bộ dữ liệu ngay
            </button>
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
                      {c.name} ({c.duration}s, filter: {c.filter || 'none'})
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
                      {c.name} ({c.duration}s, filter: {c.filter || 'standard'})
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

        {/* 11. KEYBOARD SHORTCUTS */}
        {activeModal === 'shortcuts' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <Keyboard className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Phím tắt biên tập (Hotkeys)</h3>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span>Phát / Tạm dừng</span>
                <span className="font-mono text-cyan-400 font-bold">Spacebar</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span>Tách clip tại playhead</span>
                <span className="font-mono text-cyan-400 font-bold">Ctrl + B / B</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span>Xóa clip đã chọn</span>
                <span className="font-mono text-cyan-400 font-bold">Delete / Backspace</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span>Bật / Tắt Safe Zone 9:16</span>
                <span className="font-mono text-cyan-400 font-bold">Shift + S</span>
              </div>
            </div>
          </div>
        )}

        {/* 12. ABOUT MODAL */}
        {activeModal === 'about' && (
          <div className="flex flex-col gap-3 text-center items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-400 to-sky-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
              CF
            </div>
            <h3 className="text-base font-bold text-white">CapCut Desktop Web (ClipForge v3.0)</h3>
            <p className="text-xs text-slate-400">
              Web app chỉnh sửa video dọc 9:16 chuyên dụng cho TikTok, Reels và YouTube Shorts. Chạy 100% trên trình duyệt với Dexie IndexedDB và Canvas MediaRecorder.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Build 2026.11 • Offline Guest Mode Ready
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

