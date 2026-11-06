import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Heart, ExternalLink, Bug, Activity } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  const { openModal } = useEditorStore();

  return (
    <footer className="w-full bg-[#080B12] border-t border-[#1A2234] text-[#8E9BB0] text-xs pt-8 pb-10 px-6 sm:px-10 mt-auto select-none">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Top row: Brand + Quick Links */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#1A2234]/60">
          <div className="flex flex-col gap-2 max-w-md">
            <Logo size="md" />
            <p className="text-[12px] text-[#6B7A90] leading-relaxed">
              Trình biên tập video dọc 9:16 chuyên nghiệp cho TikTok, Reels và Shorts.
              Vận hành 100% Client-Side trên trình duyệt bằng WebCodecs, WebGL2 và IndexedDB.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px]">
            <Link to="/help" className="hover:text-[#1FC8DB] transition-colors">
              Trợ giúp & FAQ (Help)
            </Link>
            <Link to="/terms" className="hover:text-[#1FC8DB] transition-colors">
              Điều khoản dịch vụ (Terms)
            </Link>
            <Link to="/privacy" className="hover:text-[#1FC8DB] transition-colors">
              Chính sách quyền riêng tư (Privacy)
            </Link>
            <button
              type="button"
              onClick={() => openModal('systemCheck')}
              className="hover:text-[#1FC8DB] transition-colors flex items-center gap-1"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kiểm tra hệ thống</span>
            </button>
            <button
              type="button"
              onClick={() => openModal('feedback')}
              className="hover:text-[#1FC8DB] transition-colors flex items-center gap-1"
            >
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>Báo lỗi & Góp ý</span>
            </button>
            <a
              href="https://github.com/Mydoriy/clipforge-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1FC8DB] transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mã nguồn GitHub</span>
            </a>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-3.5 rounded-xl bg-[#0D131F] border border-[#1E293B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] leading-relaxed text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-300">Tuyên bố độc lập:</strong> ClipForge Desktop Web là sản phẩm độc lập,
              <strong> không liên kết với CapCut hay ByteDance</strong> (Not affiliated with CapCut or ByteDance Ltd). Mọi nhãn hiệu thuộc về chủ sở hữu hợp pháp.
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Local-First & Zero Tracking</span>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#55637A]">
          <div>
            © {new Date().getFullYear()} ClipForge. Mã nguồn phát hành theo giấy phép MIT. Toàn bộ tài nguyên âm thanh, font và mẫu thuộc CC0 / OFL / In-House.
          </div>
          <div className="flex items-center gap-1">
            <span>Được xây dựng với</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>cho cộng đồng sáng tạo video ngắn</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
