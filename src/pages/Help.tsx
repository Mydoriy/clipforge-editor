import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  AlertTriangle,
  PlayCircle,
  FileQuestion,
  Search,
  ExternalLink,
  ArrowLeft,
  Activity,
  Bug,
  Shield,
  HardDrive,
  Cpu,
  Key,
  Lock,
  Layers,
  Scissors,
  Download,
  Video,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { Footer } from '../components/Footer';
import { useEditorStore } from '../store/useEditorStore';
import { APP_VERSION } from '../constants/version';

interface TroubleshootingItem {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  severity: 'high' | 'medium' | 'info';
  symptoms: string;
  cause: string;
  steps: string[];
  tip?: string;
}

interface GuideItem {
  id: string;
  title: string;
  duration: string;
  icon: any;
  description: string;
  steps: string[];
  shortcut?: string;
}

interface FaqItem {
  question: string;
  answer: string;
  category: 'privacy' | 'export' | 'backup' | 'system';
}

export const Help: React.FC = () => {
  const { openModal } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'all' | 'troubleshoot' | 'guides' | 'faq'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTroubleshoot, setExpandedTroubleshoot] = useState<string | null>('export-freeze');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const troubleshootingList: TroubleshootingItem[] = [
    {
      id: 'export-freeze',
      title: 'Export bị lỗi hoặc dừng ở 99%',
      subtitle: 'Xử lý lỗi mã hóa video, hết dung lượng đĩa hoặc GPU driver timeout',
      icon: Download,
      severity: 'high',
      symptoms: 'Thanh tiến trình chạy tới 98-99% thì đứng yên, hoặc xuất hiện thông báo "Export failed: WebCodecs timeout", tab bị đơ.',
      cause: 'Trình duyệt hết dung lượng lưu trữ cục bộ, card đồ họa bị reset khi mã hóa phần cứng (H.264/AAC), hoặc bộ nhớ RAM của tab vượt quá ngưỡng an toàn của Chrome.',
      steps: [
        'Hạ độ phân giải xuất: Trong cửa sổ Xuất video, chuyển từ 4K/1080p xuống 720p hoặc chọn 30 FPS để giảm tải GPU.',
        'Kích hoạt Dedicated WebCodecs Worker: Vào Cài đặt (Settings) → Tính năng thử nghiệm → Bật "Dedicated WebCodecs Worker" để tách render sang luồng riêng biệt.',
        'Đóng các tab trình duyệt và ứng dụng nặng khác để giải phóng tối thiểu 2GB RAM và bộ nhớ đệm VRAM.',
        'Kiểm tra dung lượng ổ đĩa: Đảm bảo ổ cứng (ổ C: trên Windows) còn trống tối thiểu 2GB để trình duyệt lưu tệp blob tạm.',
        'Chuyển sang chế độ Fallback: Nếu phần cứng không có bộ giải mã H.264 WebCodecs, hệ thống sẽ tự động dùng MediaRecorder tương thích cao.'
      ],
      tip: 'Mẹo: Bạn có thể chọn "Xuất khung hình hiện tại (PNG)" hoặc "Xuất file âm thanh MP3" trước để kiểm tra dự án có bị lỗi layer nào không.'
    },
    {
      id: 'ram-stutter',
      title: 'Thiếu RAM / Preview bị giật lag',
      subtitle: 'Tối ưu hiệu năng khi dựng video nhiều hiệu ứng và video 4K',
      icon: Cpu,
      severity: 'medium',
      symptoms: 'Phát video xem trước bị giật hình, rớt khung hình (dropped frames), âm thanh bị rè hoặc trình duyệt hiện cảnh báo "Out of Memory".',
      cause: 'Timeline có quá nhiều clip 4K bitrate cao cùng tải vào bộ nhớ, hoặc áp dụng nhiều bộ lọc WebGL2 cùng một lúc.',
      steps: [
        'Bật chế độ Xem trước Proxy: Chuyển độ phân giải preview xuống 360p hoặc 540p. Video xuất ra vẫn giữ nguyên 1080p gốc.',
        'Cắt nhỏ clip dài: Dùng phím C để tách bớt các đoạn video không sử dụng thay vì giữ nguyên clip dài 30 phút trên timeline.',
        'Giảm số lượng track chồng lấn: Hạn chế mở quá 5 layer video hoặc hiệu ứng chữ chuyển động chạy song song cùng thời điểm.',
        'Bật Tăng tốc phần cứng (Hardware Acceleration): Vào chrome://settings/system và kiểm tra "Use graphics acceleration when available" đã BẬT.'
      ],
      tip: 'Kiểm tra mức RAM và WebGL bằng cách bấm nút "Kiểm tra hệ thống" ở góc trên bên phải trang này.'
    },
    {
      id: 'file-permission',
      title: 'Mất quyền truy cập file video cục bộ',
      subtitle: 'Xử lý cảnh báo "File handle expired" sau khi tắt mở lại trình duyệt',
      icon: Key,
      severity: 'medium',
      symptoms: 'Clip trên timeline hiện biểu tượng tam giác vàng: "Mất quyền truy cập tệp gốc" hoặc không phát được video sau khi đóng mở lại tab.',
      cause: 'Cơ chế bảo mật Sandbox của trình duyệt Chromium (File System Access API) tự động thu hồi quyền đọc file trên ổ cứng khi phiên duyệt web kết thúc.',
      steps: [
        'Bấm trực tiếp vào clip có biểu tượng cảnh báo và chọn "Cấp lại quyền đọc file" (Grant Permission).',
        'Khi trình duyệt hiện hộp thoại thông báo "Xem và chỉnh sửa tệp?", hãy bấm "Cho phép" (Allow).',
        'Cách nhanh nhất: Kéo thả lại đúng tệp video gốc từ thư mục máy tính vào panel Thư viện; ClipForge tự động nhận diện lại theo mã hash SHA-256 và tên file mà không làm mất timeline dựng.',
        'Để tránh cấp lại quyền nhiều lần: Hãy bật tính năng "Lưu bản sao media vào bộ nhớ đệm IndexedDB" trong Cài đặt.'
      ],
      tip: 'Dự án của bạn không bao giờ bị mất: Mọi vị trí cắt ghép, hiệu ứng chữ, âm thanh đều đã được lưu an toàn trong cơ sở dữ liệu IndexedDB.'
    },
    {
      id: 'tab-concurrency',
      title: 'Tab bị đơ / Cảnh báo khóa đa tab (Web Locks)',
      subtitle: 'Bảo vệ dữ liệu khi mở ClipForge trên nhiều cửa sổ cùng lúc',
      icon: Lock,
      severity: 'info',
      symptoms: 'Mở tab mới thì tab cũ bị dừng, hoặc thanh trạng thái hiện "Dự án đang được giữ quyền bởi một tab khác".',
      cause: 'ClipForge sử dụng Web Locks API tiêu chuẩn để chống xung đột ghi đè đồng thời (race condition) vào cơ sở dữ liệu Dexie IndexedDB.',
      steps: [
        'Đóng các tab ClipForge khác đang mở trong cùng trình duyệt.',
        'Tải lại tab hiện tại (F5 hoặc Ctrl+R) để nhận quyền ghi độc quyền vào dự án.',
        'Nếu bạn muốn so sánh 2 dự án khác nhau: Hãy xuất một dự án ra file .capproj để lưu trữ, hoặc sử dụng cửa sổ Ẩn danh (Incognito) riêng biệt.'
      ],
      tip: 'Cơ chế Web Locks giúp bạn hoàn toàn an tâm: dữ liệu dự án của bạn không bao giờ bị ghi đè hay mất mát ngoài ý muốn.'
    }
  ];

  const guidesList: GuideItem[] = [
    {
      id: 'guide-import',
      title: '1. Tạo dự án & Nhập Media',
      duration: '1 phút',
      icon: Layers,
      description: 'Kéo thả video, âm thanh và hình ảnh trực tiếp từ máy tính vào không gian làm việc.',
      steps: [
        'Bấm "Dự án mới" trên thanh tiêu đề hoặc nhấn Ctrl + N.',
        'Kéo thả tệp video MP4/MOV hoặc ảnh từ thư mục máy tính vào khu vực "Thư viện Media".',
        'ClipForge sẽ phân tích thời lượng, kích thước và tạo thumbnail cục bộ chỉ trong vài mili-giây.'
      ],
      shortcut: 'Ctrl + N'
    },
    {
      id: 'guide-edit',
      title: '2. Cắt ghép & Sắp xếp Timeline',
      duration: '1.5 phút',
      icon: Scissors,
      description: 'Sử dụng công cụ cắt nhanh (Razor) và điều chỉnh độ dài clip trên timeline trực quan.',
      steps: [
        'Kéo thanh trượt thời gian (Playhead) đến vị trí muốn chia đoạn.',
        'Bấm phím C hoặc nhấn biểu tượng Cây kéo trên thanh công cụ để chia tách clip làm đôi.',
        'Chọn đoạn thừa và nhấn phím Delete hoặc Backspace để xóa.',
        'Kéo mép clip sang trái hoặc phải để cắt gọt (trim) thời lượng cực nhanh.'
      ],
      shortcut: 'Phím C (Cắt) • Del (Xóa)'
    },
    {
      id: 'guide-captions',
      title: '3. Phụ đề tự động & Word Art',
      duration: '2 phút',
      icon: Sparkles,
      description: 'Nhận diện giọng nói tiếng Việt bằng AI Whisper chạy trực tiếp trong trình duyệt.',
      steps: [
        'Chọn tab "Văn bản & Phụ đề" ở thanh công cụ bên trái.',
        'Bấm "Tạo phụ đề tự động" (Local Whisper AI) để phiên âm lời thoại thành văn bản không cần mạng.',
        'Chọn kiểu hiển thị Word Art nổi bật (TikTok, Neon, Karaoke) và chỉnh màu sắc, viền chữ, bóng đổ theo ý muốn.'
      ],
      shortcut: 'Phím T (Thêm chữ)'
    },
    {
      id: 'guide-export',
      title: '4. Xuất video MP4 & Lưu trữ',
      duration: '1 phút',
      icon: Download,
      description: 'Render video tốc độ cao bằng phần cứng WebCodecs và tải trực tiếp về máy.',
      steps: [
        'Bấm nút "Xuất video" (Export) màu xanh ngọc ở góc trên bên phải.',
        'Chọn định dạng xuất mong muốn: MP4 Video (1080p Full HD hoặc 4K), Audio MP3 hoặc Ảnh PNG.',
        'Bấm "Bắt đầu xuất". Sau khi hoàn tất, tệp MP4 sẽ được tải thẳng về thư mục Downloads của bạn.'
      ],
      shortcut: 'Ctrl + E'
    }
  ];

  const faqList: FaqItem[] = [
    {
      category: 'privacy',
      question: 'Video của tôi có bị tải lên máy chủ của ClipForge không?',
      answer:
        'Tuyệt đối không! ClipForge hoạt động theo kiến trúc Local-First 100% Client-Side. Toàn bộ quá trình giải mã, chỉnh sửa hiệu ứng, tổng hợp âm thanh và render MP4 đều diễn ra trực tiếp bằng chip CPU/GPU của máy tính bạn thông qua WebCodecs và WebGL2. Không có bất kỳ byte dữ liệu video nào được gửi lên server.'
    },
    {
      category: 'export',
      question: 'Tôi có cần đăng nhập để xuất video chất lượng cao không?',
      answer:
        'Không cần! Bạn có thể sử dụng tất cả tính năng biên tập cốt lõi và xuất video chất lượng cao (720p, 1080p Full HD, 60fps) hoàn toàn miễn phí và không cần đăng ký tài khoản. Tính năng đăng nhập chỉ là tùy chọn nếu bạn muốn kết nối Supabase cá nhân để đồng bộ dự án giữa các thiết bị.'
    },
    {
      category: 'backup',
      question: 'Làm thế nào để sao lưu dự án hoặc mang sang máy tính khác?',
      answer:
        'Bạn vào Menu góc trái → chọn "Tệp" → chọn "Xuất file dự án (.capproj)". Tệp .capproj chứa toàn bộ timeline, vị trí cắt ghép, hiệu ứng chữ và thông số màu sắc. Sang máy tính mới, bạn chỉ cần mở ClipForge và chọn "Mở tệp .capproj" để tiếp tục dựng mà không bị giảm chất lượng.'
    },
    {
      category: 'system',
      question: 'Trình duyệt nào được hỗ trợ tốt nhất?',
      answer:
        'ClipForge hoạt động tối ưu nhất trên các trình duyệt Chromium phiên bản 106 trở lên như Google Chrome, Microsoft Edge, Brave và Cốc Cốc nhờ hỗ trợ đầy đủ WebCodecs và Web Audio API. Trình duyệt Firefox và Safari vẫn có thể dùng được thông qua bộ giải mã tương thích dự phòng (MediaRecorder & FFmpeg WebAssembly).'
    },
    {
      category: 'system',
      question: 'Nếu tôi vô tình tắt tab hoặc trình duyệt bị đóng đột ngột thì sao?',
      answer:
        'Đừng lo lắng! Cơ chế Tự động lưu (Autosave) của ClipForge ghi nhận từng thao tác chỉnh sửa vào cơ sở dữ liệu IndexedDB theo thời gian thực. Khi bạn mở lại trang web, dự án gần nhất sẽ tự động được khôi phục nguyên vẹn.'
    }
  ];

  // Filtering
  const filteredTroubleshoot = troubleshootingList.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.symptoms.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuides = guidesList.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaq = faqList.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F19] text-[#E5E7EB] flex flex-col justify-between">
      <div className="p-4 sm:p-8 lg:p-12 max-w-5xl mx-auto w-full flex flex-col gap-8 pb-16">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#1FC8DB] hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang chủ (Dashboard)</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[#22D3EE] font-mono">
              ClipForge v{APP_VERSION}
            </span>
            <button
              type="button"
              onClick={() => openModal('systemCheck')}
              className="px-3 py-1.5 rounded-lg bg-[#141B2D] hover:bg-cyan-500/20 text-[#22D3EE] border border-cyan-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Kiểm tra hệ thống</span>
            </button>
            <button
              type="button"
              onClick={() => openModal('feedback')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Báo sự cố</span>
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-[#22D3EE]">
            <HelpCircle className="w-6 h-6 stroke-[2.2]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Trung tâm Trợ giúp & Khắc phục Sự cố
            </h1>
          </div>
          <p className="text-sm text-[#9CA3AF] max-w-2xl leading-relaxed">
            Tìm kiếm giải pháp nhanh cho các sự cố kỹ thuật thường gặp, hướng dẫn sử dụng tính năng và giải đáp các thắc mắc về quyền riêng tư.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sự cố: export lỗi, thiếu RAM, mất quyền đọc file, phím tắt..."
            className="w-full bg-[#111625] border border-[#1F2937] focus:border-[#22D3EE] rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder-[#6B7280] outline-none shadow-inner transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] hover:text-white"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Tabs Filter */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1F2937] pb-2 text-xs font-semibold">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'troubleshoot', label: 'Khắc phục sự cố (Troubleshooting)' },
            { key: 'guides', label: 'Hướng dẫn nhanh (Quick Guides)' },
            { key: 'faq', label: 'Câu hỏi thường gặp (FAQ)' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#22D3EE] text-slate-950 font-bold shadow-md'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SECTION 1: TROUBLESHOOTING */}
        {(activeTab === 'all' || activeTab === 'troubleshoot') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                Khắc phục 4 Sự cố Kỹ thuật Thường gặp
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {filteredTroubleshoot.map((item) => {
                const isExpanded = expandedTroubleshoot === item.id;
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? 'bg-[#121828] border-cyan-500/40 shadow-lg'
                        : 'bg-[#0E1322] border-[#1F2937] hover:border-[#374151]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedTroubleshoot(isExpanded ? null : item.id)}
                      className="w-full p-4 sm:p-5 flex items-start justify-between gap-4 text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            item.severity === 'high'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : item.severity === 'medium'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-white">{item.title}</h3>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                item.severity === 'high'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : item.severity === 'medium'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {item.severity === 'high' ? 'Nghiêm trọng' : item.severity === 'medium' ? 'Cần chú ý' : 'Thông tin'}
                            </span>
                          </div>
                          <p className="text-xs text-[#9CA3AF] mt-1">{item.subtitle}</p>
                        </div>
                      </div>
                      <div className="text-[#9CA3AF] p-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-[#1F2937]/60 flex flex-col gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-[#090D17] border border-[#1F2937] flex flex-col gap-1.5">
                          <div>
                            <span className="font-bold text-slate-300">Biểu hiện: </span>
                            <span className="text-[#9CA3AF]">{item.symptoms}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-300">Nguyên nhân cốt lõi: </span>
                            <span className="text-[#9CA3AF]">{item.cause}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Các bước khắc phục khuyến nghị:</span>
                          </h4>
                          <ol className="list-decimal list-inside space-y-1.5 text-[#CBD5E1] pl-1 leading-relaxed">
                            {item.steps.map((step, idx) => (
                              <li key={idx} className="pl-1">
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {item.tip && (
                          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#22D3EE] leading-relaxed">
                            {item.tip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: SHORT VISUAL GUIDES */}
        {(activeTab === 'all' || activeTab === 'guides') && (
          <div className="flex flex-col gap-4 pt-4 border-t border-[#1F2937]">
            <div className="flex items-center gap-2 text-cyan-400">
              <PlayCircle className="w-5 h-5" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                Hướng dẫn Biên tập Nhanh (Quick Visual Guides)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGuides.map((guide) => {
                const GuideIcon = guide.icon;
                return (
                  <div
                    key={guide.id}
                    className="p-5 rounded-2xl bg-[#0E1322] border border-[#1F2937] flex flex-col justify-between gap-4 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                          <GuideIcon className="w-4 h-4" />
                          <span>{guide.title}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1F2937] text-[#9CA3AF] font-mono">
                          {guide.duration}
                        </span>
                      </div>
                      <p className="text-xs text-[#9CA3AF] leading-relaxed">{guide.description}</p>
                      <ul className="space-y-1.5 text-xs text-[#CBD5E1] pt-1">
                        {guide.steps.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#22D3EE] font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {guide.shortcut && (
                      <div className="pt-2 border-t border-[#1F2937] flex items-center justify-between text-[11px]">
                        <span className="text-[#6B7280]">Phím tắt gợi ý:</span>
                        <span className="px-2 py-0.5 rounded bg-[#172033] border border-cyan-500/20 text-[#22D3EE] font-mono font-semibold">
                          {guide.shortcut}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: FAQ */}
        {(activeTab === 'all' || activeTab === 'faq') && (
          <div className="flex flex-col gap-4 pt-4 border-t border-[#1F2937]">
            <div className="flex items-center gap-2 text-emerald-400">
              <FileQuestion className="w-5 h-5" />
              <h2 className="text-base sm:text-lg font-bold text-white">Câu hỏi Thường gặp (FAQ)</h2>
            </div>

            <div className="flex flex-col gap-2.5">
              {filteredFaq.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-[#1F2937] bg-[#0E1322] overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left gap-4 cursor-pointer hover:bg-[#141B2D]"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-white">{faq.question}</span>
                      <div className="text-[#9CA3AF] shrink-0">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-[#9CA3AF] leading-relaxed border-t border-[#1F2937]/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: EMERGENCY ACTIONS & DIAGNOSTICS */}
        <div className="p-6 rounded-2xl bg-[#0F172A] border border-cyan-500/20 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[#22D3EE]">
            <HardDrive className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Công cụ Khẩn cấp & Báo cáo Kỹ thuật
            </h3>
          </div>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Nếu bạn gặp sự cố không thể tự khắc phục hoặc phát hiện lỗi phát sinh trong quá trình biên tập, hãy sử dụng các công cụ chẩn đoán dưới đây để gửi báo cáo hoặc đặt lại trạng thái ứng dụng.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => openModal('systemCheck')}
              className="px-4 py-2 rounded-xl bg-[#22D3EE] text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Activity className="w-4 h-4" />
              <span>Kiểm tra phần cứng & WebCodecs</span>
            </button>
            <button
              type="button"
              onClick={() => openModal('feedback')}
              className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer border border-[#334155]"
            >
              <Bug className="w-4 h-4 text-amber-400" />
              <span>Gửi chẩn đoán lỗi kèm Log</span>
            </button>
            <Link
              to="/privacy"
              className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] font-semibold text-xs transition-colors flex items-center gap-2 border border-[#334155]"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Chính sách Bảo mật & Dữ liệu</span>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
