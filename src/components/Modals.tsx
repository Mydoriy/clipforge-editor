import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { translations } from '../i18n';
import { exportTimelineVideo } from '../utils/videoExporter';
import { isSupabaseConfigured } from '../utils/supabase';
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
    activeModal,
    closeModal,
    clips,
    duration,
    setDuration,
    showToast,
    addClip,
    updateClip,
    setClips,
    signIn
  } = useEditorStore();

  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [promptInput, setPromptInput] = useState('');
  const [authName, setAuthName] = useState('Mydoriy');
  const [authEmail, setAuthEmail] = useState('mydoriy@gmail.com');
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

        {/* 0. AUTH MODAL */}
        {activeModal === 'auth' && (
          <div className="flex flex-col gap-4 text-center items-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#22D3EE] to-sky-500 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Đăng nhập CapCut Web</h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Đăng nhập để đồng bộ dự án và nhận gói Pro trải nghiệm.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3 text-left text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[#9CA3AF] font-semibold">Tên hiển thị:</span>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Nhập tên của bạn..."
                  className="bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-[#E5E7EB] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[#9CA3AF] font-semibold">Email:</span>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com..."
                  className="bg-[#0B0F19] border border-[#1F2937] focus:border-[#22D3EE] rounded-xl px-3.5 py-2 text-[#E5E7EB] outline-none"
                />
              </div>
            </div>

            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  signIn(authName || 'User', authEmail || 'user@capcut.web');
                  showToast(`Chào mừng ${authName || 'User'}! Đã đăng nhập thành công.`, 'success');
                  closeModal();
                }}
                className="w-full py-2.5 rounded-xl bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/25 hover-lift transition-all"
              >
                Đăng nhập ngay
              </button>

              <button
                onClick={closeModal}
                className="w-full py-2 rounded-xl bg-transparent hover:bg-[#1F2937] text-[#9CA3AF] text-xs font-medium transition-colors"
              >
                Tiếp tục chế độ Khách (Offline)
              </button>
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

        {/* 2. PRO MODAL */}
        {activeModal === 'pro' && (
          <div className="flex flex-col gap-4 text-center items-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nâng cấp ClipForge Pro</h3>
              <p className="text-xs text-slate-400 mt-1">
                Khai phá toàn bộ sức mạnh AI, chất lượng xuất 4K và thư viện âm thanh độc quyền
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 text-left text-xs">
              {[
                'Không giới hạn xuất video 4K 60fps',
                'Tự động tách giọng & khử ồn AI bằng WebCodecs',
                'Bộ hơn 200+ mẫu Hook TikTok & Reels có sẵn',
                'Đồng bộ đám mây Supabase không giới hạn'
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <Check className="w-4 h-4 text-pink-400 shrink-0" />
                  <span className="text-slate-200">{feat}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                showToast('🎉 Đã kích hoạt bản quyền Pro thành công!', 'success');
                closeModal();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 text-white font-bold text-sm shadow-xl transition-all"
            >
              Kích hoạt trải nghiệm Pro Miễn Phí
            </button>
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

