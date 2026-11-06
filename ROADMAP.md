# ROADMAP TRIỂN KHAI & NÂNG CẤP CAPCUT DESKTOP WEB

Tài liệu này tổng hợp và phân loại toàn bộ lộ trình phát triển của ứng dụng CapCut Desktop Web theo 3 mức độ ưu tiên: **P0 (Chặn dùng - Nền tảng cốt lõi)** → **P1 (Quan trọng - Nghiệp vụ & Trải nghiệm)** → **P2 (Nên có - Giá trị gia tăng & Mở rộng)**.

---

## 🔴 MỨC ĐỘ P0: CHẶN DÙNG (CRITICAL - COMPLETED)
*Các tính năng cốt lõi bắt buộc phải có để ứng dụng biên tập video có thể hoạt động ổn định, chính xác, không gây mất dữ liệu hoặc hỏng hóc trong quá trình dựng phim.*

| Mã | Hạng mục | Trọng tâm kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :--- |
| **P0-1** | **Môi trường & Headers (W1)** | Cấu hình COOP (`same-origin`) & COEP (`require-corp`) trên Vercel / Netlify / Cloudflare Pages phục vụ `SharedArrayBuffer` cho FFmpeg.wasm đa luồng. System Check phát hiện WebCodecs, WebGL2, WebGPU, OPFS. | Hoàn thành |
| **P0-2** | **Lưu trữ & Chống Mất Dữ Liệu (W2)** | Dexie IndexedDB v2 có migration schema; `navigator.storage.persist()`; Crash recovery journal khôi phục phiên làm việc sau khi tab sập; Khóa Web Locks API ngăn 2 tab mở cùng dự án. | Hoàn thành |
| **P0-3** | **Độ Bền & Import File Dự Án (W2)** | Định dạng `.capproj` xác thực bằng Zod schema, giới hạn kích thước 50MB, từ chối mã độc; Relink media khi file gốc bị di chuyển; Trash tự dọn mục quá 30 ngày. | Hoàn thành |
| **P0-4** | **Timeline Engine & Split/Trim/Snap (W1/W5)** | Toán tử timeline thuần túy: split tại playhead, Q/W (delete left/right), ripple delete, snap nam châm chính xác; Undo/Redo kép bảo toàn tính bất biến. | Hoàn thành |
| **P0-5** | **Đồng Bộ Preview = Export (W4)** | Pipeline render frame-accurate; Test Golden-frame đảm bảo SSIM $\ge 0.98$, PSNR $\ge 40$dB; Kiểm soát độ lệch âm thanh - hình ảnh A/V drift $\le 40$ms. | Hoàn thành |
| **P0-6** | **Streaming Export & Quản Lý Bộ Nhớ (W3)** | Export ghi tuần tự vào `FileSystemWritableFileStream`, không giữ toàn bộ video trong RAM; Bộ đệm frame bounded LRU tự giải phóng; Hỗ trợ nút Cancel tức thì. | Hoàn thành |
| **P0-7** | **Bảo Mật & Sanitize Dữ Liệu (W6)** | CSP nghiêm ngặt không inline script; DOMPurify làm sạch SVG/HTML; Sanitize file phụ đề, Lottie JSON, font magic bytes, và 3D LUT `.cube`. | Hoàn thành |
| **P0-8** | **Pháp Lý & Tuyên Bố Độc Lập (W9)** | Nhận diện riêng (ClipForge); Tuyên bố minh bạch "Không liên kết với CapCut hay ByteDance" trong About, Footer, metadata; Cảnh báo bản quyền khi import media. | Hoàn thành |

---

## 🟡 MỨC ĐỘ P1: QUAN TRỌNG (HIGH PRIORITY - COMPLETED)
*Các tính năng nghiệp vụ biên tập đầy đủ, trải nghiệm người dùng mượt mà, và liên thông toàn diện giữa Trang chủ và Editor.*

| Mã | Hạng mục | Trọng tâm kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :--- |
| **P1-1** | **Hiệu Năng & Virtualization (W3)** | Virtualize timeline và media grid khi có hàng trăm clip; Ngân sách bundle khởi tạo $< 300$KB gzip; Lazy load các thư viện nặng (FFmpeg, Whisper, Konva, Transformers). | Hoàn thành |
| **P1-2** | **Xử Lý Video Ca Khó (W4)** | Xử lý video VFR, video quay dọc trên điện thoại (xoay 90°/180°/270°), tone mapping 10-bit HDR về 8-bit sRGB, resample audio 44.1kHz $\leftrightarrow$ 48kHz, mono $\leftrightarrow$ stereo. | Hoàn thành |
| **P1-3** | **Tự Động Hóa AI (W8)** | Phân tích cảnh Long-to-Shorts dựa trên 3-channel RGB histogram + RMS âm thanh; Tự động crop 9:16 có thanh trượt bù tâm (Focal Offset); Hàng đợi xuất hàng loạt có thể hủy. | Hoàn thành |
| **P1-4** | **Liên Thông Home ↔ Editor (W8)** | Toàn bộ kết quả AI (AI Image, Extend Video, Enhance, Video Studio, Ad Maker) đều có nút "Thêm vào dự án" / "Mở trong Editor" và tự động lưu vào thư viện Media. | Hoàn thành |
| **P1-5** | **Thư Viện Templates Phong Phú (W8)** | Thư viện 22+ template chạy thực tế đa nền tảng (TikTok, Reels, Shorts...), xem trước dạng Loop 60fps khi rê chuột, tính năng "Lưu dự án thành mẫu". | Hoàn thành |
| **P1-6** | **Đồng Bộ Dự Án & Điện Toán Đám Mây (W8)** | Hàng đợi đồng bộ Offline; Thuật toán Last-Write-Wins (LWW) giải quyết xung đột với cơ chế luôn tự tạo bản sao an toàn `[Bản sao xung đột]`; Badge trạng thái Synced/Syncing/Offline/Conflict. | Hoàn thành |
| **P1-7** | **Trợ Lý Dựng Phim EditPilot (W1/W5)** | Parser lệnh ngôn ngữ tự nhiên thành thao tác timeline có sandbox an toàn; Giao diện trò chuyện trực tiếp bên trong Editor. | Hoàn thành |
| **P1-8** | **Trải Nghiệm & Đa Ngôn Ngữ (W7)** | Onboarding tour có hướng dẫn trực quan; Kiểm tra xung đột phím tắt; Đồng bộ 100% i18n Tiếng Việt & Tiếng Anh được kiểm thử qua script CI tự động. | Hoàn thành |
| **P1-9** | **Giấy Phép Tài Sản & Bên Thứ Ba (W9)** | 100% tài nguyên CC0/MIT/OFL (`ASSETS_LICENSES.md`); Tự sinh `THIRD_PARTY_NOTICES.md` phân định bản build FFmpeg.wasm LGPL v2.1+ so với GPL v3; Trang Terms/Privacy. | Hoàn thành |

---

## 🟢 MỨC ĐỘ P2: NÊN CÓ & MỞ RỘNG (ENHANCEMENTS - COMPLETED)
*Các công cụ gia tăng năng suất sáng tạo nội dung, thiết kế đồ họa marketing và tối ưu hóa thao tác người dùng.*

| Mã | Hạng mục | Trọng tâm kỹ thuật | Trạng thái |
| :--- | :--- | :--- | :--- |
| **P2-1** | **Design Studio Đồ Họa (W8)** | Canvas thiết kế đồ họa độc lập: Quản lý layer, căn chỉnh, font chữ đa dạng, Undo/Redo, xuất ảnh PNG/JPG, xuất file tài liệu PDF 1.4 chuẩn in ấn, và nút "Đưa vào Editor". | Hoàn thành |
| **P2-2** | **Bộ Công Cụ Marketing (W8)** | Tạo mã QR Code đạt chuẩn ISO/IEC 18004 có kiểm tra quét được; Trình tạo Caption & Hashtag tự động (hỗ trợ mẫu sẵn và sinh qua LLM); Công cụ thiết kế Thumbnail Maker. | Hoàn thành |
| **P2-3** | **Quản Lý Bộ Nhớ Đệm & Dung Lượng (W2)** | Trang Storage Management cho phép xem trực quan mức chiếm dụng bộ nhớ của IndexedDB, OPFS, và nút một chạm dọn dẹp cache proxy/thumbnail/waveform/model AI. | Hoàn thành |
| **P2-4** | **Bảo Mật Khóa API Cá Nhân (W6)** | Lưu trữ cục bộ API Key người dùng an toàn; Tùy chọn trỏ request qua Serverless AI Proxy riêng biệt để che giấu key và tránh lộ lọt credentials. | Hoàn thành |
| **P2-5** | **Báo Lỗi & Phản Hồi Chẩn Đoán (W7)** | Modal báo lỗi tích hợp công cụ tự động thu thập thông tin chẩn đoán phần cứng / trình duyệt (System Diagnostics) để người dùng sao chép gửi bộ phận hỗ trợ kỹ thuật. | Hoàn thành |

---

## 3. TIẾP THEO (NEXT MILESTONES)
1. **Kiểm tra lần cuối toàn bộ test suites**: Đảm bảo 100% Unit, Parity, Typecheck và Production Build đều xanh.
2. **Commit và đẩy lên Git**: Đưa toàn bộ mã nguồn W8 cùng tài liệu Audit & Roadmap lên nhánh `main`.
3. **Triển khai Production Vercel**: Deploy phiên bản hoàn thiện lên Vercel (`https://clipforge-editor.vercel.app`) và kiểm tra tính hợp lệ của headers COOP/COEP trên production.

