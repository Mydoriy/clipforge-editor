import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import {
  Sparkles,
  Scissors,
  Zap,
  ShieldCheck,
  Download,
  WifiOff,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Play,
  Film,
  Layers,
  Sliders,
  Type,
  ExternalLink,
  Laptop,
  Smartphone,
  Globe
} from 'lucide-react';
import { APP_VERSION } from '../constants/version';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 w-full bg-[#080B12]/85 backdrop-blur-md border-b border-[#1A2234] px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#8E9BB0]">
          <a href="#features" className="hover:text-[#1FC8DB] transition-colors">
            Tính năng
          </a>
          <a href="#compare" className="hover:text-[#1FC8DB] transition-colors">
            Bảo mật & So sánh
          </a>
          <a href="#compatibility" className="hover:text-[#1FC8DB] transition-colors">
            Tương thích
          </a>
          <a href="#faq" className="hover:text-[#1FC8DB] transition-colors">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/templates')}
            className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-[#141B2D] hover:bg-[#1E2842] text-[#8E9BB0] hover:text-white text-xs font-semibold border border-[#1E2842] transition-colors cursor-pointer"
          >
            Mẫu dựng sẵn
          </button>
          <button
            onClick={() => navigate('/editor/demo-916-intro')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1FC8DB] to-[#22D3EE] hover:opacity-95 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer hover-lift"
          >
            <span>Mở Editor ngay</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative px-6 lg:px-12 pt-16 pb-20 max-w-7xl mx-auto flex flex-col items-center text-center gap-6">
        {/* Glow backdrop */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-cyan-500/15 to-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-[#1FC8DB]" />
          <span>Trình dựng video 100% Client-Side • Local-First Architecture</span>
        </div>

        {/* H1 Main Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-4xl leading-[1.15]">
          Chỉnh sửa video online{' '}
          <span className="bg-gradient-to-r from-[#1FC8DB] via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            không cần đăng nhập
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base lg:text-lg text-[#8E9BB0] max-w-2xl leading-relaxed">
          Cắt ghép video trên trình duyệt miễn phí tối ưu cho TikTok, Reels và Shorts.
          Vận hành trực tiếp bằng WebCodecs & WebGL2. <strong>Video của bạn không bao giờ bị tải lên máy chủ.</strong>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/editor/demo-916-intro')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#1FC8DB] to-[#22D3EE] hover:opacity-95 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover-lift"
          >
            <Play className="w-4 h-4 fill-slate-950 stroke-[0]" />
            <span>Mở Editor ngay (Không cần đăng ký)</span>
          </button>
          <a
            href="#compare"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#141B2D] hover:bg-[#1E2842] text-[#CBD5E1] font-semibold text-sm border border-[#232F4A] transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tại sao an toàn hơn cloud?</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#6B7A90] pt-4">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Miễn phí
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Không dính watermark ép buộc
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Chạy Offline qua PWA
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Xuất chuẩn MP4 1080p & 4K
          </span>
        </div>

        {/* 3. INTERACTIVE / ANIMATED MOCKUP (9:16 STUDIO) */}
        <div className="relative mt-8 w-full max-w-4xl p-2.5 sm:p-4 rounded-3xl bg-gradient-to-b from-[#1A2234] to-[#0D121F] border border-cyan-500/20 shadow-2xl shadow-cyan-950/50">
          <div className="w-full rounded-2xl bg-[#080B12] border border-[#1A2234] overflow-hidden flex flex-col">
            {/* Mockup Window Header */}
            <div className="px-4 py-2.5 bg-[#0C101A] border-b border-[#1A2234] flex items-center justify-between text-xs text-[#6B7A90]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-[#8E9BB0]">
                  ClipForge Studio • 9:16 Vertical (1080 × 1920)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono font-bold">
                Hardware WebCodecs 60fps
              </span>
            </div>

            {/* Mockup Workspace */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Left Canvas Preview 9:16 */}
              <div className="md:col-span-5 flex justify-center">
                <div className="relative w-44 sm:w-52 h-80 sm:h-92 rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#020617] border-2 border-[#1E293B] shadow-2xl overflow-hidden flex flex-col justify-between p-3.5 text-center">
                  <div className="flex justify-between items-center text-[10px] text-cyan-400 font-mono">
                    <span>9:16 SAFE ZONE</span>
                    <span>00:04:15</span>
                  </div>

                  {/* Graphic Title */}
                  <div className="space-y-1.5 my-auto">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[9px] uppercase tracking-wide">
                      TRENDING
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-md">
                      3 BÍ QUYẾT TĂNG TƯƠNG TÁC TIKTOK 🚀
                    </h4>
                    <p className="text-[10px] text-cyan-300 font-medium">
                      Nhập nội dung phụ đề tự động tại đây...
                    </p>
                  </div>

                  {/* Playhead bar indicator */}
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#1FC8DB] h-full w-2/5" />
                  </div>
                </div>
              </div>

              {/* Right Multi-track timeline simulation */}
              <div className="md:col-span-7 flex flex-col gap-2.5 text-left text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1A2234]">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#1FC8DB]" />
                    <span>Multi-track Timeline (Thời gian thực)</span>
                  </span>
                  <span className="text-[10px] text-[#6B7A90] font-mono">00:00:04:15 / 00:00:15:00</span>
                </div>

                {/* Simulated Tracks */}
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-[#141B2D] border border-cyan-500/20 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-cyan-300 text-[11px] font-semibold">
                      <Type className="w-3 h-3" />
                      <span>Text Track: 3 BÍ QUYẾT TĂNG TƯƠNG TÁC</span>
                    </span>
                    <span className="text-[10px] text-[#6B7A90]">4.0s</span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#1E1B4B] border border-indigo-500/20 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-indigo-300 text-[11px] font-semibold">
                      <Film className="w-3 h-3" />
                      <span>Video 9:16 (1080p H.264)</span>
                    </span>
                    <span className="text-[10px] text-[#6B7A90]">15.0s</span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#064E3B]/40 border border-emerald-500/20 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-semibold">
                      <Zap className="w-3 h-3" />
                      <span>Audio Waveform: Viral Lo-Fi Chill Beat</span>
                    </span>
                    <span className="text-[10px] text-[#6B7A90]">15.0s</span>
                  </div>
                </div>

                {/* Quick Action Tools */}
                <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-md bg-[#161F33] text-[#8E9BB0] border border-[#232F4A]">
                    Phím C: Tách clip
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#161F33] text-[#8E9BB0] border border-[#232F4A]">
                    Phím Q/W: Cắt trái/phải
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#161F33] text-[#8E9BB0] border border-[#232F4A]">
                    Del: Ripple Delete
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#161F33] text-[#8E9BB0] border border-[#232F4A]">
                    Ctrl+Z: Hoàn tác
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE FEATURES (TÍNH NĂNG NỔI BẬT) */}
      <section id="features" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto border-t border-[#1A2234]/60 w-full">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold text-[#1FC8DB] uppercase tracking-wider">TÍNH NĂNG CHUYÊN NGHIỆP</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Bộ công cụ dựng video mạnh mẽ, chạy ngay trên trình duyệt
          </h2>
          <p className="text-xs sm:text-sm text-[#8E9BB0] leading-relaxed">
            Không cần cài đặt phần mềm nặng hàng gigabyte. Mọi thao tác cắt ghép, tạo hiệu ứng, chèn âm thanh đều diễn ra mượt mà với hiệu năng tăng tốc phần cứng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Scissors,
              color: 'text-cyan-400',
              bg: 'bg-cyan-500/10 border-cyan-500/20',
              title: 'Timeline đa lớp & Snapping',
              desc: 'Cắt gọt chính xác tới từng frame, phím tắt Q/W/C, ripple delete tự dồn clip và nam châm bắt mút playhead cực kỳ mượt mà.'
            },
            {
              icon: Zap,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
              title: 'Xuất WebCodecs siêu tốc',
              desc: 'Tận dụng GPU thiết bị xuất video MP4 1080p/4K với tốc độ vượt trội bằng mp4-muxer streaming, không giữ video trong RAM.'
            },
            {
              icon: Type,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 border-purple-500/20',
              title: 'Preset chữ & Phụ đề TikTok',
              desc: '20+ mẫu chữ hot trend bắt mắt, chữ nghệ thuật Word Art, hiệu ứng chữ phát sáng và tự động đồng bộ phụ đề .srt / .vtt.'
            },
            {
              icon: Sliders,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
              title: 'Bộ lọc màu & 3D LUT (.cube)',
              desc: 'Hỗ trợ tệp 3D LUT tiêu chuẩn điện ảnh, color grading trực quan trên WebGL2 context cho màu sắc chuẩn studio.'
            },
            {
              icon: WifiOff,
              color: 'text-sky-400',
              bg: 'bg-sky-500/10 border-sky-500/20',
              title: 'PWA & Dựng phim Offline',
              desc: 'Cài đặt như ứng dụng native trên máy tính hay điện thoại. Mở và xuất video bình thường ngay cả khi không có kết nối mạng.'
            },
            {
              icon: ShieldCheck,
              color: 'text-rose-400',
              bg: 'bg-rose-500/10 border-rose-500/20',
              title: 'An toàn & Riêng tư tuyệt đối',
              desc: 'Local-first 100%: Dữ liệu lưu trong Dexie IndexedDB máy bạn. Không thu thập nội dung video, không lưu trữ tệp lên máy chủ.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-[#0D121F] border border-[#1A2234] hover:border-[#2A3752] transition-all flex flex-col gap-3 group hover-lift"
            >
              <div className={`w-10 h-10 rounded-xl ${item.bg} border flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#1FC8DB] transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-[#8E9BB0] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. PRIVACY & LOCAL-FIRST COMPARISON TABLE */}
      <section id="compare" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto border-t border-[#1A2234]/60 w-full">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            BẢO MẬT & QUYỀN RIÊNG TƯ
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Chạy hoàn toàn trên trình duyệt, video không bị tải lên server
          </h2>
          <p className="text-xs sm:text-sm text-[#8E9BB0] leading-relaxed">
            Xem sự khác biệt mang tính cách mạng giữa kiến trúc Local-First của ClipForge và các web editor truyền thống:
          </p>
        </div>

        {/* Comparison Table */}
        <div className="w-full overflow-x-auto rounded-2xl border border-[#1A2234] bg-[#0D121F]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1A2234] bg-[#141B2D]">
                <th className="py-4 px-6 font-bold text-white w-1/3">Tiêu chí so sánh</th>
                <th className="py-4 px-6 font-black text-[#1FC8DB] bg-cyan-950/30 w-1/3 border-x border-[#1A2234]">
                  ClipForge Web (Local-First)
                </th>
                <th className="py-4 px-6 font-semibold text-[#8E9BB0] w-1/3">
                  Web Editor truyền thống (Cloud-based)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2234]/60 text-[#CBD5E1]">
              <tr>
                <td className="py-4 px-6 font-medium text-white">Nơi xử lý & render video</td>
                <td className="py-4 px-6 font-bold text-emerald-300 bg-cyan-950/20 border-x border-[#1A2234] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% CPU/GPU của bạn</span>
                </td>
                <td className="py-4 px-6 text-[#8E9BB0]">Server đám mây bên thứ ba</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-white">Quyền riêng tư & Bản quyền</td>
                <td className="py-4 px-6 font-bold text-emerald-300 bg-cyan-950/20 border-x border-[#1A2234]">
                  Tuyệt đối an toàn, video không rời khỏi máy
                </td>
                <td className="py-4 px-6 text-[#8E9BB0]">Nguy cơ rò rỉ dữ liệu khi lưu trên máy chủ</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-white">Thời gian chờ tải tệp (Upload)</td>
                <td className="py-4 px-6 font-bold text-emerald-300 bg-cyan-950/20 border-x border-[#1A2234]">
                  0 giây (Kéo thả dựng ngay lập tức)
                </td>
                <td className="py-4 px-6 text-[#8E9BB0]">Mất 5-20 phút upload file video lớn</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-white">Yêu cầu đăng nhập</td>
                <td className="py-4 px-6 font-bold text-emerald-300 bg-cyan-950/20 border-x border-[#1A2234]">
                  Không cần đăng nhập (Khách vãng lai dùng ngay)
                </td>
                <td className="py-4 px-6 text-[#8E9BB0]">Bắt buộc tạo tài khoản & khai báo email</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-white">Hoạt động khi mất mạng</td>
                <td className="py-4 px-6 font-bold text-emerald-300 bg-cyan-950/20 border-x border-[#1A2234]">
                  Dựng và xuất video bình thường (PWA Offline)
                </td>
                <td className="py-4 px-6 text-[#8E9BB0]">Sập hoàn toàn khi mất kết nối mạng</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. BROWSER COMPATIBILITY */}
      <section id="compatibility" className="py-16 px-6 lg:px-12 max-w-7xl mx-auto border-t border-[#1A2234]/60 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">TƯƠNG THÍCH ĐA NỀN TẢNG</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Hoạt động trên mọi trình duyệt hiện đại</h2>
          <p className="text-xs text-[#8E9BB0]">
            Tự động kích hoạt phương án fallback cục bộ thông minh phù hợp với cấu hình thiết bị của bạn:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              browser: 'Google Chrome',
              os: 'Windows / Mac / Linux / Android',
              grade: 'Tối ưu 100%',
              badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
              detail: 'Hỗ trợ đầy đủ WebCodecs GPU, WebGL2, OPFS và File System Access streaming.'
            },
            {
              browser: 'Microsoft Edge',
              os: 'Windows / Mac / Linux',
              grade: 'Tối ưu 100%',
              badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
              detail: 'Tăng tốc phần cứng native, giải mã H.264 siêu mượt và cài đặt PWA hoàn hảo.'
            },
            {
              browser: 'Apple Safari',
              os: 'macOS / iOS / iPadOS',
              grade: 'Tương thích tốt',
              badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
              detail: 'Compositor WebGL2, tone mapping HDR, tự động fallback tải file Blob an toàn.'
            },
            {
              browser: 'Mozilla Firefox',
              os: 'Windows / Mac / Linux',
              grade: 'Tương thích tốt',
              badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              detail: 'WebGL2 mượt mà, tự động fallback sang MediaRecorder & FFmpeg.wasm khi cần.'
            }
          ].map((b, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#0D121F] border border-[#1A2234] flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{b.browser}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${b.badgeBg}`}>{b.grade}</span>
              </div>
              <span className="text-[11px] text-[#6B7A90] font-mono">{b.os}</span>
              <p className="text-[11px] text-[#8E9BB0] pt-1 leading-relaxed">{b.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section id="faq" className="py-20 px-6 lg:px-12 max-w-4xl mx-auto border-t border-[#1A2234]/60 w-full">
        <div className="text-center mb-12 space-y-3">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">GIẢI ĐÁP THẮC MẮC</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Câu hỏi thường gặp (FAQ)</h2>
          <p className="text-xs text-[#8E9BB0]">Những điều bạn cần biết trước khi bắt đầu dựng video với ClipForge</p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'ClipForge có thực sự miễn phí và không cần tạo tài khoản?',
              a: 'Chính xác! ClipForge hoạt động theo triết lý Local-First: bạn truy cập vào web là có thể kéo thả video dựng ngay mà không cần email, số điện thoại hay mật khẩu. Toàn bộ tiến trình làm việc được tự động lưu trong IndexedDB của trình duyệt.'
            },
            {
              q: 'Video của tôi có bị tải lên máy chủ nào không?',
              a: 'Tuyệt đối KHÔNG. Mọi tác vụ cắt, ghép, phân tích audio waveform, áp bộ lọc 3D LUT và xuất file MP4 đều được thực thi trực tiếp bằng CPU và GPU máy tính của bạn. Dữ liệu của bạn được bảo mật tuyệt đối.'
            },
            {
              q: 'Tôi có thể xuất video ở độ phân giải nào?',
              a: 'Bạn có thể xuất video ở độ phân giải 720p HD, 1080p Full HD hoặc 4K Ultra HD với tốc độ khung hình từ 24fps đến 60fps định dạng MP4 H.264 tiêu chuẩn, tương thích hoàn hảo với TikTok, Instagram Reels, Facebook Shorts và YouTube Shorts.'
            },
            {
              q: 'Ứng dụng có thể chạy khi mất mạng (Offline) không?',
              a: 'Có! ClipForge là một Progressive Web App (PWA) với Service Worker nạp sẵn tài nguyên. Sau lần đầu truy cập, bạn có thể ngắt internet hoàn toàn và tiếp tục dựng phim hay xuất video bình thường.'
            },
            {
              q: 'ClipForge có liên kết với CapCut hay ByteDance không?',
              a: 'KHÔNG. ClipForge là một sản phẩm độc lập do đội ngũ kỹ sư phần mềm phát triển độc lập, không liên kết, không tài trợ và không trực thuộc CapCut hay ByteDance. Chúng tôi sử dụng bộ nhận diện, logo và mã nguồn riêng.'
            }
          ].map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-[#0D121F] border border-[#1A2234] overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full px-5 py-4 text-left font-bold text-sm text-white flex items-center justify-between gap-4 cursor-pointer hover:text-[#1FC8DB] transition-colors"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-[#1FC8DB] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#8E9BB0] shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4 text-xs text-[#8E9BB0] leading-relaxed border-t border-[#1A2234]/40 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. BOTTOM CALL-TO-ACTION */}
      <section className="py-16 px-6 lg:px-12 max-w-5xl mx-auto text-center border-t border-[#1A2234]/60 w-full">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30 flex flex-col items-center gap-5 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-black text-white">Sẵn sàng sáng tạo video triệu view?</h2>
          <p className="text-xs sm:text-sm text-[#8E9BB0] max-w-xl">
            Không cần chờ đợi, không cần đăng nhập, không lo lộ lọt video. Trải nghiệm dựng video dọc 9:16 ngay hôm nay!
          </p>
          <button
            onClick={() => navigate('/editor/demo-916-intro')}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#1FC8DB] to-[#22D3EE] hover:opacity-95 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer hover-lift"
          >
            <Play className="w-4 h-4 fill-slate-950 stroke-[0]" />
            <span>Mở Editor ngay bây giờ</span>
          </button>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="w-full bg-[#05070C] border-t border-[#1A2234] text-[#8E9BB0] text-xs pt-10 pb-12 px-6 lg:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#1A2234]/60">
            <div className="flex flex-col gap-2 max-w-md">
              <Logo size="md" />
              <p className="text-[12px] text-[#6B7A90] leading-relaxed">
                ClipForge Web — Trình biên tập video ngắn 9:16 trực tuyến. Vận hành 100% Client-Side trên trình duyệt.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px]">
              <Link to="/terms" className="hover:text-[#1FC8DB] transition-colors">
                Điều khoản dịch vụ
              </Link>
              <Link to="/privacy" className="hover:text-[#1FC8DB] transition-colors">
                Chính sách bảo mật
              </Link>
              <a href="/sitemap.xml" target="_blank" className="hover:text-[#1FC8DB] transition-colors">
                Sitemap
              </a>
              <a
                href="https://github.com/Mydoriy/clipforge-editor"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#1FC8DB] transition-colors flex items-center gap-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#556377]">
            <p>© {new Date().getFullYear()} ClipForge. Giữ toàn quyền tác giả.</p>
            <p className="text-amber-400/90 font-medium">
              Tuyên bố minh bạch: ClipForge là sản phẩm độc lập, không liên kết với CapCut hay ByteDance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
