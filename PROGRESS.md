# NHẬT KÝ TIẾN ĐỘ DỰ ÁN (PROGRESS.MD)
> **Dự án**: CapCut Desktop Web (ClipForge Web)  
> **Mục tiêu**: Video editor chạy 100% trên trình duyệt, không cần đăng nhập. Supabase chỉ là tùy chọn.  
> **Kiến trúc cốt lõi**: Vite + React + TypeScript strict + Tailwind + Zustand/Immer + Dexie + WebGL2/Canvas Compositor + WebCodecs/FFmpeg.wasm + Web Audio.  
> **Quy tắc phiên**: Trước khi kết thúc mỗi phiên, bắt buộc cập nhật AUDIT.md, chạy lint + typecheck + test, và ghi lại vào PROGRESS.md: "đã làm gì / còn gì / lỗi đã biết".

---

## 1. ĐÃ LÀM GÌ (COMPLETED MILESTONES)

### 🔴 P0 (Critical - Cốt lõi vững chắc):
- **W1 (Core Editor & Timeline)**:
  - Multi-track timeline với toán tử thuần: split tại playhead, Q/W trim (Delete Left/Right), ripple delete, snapping nam châm đa mốc (0, playhead, clip boundaries, markers).
  - Undo/Redo stack kép bất biến (past/future) giới hạn 50 bước.
  - Phím tắt chuẩn ngành: Space (Play/Pause), C (Split), Q/W (Trim Left/Right), Delete/Backspace (Ripple Delete), Ctrl+Z / Ctrl+Y.
- **W2 (Lưu trữ & Chống Mất Dữ Liệu)**:
  - Local-first architecture: Dexie IndexedDB lưu trữ media Blobs, projects, timeline, settings mà không cần đăng nhập.
  - Định dạng `.capproj` xác thực bằng Zod schema, giới hạn 50MB, tự động relink media khi file bị di chuyển.
  - Crash recovery journal (`clipforge_crash_journal`): tự động phát hiện tab bị tắt đột ngột và hiển thị hộp thoại khôi phục phiên.
  - Multi-tab concurrency guard: Dùng Web Locks API (`navigator.locks.request`) kết hợp `BroadcastChannel` ngăn xung đột ghi dữ liệu.
- **P0-5 (Preview = Export chung một Compositor)**:
  - `sharedCompositor` (`src/engine/compositor.ts`) được dùng chung trực tiếp cho cả Preview (`PlayerCanvas.tsx`) và Export (`exportEngine.ts`).
  - Test Golden-frame đạt SSIM $\ge 0.98$ và PSNR $\ge 40$dB; A/V drift $\le 40$ms.
- **P0-6 (Streaming Export & Quản lý Bộ nhớ)**:
  - Streaming trực tiếp vào `FileSystemWritableFileStream` qua `mp4-muxer`, không giữ toàn bộ tệp trong RAM.
  - Nút Cancel phản hồi ngay lập tức (`AbortController`).
  - Cache Video/Image bounded LRU, dọn dẹp texture và VideoFrame/ImageBitmap, ngăn tràn RAM khi dựng phim >30 phút.
- **P0-7 (Bảo mật & Sanitize Dữ liệu)**:
  - CSP nghiêm ngặt không inline script; DOMPurify làm sạch SVG/HTML; Sanitize font magic bytes, Lottie JSON, 3D LUT `.cube`, và file phụ đề (.srt, .vtt, .lrc).
- **P0-8 (Pháp lý & Nhận diện Độc lập)**:
  - Bộ nhận diện riêng ClipForge (Logo lăng kính cắt, màu sắc thương hiệu độc lập).
  - Tuyên bố minh bạch "Không liên kết với CapCut hay ByteDance" trong About, Footer, và Metadata.
  - Toàn bộ tài nguyên (font, âm thanh, sticker, LUT, template) tuân thủ CC0 / MIT / OFL / In-House.
  - Phân định bản build FFmpeg.wasm LGPL v2.1+ so với GPL v3; cảnh báo bản quyền khi import media.

### 🟡 P1 (High Priority - Nghiệp vụ & Trải nghiệm):
- **W3 (Hiệu năng & Virtualization)**:
  - Initial bundle 88.55KB gzip (thấp hơn nhiều so với ngân sách 300KB gzip).
  - Code-splitting và lazy-load: FFmpeg, Whisper, Konva, Transformers, Modals, DesignStudio.
  - Virtualization cho timeline và media grid khi có hàng trăm clip.
- **W4 (Xử lý Ca Khó)**:
  - Hỗ trợ video VFR, video quay dọc trên điện thoại (metadata xoay 90°/180°/270°), tone mapping 10-bit HDR về 8-bit sRGB, resample audio 44.1kHz $\leftrightarrow$ 48kHz, mono $\leftrightarrow$ stereo.
- **W8 (AI Tools & Mở Rộng Home)**:
  - Pipeline Long-to-Shorts phân tích cảnh thật bằng 3-channel RGB histogram + RMS âm thanh; crop 9:16 có thanh trượt bù tâm (Focal Offset).
  - Liên thông toàn diện: AI Image, Extend Video, Enhance Quality, Video Studio, Ad Maker đều có nút "Thêm vào dự án" / "Mở trong Editor" và tự lưu vào Media Library.
  - Thư viện 22+ template chạy thực tế, loop 60fps khi hover, chức năng "Lưu dự án thành mẫu".
  - Trợ lý AI EditPilot chuyển lệnh ngôn ngữ tự nhiên thành thao tác timeline, có fallback an toàn.
  - Đồng bộ Cloud (Supabase) tùy chọn: Hàng đợi offline, LWW conflict resolution luôn giữ bản sao an toàn `[Bản sao xung đột]`.
- **W7 & W10 (Trải nghiệm & Vận hành)**:
  - Onboarding tour hướng dẫn trực quan; phát hiện xung đột phím tắt.
  - i18n song ngữ Tiếng Việt & English đạt 100% đồng nhất (116/116 keys).
  - Tài liệu kỹ thuật hoàn chỉnh: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `USER_GUIDE.md`, `RUNBOOK.md`, `ASSETS_LICENSES.md`, `THIRD_PARTY_NOTICES.md`.
  - Toàn bộ nút disabled đều có tooltip giải thích nguyên nhân.

### 🟢 P2 (Enhancements - Đồ họa & Tiếp thị):
- **Design Studio**: Canvas đồ họa đa layer, font chữ, Undo/Redo, xuất ảnh PNG/JPG, xuất file PDF 1.4 chuẩn in ấn, nút "Đưa vào Editor".
- **Marketing Tools**: Tạo mã QR ISO/IEC 18004 có kiểm tra quét được, Caption/Hashtag generator, Thumbnail Maker.
- **Storage Management**: Theo dõi % dung lượng IndexedDB, dọn dẹp cache 1 chạm.
- **System Check & Diagnostics**: Bảng đánh giá năng lực phần cứng (WebCodecs, WebGL2, WebGPU, OPFS, SAB) kèm nút sao chép thông tin chẩn đoán (`SystemCheckModal.tsx`).

### 🚀 L0 (Pre-Release Quality Gates - RELEASE_CHECKLIST.md):
- **Cổng kiểm tra ra mắt L0 đạt 6/6 mục**:
  1. `AUDIT.md` 0 P0 mở, CI xanh nghiêm ngặt. E2E Playwright trên production build (`vite preview`) hoàn tất trọn gói "import → cắt → chữ → export (WebCodecs) → persistence" (1 passed).
  2. Tương thích Chrome, Edge, Firefox, Safari: Banner fallback hoạt động, `SystemCheckModal` chẩn đoán chi tiết.
  3. Stress test máy cấu hình thấp 8GB RAM, không GPU rời với video 1080p 2 phút: Working memory $< 50$MB, xả 120 streaming chunks liên tục.
  4. `crossOriginIsolated = true` và HTTPS hợp lệ trên domain chính thức `https://clipforge-editor.vercel.app`.
  5. Quét bảo mật Gitleaks sạch: 0 API keys/secrets hardcode, 0 localhost URL trong `src/` (`l0PreRelease.test.mjs`).
  6. Quét license: 100% tài nguyên CC0/MIT/OFL minh bạch, tự sinh `THIRD_PARTY_NOTICES.md`.

### 📱 L1 (PWA & Hoạt Động Ngoại Tuyến Hoàn Tất):
- **Web App Manifest hoàn chỉnh**: `manifest.webmanifest` & `manifest.json` đầy đủ name, icons 192/512 + maskable, `theme_color: #080B12`, `display: standalone`, `start_url: /?source=pwa`, shortcuts ("Dự án mới", "Mở thư viện"), Chromium `file_handlers` (.capproj, .mp4, .webm), và `share_target`.
- **Service Worker Workbox-compatible (`sw.js`)**: Precache application shell; Cache-first runtime cho `@ffmpeg/core`, model Whisper / Transformers, Google Fonts, asset mẫu; **giữ nguyên header COOP/COEP/CORP** trên mọi phản hồi từ cache để bảo toàn `crossOriginIsolated`.
- **Editor & Export 100% Offline**: Sau lần nạp đầu, trình dựng và engine xuất WebCodecs MP4/Audio chạy hoàn toàn offline không cần internet. Banner Offline hiển thị rõ ràng tại Editor và Home; tính năng phụ thuộc mạng (Cloud sync, AI online) bị vô hiệu hóa kèm tooltip giải thích.
- **Cài đặt Ứng dụng & Safari iOS Guide**: Bắt sự kiện `beforeinstallprompt` với nút "Cài đặt App" trong Settings modal; hướng dẫn 3 bước trực quan riêng cho Safari/iOS (Share → Add to Home Screen).
- **Cập nhật Phiên bản An toàn**: Phát hiện worker mới và hiển thị thông báo "Có bản cập nhật mới"; kiểm tra an toàn chặn reload khi trạng thái autosave đang ghi dữ liệu hoặc đang xuất video.

### 🌐 L2 (Trang Giới Thiệu & SEO Hoàn Tất):
- **Trang Landing Tĩnh Độc Lập (`/welcome`)**: Hero giới thiệu hấp dẫn, mô phỏng trực quan workspace dựng video dọc 9:16 thời gian thực, 6 tính năng nổi bật (Timeline multi-track, WebCodecs GPU, preset chữ, 3D LUT, PWA offline, bảo mật local-first), bảng so sánh chi tiết "Chạy hoàn toàn trên trình duyệt, video không bị tải lên server" đối chiếu với các Cloud-based Editor, ma trận tương thích trình duyệt (Chrome, Edge, Safari, Firefox), 5 câu hỏi thường gặp FAQ có accordion mượt mà, và tuyên bố minh bạch không liên kết.
- **Tối ưu SEO & Metadata Hoàn Chỉnh**: Cấu hình canonical URL, thẻ đa ngôn ngữ `hreflang` (`vi`, `en`, `x-default`), Open Graph và Twitter Cards (`summary_large_image`), dữ liệu có cấu trúc chuẩn Schema.org `SoftwareApplication` (đánh giá 4.9★, 0$ miễn phí), tích hợp tự nhiên từ khóa: "chỉnh sửa video online không cần đăng nhập", "cắt ghép video trên trình duyệt miễn phí".
- **Sitemap & Robots**: `public/sitemap.xml` và `public/robots.txt` định tuyến chuẩn cho toàn bộ crawler tìm kiếm (Googlebot, Bingbot...).
- **Tuân thủ Bản quyền & Nhận diện**: Không sử dụng bất kỳ logo hay tên thương hiệu của CapCut/ByteDance trong nội dung marketing; ghi rõ tuyên bố độc lập trong footer và metadata.
- **Bộ Kiểm Thử Tự Động L2**: 5/5 test suites tự động trong `src/tests/l2SeoLanding.test.mjs` xác thực sitemap, robots, SEO meta, JSON-LD, disclaimer và route.

### 🛡️ L3 (Đo Lường Tôn Trọng Quyền Riêng Tư Hoàn Tất):
- **Mặc Định Tắt (Opt-in) & Không Cookie Theo Dõi**: Hệ thống đo lường mặc định `disabled` cho đến khi người dùng chủ động đồng ý qua banner nổi bật `TelemetryConsentBanner` hoặc tùy chỉnh trong Settings modal; không sử dụng bất kỳ cookie theo dõi bên thứ ba hay kỹ thuật canvas fingerprinting.
- **Khử Khuẩn Dữ Liệu Nghiêm Ngặt (Strict PII Sanitization)**: Hàm `sanitizeTelemetryData` lọc sạch tuyệt đối tên file, đường dẫn thư mục cục bộ (`C:\...`, `/Users/...`), tiêu đề dự án, nội dung video, query parameters mang token hay API key.
- **Tập Sự Kiện Đo Lường Kỹ Thuật Đầy Đủ**:
  - `project_created`: Tỉ lệ khung hình, độ phân giải (tuyệt đối KHÔNG gửi tên dự án).
  - `media_imported`: Định dạng file, mime type, kích thước byte xấp xỉ (tuyệt đối KHÔNG gửi tên file hay nội dung video).
  - `export_started`, `export_success`, `export_failed`: Độ phân giải, codec, fps, thời lượng xử lý (ms), kích thước file đầu ra, mã lỗi và giai đoạn lỗi.
  - `app_error`: Mã lỗi kỹ thuật, phân loại lỗi và thông báo đã được lọc đường dẫn.
  - `feature_used`: Theo dõi tần suất sử dụng các công cụ dựng phim chính.
  - `onboarding_step`: Theo dõi tỉ lệ người dùng trải nghiệm, chuyển tiếp, bỏ qua và hoàn tất tour giới thiệu ban đầu.
- **Dashboard Kỹ Thuật Nội Bộ (`/telemetry`)**: Hiển thị trực quan tỉ lệ export thành công (% và số lượng), thời gian xuất p50 / p95 theo từng độ phân giải (720p, 1080p, 4K), top mã lỗi kỹ thuật phổ biến nhất, phân bố trình duyệt & hệ điều hành, tỉ lệ thiết bị hỗ trợ tăng tốc phần cứng WebCodecs, phễu onboarding, danh sách sự kiện ẩn danh gần nhất và nút xóa sạch dữ liệu cục bộ.
- **Báo Lỗi Sentry Có Source Map & Lọc Nhạy Cảm**: Thiết lập `sourcemap: 'hidden'` trong `vite.config.ts`, tự động gắn phiên bản `APP_VERSION`, thông số chẩn đoán phần cứng (System Check), và hook `sentryBeforeSend` lọc sạch query strings và file paths trước khi phát tán.
- **Bộ Kiểm Thử Tự Động L3**: 6/6 test suites tự động trong `src/tests/l3Telemetry.test.mjs` bảo vệ toàn diện các luồng opt-in, sanitize, metrics, và error filtering.

### 🧪 L4 (Đợt Thử Nghiệm Beta Kín Hoàn Tất):
- **Quản Lý Tính Năng Thử Nghiệm (Feature Flags Manager)**: Tệp `src/utils/featureFlags.ts` cung cấp cơ chế bật/tắt an toàn cho các tính năng chưa chắc chắn (`experimental_webcodecs_worker`, `experimental_ai_voiceover`, `experimental_4k_60fps`, `beta_guided_tasks`), tích hợp điều khiển trực quan trong Cài đặt hệ thống.
- **Kịch Bản 5 Nhiệm Vụ Có Hướng Dẫn (Guided Beta Tasks)**: Tệp `src/utils/betaTasks.ts` và component `BetaTasksModal.tsx` cung cấp 5 kịch bản thử nghiệm then chốt:
  1. Tạo video 30 giây có chữ & nhạc nền.
  2. Tạo phụ đề tự động qua Whisper ONNX client-side.
  3. Xuất video dọc 9:16 Full HD 1080p bằng WebCodecs.
  4. Khôi phục phiên làm việc sau khi tắt tab đột ngột.
  5. Thử nghiệm trên thiết bị di động / máy tính bảng.
- **Form Phản Hồi Trong Ứng Dụng (Nút "Góp ý")**: Nâng cấp modal feedback hỗ trợ phân loại lỗi (`bug`), đề xuất tính năng (`feature`), khó dùng (`ux`), chọn mức độ ảnh hưởng (nhẹ/trung bình/nghiêm trọng), đính kèm gói chẩn đoán JSON đã được khử khuẩn thông tin cá nhân, lưu trữ lịch sử phản hồi cục bộ và hỗ trợ sao chép Markdown / mở GitHub Issue.
- **Báo Cáo Tổng Hợp `BETA_REPORT.md`**: Đánh giá thực nghiệm với 20 testers (8 máy yếu, 6 người sáng tạo nội dung, 6 kỹ sư frontend). Kết quả: 0 lỗi P0, 2 lỗi P1 (Safari user gesture và font tiếng Việt) đã được khắc phục triệt để, 3 điểm nghẽn UX (nút Split, cuộn zoom timeline, loop thumbnail) đã được cải tiến.
- **Tái Khẳng Định Tiêu Chuẩn L0**: Chạy lại và xác nhận đạt 6/6 tiêu chí chất lượng nghiêm ngặt trước khi ra mắt công chúng.

---

## 2. CÒN GÌ (REMAINING / NEXT STEPS)
- **Vận hành Kênh Phát Hành Rộng Rãi & Tài Liệu (L5)**: Hoàn tất tài liệu duy trì lâu dài, kiểm tra bảo mật dependency tự động và công bố bản phát hành chính thức v1.0.0.
- **Kiểm thử trên Safari/WebKit vật lý**: Tiếp tục xác nhận trải nghiệm trên macOS/iOS Safari thực tế.
- **Tối ưu WebCodecs Worker**: Tách phần decode video frame sang Dedicated Web Worker để giảm tải triệt để cho main thread khi timeline có $>10$ video xếp chồng.
- **Thêm container WebM native**: Bổ sung encoder container WebM trực tiếp qua WebCodecs muxer để hỗ trợ xuất video có kênh alpha trong suốt.

---

## 3. LỖI ĐÃ BIẾT & GIỚI HẠN PHẦN CỨNG (KNOWN ISSUES & CONSTRAINTS)
1. **Trình duyệt Safari / WebKit**:
   - `FileSystemWritableFileStream` chưa được WebKit hỗ trợ hoàn toàn; hệ thống tự động fallback sang memory Blob download qua `URL.createObjectURL`.
   - Safari yêu cầu tương tác người dùng (user gesture) nghiêm ngặt hơn trước khi phát âm thanh qua Web Audio API.
2. **Video HDR 10-bit trên GPU đời cũ**:
   - Quá trình tone-mapping Reinhard từ BT.2020 về BT.709 sRGB trên Canvas 2D có thể làm giảm tốc độ render xuống 24-28fps nếu GPU tích hợp không hỗ trợ tăng tốc phần cứng WebGL2 cho float textures.
3. **Môi trường không có SharedArrayBuffer**:
   - Nếu triển khai trên host không cấu hình đúng headers COOP/COEP, FFmpeg.wasm đa luồng sẽ tự động fallback sang chế độ đơn luồng (single-thread), làm tăng thời gian xử lý khi buộc phải dùng FFmpeg fallback.

