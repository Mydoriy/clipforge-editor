import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEditorStore } from '../store/useEditorStore';
import { db, type ProjectEntity, type MediaEntity } from '../db';
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
  HardDrive,
  Search,
  Filter,
  QrCode,
  Hash,
  MessageSquare,
  Copy,
  Check,
  Image as ImageIcon,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

export const SectionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentProjectId, setProjectTitle, showToast, openModal, addClip, setClips, setDuration } = useEditorStore();

  const mediaList = useLiveQuery(() => db.media.toArray(), []) || [];
  const projectList = useLiveQuery(() => db.projects.toArray(), []) || [];
  const trashList = useLiveQuery(() => db.trash.toArray(), []) || [];

  const path = location.pathname;

  // 1. TEMPLATES STATE (16 Templates across 5 Categories)
  const [templateCat, setTemplateCat] = useState<'all' | 'trending' | 'intro' | 'vlog' | 'sale' | 'quotes'>('all');
  const templates = [
    // Trending
    { id: 't1', cat: 'trending', name: 'Alex Hormozi Viral Hook', dur: 12, slots: 3, tag: 'Trending 🔥', img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80', desc: 'Hook 3s cực mạnh giữ chân 90% người xem' },
    { id: 't2', cat: 'trending', name: 'TikTok Reaction Màn Hình Đôi', dur: 15, slots: 2, tag: 'Trending 🔥', img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80', desc: 'Bố cục 2 nửa màn hình phản ứng video' },
    { id: 't3', cat: 'trending', name: 'Before & After Biến Hình', dur: 10, slots: 2, tag: 'Trending 🔥', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80', desc: 'Chuyển cảnh biến hình theo nhịp bass giật' },
    { id: 't4', cat: 'trending', name: 'POV: Một Ngày Làm Việc Của GenZ', dur: 18, slots: 4, tag: 'Trending 🔥', img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&q=80', desc: 'Nhịp điệu nhanh, text hài hước xu hướng' },

    // Intro
    { id: 't5', cat: 'intro', name: 'Cyberpunk Neon Intro 9:16', dur: 6, slots: 1, tag: 'Intro ⚡', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', desc: 'Mở đầu công nghệ ánh sáng neon rực rỡ' },
    { id: 't6', cat: 'intro', name: 'Minimalist Title Card Reveal', dur: 5, slots: 1, tag: 'Intro ⚡', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', desc: 'Xuất hiện logo & tiêu đề sang trọng tinh tế' },
    { id: 't7', cat: 'intro', name: 'Glitch Shorts Opening', dur: 8, slots: 2, tag: 'Intro ⚡', img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80', desc: 'Hiệu ứng nhiễu sóng glitch hiện đại' },

    // Vlog
    { id: 't8', cat: 'vlog', name: 'Cinematic Travel Đà Lạt Săn Mây', dur: 25, slots: 5, tag: 'Vlog ✈️', img: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80', desc: 'Tông màu vintage ấm áp kèm nhạc lofi nhẹ nhàng' },
    { id: 't9', cat: 'vlog', name: 'Daily Cafe & Chill Mini-Vlog', dur: 15, slots: 4, tag: 'Vlog ✈️', img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80', desc: 'Nhịp sống thư giãn thưởng thức cà phê cuối tuần' },
    { id: 't10', cat: 'vlog', name: 'Street Food Ẩm Thực Đường Phố', dur: 20, slots: 4, tag: 'Vlog ✈️', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80', desc: 'Cận cảnh món ăn ngon với hiệu ứng âm thanh kích thích' },

    // Sale
    { id: 't11', cat: 'sale', name: 'TikTok Shop Mega Flash Sale', dur: 15, slots: 3, tag: 'Sale 🛍️', img: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80', desc: 'Đồng hồ đếm ngược, voucher giảm 50% bắt mắt' },
    { id: 't12', cat: 'sale', name: 'Product Unboxing & Đánh Giá', dur: 22, slots: 4, tag: 'Sale 🛍️', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', desc: 'Mở hộp chi tiết các tính năng sản phẩm' },
    { id: 't13', cat: 'sale', name: 'Voucher Độc Quyền Hôm Nay', dur: 12, slots: 2, tag: 'Sale 🛍️', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80', desc: 'Thúc đẩy mua sắm khẩn cấp tại giỏ hàng' },

    // Quotes
    { id: 't14', cat: 'quotes', name: 'Động Lực Mỗi Sáng Đột Phá', dur: 10, slots: 1, tag: 'Quotes 💡', img: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&q=80', desc: 'Chữ chạy nghệ thuật với lời khuyên truyền cảm hứng' },
    { id: 't15', cat: 'quotes', name: 'Triết Lý Sống & Bình Yên Tâm Hồn', dur: 14, slots: 1, tag: 'Quotes 💡', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', desc: 'Nền phong cảnh êm đềm với typography tối giản' },
    { id: 't16', cat: 'quotes', name: 'Bí Quyết Thành Công & Kỷ Luật', dur: 12, slots: 2, tag: 'Quotes 💡', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80', desc: 'Hình ảnh vũ trụ bao la với trích dẫn sâu sắc' }
  ];

  const filteredTemplates = templates.filter((t) => templateCat === 'all' || t.cat === templateCat);

  // Apply Template with Placeholder Slots
  const handleUseTemplate = async (template: typeof templates[0]) => {
    const id = 'proj-tpl-' + Date.now();
    const title = `${template.name} (9:16)`;

    // Build placeholder clips
    const placeholderClips: any[] = [];
    const slotDuration = template.dur / template.slots;
    for (let i = 0; i < template.slots; i++) {
      placeholderClips.push({
        id: `slot-${i}-${Date.now()}`,
        track: 'video',
        name: `[Slot #${i + 1}: Thả video/ảnh vào đây]`,
        src: template.img,
        type: 'image',
        start: i * slotDuration,
        duration: slotDuration,
        filter: 'cinematic'
      });
    }

    // Title overlay clip
    placeholderClips.push({
      id: `text-title-${Date.now()}`,
      track: 'text',
      name: `Tiêu đề: ${template.name}`,
      text: template.name.toUpperCase(),
      type: 'text',
      start: 0,
      duration: Math.min(6, template.dur),
      y: 110,
      scale: 1.15
    });

    // Audio track clip
    placeholderClips.push({
      id: `audio-bg-${Date.now()}`,
      track: 'audio',
      name: 'Nhạc nền mẫu (120BPM)',
      type: 'audio',
      start: 0,
      duration: template.dur,
      volume: 0.85
    });

    const newProj: ProjectEntity = {
      id,
      title,
      width: 1080,
      height: 1920,
      fps: 30,
      duration: template.dur,
      thumbnail: template.img,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      tracksData: { clips: placeholderClips }
    };

    await db.projects.add(newProj);
    setCurrentProjectId(id);
    setProjectTitle(title);
    setClips(placeholderClips);
    setDuration(template.dur);
    showToast(`Đã tạo dự án từ mẫu "${template.name}" với ${template.slots} placeholder slots!`, 'success');
    navigate(`/editor/${id}`);
  };

  // 2. LIBRARY STATE & HANDLERS
  const [libSearch, setLibSearch] = useState('');
  const [libType, setLibType] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const libFileInputRef = useRef<HTMLInputElement>(null);

  const filteredMedia = mediaList.filter((m) => {
    const matchesName = m.name.toLowerCase().includes(libSearch.toLowerCase());
    const matchesType = libType === 'all' || m.type === libType;
    return matchesName && matchesType;
  });

  const handleUploadFilesToLibrary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let type: 'video' | 'image' | 'audio' = 'image';
        if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        await db.media.add({
          id: 'media-' + Date.now() + '-' + i,
          name: file.name,
          type,
          blob: file,
          size: file.size,
          createdAt: Date.now()
        });
      }
      showToast(`Đã tải lên ${files.length} tệp vào Thư viện IndexedDB!`, 'success');
    } catch (err: any) {
      showToast('Lỗi tải file: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  const handleDownloadMedia = (media: MediaEntity) => {
    const url = URL.createObjectURL(media.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = media.name;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã tải tệp "${media.name}" về máy!`, 'success');
  };

  // 3. CLOUD STORAGE (ESTIMATE) STATE
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorageEstimate({
          usage: est.usage || 0,
          quota: est.quota || 1024 * 1024 * 1024 * 5 // 5GB default
        });
      }).catch(() => {});
    }
  }, [mediaList, projectList]);

  // 4. MARKETING TOOLS TABS & LOCAL TOOLS STATE
  const [mktTab, setMktTab] = useState<'ad' | 'qr' | 'caption' | 'hashtag' | 'thumbnail'>('ad');

  // QR Code tool
  const [qrInputUrl, setQrInputUrl] = useState('https://tiktok.com/@capcut_store');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  useEffect(() => {
    if (qrInputUrl) {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrInputUrl)}&color=000000&bgcolor=ffffff`);
    }
  }, [qrInputUrl]);

  // Caption Generator tool
  const [captionTopic, setCaptionTopic] = useState<'sale' | 'hook' | 'fun' | 'review'>('sale');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const sampleCaptions = {
    sale: `⚡ FLASH SALE BÙNG NỔ DUY NHẤT HÔM NAY! 🛒\n🔥 Giảm sốc đến 50% + Freeship toàn quốc cho 100 đơn đầu tiên!\n👉 Nhấn ngay vào giỏ hàng góc trái màn hình để không bỏ lỡ deal hời này nhé!\n#tiktokshop #sale #dealhot #muangay #flashsale`,
    hook: `😱 DỪNG LẠI 3 GIÂY! Nếu bạn chưa biết mẹo này thì quá tiếc luôn...\n✨ Bí quyết giữ chân người xem 90% cực kỳ đơn giản ai cũng làm được!\n💬 Bình luận bên dưới nếu bạn muốn mình ra phần tiếp theo nhé!\n#xuhuong #meohay #learnontiktok #viral #videotrieuview`,
    fun: `😂 Khi bạn tính ngủ sớm nhưng lỡ lướt video đến 2 giờ sáng...\nAi đồng cảm điểm danh liền nha! Tag ngay đứa bạn cú đêm vào đây 🦉\n#haihuoc #genz #trend #funny #cuden`,
    review: `⭐ REVIEW CHÂN THỰC: Liệu sản phẩm này có thần thánh như lời đồn?\nSau 1 tuần trải nghiệm thực tế, đây là cảm nhận chi tiết của mình:\n+ Ưu điểm: Đẹp, bền, dùng cực mượt\n+ Nhược điểm: Nhanh hết hàng quá thôi haha!\n#review #danhgia #sanphamhot #unbox #tiktokmademebuyit`
  };

  // Hashtag Generator tool
  const [hashtagInput, setHashtagInput] = useState('tai nghe bluetooth');
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const generatedHashtags = `#${hashtagInput.replace(/\s+/g, '')} #tiktokshop #xuhuong #review #trending #muangay #dealhot #congnghe2026 #topxuhuong #gadget #viralreels #shortsvideo #fyp #foryou #capcut`;

  // Thumbnail Maker tool
  const [thumbTitle, setThumbTitle] = useState('BÍ QUYẾT TRIỆU VIEW 9:16');
  const [thumbBg, setThumbBg] = useState<'cyberpunk' | 'neon' | 'sunset'>('cyberpunk');
  const handleExportQuickThumbnail = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gradient
    const g = ctx.createLinearGradient(0, 0, 540, 960);
    if (thumbBg === 'cyberpunk') {
      g.addColorStop(0, '#0a0a23');
      g.addColorStop(0.5, '#1e0836');
      g.addColorStop(1, '#05021a');
    } else if (thumbBg === 'neon') {
      g.addColorStop(0, '#001a2c');
      g.addColorStop(0.5, '#003e5c');
      g.addColorStop(1, '#000000');
    } else {
      g.addColorStop(0, '#311042');
      g.addColorStop(0.5, '#80235d');
      g.addColorStop(1, '#d96552');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 540, 960);

    // Neon Frame
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 500, 920);

    // Title box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(40, 400, 460, 160);
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 400, 460, 160);

    // Text
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(thumbTitle, 270, 490);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('9:16 THUMBNAIL STUDIO', 270, 880);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `Thumbnail_916_${Date.now()}.png`;
    a.click();
    showToast('Đã xuất ảnh Thumbnail 9:16 (PNG)!', 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F19] p-8 flex flex-col gap-6 select-none text-[#E5E7EB]">
      {/* 1. TEMPLATES ROUTE */}
      {path === '/templates' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center border border-[#22D3EE]/30">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Kho Mẫu Video 9:16 (16 Templates)</h2>
                <p className="text-xs text-[#9CA3AF]">Mẫu dựng sẵn kèm placeholder slot để kéo thả media vào</p>
              </div>
            </div>

            {/* Filter by Category */}
            <div className="flex items-center gap-1.5 bg-[#111827] p-1 rounded-xl border border-[#1F2937] overflow-x-auto">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'trending', label: 'Trending 🔥' },
                { id: 'intro', label: 'Intro ⚡' },
                { id: 'vlog', label: 'Vlog ✈️' },
                { id: 'sale', label: 'Sale 🛍️' },
                { id: 'quotes', label: 'Quotes 💡' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setTemplateCat(c.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    templateCat === c.id
                      ? 'bg-[#22D3EE] text-slate-950 shadow-sm'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-[#22D3EE] p-3 flex flex-col justify-between gap-2.5 hover-lift shadow-lg group transition-all"
              >
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black border border-[#1F2937]">
                  <img
                    src={tpl.img}
                    alt={tpl.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 bg-[#22D3EE] text-slate-950 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-md">
                    {tpl.tag}
                  </span>
                  <span className="absolute bottom-2 right-2 bg-black/85 text-white px-2 py-0.5 rounded-md text-[10px] font-mono">
                    {tpl.dur}s
                  </span>
                  <span className="absolute bottom-2 left-2 bg-black/85 text-cyan-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {tpl.slots} slot media
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-bold text-xs text-[#E5E7EB] truncate group-hover:text-[#22D3EE] transition-colors">
                    {tpl.name}
                  </span>
                  <p className="text-[10px] text-[#9CA3AF] line-clamp-1">{tpl.desc}</p>
                </div>

                <button
                  onClick={() => handleUseTemplate(tpl)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#22D3EE] to-sky-500 hover:opacity-95 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Dùng mẫu này (Use template)</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. LIBRARY ROUTE */}
      {path === '/library' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Thư Viện Tệp Media (IndexedDB)</h2>
                <p className="text-xs text-[#9CA3AF]">
                  Toàn bộ video, ảnh và âm thanh đã import • Kéo thả trực tiếp vào Editor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => libFileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
              >
                <Upload className="w-4 h-4" />
                <span>+ Tải tệp lên</span>
              </button>
              <input
                ref={libFileInputRef}
                type="file"
                multiple
                accept="video/*,image/*,audio/*"
                onChange={handleUploadFilesToLibrary}
                className="hidden"
              />
            </div>
          </div>

          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex items-center w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3.5" />
              <input
                type="text"
                value={libSearch}
                onChange={(e) => setLibSearch(e.target.value)}
                placeholder="Tìm kiếm tệp media..."
                className="w-full bg-[#111827] border border-[#1F2937] rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-[#9CA3AF] outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#111827] p-1 rounded-xl border border-[#1F2937]">
              {(['all', 'video', 'image', 'audio'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLibType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all uppercase ${
                    libType === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'Tất cả' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Media Items Grid */}
          {filteredMedia.length === 0 ? (
            <div className="p-16 rounded-[20px] bg-[#111827] border border-[#1F2937] text-center flex flex-col items-center justify-center gap-3 text-[#9CA3AF]">
              <FolderKanban className="w-12 h-12 opacity-30 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Chưa có tệp media nào</span>
              <p className="text-xs max-w-sm">Tải lên video, ảnh hoặc nhạc từ máy tính để lưu trữ an toàn trong IndexedDB và sử dụng cho mọi dự án.</p>
              <button
                onClick={() => libFileInputRef.current?.click()}
                className="mt-2 px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover-lift"
              >
                + Tải tệp lên ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((m) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(m));
                    showToast(`Đang kéo "${m.name}". Thả vào timeline để chèn!`, 'info');
                  }}
                  className="p-4 rounded-[16px] bg-[#111827] border border-[#1F2937] hover:border-indigo-500/50 flex flex-col justify-between gap-3 hover-lift shadow-md group cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                        {m.type === 'video' ? <Video className="w-4 h-4" /> : m.type === 'audio' ? <Clock className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-xs text-white block truncate" title={m.name}>
                          {m.name}
                        </span>
                        <span className="text-[10px] text-indigo-300 uppercase font-semibold">
                          {m.type} • {(m.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-[#1F2937] pt-2">
                    <span>{new Date(m.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span className="text-cyan-400 font-semibold cursor-help" title="Kéo thả trực tiếp tệp này vào Timeline Editor">
                      ⠿ Kéo vào Editor
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      onClick={() => {
                        addClip({
                          track: m.type === 'audio' ? 'audio' : 'video',
                          name: m.name,
                          start: 0,
                          duration: 8,
                          type: m.type
                        });
                        showToast(`Đã thêm "${m.name}" vào Timeline!`, 'success');
                      }}
                      className="py-1 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-[10px] text-center"
                    >
                      + Dùng
                    </button>
                    <button
                      onClick={() => handleDownloadMedia(m)}
                      className="py-1 px-2 rounded-lg bg-[#0B0F19] hover:bg-slate-800 text-slate-300 font-semibold text-[10px] flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Tải về</span>
                    </button>
                    <button
                      onClick={async () => {
                        await db.media.delete(m.id);
                        showToast('Đã xóa tệp khỏi Thư viện', 'info');
                      }}
                      className="py-1 px-2 rounded-lg bg-[#0B0F19] hover:bg-rose-950 text-rose-400 font-semibold text-[10px] flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. CLOUD STORAGE (Dung lượng cục bộ navigator.storage.estimate & Supabase) */}
      {path === '/cloud-storage' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#1F2937]">
            <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center border border-[#22D3EE]/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Lưu Trữ & Quản Lý Dung Lượng (Storage)</h2>
              <p className="text-xs text-[#9CA3AF]">
                Theo dõi dung lượng IndexedDB trình duyệt và trạng thái đồng bộ Supabase Cloud
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Dung lượng cục bộ (navigator.storage.estimate) */}
            <div className="p-6 rounded-[20px] bg-[#111827] border border-[#1F2937] flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <HardDrive className="w-5 h-5" />
                  <span>Dung lượng cục bộ (IndexedDB)</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  {(storageEstimate.usage / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Đã sử dụng: {(storageEstimate.usage / 1024 / 1024).toFixed(1)} MB</span>
                  <span>Hạn mức: {(storageEstimate.quota / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(2, Math.min(100, (storageEstimate.usage / storageEstimate.quota) * 100))}%`
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 text-right">
                  Trình duyệt cấp phát hạn mức tự động theo dung lượng ổ đĩa khả dụng
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F2937] text-center">
                <div className="p-2.5 rounded-xl bg-[#0B0F19]">
                  <span className="text-[10px] text-slate-400 block">Dự án</span>
                  <span className="text-base font-bold text-white">{projectList.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B0F19]">
                  <span className="text-[10px] text-slate-400 block">Tệp Media</span>
                  <span className="text-base font-bold text-cyan-300">{mediaList.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B0F19]">
                  <span className="text-[10px] text-slate-400 block">Thùng rác</span>
                  <span className="text-base font-bold text-rose-400">{trashList.length}</span>
                </div>
              </div>

              <button
                onClick={() => openModal('projectSync')}
                className="w-full py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#2A374A] text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Xuất file sao lưu toàn bộ (.capproj)</span>
              </button>
            </div>

            {/* Box 2: Trạng thái Supabase Cloud */}
            <div className="p-6 rounded-[20px] bg-[#111827] border border-[#1F2937] flex flex-col justify-between gap-4 shadow-xl">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Cloud className="w-5 h-5" />
                    <span>Trạng thái Supabase Cloud</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {isSupabaseConfigured ? '🟢 Connected' : '⚡ Guest Mode (Offline)'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-slate-300 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Endpoint:</span>
                    <span className="font-mono text-[11px] text-cyan-300 truncate max-w-xs">
                      {isSupabaseConfigured ? 'https://****.supabase.co' : 'Chưa cấu hình VITE_SUPABASE_URL'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Đồng bộ Cloud:</span>
                    <span className="font-semibold text-white">
                      {isSupabaseConfigured ? 'Tự động sao lưu' : 'Vô hiệu hóa (Tùy chọn)'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Supabase chỉ là tùy chọn. Khi không có biến môi trường VITE_SUPABASE_URL, web app vẫn chạy 100% đầy đủ chức năng ở chế độ khách ngoại tuyến.
                </p>
              </div>

              <button
                onClick={() => openModal('auth')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs hover:opacity-95 shadow-md shadow-emerald-500/20"
              >
                Đăng nhập tài khoản & Kiểm tra đồng bộ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MARKETING TOOLS ROUTE (5 Công cụ chạy cục bộ) */}
      {path === '/marketing' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bộ Công Cụ Marketing & Bán Hàng 9:16</h2>
                <p className="text-xs text-[#9CA3AF]">
                  5 công cụ độc lập chạy cục bộ giúp tối đa hóa tỷ lệ chuyển đổi và doanh số
                </p>
              </div>
            </div>

            {/* Selector 5 tools */}
            <div className="flex items-center gap-1.5 bg-[#111827] p-1 rounded-xl border border-[#1F2937] overflow-x-auto">
              {[
                { id: 'ad', label: 'AI Ad Maker', icon: Sparkles },
                { id: 'qr', label: 'Mã QR Code', icon: QrCode },
                { id: 'caption', label: 'Caption Generator', icon: MessageSquare },
                { id: 'hashtag', label: 'Hashtag Generator', icon: Hash },
                { id: 'thumbnail', label: 'Thumbnail Maker', icon: ImageIcon }
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setMktTab(tool.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      mktTab === tool.id
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TOOL 1: AI AD MAKER */}
          {mktTab === 'ad' && (
            <div className="p-6 rounded-[20px] bg-[#111827] border border-[#1F2937] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>AI Ad Maker • Trình tạo kịch bản quảng cáo 5 cảnh</span>
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Tạo storyboard hoàn chỉnh cho video bán hàng TikTok Shop & Reels với 3 biến thể chọn lọc
                  </p>
                </div>
                <button
                  onClick={() => openModal('aiAdMaker')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs hover-lift shadow-md shadow-amber-500/20"
                >
                  Mở Wizard tạo quảng cáo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937]">
                  <span className="font-bold text-xs text-amber-400 block mb-1">Variant A: Flash Sale Deal</span>
                  <p className="text-[11px] text-slate-400">Tập trung đồng hồ đếm ngược, mã giảm giá và kích thích chốt đơn nhanh.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937]">
                  <span className="font-bold text-xs text-blue-400 block mb-1">Variant B: UGC Review Chân Thực</span>
                  <p className="text-[11px] text-slate-400">Phong cách đời thường của nhà sáng tạo, tạo niềm tin tự nhiên cho người xem.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937]">
                  <span className="font-bold text-xs text-purple-400 block mb-1">Variant C: Luxury Tech Tối Giản</span>
                  <p className="text-[11px] text-slate-400">Hình ảnh cận cảnh tinh tế, âm thanh cao cấp dành cho sản phẩm giá trị cao.</p>
                </div>
              </div>
            </div>
          )}

          {/* TOOL 2: QR CODE GENERATOR */}
          {mktTab === 'qr' && (
            <div className="p-6 rounded-[20px] bg-[#111827] border border-[#1F2937] flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-400" />
                    <span>Tạo Mã QR Code Chèn Video</span>
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Tạo mã QR trực tiếp để người xem quét mua hàng trên TikTok Shop, Shopee hoặc website
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#9CA3AF]">Liên kết đích (URL):</span>
                  <input
                    type="text"
                    value={qrInputUrl}
                    onChange={(e) => setQrInputUrl(e.target.value)}
                    placeholder="https://yourstore.com..."
                    className="bg-[#0B0F19] border border-[#1F2937] focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!qrCodeUrl) return;
                      const a = document.createElement('a');
                      a.href = qrCodeUrl;
                      a.download = 'QRCode_Video.png';
                      a.click();
                      showToast('Đã tải mã QR Code về máy!', 'success');
                    }}
                    className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải ảnh QR (PNG)</span>
                  </button>

                  <button
                    onClick={() => {
                      addClip({
                        track: 'sticker',
                        name: 'QR Code Mua Hàng',
                        src: qrCodeUrl,
                        type: 'image',
                        start: 3,
                        duration: 8,
                        x: 80,
                        y: 120,
                        scale: 0.8
                      });
                      showToast('Đã chèn mã QR vào timeline video!', 'success');
                    }}
                    className="py-2.5 px-4 rounded-xl bg-[#0B0F19] hover:bg-slate-800 border border-[#1F2937] text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" />
                    <span>+ Chèn vào Timeline Video</span>
                  </button>
                </div>
              </div>

              {/* QR Preview Frame */}
              <div className="w-48 h-48 rounded-2xl bg-white p-3 flex items-center justify-center border-4 border-amber-400 shadow-2xl shrink-0">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code Preview" className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-16 h-16 text-slate-400" />
                )}
              </div>
            </div>
          )}

          {/* TOOL 3: CAPTION GENERATOR */}
          {mktTab === 'caption' && (
            <div className="p-6 rounded-[20px] bg-[#111827] border border-[#1F2937] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-400" />
                    <span>Caption Generator • Chú thích TikTok Triệu View</span>
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Sinh tự động đoạn văn bản mô tả thu hút kèm biểu tượng cảm xúc và hashtag</p>
                </div>

                {/* Topic selector */}
                <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-xl border border-[#1F2937]">
                  {[
                    { id: 'sale', label: '🛍️ Bán hàng' },
                    { id: 'hook', label: '🔥 Hook sốc' },
                    { id: 'fun', label: '😂 Hài hước' },
                    { id: 'review', label: '⭐ Đánh giá' }
                  ].map((tp) => (
                    <button
                      key={tp.id}
                      onClick={() => setCaptionTopic(tp.id as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        captionTopic === tp.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={5}
                  value={sampleCaptions[captionTopic]}
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-xl p-4 text-xs text-white leading-relaxed font-mono outline-none resize-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sampleCaptions[captionTopic]);
                    setCopiedCaption(true);
                    showToast('Đã sao chép Caption vào Clipboard!', 'success');
                    setTimeout(() => setCopiedCaption(false), 2000);
                  }}
                  className="absolute right-3 bottom-3 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'Đã chép!' : 'Sao chép Caption'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TOOL 4: HASHTAG GENERATOR */}
          {mktTab === 'hashtag' && (
            <div className="p-6 rounded-[20px] bg-[#111827] border border-[#1F2937] flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Hash className="w-5 h-5 text-amber-400" />
                  <span>Hashtag Generator • Chùm Hashtag Viral Theo Ngách</span>
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Nhập từ khóa ngành hàng để sinh bộ hashtag tối ưu thuật toán tìm kiếm</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  placeholder="Nhập từ khóa sản phẩm (VD: thoi trang nam, my pham, cong nghe)..."
                  className="flex-1 bg-[#0B0F19] border border-[#1F2937] focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937] flex flex-col gap-2">
                <span className="text-[11px] font-bold text-[#9CA3AF]">Bộ Hashtags đề xuất (15 thẻ):</span>
                <p className="text-xs text-cyan-300 font-mono leading-relaxed">{generatedHashtags}</p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedHashtags);
                      setCopiedHashtags(true);
                      showToast('Đã sao chép toàn bộ Hashtags!', 'success');
                      setTimeout(() => setCopiedHashtags(false), 2000);
                    }}
                    className="py-1.5 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    {copiedHashtags ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHashtags ? 'Đã chép!' : 'Sao chép tất cả Hashtags'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TOOL 5: THUMBNAIL MAKER */}
          {mktTab === 'thumbnail' && (
            <div className="p-6 rounded-[20px] bg-[#111827] border border-[#1F2937] flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-amber-400" />
                    <span>Thumbnail Maker 9:16 Cực Nhanh</span>
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Tạo ảnh bìa video dọc nổi bật giúp tăng tỷ lệ nhấp chuột (CTR)</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#9CA3AF]">Tiêu đề ảnh bìa:</span>
                  <input
                    type="text"
                    value={thumbTitle}
                    onChange={(e) => setThumbTitle(e.target.value)}
                    className="bg-[#0B0F19] border border-[#1F2937] focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#9CA3AF]">Phong cách nền:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cyberpunk', 'neon', 'sunset'] as const).map((bg) => (
                      <button
                        key={bg}
                        onClick={() => setThumbBg(bg)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border capitalize ${
                          thumbBg === bg ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-[#0B0F19] border-[#1F2937] text-slate-400'
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExportQuickThumbnail}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs hover:opacity-95 shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất ảnh Thumbnail 9:16 (PNG)</span>
                </button>
              </div>

              {/* Thumbnail 9:16 Mini Preview */}
              <div className="w-36 aspect-[9/16] rounded-xl overflow-hidden border-2 border-cyan-400 shadow-2xl relative flex flex-col justify-between p-2.5 bg-gradient-to-b from-[#0a0a23] via-[#1e0836] to-[#05021a] shrink-0 text-center">
                <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">CapCut 9:16</span>
                <div className="p-1.5 bg-black/80 rounded border border-pink-500">
                  <span className="text-[10px] font-black text-amber-300 leading-tight block">{thumbTitle}</span>
                </div>
                <span className="text-[8px] text-slate-400 font-mono">THUMBNAIL</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
