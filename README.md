# ClipForge Desktop Web • 9:16 Vertical Video Studio

[![CI Status](https://github.com/Mydoriy/clipforge-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/Mydoriy/clipforge-editor/actions)
[![Production URL](https://img.shields.io/badge/Production-Live-00f2fe?style=flat&logo=vercel)](https://clipforge-editor.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-emerald.svg)](CHANGELOG.md)

Trình biên tập video ngắn dọc tỷ lệ 9:16 (1080×1920 Full HD) chạy 100% phía máy khách (Client-Side) trên trình duyệt, tối ưu hóa cho **TikTok, Instagram Reels và YouTube Shorts**. Ứng dụng hoạt động theo tiêu chí **Local-First**, không cần máy chủ backend trung gian, không bắt buộc đăng nhập, dữ liệu được bảo vệ an toàn trong cơ sở dữ liệu IndexedDB của trình duyệt.

> ⚠️ **Tuyên bố pháp lý quan trọng**: ClipForge Desktop Web là sản phẩm nghiên cứu & mã nguồn mở độc lập, **KHÔNG liên kết, tài trợ, ủy quyền hay chứng thực bởi CapCut hoặc ByteDance Ltd**. Mọi nhãn hiệu hàng hóa đều thuộc về chủ sở hữu tương ứng.

---

## 📚 Mục Lục Tài Liệu Kỹ Thuật
- [Hướng dẫn sử dụng người dùng (User Guide - Song ngữ VI/EN)](USER_GUIDE.md)
- [Kiến trúc chi tiết hệ thống (Architecture & Pipeline)](ARCHITECTURE.md)
- [Sổ tay vận hành & Quy trình SRE (Operations Runbook)](RUNBOOK.md)
- [Hướng dẫn đóng góp mã nguồn (Contributing Guide)](CONTRIBUTING.md)
- [Giấy phép tài nguyên & Font/SFX (Assets Licenses)](ASSETS_LICENSES.md)
- [Thông báo bản quyền bên thứ ba & FFmpeg.wasm (Third-Party Notices)](THIRD_PARTY_NOTICES.md)
- [Nhật ký thay đổi phiên bản (Changelog)](CHANGELOG.md)

---

## ✨ Tính Năng Nổi Bật

- **Kiến trúc Local-First 100%**: Xử lý toàn bộ video, âm thanh và hiệu ứng trực tiếp trên phần cứng máy tính người dùng thông qua **W3C WebCodecs API**, **WebGL2 Rec.709 shaders** và **Web Audio API**. Không có bất kỳ frame video nào bị tải lên máy chủ ngoài ý muốn.
- **Preview = Export**: Đồng bộ khung hình chuẩn xác giữa màn hình xem trước và file xuất cuối cùng, đạt tỷ lệ tương đồng SSIM $\ge 0.98$ và độ lệch âm thanh/hình ảnh A/V drift $\le 40$ms.
- **Timeline Đa Track Chuyên Nghiệp**: Hỗ trợ cắt tại playhead (`C`/`S`), xóa trái (`Q`), xóa phải (`W`), xóa dồn ripple delete, snapping nam châm chính xác, và hoàn tác Undo/Redo đa tầng (tối đa 50 bước).
- **Bộ Công Cụ Sáng Tạo Tích Hợp (Creative Suite)**:
  - **EditPilot AI**: Trợ lý ngôn ngữ tự nhiên hỗ trợ biên tập theo câu lệnh văn bản.
  - **Video dài thành Shorts (Long-to-Shorts)**: Phân tích cảnh cắt bằng 3-kênh RGB Histogram kết hợp năng lượng âm thanh RMS, tự động căn khung 9:16 có thanh trượt bù tâm (Focal Offset).
  - **Design Studio**: Thiết kế banner, poster, thumbnail 9:16 đa layer, xuất file in ấn chuẩn PDF 1.4 không phụ thuộc thư viện nặng.
  - **Công cụ Marketing**: Trình tạo mã QR chuẩn ISO/IEC 18004 scannable và bộ sinh Caption/Hashtag viral.
  - **Thư viện 22+ Templates**: Xem trước loop 60fps và cho phép lưu dự án người dùng thành mẫu tái sử dụng.
- **Độ Bền & Khôi Phục Sự Cố**: Hỗ trợ cơ chế phục hồi phiên làm việc dở dang (Crash Recovery Journal), khóa chống mở 2 tab đồng thời (Web Locks API), và xuất/nhập gói dự án `.capproj` xác thực bằng Zod.

---

## 🛠️ Yêu Cầu Hệ Thống & Cài Đặt

### 1. Yêu cầu môi trường
- **Node.js**: Phiên bản 18.0.0 trở lên.
- **Trình duyệt khuyến nghị**: Google Chrome 105+, Microsoft Edge 105+, hoặc bất kỳ trình duyệt nhân Chromium hỗ trợ WebCodecs & OPFS.

### 2. Cài đặt các gói phụ thuộc
```bash
git clone https://github.com/Mydoriy/clipforge-editor.git
cd clipforge-editor
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` từ mẫu có sẵn:
```bash
cp .env.example .env
```
*(Lưu ý: Mọi biến môi trường đều là tùy chọn. ClipForge chạy ngoại tuyến hoàn hảo mà không cần bất kỳ API key nào).*

### 4. Khởi chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Truy cập địa chỉ: `http://localhost:5173`

---

## 🧪 Kiểm Thử & Đảm Bảo Chất Lượng

Dự án trang bị hệ thống kiểm thử tự động toàn diện:
```bash
# Chạy 45 bài kiểm tra cốt lõi (Node native test runner)
npm test

# Chạy kiểm tra các hàm toán tử timeline thuần túy (Vitest)
npm run test:vitest

# Kiểm tra tính đồng bộ 100% của từ điển i18n Tiếng Việt & Tiếng Anh
npm run check:i18n

# Kiểm tra cú pháp mã nguồn & kiểu dữ liệu
npm run lint
npm run typecheck

# Đóng gói bản build cho môi trường sản xuất
npm run build
```

---

## 🚀 Triển Khai Môi Trường Sản Xuất (Deployment)

### Tiêu đề bảo mật bắt buộc (Cross-Origin Isolation)
Để kích hoạt `SharedArrayBuffer` cho FFmpeg.wasm đa luồng, máy chủ hosting bắt buộc phải trả về 2 tiêu đề HTTP:
```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

### 1. Triển khai lên Vercel (Khuyên dùng)
Dự án đã cấu hình sẵn file [vercel.json](file:///d:/Editor/vercel.json) với đầy đủ tiêu đề COOP, COEP và CSP:
```bash
npx vercel --prod --yes
```

### 2. Triển khai lên Cloudflare Pages / Netlify
File cấu hình tiêu đề tĩnh đã được thiết lập sẵn tại [public/_headers](file:///d:/Editor/public/_headers).

---

## ⌨️ Phím Tắt Biên Tập (Hotkeys)

| Phím tắt | Thao tác | Mô tả |
| :--- | :--- | :--- |
| `Space` | Play / Pause | Phát hoặc dừng video trong màn hình xem trước. |
| `C` / `S` | Split Clip | Cắt clip đang chọn tại vị trí con trỏ thời gian (Playhead). |
| `Q` | Delete Left | Cắt và xóa đoạn từ đầu clip đến vị trí playhead. |
| `W` | Delete Right | Cắt và xóa đoạn từ vị trí playhead đến cuối clip. |
| `Delete` / `Backspace` | Ripple Delete | Xóa clip và tự động dồn các clip phía sau lại gần nhau. |
| `Ctrl + Z` / `Cmd + Z` | Undo | Hoàn tác thao tác trước đó (tối đa 50 bước). |
| `Ctrl + Y` / `Ctrl+Shift+Z` | Redo | Làm lại thao tác vừa hoàn tác. |
| `Shift + S` | Safe Zone | Bật/tắt khung viền an toàn tránh icon TikTok/Reels che khuất. |

---

## 📄 Giấy Phép & Tác Quyền (License)

Mã nguồn của ClipForge Desktop Web được phát hành theo giấy phép [MIT License](LICENSE).  
Toàn bộ tài sản tích hợp sẵn (âm thanh, phông chữ, nhãn dán, LUT, mẫu dựng) tuân thủ các giấy phép mở CC0, OFL và MIT. Xem chi tiết tại [ASSETS_LICENSES.md](ASSETS_LICENSES.md) và [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
