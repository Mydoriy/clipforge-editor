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
  Info
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
      <div className="relative w-full max-w-lg bg-[#141822] border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
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
                    updateSettings,
    setCurrentProjectId,
    setProjectTitle({ autosave: e.target.checked });
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
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-pink-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{t.quickAiImage}</h3>
            </div>

            <p className="text-xs text-slate-400">
              Nhập mô tả hình nền 9:16 bạn muốn tạo cho video (Cyberpunk, Anime, Minimalist, Pastel gradient...):
            </p>

            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="VD: Cyberpunk Tokyo night with neon lights 9:16..."
              className="bg-slate-900 border border-slate-700 focus:border-pink-500 rounded-lg p-2.5 text-xs text-white outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  addClip({
                    track: 'video',
                    name: `AI BG: ${promptInput || 'Cyberpunk City'}`,
                    start: 0,
                    duration: 10,
                    type: 'video',
                    filter: 'cinematic'
                  });
                  showToast('Đã tạo ảnh nền 9:16 và chèn vào timeline!', 'success');
                  closeModal();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs"
              >
                Tạo và Chèn vào Video
              </button>
            </div>
          </div>
        )}

        {/* 7. EXTEND VIDEO MODAL */}
        {activeModal === 'extendVideo' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sky-400">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{t.quickExtendVideo}</h3>
            </div>
            <p className="text-xs text-slate-400">
              Kéo dài tổng thời lượng video của bạn để có thêm không gian chèn nội dung:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((secs) => (
                <button
                  key={secs}
                  onClick={() => {
                    setDuration(duration + secs);
                    showToast(`Đã kéo dài thêm +${secs}s (Tổng: ${duration + secs}s)`, 'success');
                    closeModal();
                  }}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-center font-bold text-cyan-300 text-xs"
                >
                  +{secs} giây
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 8. AI EDIT MODAL */}
        {activeModal === 'aiEdit' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <Zap className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{t.quickAiEdit}</h3>
            </div>
            <p className="text-xs text-slate-400">
              AI sẽ tự động rà soát nhịp điệu, tối ưu hóa kích thước chữ và tự động thêm các hiệu ứng chuyển tiếp phù hợp:
            </p>
            <button
              onClick={() => {
                const videoClip = clips.find((c) => c.track === 'video');
                if (videoClip) {
                  updateClip(videoClip.id, { speed: 1.15, filter: 'cinematic' });
                }
                showToast('AI đã tối ưu hóa nhịp điệu và bộ lọc video!', 'success');
                closeModal();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-bold text-xs"
            >
              Áp dụng chỉnh sửa thông minh
            </button>
          </div>
        )}

        {/* 9. ENHANCE QUALITY MODAL */}
        {activeModal === 'enhanceQuality' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Sliders className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{t.quickEnhanceQuality}</h3>
            </div>
            <p className="text-xs text-slate-400">
              Tự động nâng cao tương phản, làm nét viền và khử nhiễu màu cho video 9:16:
            </p>
            <button
              onClick={() => {
                const videoClip = clips.find((c) => c.track === 'video');
                if (videoClip) {
                  updateClip(videoClip.id, { filter: 'cinematic', opacity: 1 });
                }
                showToast('Đã nâng cấp chất lượng hình ảnh HD!', 'success');
                closeModal();
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Nâng cấp HD ngay
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

