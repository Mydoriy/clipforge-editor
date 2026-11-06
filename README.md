# CapCut Desktop Web v3.0 • 9:16 Vertical Video Studio

Trình biên tập video ngắn dọc tỷ lệ 9:16 (1080×1920 Full HD) chạy 100% phía máy khách (Client-Side) trên trình duyệt, lấy cảm hứng từ giao diện CapCut Desktop. Ứng dụng hoạt động theo tiêu chí **Offline-First**, không bắt buộc đăng nhập, không cần máy chủ backend, dữ liệu được lưu an toàn trong IndexedDB của trình duyệt.

---

## 🛠️ Tech Stack & Kiến trúc mã nguồn

- **Frontend Core**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6.
- **Quản lý trạng thái (State)**: Zustand (với middleware `persist` lưu cài đặt và trạng thái giao diện).
- **Lưu trữ dữ liệu (Database)**: Dexie.js (IndexedDB) lưu trữ dự án, video, ảnh, âm thanh và thùng rác cục bộ.
- **Xử lý video / âm thanh**: FFmpeg.wasm, Canvas 2D/WebGL, MediaRecorder, Web Audio API, Web Speech API.
- **Đồ họa 2D**: Konva / HTML5 Canvas (Design Studio).
- **Đa ngôn ngữ (i18n)**: Tiếng Việt (VN) và English (EN) chuyển đổi tức thì, không hard-code văn bản.
- **Cloud Backend (Tùy chọn)**: Supabase (chỉ kích hoạt khi có biến môi trường cấu hình).

### 📁 Cấu trúc thư mục (Modular Architecture)

```text
src/
├── components/          # Các component giao diện dùng chung (Header, Sidebar, Modals, Toasts, EditPilot, Logo)
├── editor/              # Module chuyên biệt cho màn hình dựng video /editor/:id
│   ├── CategoryPanel.tsx # 8 danh mục: Media, Audio, Text, Stickers, Effects, Transitions, Filters, Captions
│   ├── PlayerCanvas.tsx  # Khung canvas 9:16, overlay Safe Zone TikTok/Reels, preview realtime
│   ├── Inspector.tsx     # Bảng thuộc tính: scale, vị trí, xoay, opacity, tốc độ, volume, fade, bộ lọc màu, text anim
│   ├── Timeline.tsx      # Timeline đa track, kéo thả, trim 2 đầu, split, duplicate, snap, zoom slider
│   └── index.ts          # Barrel export module editor
├── pages/               # Các trang chính: Home, Editor, DesignStudio, SectionPage (Templates, Library, Cloud, Marketing)
├── store/               # Zustand store: useEditorStore (clips, history undo/redo, timeline zoom, snapping, autosave)
├── lib/                 # Các dịch vụ lõi:
│   ├── db.ts            # Dexie database, kiểm tra quota dung lượng, safeAddMedia chống tràn bộ nhớ
│   ├── ffmpeg.ts        # FFmpeg.wasm client service: cắt video, thay đổi tốc độ, kiểm tra WebAssembly
│   ├── ai.ts            # Bộ phân tích ngôn ngữ tự nhiên EditPilot và kết nối API LLM (OpenAI / Gemini)
│   └── index.ts         # Barrel export module lib
├── i18n/                # Hệ thống từ điển đa ngữ (index.ts: Tiếng Việt & English)
├── utils/               # Audio synthesizer, TTS, WebCodecs/Canvas video exporter
└── db/                  # Dexie schema & demo seed projects
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
- Node.js version 18 trở lên.
- Trình duyệt hiện đại: Google Chrome, Microsoft Edge, Brave, hoặc Safari.

### 2. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 3. Chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:5173`

### 4. Đóng gói cho Production
```bash
npm run build
```
Thư mục xuất bản `./dist` đã sẵn sàng để triển khai lên Vercel, Netlify hoặc bất kỳ máy chủ tĩnh nào.

---

## ☁️ Cách cấu hình Supabase (Tùy chọn)

Supabase trong dự án là **hoàn toàn tùy chọn**. Nếu không cấu hình, ứng dụng vẫn hoạt động 100% tính năng dưới chế độ **Khách (Offline)** và lưu vào IndexedDB.

Để bật đăng nhập và đồng bộ dự án lên Cloud:

1. Đăng ký tài khoản miễn phí tại [https://supabase.com](https://supabase.com) và tạo một Project mới.
2. Tạo file `.env` hoặc `.env.local` tại thư mục gốc của dự án:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
3. Khởi động lại dev server: `npm run dev`.
4. Lúc này, biểu tượng đám mây ở Header sẽ hiển thị trạng thái `Cloud Connected`, tính năng đăng nhập Google OAuth và đồng bộ dữ liệu sẽ tự động được kích hoạt.

---

## 🤖 Cách thêm API Key AI (OpenAI / Gemini)

Dự án tích hợp trợ lý biên tập thông minh **EditPilot** và công cụ **AI Image**. Bạn có thể dùng tính năng AI theo 2 cách:

### Cách 1: Thêm trực tiếp trên giao diện (Khuyên dùng)
1. Bấm vào biểu tượng **Bánh răng (Settings)** ở góc trên bên phải màn hình.
2. Tìm mục **AI API Key (Tùy chọn)**.
3. Dán OpenAI API Key (`sk-...`) hoặc Google Gemini API Key của bạn vào ô nhập.
4. Bấm **Lưu cài đặt** (khóa API được lưu cục bộ trong `localStorage` của trình duyệt, không bao giờ gửi ra máy chủ trung gian).

### Cách 2: Dùng chế độ phân tích cục bộ (Không cần API Key)
Nếu không nhập API Key, EditPilot vẫn hoạt động bình thường nhờ bộ phân tích ngôn ngữ tự nhiên tích hợp sẵn (`lib/ai.ts`). Bạn có thể gõ trực tiếp các lệnh tiếng Việt hoặc tiếng Anh:
- `"cắt 2 giây đầu"`
- `"tăng tốc 2x"` hoặc `"tăng tốc video"`
- `"thêm chữ Xin chào"`
- `"bộ lọc cinematic"`
- `"tắt tiếng video"`
- `"xuất video"`

---

## ⌨️ Phím tắt biên tập (Hotkeys)

| Phím tắt | Chức năng |
| :--- | :--- |
| `Space` | Phát / Tạm dừng video (Play / Pause) |
| `S` | Tách clip tại vị trí con trỏ (Split at Playhead) |
| `Delete` / `Backspace` | Xóa clip đang chọn |
| `Ctrl + Z` / `Cmd + Z` | Hoàn tác thao tác trước (Undo) |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Làm lại thao tác (Redo) |
| `+` / `=` | Phóng to dòng thời gian (Zoom In Timeline) |
| `-` / `_` | Thu nhỏ dòng thời gian (Zoom Out Timeline) |
| `Shift + S` | Bật / tắt hiển thị Vùng an toàn 9:16 (Safe Zone) |

---

## 🛡️ Xử lý lỗi & Tương thích trình duyệt

1. **Tệp không được hỗ trợ**:
   - Nếu bạn chọn file ngoài các định dạng `mp4, mov, webm, jpg, png, mp3, wav`, hệ thống sẽ hiển thị thông báo lỗi rõ ràng và từ chối nạp để tránh hỏng dữ liệu.
2. **Hết dung lượng lưu trữ (Quota Exceeded)**:
   - Module `lib/db.ts` tự động theo dõi dung lượng qua `navigator.storage.estimate()`. Khi dung lượng đạt ngưỡng 90%, hệ thống sẽ cảnh báo bạn dọn dẹp Thùng rác hoặc xuất file dự án `.capproj` ra máy tính.
3. **Thiếu API trình duyệt**:
   - **Web Speech API**: Nếu trình duyệt không hỗ trợ nhận diện giọng nói tự động (ví dụ: một số bản Firefox cũ), ứng dụng sẽ hướng dẫn bạn dùng tính năng **Nhập tay** hoặc **Import SRT**.
   - **MediaRecorder / Canvas Stream**: Nếu trình duyệt thiếu tính năng ghi canvas, hệ thống sẽ hiện thông báo yêu cầu cập nhật phiên bản trình duyệt mới nhất.
4. **Responsive từ 1280px và Tablet**:
   - Trên desktop màn hình rộng (≥ 1280px), toàn bộ 3 panel Media, Canvas và Inspector hiển thị đầy đủ song song.
   - Trên máy tính bảng (Tablet 768px – 1024px), bảng Inspector có thể thu gọn/mở ra qua nút bấm chuyên dụng để ưu tiên không gian cho Canvas và Timeline.
