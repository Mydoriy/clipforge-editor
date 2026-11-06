import React, { useState } from 'react';
import {
  Shield,
  Lock,
  EyeOff,
  HardDrive,
  Key,
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  FileText,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Sparkles
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Footer } from '../components/Footer';

interface PrivacyProps {
  initialTab?: 'privacy' | 'terms';
}

export const Privacy: React.FC<PrivacyProps> = ({ initialTab = 'privacy' }) => {
  const location = useLocation();
  const isTermsUrl = location.pathname.includes('terms') || initialTab === 'terms';
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(isTermsUrl ? 'terms' : 'privacy');

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F19] text-[#E5E7EB] flex flex-col justify-between">
      <div className="p-4 sm:p-8 lg:p-12 max-w-4xl mx-auto w-full flex flex-col gap-8 pb-16">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#1FC8DB] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang chủ (Dashboard)</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            <span>Phiên bản 1.0 • Cập nhật: Tháng 11/2026</span>
          </div>
        </div>

        {/* Tab Switcher: Privacy vs Terms */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#141824] border border-[#1F2937] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'privacy'
                ? 'bg-[#1FC8DB] text-slate-950 shadow-md'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Chính sách Quyền riêng tư (Privacy)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'terms'
                ? 'bg-[#1FC8DB] text-slate-950 shadow-md'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Điều khoản Dịch vụ (Terms of Service)</span>
          </button>
        </div>

        {/* TAB 1: PRIVACY POLICY */}
        {activeTab === 'privacy' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-200">
            {/* Hero Title */}
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1FC8DB]/10 border border-[#1FC8DB]/30 text-[#1FC8DB] text-xs font-bold w-fit">
                <Shield className="w-3.5 h-3.5" />
                <span>100% Client-Side Architecture & Privacy Standard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Chính sách Bảo mật & Quyền riêng tư (Privacy Policy)
              </h1>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                ClipForge Desktop Web được thiết kế theo triết lý <strong>Local-First & Client-Side Zero-Trust</strong>.
                Chúng tôi tin rằng video, âm thanh và nội dung sáng tạo của bạn phải thuộc toàn quyền kiểm soát của bạn,
                không bao giờ bị thu thập hay lưu giữ âm thầm trên máy chủ trung gian.
              </p>
            </div>

            {/* Core Principles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#141824] border border-[#1F2937] flex flex-col gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#1FC8DB]">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">1. Xử lý 100% trong trình duyệt (Local Processing)</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Mọi tác vụ giải mã video, cắt tỉa (split/trim), hiệu ứng chuyển cảnh, bộ lọc màu (3D LUT), render canvas
                  và xuất file MP4 đều sử dụng phần cứng máy bạn qua <strong>WebCodecs API</strong>,{' '}
                  <strong>WebAssembly (FFmpeg)</strong> và <strong>Web Audio API</strong>. Không có bất kỳ frame video hay
                  âm thanh nào được upload lên cloud khi xuất video.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#141824] border border-[#1F2937] flex flex-col gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <EyeOff className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">2. Telemetry tắt mặc định (No Spyware)</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  ClipForge <strong>tắt hoàn toàn mọi dịch vụ thu thập sự cố (Sentry)</strong> theo mặc định. Ứng dụng chỉ
                  ghi nhận log sự cố kỹ thuật ẩn danh (loại trình duyệt, bộ nhớ, mã lỗi) khi bạn chủ động tích chọn trong
                  Cài đặt để hỗ trợ sửa lỗi.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#141824] border border-[#1F2937] flex flex-col gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">3. Quản lý API Key AI & Proxy riêng</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Khóa API OpenAI / Gemini do bạn nhập chỉ được lưu trong <code>localStorage</code> trên trình duyệt của
                  bạn. Để đảm bảo an toàn tối đa trước các extension lạ, ClipForge hỗ trợ tùy chọn trỏ tới{' '}
                  <strong>Proxy Serverless riêng</strong> để bạn tự cô lập và quản lý request.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#141824] border border-[#1F2937] flex flex-col gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">4. Supabase Cloud Sync (Tùy chọn & RLS)</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Đồng bộ cloud là tùy chọn không bắt buộc (chế độ Guest mặc định không cần đăng nhập). Khi bạn bật
                  Supabase, toàn bộ bảng dữ liệu được bảo vệ bằng <strong>Row Level Security (RLS)</strong>, bucket lưu trữ
                  riêng tư (private) và truy cập bằng <strong>Signed URL</strong> có thời hạn.
                </p>
              </div>
            </div>

            {/* Detailed Sections */}
            <div className="flex flex-col gap-6 pt-4 border-t border-[#1F2937]">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1FC8DB]" />
                  Dữ liệu của bạn được lưu ở đâu?
                </h2>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Mọi dự án và tệp media được lưu trong cơ sở dữ liệu trình duyệt IndexedDB thông qua thư viện Dexie.js. Khi
                  bạn đóng trình duyệt, dữ liệu vẫn nguyên vẹn trên ổ cứng của bạn. Bạn có thể xuất file gói dự án{' '}
                  <code>.capproj</code> để sao lưu hoặc chuyển đổi sang thiết bị khác mà không cần đăng nhập tài khoản.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1FC8DB]" />
                  Quyền hạn Trình duyệt (Permissions-Policy & CSP)
                </h2>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Chúng tôi áp dụng chính sách bảo mật nội dung nghiêm ngặt (Strict Content-Security-Policy):
                </p>
                <ul className="list-disc list-inside text-xs text-[#9CA3AF] space-y-1 pl-2">
                  <li>
                    Chặn hoàn toàn inline scripts và chỉ cho phép <code>'wasm-unsafe-eval'</code> cho nhân tính toán FFmpeg
                    / ONNX WebAssembly.
                  </li>
                  <li>
                    Permissions-Policy vô hiệu hóa quyền truy cập Camera và Vị trí (Geolocation); chỉ xin quyền Micro khi
                    bạn chủ động ghi âm lồng tiếng (Voiceover).
                  </li>
                  <li>
                    Chặn nhúng frame từ bên ngoài với tiêu đề <code>X-Frame-Options: DENY</code> và{' '}
                    <code>frame-ancestors 'none'</code>.
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1FC8DB]" />
                  Quyền xóa dữ liệu (Right to be Forgotten)
                </h2>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Bạn có toàn quyền xóa sạch 100% dữ liệu dự án, cache media, thumbnail, waveform và lịch sử chỉnh sửa bất
                  kỳ lúc nào thông qua nút <strong>"Xóa toàn bộ dữ liệu" (Danger Zone)</strong> trong Cài đặt hệ thống, hoặc
                  thông qua tính năng dọn dẹp bộ nhớ của trình duyệt.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TERMS OF SERVICE */}
        {activeTab === 'terms' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-200">
            {/* Hero Title */}
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold w-fit">
                <Scale className="w-3.5 h-3.5" />
                <span>Quy định Sử dụng & Bản quyền</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Điều khoản Dịch vụ & Miễn trừ Trách nhiệm (Terms of Service)
              </h1>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                Chào mừng bạn đến với ClipForge Desktop Web. Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng ứng dụng.
                Việc bạn truy cập và sử dụng ClipForge đồng nghĩa với việc bạn đồng ý tuân thủ toàn bộ các điều khoản này.
              </p>
            </div>

            {/* Prominent Trademark & Non-Affiliation Box */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 text-amber-200 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>1. Tuyên bố Độc lập & Bản quyền Thương hiệu (Trademark Disclaimer)</span>
              </div>
              <p>
                <strong>ClipForge Desktop Web là một sản phẩm độc lập, mã nguồn mở</strong>, được phát triển phục vụ cộng đồng sáng tạo video ngắn 9:16.
                Ứng dụng <strong>KHÔNG liên kết, tài trợ, ủy quyền hoặc bảo trợ bởi CapCut hoặc ByteDance Ltd.</strong>
              </p>
              <p>
                Nhãn hiệu "CapCut" và các logo liên quan là tài sản trí tuệ độc quyền của ByteDance Ltd. Bất kỳ sự tương đồng nào về quy trình thao tác
                đều nhằm mục đích tối ưu hóa trải nghiệm thân thuộc cho người sáng tạo nội dung trên nền tảng web mã nguồn mở.
              </p>
            </div>

            {/* Terms Sections */}
            <div className="flex flex-col gap-6">
              <div className="p-5 rounded-2xl bg-[#141824] border border-[#1F2937] flex flex-col gap-2.5">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1FC8DB]" />
                  2. Bản quyền Nội dung & Trách nhiệm Người dùng (User Content & Copyright)
                </h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Người dùng giữ toàn quyền sở hữu đối với mọi video, âm thanh, văn bản và hình ảnh được nhập vào ứng dụng.
                  <strong> Bạn chịu trách nhiệm hoàn toàn về tính pháp lý và bản quyền của các tệp tin này</strong>.
                </p>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Bạn cam kết không sử dụng ứng dụng để xử lý, cắt ghép hoặc phân phối các nội dung vi phạm bản quyền tác giả,
                  nội dung độc hại, vi phạm pháp luật hoặc xâm phạm quyền riêng tư của cá nhân/tổ chức khác.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#141824] border border-[#1F2937] flex flex-col gap-2.5">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1FC8DB]" />
                  3. Xử lý Cục bộ & Trách nhiệm Bảo toàn Dữ liệu (Local Storage & Data Loss)
                </h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  ClipForge hoạt động theo kiến trúc <strong>Local-First 100%</strong>. Dữ liệu dự án và media chỉ tồn tại trên thiết bị của bạn
                  thông qua cơ sở dữ liệu IndexedDB của trình duyệt. ClipForge không thể khôi phục dữ liệu nếu bạn thực hiện:
                </p>
                <ul className="list-disc list-inside text-xs text-[#9CA3AF] space-y-1 pl-2">
                  <li>Xóa bộ nhớ đệm (Clear site data / Cookies) của trình duyệt.</li>
                  <li>Dùng chế độ ẩn danh (Incognito Mode) và đóng cửa sổ duyệt web.</li>
                  <li>Gỡ bỏ trình duyệt hoặc gặp sự cố hỏng hóc ổ cứng vật lý.</li>
                </ul>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Chúng tôi khuyến nghị người dùng chủ động xuất gói dự án định dạng <code>.capproj</code> sau các phiên làm việc quan trọng để sao lưu.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#141824] border border-[#1F2937] flex flex-col gap-2.5">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1FC8DB]" />
                  4. Tài sản Dựng sẵn & Giấy phép Mã nguồn (Built-in Assets & Licenses)
                </h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Mọi tài nguyên tích hợp sẵn trong ứng dụng đều tuân thủ các giấy phép nguồn mở và tự do thương mại:
                </p>
                <ul className="list-disc list-inside text-xs text-[#9CA3AF] space-y-1 pl-2">
                  <li><strong>Phông chữ (Fonts):</strong> SIL Open Font License 1.1 (OFL) và Apache 2.0.</li>
                  <li><strong>Âm thanh & Hiệu ứng:</strong> Procedural Web Audio API synthesis (MIT / CC0) & CC0 Public Domain.</li>
                  <li><strong>Icon & Sticker:</strong> Lucide Icons (ISC License) và vector đồ họa in-house.</li>
                  <li><strong>Mẫu video (Templates):</strong> 22+ mẫu do ClipForge tự phát triển, tự do sử dụng cho mục đích cá nhân và thương mại.</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-[#141824] border border-[#1F2937] flex flex-col gap-2.5">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1FC8DB]" />
                  5. Giới hạn Trách nhiệm (Limitation of Liability)
                </h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  PHẦN MỀM ĐƯỢC CUNG CẤP "NGUYÊN TRẠNG" (AS IS), KHÔNG CÓ BẤT KỲ SỰ BẢO ĐẢM NÀO DÙ RÕ RÀNG HAY NGỤ Ý.
                  TRONG MỌI TRƯỜNG HỢP, CÁC TÁC GIẢ HOẶC NGƯỜI NẮM GIỮ BẢN QUYỀN SẼ KHÔNG CHỊU TRÁCH NHIỆM CHO BẤT KỲ KHIẾU NẠI,
                  THIỆT HẠI NÀO PHÁT SINH TỪ VIỆC SỬ DỤNG HOẶC KHÔNG THỂ SỬ DỤNG ỨNG DỤNG.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="p-4 rounded-xl bg-[#141824] border border-[#1F2937] flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="text-xs text-[#9CA3AF]">
            Xem chi tiết thông báo bản quyền phụ thuộc bên thứ ba và giấy phép tài sản.
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Mydoriy/clipforge-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#1FC8DB]/15 hover:bg-[#1FC8DB] text-[#1FC8DB] hover:text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Mã nguồn trên GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};
