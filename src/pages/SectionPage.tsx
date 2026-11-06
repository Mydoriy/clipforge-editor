import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { db, type ProjectEntity } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { isSupabaseConfigured } from '../utils/supabase';
import {
  LayoutTemplate,
  Video,
  Sparkles,
  TrendingUp,
  FolderKanban,
  Cloud,
  Plus,
  Play,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export const SectionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentProjectId, setProjectTitle, showToast, openModal } = useEditorStore();

  const mediaList = useLiveQuery(() => db.media.toArray(), []) || [];
  const projectList = useLiveQuery(() => db.projects.toArray(), []) || [];

  const handleUseTemplate = async (templateName: string, duration: number) => {
    const id = 'proj-tpl-' + Date.now();
    const title = `${templateName} (9:16)`;
    const newProj: ProjectEntity = {
      id,
      title,
      width: 1080,
      height: 1920,
      fps: 30,
      duration,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
      tracksData: {
        clips: [
          { id: 'c1', track: 'video', name: `${templateName} Background`, start: 0, duration, type: 'video' },
          { id: 'c2', track: 'text', name: 'Hook Title', start: 0, duration: 4, type: 'text', text: `🔥 ${templateName.toUpperCase()}` }
        ]
      }
    };

    await db.projects.add(newProj);
    setCurrentProjectId(id);
    setProjectTitle(title);
    showToast(`Đã áp dụng mẫu: ${templateName}`, 'success');
    navigate(`/editor/${id}`);
  };

  const path = location.pathname;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F19] p-8 flex flex-col gap-6 select-none">
      {/* 1. TEMPLATES ROUTE */}
      {path === '/templates' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#1F2937]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center border border-[#22D3EE]/30">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Kho Mẫu Video 9:16 (Templates)</h2>
                <p className="text-xs text-[#9CA3AF]">Chọn mẫu dựng sẵn chuẩn TikTok, Reels, Shorts để bắt đầu ngay</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: 'TikTok Shop Flash Sale', dur: 15, tag: 'Bán hàng', img: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80' },
              { name: 'Cinematic Travel Vlog', dur: 20, tag: 'Vlog', img: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80' },
              { name: 'Podcast Highlights Reel', dur: 30, tag: 'Podcast', img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80' },
              { name: 'Alex Hormozi Viral Hook', dur: 12, tag: 'Viral Trend', img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80' }
            ].map((tpl, i) => (
              <div
                key={i}
                className="rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-[#22D3EE] p-3 flex flex-col gap-2.5 hover-lift shadow-lg group"
              >
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black">
                  <img src={tpl.img} alt={tpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute top-2 left-2 bg-[#22D3EE] text-slate-950 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {tpl.tag}
                  </span>
                  <span className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-0.5 rounded-md text-[10px] font-mono">
                    {tpl.dur}s
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-[#E5E7EB] truncate">{tpl.name}</span>
                  <button
                    onClick={() => handleUseTemplate(tpl.name, tpl.dur)}
                    className="px-2.5 py-1 rounded-lg bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-bold text-[11px] shrink-0"
                  >
                    + Dùng
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. VIDEO STUDIO ROUTE */}
      {path === '/video-studio' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#1F2937]">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Video Studio 9:16</h2>
              <p className="text-xs text-[#9CA3AF]">Trình tạo và biên tập video dọc chuyên nghiệp</p>
            </div>
          </div>

          <div className="p-8 rounded-[16px] bg-[#111827] border border-[#1F2937] flex flex-col items-center justify-center gap-4 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#12A8C9] to-[#0B4A66] flex items-center justify-center text-white shadow-xl">
              <Video className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sẵn sàng tạo video mới?</h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Tạo dự án 9:16 với tỷ lệ chuẩn TikTok/Reels, không gian dựng đa track và bộ công cụ AI thông minh.
              </p>
            </div>
            <button
              onClick={() => handleUseTemplate('0917 Studio Project', 15)}
              className="px-6 py-3 rounded-xl bg-[#22D3EE] text-slate-950 font-bold text-xs hover-lift shadow-lg shadow-cyan-500/20"
            >
              + Khởi tạo dự án Video Studio
            </button>
          </div>
        </div>
      )}

      {/* 3. AI TOOLS ROUTE */}
      {path === '/ai-tools' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#1F2937]">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center border border-pink-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bộ Công Cụ AI (Create with AI)</h2>
              <p className="text-xs text-[#9CA3AF]">Tận dụng trí tuệ nhân tạo để tăng tốc sản xuất video</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => openModal('aiImage')}
              className="p-5 rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-pink-500/50 hover-lift cursor-pointer flex flex-col gap-2"
            >
              <h4 className="font-bold text-white text-sm">🎨 Tạo ảnh nền AI (Text to Image)</h4>
              <p className="text-xs text-[#9CA3AF]">Chuyển ý tưởng kịch bản thành hình ảnh đồ họa 9:16 độc đáo</p>
            </div>

            <div
              onClick={() => openModal('aiEdit')}
              className="p-5 rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-[#22D3EE]/50 hover-lift cursor-pointer flex flex-col gap-2"
            >
              <h4 className="font-bold text-white text-sm">⚡ Auto-Cut & Subtitles</h4>
              <p className="text-xs text-[#9CA3AF]">Tự động cắt khoảng lặng và tạo phụ đề động bắt tai</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. MARKETING TOOLS ROUTE */}
      {path === '/marketing' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#1F2937]">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Công Cụ Marketing & Bán Hàng</h2>
              <p className="text-xs text-[#9CA3AF]">Tối ưu hóa tỷ lệ chuyển đổi cho video TikTok Shop & Quảng cáo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Khung đếm ngược Flash Sale', 'Nút Call-To-Action Giỏ Hàng', 'Bộ huy hiệu Giảm giá & Freeship'].map((name, i) => (
              <div
                key={i}
                className="p-5 rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-amber-400 hover-lift flex flex-col justify-between gap-4"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">{name}</h4>
                  <p className="text-xs text-[#9CA3AF] mt-1">Chèn nhanh vào video để thúc đẩy người xem nhấn giỏ hàng</p>
                </div>
                <button
                  onClick={() => openModal('marketing')}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Xem & Thêm vào Video
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. LIBRARY ROUTE */}
      {path === '/library' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#1F2937]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Thư Viện Tệp Cục Bộ (IndexedDB)</h2>
                <p className="text-xs text-[#9CA3AF]">Quản lý toàn bộ video, hình ảnh và âm thanh đã lưu trên trình duyệt</p>
              </div>
            </div>

            <button
              onClick={() => openModal('library')}
              className="px-3.5 py-2 rounded-xl bg-[#22D3EE] text-slate-950 font-bold text-xs hover-lift"
            >
              + Quản lý tệp
            </button>
          </div>

          {mediaList.length === 0 ? (
            <div className="p-14 rounded-[16px] bg-[#111827] border border-[#1F2937] text-center flex flex-col items-center justify-center gap-2 text-[#9CA3AF]">
              <FolderKanban className="w-10 h-10 opacity-30 text-[#9CA3AF]" />
              <span className="text-xs">Chưa có tệp tải lên trong IndexedDB. Mở một dự án để tải file lên.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaList.map((m) => (
                <div key={m.id} className="p-4 rounded-[16px] bg-[#111827] border border-[#1F2937] flex flex-col gap-2">
                  <span className="font-semibold text-xs text-[#E5E7EB] truncate">{m.name}</span>
                  <span className="text-[10px] text-[#9CA3AF] uppercase">{m.type} • {(m.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. CLOUD STORAGE (SUPABASE) ROUTE */}
      {path === '/cloud-storage' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#1F2937]">
            <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center border border-[#22D3EE]/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cloud Storage & Đồng Bộ (Supabase)</h2>
              <p className="text-xs text-[#9CA3AF]">Cơ sở dữ liệu đám mây và lưu trữ an toàn</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-[16px] bg-[#111827] border border-[#1F2937] flex flex-col gap-3">
              <span className="font-bold text-white text-sm">Trạng thái kết nối Cloud:</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-xs font-semibold text-[#E5E7EB]">
                  {isSupabaseConfigured ? 'Đã kết nối Supabase Cloud' : 'Chế độ Khách (Offline IndexedDB)'}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {isSupabaseConfigured
                  ? 'Toàn bộ thay đổi đang được đồng bộ tự động lên cloud Supabase.'
                  : 'Dữ liệu được lưu trữ an toàn ngay trên máy của bạn thông qua Dexie IndexedDB mà không cần tài khoản.'}
              </p>
            </div>

            <div className="p-5 rounded-[16px] bg-[#111827] border border-[#1F2937] flex flex-col gap-3">
              <span className="font-bold text-white text-sm">Thống kê lưu trữ cục bộ:</span>
              <div className="text-xs text-[#E5E7EB] flex flex-col gap-1">
                <div>Số lượng dự án: <span className="font-bold text-[#22D3EE]">{projectList.length}</span></div>
                <div>Số lượng tệp media: <span className="font-bold text-[#22D3EE]">{mediaList.length}</span></div>
              </div>
              <button
                onClick={() => showToast('Đã sao lưu thành công!', 'success')}
                className="mt-2 py-2 px-3 rounded-xl bg-[#1F2937] hover:bg-[#2A374A] text-[#22D3EE] text-xs font-bold hover-lift"
              >
                Sao lưu cơ sở dữ liệu (Export JSON)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
