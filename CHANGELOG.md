# NHẬT KÝ THAY ĐỔI (CHANGELOG)

Tất cả những thay đổi đáng chú ý của dự án **ClipForge Desktop Web** được ghi nhận chi tiết tại đây theo định dạng [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/lang/vi/).

---

## [1.0.0] - 2026-11-06 (Bản Phát Hành Chính Thức Toàn Diện)

### Đã Thêm (Added)
- **W1. Triển khai & Tương thích Trình duyệt (Deployment & Compatibility)**:
  - Cấu hình tiêu đề bảo mật Cross-Origin Isolation: `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: credentialless` trên Vercel, Netlify và Cloudflare Pages phục vụ `SharedArrayBuffer` cho FFmpeg.wasm đa luồng.
  - Trang **System Check** trực quan phát hiện năng lực phần cứng: WebCodecs, WebGL2, WebGPU, File System Access, OPFS, SharedArrayBuffer, MediaRecorder, CPU cores, RAM.
  - Cơ chế tự động phát hiện và cảnh báo fallback trên Firefox và Safari.
- **W2. Dữ liệu & Độ bền Lưu trữ (Data & Reliability)**:
  - Cơ sở dữ liệu Dexie.js IndexedDB v2 có kiểm thử migration nâng cấp schema bảo vệ dữ liệu phiên bản cũ.
  - Gọi `navigator.storage.persist()`; giám sát hạn mức lưu trữ và cảnh báo khi vượt quá 80%.
  - Crash recovery journal: Tự động ghi nhật ký checkpoint và hỏi "Khôi phục phiên chưa lưu?" khi mở lại tab sau sự cố tắt đột ngột.
  - Web Locks API kết hợp `BroadcastChannel` khóa dự án chống mở 2 tab ghi đè dữ liệu.
  - Định dạng `.capproj` xác thực bằng Zod schema, giới hạn 50MB, từ chối file lạ.
  - Tự động dọn dẹp các mục trong Trash quá 30 ngày mỗi lần khởi động.
- **W3. Hiệu năng & Tiết kiệm Bộ nhớ (Performance & Memory)**:
  - Ngân sách bundle khởi tạo `< 300KB gzip` nhờ kiến trúc dynamic code-splitting React lazy.
  - Bounded LRU cache cho frame video/ảnh, tự động đóng `VideoFrame` / `ImageBitmap` đảm bảo bộ nhớ ổn định suốt 30+ phút biên tập.
  - Virtualization cho timeline và lưới media khi có hàng trăm clip.
  - Streaming export ghi trực tiếp vào `FileSystemWritableFileStream` giảm áp lực RAM; nút Cancel phản hồi tức thì.
- **W4. Chuẩn Xác Khung Hình Preview = Export (Fidelity & Tests)**:
  - Test Golden-frame đạt SSIM $\ge 0.98$ và PSNR $\ge 40$dB; kiểm soát độ lệch âm thanh/hình ảnh A/V drift $\le 40$ms.
  - Xử lý mượt mà các trường hợp khó: video VFR, video quay dọc trên điện thoại có rotation metadata (90°, 180°, 270°), tone mapping 10-bit HDR về 8-bit sRGB, resample audio 44.1kHz $\leftrightarrow$ 48kHz.
  - Hỗ trợ đảo ngược video (reverse), đóng băng hình (freeze frame), speed curve và compound clip lồng nhau.
- **W5. Kiểm Thử & CI/CD (Quality & Testing)**:
  - Chế độ TypeScript strict, ESLint, Prettier, Husky pre-commit hook tự động.
  - Bộ test Vitest cho logic thuần túy (split, trim, snap, ripple, undo/redo).
  - Test E2E Playwright và GitHub Actions workflow (`ci.yml`).
  - Panel Error Boundaries bao bọc từng panel độc lập; nút chẩn đoán kỹ thuật "Copy diagnostic info".
- **W6. Bảo Mật & Quyền Riêng Tư (Security & Privacy)**:
  - CSP nghiêm ngặt không inline script; DOMPurify làm sạch SVG, phụ đề SRT/VTT, Lottie JSON, font magic bytes, và 3D LUT `.cube`.
  - Quản lý API Key AI hoàn toàn cục bộ trong `localStorage`; hỗ trợ Serverless AI Proxy riêng biệt.
  - Telemetry tắt mặc định; Row Level Security (RLS) bảo vệ Supabase.
- **W7. Hoàn Thiện Trải Nghiệm Người Dùng (User Experience)**:
  - Onboarding tour 4 bước trực quan kèm dự án mẫu khởi tạo sẵn.
  - Kiểm tra và cảnh báo xung đột phím tắt (Shortcut Conflict Detection).
  - Hỗ trợ cảm ứng và pinch-zoom trên timeline bằng Pointer Events.
  - Script CI kiểm tra tự động 100% tính đồng nhất của từ điển i18n Tiếng Việt & Tiếng Anh.
- **W8. Hoàn Thiện Các Module Trên Home (Home Modules Overhaul)**:
  - Liên thông toàn diện Home $\leftrightarrow$ Editor: kết quả từ AI Image, Extend Video, Enhance, Video Studio, Ad Maker, Long-to-Shorts đều có nút "Thêm vào dự án" và "Mở trong Editor", tự động lưu vào Library.
  - Pipeline Long-to-Shorts thật: phát hiện cảnh bằng 3-kênh RGB histogram + RMS âm thanh, auto-crop 9:16 có thanh trượt bù tâm (Focal Offset), hàng đợi xuất hàng loạt hủy được.
  - Design Studio: đa layer, font chữ, xuất ảnh PNG/JPG và xuất tài liệu PDF 1.4 chuẩn in ấn, nút "Đưa vào Editor".
  - Bộ công cụ Marketing: tạo mã QR chuẩn ISO/IEC 18004 có kiểm tra quét được, Caption/Hashtag generator, Thumbnail Maker gán bìa dự án.
  - Thư viện 22 template dựng sẵn có xem trước dạng Loop 60fps và tính năng "Lưu làm mẫu".
  - Offline sync queue với thuật toán giải quyết xung đột Last-Write-Wins tự động tạo bản sao an toàn `[Bản sao xung đột]`.
- **W9. Pháp Lý & Bản Quyền Tài Nguyên (Legal Compliance & Assets)**:
  - Độc lập nhận diện thương hiệu: tên **ClipForge**, logo biểu tượng lăng kính cắt đa diện riêng.
  - Tuyên bố pháp lý minh bạch trong About modal và Footer: *"Không liên kết với CapCut hay ByteDance"*.
  - [ASSETS_LICENSES.md](file:///d:/Editor/ASSETS_LICENSES.md): 100% tài nguyên tuân thủ CC0 / MIT / OFL / In-House.
  - Tự động sinh [THIRD_PARTY_NOTICES.md](file:///d:/Editor/THIRD_PARTY_NOTICES.md) qua `npm run generate:licenses`; phân định rõ bản build `@ffmpeg/core` tiêu chuẩn là LGPL v2.1+.
  - Trang Điều khoản dịch vụ (`/terms`) và Quyền riêng tư (`/privacy`); banner cảnh báo bản quyền người dùng khi import media.
- **W10. Tài Liệu & Vận Hành (Documentation & Operations)**:
  - Cập nhật [README.md](file:///d:/Editor/README.md), [ARCHITECTURE.md](file:///d:/Editor/ARCHITECTURE.md), [CONTRIBUTING.md](file:///d:/Editor/CONTRIBUTING.md), [USER_GUIDE.md](file:///d:/Editor/USER_GUIDE.md) (song ngữ VI/EN), [.env.example](file:///d:/Editor/.env.example).
  - Quản lý phiên bản chuẩn Semantic Versioning (`APP_VERSION = '1.0.0'`) hiển thị động trong About Modal và Header.
  - Quy trình vận hành & SRE tại [RUNBOOK.md](file:///d:/Editor/RUNBOOK.md) (Deploy, Rollback, Phân tích System Diagnostics).
