import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Cpu,
  Layers,
  HardDrive,
  ShieldCheck,
  Film,
  Zap,
  Globe
} from 'lucide-react';

interface DiagnosticItem {
  id: string;
  name: string;
  status: 'green' | 'amber' | 'red';
  value: string;
  detail: string;
  fallback: string;
}

export const SystemCheckModal: React.FC = () => {
  const { closeModal, showToast } = useEditorStore();
  const [copied, setCopied] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [overallGrade, setOverallGrade] = useState<'A+' | 'A' | 'B' | 'C'>('A');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasWebCodecs = 'VideoEncoder' in window && 'VideoDecoder' in window;
    const hasWebGL2 = (() => {
      try {
        const c = document.createElement('canvas');
        return !!c.getContext('webgl2');
      } catch {
        return false;
      }
    })();
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const hasFsAccess = 'showDirectoryPicker' in window;
    const hasOpfs = typeof navigator !== 'undefined' && 'storage' in navigator && 'getDirectory' in navigator.storage;
    const isIsolated = !!window.crossOriginIsolated;
    const hasSAB = typeof SharedArrayBuffer !== 'undefined';
    const hasMediaRecorder = 'MediaRecorder' in window;
    const cpuCores = navigator.hardwareConcurrency || 4;
    const ramGB = (navigator as any).deviceMemory || 8;

    // Detect browser
    const ua = navigator.userAgent;
    let browserName = 'Trình duyệt khác';
    let isChromeOrEdge = false;
    if (ua.includes('Edg/')) {
      browserName = 'Microsoft Edge';
      isChromeOrEdge = true;
    } else if (ua.includes('Chrome/')) {
      browserName = 'Google Chrome';
      isChromeOrEdge = true;
    } else if (ua.includes('Firefox/')) {
      browserName = 'Mozilla Firefox';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
      browserName = 'Apple Safari';
    }

    const items: DiagnosticItem[] = [
      {
        id: 'webcodecs',
        name: 'WebCodecs (VideoEncoder / VideoDecoder)',
        status: hasWebCodecs ? 'green' : 'red',
        value: hasWebCodecs ? 'Hỗ trợ phần cứng' : 'Không hỗ trợ',
        detail: hasWebCodecs ? 'Xuất video 1080p/4K siêu tốc bằng GPU/CPU native.' : 'Trình duyệt không hỗ trợ WebCodecs API.',
        fallback: hasWebCodecs ? 'Không cần fallback' : 'Tự động fallback sang MediaRecorder & FFmpeg.wasm.'
      },
      {
        id: 'webgl2',
        name: 'WebGL 2.0 Compositor',
        status: hasWebGL2 ? 'green' : 'amber',
        value: hasWebGL2 ? 'Sẵn sàng' : 'Không hỗ trợ',
        detail: hasWebGL2 ? 'Compositor thời gian thực với shaders và bộ lọc màu 3D LUT.' : 'Không thể khởi tạo WebGL2 context.',
        fallback: hasWebGL2 ? 'Không cần fallback' : 'Fallback sang HTML5 Canvas 2D render.'
      },
      {
        id: 'webgpu',
        name: 'WebGPU Compute Acceleration',
        status: hasWebGPU ? 'green' : 'amber',
        value: hasWebGPU ? 'Sẵn sàng' : 'Chưa bật cờ WebGPU',
        detail: hasWebGPU ? 'Tính toán song song đồ họa hiệu năng cao.' : 'WebGPU chưa được bật mặc định trên phiên bản này.',
        fallback: 'Compositor chạy hoàn hảo trên WebGL2/Canvas2D.'
      },
      {
        id: 'fs_access',
        name: 'File System Access API (Streaming Writable)',
        status: hasFsAccess ? 'green' : 'amber',
        value: hasFsAccess ? 'Được hỗ trợ' : 'Không hỗ trợ',
        detail: hasFsAccess ? 'Ghi trực tiếp file video vào ổ đĩa trong lúc xuất, tiết kiệm RAM.' : 'Safari/Firefox chưa hỗ trợ ghi stream ổ đĩa.',
        fallback: hasFsAccess ? 'Không cần fallback' : 'Tự động fallback sang tải file qua Blob browser download.'
      },
      {
        id: 'opfs',
        name: 'Origin Private File System (OPFS)',
        status: hasOpfs ? 'green' : 'amber',
        value: hasOpfs ? 'Sẵn sàng' : 'Không hỗ trợ',
        detail: hasOpfs ? 'Lưu trữ tệp tạm và proxy video siêu tốc độ cao.' : 'Trình duyệt không hỗ trợ OPFS.',
        fallback: 'Fallback sang IndexedDB Blobs lưu trữ an toàn.'
      },
      {
        id: 'isolation',
        name: 'Cross-Origin Isolation (COOP / COEP)',
        status: isIsolated ? 'green' : 'amber',
        value: isIsolated ? 'crossOriginIsolated = true' : 'crossOriginIsolated = false',
        detail: isIsolated ? 'Headers COOP (same-origin) và COEP (credentialless) đã kích hoạt.' : 'Headers chưa bật, không thể dùng SharedArrayBuffer đa luồng.',
        fallback: isIsolated ? 'Không cần fallback' : 'FFmpeg.wasm chạy ở chế độ đơn luồng (single-thread).'
      },
      {
        id: 'hardware',
        name: 'Cấu hình Phần cứng (CPU & RAM)',
        status: cpuCores >= 4 && ramGB >= 8 ? 'green' : 'amber',
        value: `${cpuCores} CPU Cores • ~${ramGB} GB RAM`,
        detail: `Hệ thống phát hiện ${cpuCores} luồng tính toán và khoảng ${ramGB}GB RAM thiết bị.`,
        fallback: cpuCores >= 4 && ramGB >= 8 ? 'Tối ưu cho 1080p 60fps' : 'Tự động gợi ý bật Proxy 480p khi phát hiện tụt fps.'
      },
      {
        id: 'browser',
        name: 'Trình duyệt & Nền tảng thực thi',
        status: isChromeOrEdge ? 'green' : 'amber',
        value: browserName,
        detail: isChromeOrEdge ? 'Môi trường tối ưu nhất cho toàn bộ tính năng Client-Side.' : `${browserName} có thể cần một số fallback tương thích.`,
        fallback: isChromeOrEdge ? 'Trải nghiệm gốc 100%' : 'Tất cả fallback cục bộ tự động kích hoạt.'
      }
    ];

    setDiagnostics(items);

    // Compute grade
    const redCount = items.filter((i) => i.status === 'red').length;
    const amberCount = items.filter((i) => i.status === 'amber').length;
    if (redCount === 0 && amberCount <= 1) setOverallGrade('A+');
    else if (redCount === 0 && amberCount <= 3) setOverallGrade('A');
    else if (redCount <= 1) setOverallGrade('B');
    else setOverallGrade('C');
  }, []);

  const handleCopyDiagnostics = () => {
    if (typeof navigator === 'undefined') return;
    const markdown = `# CLIPFORGE - BÁO CÁO CHẨN ĐOÁN HỆ THỐNG
- Thời gian: ${new Date().toISOString()}
- Trình duyệt (UA): ${navigator.userAgent}
- Đánh giá tổng quan: Hạng ${overallGrade}
- crossOriginIsolated: ${window.crossOriginIsolated}

## Chi tiết năng lực phần cứng & Web API:
${diagnostics
  .map(
    (d) =>
      `- [${d.status.toUpperCase()}] ${d.name}: ${d.value}\n  • Chi tiết: ${d.detail}\n  • Fallback: ${d.fallback}`
  )
  .join('\n')}
`;
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      showToast('Đã sao chép báo cáo chẩn đoán vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="flex flex-col gap-5 text-left text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2.5 text-[#22D3EE]">
          <Activity className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">Kiểm tra hệ thống & Năng lực thiết bị</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#9CA3AF]">Tương thích:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              overallGrade === 'A+' || overallGrade === 'A'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : overallGrade === 'B'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            Hạng {overallGrade}
          </span>
        </div>
      </div>

      {/* Overview Intro Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/20 flex items-start gap-3 text-xs leading-relaxed text-[#CBD5E1]">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-white">Vận hành 100% Client-Side không cần Server render</span>
          <span className="text-[11px] text-[#9CA3AF]">
            ClipForge sử dụng trực tiếp CPU, GPU và các API Web tiên tiến của thiết bị bạn. Mọi video được dựng an toàn
            trên trình duyệt mà không tải dữ liệu lên máy chủ.
          </span>
        </div>
      </div>

      {/* Diagnostics List */}
      <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
        {diagnostics.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] flex flex-col gap-1.5 text-xs transition-colors hover:border-[#374151]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.status === 'green' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : item.status === 'amber' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-semibold text-white">{item.name}</span>
              </div>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                  item.status === 'green'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : item.status === 'amber'
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'bg-rose-500/10 text-rose-300'
                }`}
              >
                {item.value}
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] pl-6 leading-relaxed">{item.detail}</p>
            {item.status !== 'green' && (
              <div className="ml-6 p-2 rounded-lg bg-[#141B2D] border border-cyan-500/20 text-[10px] text-cyan-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Phương án thích ứng:</strong> {item.fallback}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1F2937]">
        <button
          type="button"
          onClick={handleCopyDiagnostics}
          className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#E2E8F0] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã sao chép' : 'Sao chép thông tin chẩn đoán'}</span>
        </button>
        <button
          type="button"
          onClick={closeModal}
          className="px-5 py-2 rounded-xl bg-[#22D3EE] hover:bg-[#4BD9E8] text-slate-950 font-bold text-xs transition-colors cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};
