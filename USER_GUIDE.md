# HƯỚNG DẪN SỬ DỤNG CLIPFORGE DESKTOP WEB (USER GUIDE)

> **Ngôn ngữ / Languages**: [Tiếng Việt](#phần-1-hướng-dẫn-sử-dụng-tiếng-việt) | [English](#part-2-end-user-guide-english)  
> **Ứng dụng**: ClipForge Desktop Web • Local-First 9:16 Video Studio  
> **Phiên bản**: v1.0.0

---

# PHẦN 1: HƯỚNG DẪN SỬ DỤNG (TIẾNG VIỆT)

## 1. Khởi Tạo Dự Án Mới & Chọn Mẫu Dựng Sẵn (Templates)
- **Tạo dự án trống**: Tại Trang chủ (Dashboard), nhấp vào nút lớn **"Tạo dự án mới"** ở giữa banner hoặc bấm `+` trên thanh điều hướng. Dự án mới sẽ mở ra với tỷ lệ chuẩn dọc 9:16 (1080×1920) tối ưu cho TikTok, Instagram Reels và YouTube Shorts.
- **Sử dụng mẫu có sẵn**: Vào mục **"Mẫu video"** trên thanh menu bên trái. Chọn trong số 22+ mẫu chuyên nghiệp (Viral Hook, Travelogue, Podcast Waveform, Flash Sale...). Rê chuột vào từng thẻ để xem trước hoạt ảnh lặp 60fps, bấm **"Dùng mẫu này"** để tự động nạp cấu trúc timeline vào trình soạn thảo.

---

## 2. Nhập Dữ Liệu (Import Media) & Lưu Ý Bản Quyền
- **Cách nhập tệp**: 
  - Kéo thả trực tiếp file từ máy tính vào khung nét đứt lớn trong tab **Media**.
  - Hoặc nhấp **"Import"** $\rightarrow$ chọn file từ thiết bị, thư mục, hoặc tải qua đường link URL.
- **Định dạng hỗ trợ**: Video (`.mp4`, `.mov`, `.webm`, `.mkv`), Hình ảnh (`.jpg`, `.png`, `.webp`, `.gif`), Âm thanh (`.mp3`, `.wav`, `.m4a`, `.ogg`).
- ⚠️ **Lưu ý bản quyền**: ClipForge vận hành 100% cục bộ trên trình duyệt của bạn (Local-First), không lưu trữ media lên máy chủ. Bạn chịu trách nhiệm hoàn toàn về tính hợp pháp và bản quyền của tệp tin tải lên.

---

## 3. Thao Tác Cắt Ghép Cơ Bản Trên Timeline & Phím Tắt
| Phím tắt | Tên thao tác | Mô tả |
| :--- | :--- | :--- |
| `Space` | **Phát / Tạm dừng** | Bật hoặc dừng xem trước video trên màn hình phát. |
| `C` hoặc `S` | **Tách clip (Split)** | Cắt clip đang chọn tại vị trí con trỏ thời gian (Playhead). |
| `Q` | **Xóa bên trái (Delete Left)** | Cắt và xóa đoạn từ đầu clip đến vị trí playhead. |
| `W` | **Xóa bên phải (Delete Right)** | Cắt và xóa đoạn từ vị trí playhead đến cuối clip. |
| `Delete` / `Backspace` | **Ripple Delete** | Xóa clip và tự động dồn các clip phía sau về phía trước không để khoảng trống. |
| `Ctrl + Z` (Cmd+Z) | **Hoàn tác (Undo)** | Hủy thao tác vừa thực hiện (lịch sử tối đa 50 bước). |
| `Ctrl + Y` (Ctrl+Shift+Z) | **Làm lại (Redo)** | Phục hồi lại thao tác vừa hoàn tác. |
| `Shift + S` | **Vùng an toàn (Safe Zone)** | Bật khung hướng dẫn vùng an toàn tránh bị icon TikTok che khuất. |

---

## 4. Tùy Chỉnh Chi Tiết Clip (Inspector Panel)
Khi nhấp chọn một clip trên timeline, bảng **Details** ở góc phải màn hình sẽ tự động hiển thị:
- **Clip Video / Ảnh**: Điều chỉnh Scale (phóng to/thu nhỏ), Vị trí X/Y, Góc xoay, Độ mờ (Opacity), Tốc độ (Speed từ 0.1x đến 10x), Đảo ngược (Reverse), và áp dụng Bộ lọc màu điện ảnh 3D LUT (.cube).
- **Clip Âm thanh**: Tăng giảm Volume, Chỉnh thời gian Fade in / Fade out, Bật chuẩn hóa âm lượng.
- **Clip Chữ / Phụ đề**: Thay đổi nội dung, Chọn phông chữ (Plus Jakarta Sans, Inter, Roboto...), Kích cỡ, Màu sắc, Nền và Căn lề.

---

## 5. Trợ Lý AI EditPilot & Bộ Công Cụ Nâng Cao
- **EditPilot AI**: Nhấp biểu tượng ngôi sao ✨ ở góc dưới hoặc thanh nhập prompt trên Home. Gõ câu lệnh tự nhiên:
  - *"Cắt 2 giây đầu và tăng tốc 1.5x"*
  - *"Thêm phụ đề tự động"*
  - *"Áp dụng bộ lọc màu hoàng hôn và tắt tiếng clip"*
- **Video dài thành Shorts (Long-to-Shorts)**: Phân tích video cảnh quay ngang 16:9, tự động nhận diện đoạn cut bằng biểu đồ màu và biên độ âm thanh, căn khung tự động 9:16 có thanh trượt bù tâm (Focal Offset).
- **Design Studio**: Thiết kế banner, poster, thumbnail 9:16 với hệ thống layer đa tầng, hỗ trợ xuất ảnh PNG/JPG và file in ấn PDF 1.4.

---

## 6. Xuất Video & Sao Lưu Dự Án
- **Xuất video**: Bấm nút **"Export"** ở góc trên bên phải. Chọn định dạng:
  - **MP4 (Khuyên dùng)**: Video chuẩn H.264/AAC tương thích mọi mạng xã hội.
  - **WebM**: Định dạng nén nhanh cho web.
  - **GIF**: Hoạt ảnh ngắn 9:16.
  - **SRT**: Tệp phụ đề thời gian chuẩn.
- **Sao lưu gói dự án `.capproj`**: Trong menu `File` $\rightarrow$ chọn **"Xuất dự án (.capproj)"**. File này chứa toàn bộ timeline và hiệu ứng, cho phép bạn nạp lại bất kỳ lúc nào mà không cần tài khoản đăng nhập.

---

## 7. Khắc Phục Sự Cố & Kiểm Tra Hệ Thống
- Vào **Menu ▾** $\rightarrow$ **Cài đặt** $\rightarrow$ **Kiểm tra hệ thống (System Check)** để kiểm tra thiết bị của bạn có hỗ trợ WebCodecs, WebGL2, OPFS hay không.
- Nếu gặp hiện tượng giật lag khi biên tập video 4K, hãy bật tùy chọn **"Bật Proxy Mode"** để chuyển sang luồng preview 480p siêu mượt.

---

<br />

# PART 2: END-USER GUIDE (ENGLISH)

## 1. Starting a Project & Template Selection
- **New Project**: Click the prominent **"Create project"** button on the Home Dashboard. The project opens immediately with a native 9:16 vertical ratio (1080×1920 Full HD) tailored for TikTok, Instagram Reels, and YouTube Shorts.
- **Templates Library**: Navigate to **"Templates"** in the left sidebar. Explore 22+ curated templates (Viral Hook, Travelogue, Podcast Waveform, Flash Sale, etc.). Hover over any card for a 60fps loop preview, and click **"Use this template"** to populate the editor.

---

## 2. Importing Media & Copyright Guidelines
- **Import Methods**:
  - Drag and drop media files directly into the dashed dropzone in the **Media** tab.
  - Or click **"Import"** to choose local files, entire folders, or download via URL.
- **Supported Formats**: Video (`.mp4`, `.mov`, `.webm`, `.mkv`), Images (`.jpg`, `.png`, `.webp`, `.gif`), Audio (`.mp3`, `.wav`, `.m4a`, `.ogg`).
- ⚠️ **Copyright Notice**: ClipForge is 100% Client-Side and Local-First. Your media is never uploaded to remote servers. You hold sole legal responsibility for the copyright of files you import.

---

## 3. Essential Timeline Operations & Shortcuts
| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Space` | **Play / Pause** | Toggle playback in the preview player. |
| `C` or `S` | **Split Clip** | Cut selected clip at playhead position. |
| `Q` | **Delete Left** | Trim and discard from start of clip to playhead. |
| `W` | **Delete Right** | Trim and discard from playhead to end of clip. |
| `Delete` / `Backspace` | **Ripple Delete** | Remove clip and ripple left subsequent clips without gaps. |
| `Ctrl + Z` (Cmd+Z) | **Undo** | Undo previous edit operation (up to 50 steps history). |
| `Ctrl + Y` (Ctrl+Shift+Z) | **Redo** | Redo previously undone edit. |
| `Shift + S` | **Safe Zone** | Toggle 9:16 UI overlay guide for TikTok/Reels interface icons. |

---

## 4. Inspector Panel & Clip Properties
Selecting a clip reveals the **Details** panel on the right:
- **Video / Photo Clips**: Adjust Transform (Position, Scale, Rotation), Opacity, Speed Curve (0.1x to 10x), Reverse playback, and cinematic 3D LUT color grading.
- **Audio Clips**: Volume gain slider, Fade-In and Fade-Out duration, Audio Normalization.
- **Text & Captions**: Real-time content edit, Google Fonts selector (Plus Jakarta Sans, Inter, Roboto...), font size, color, background pill, and alignment.

---

## 5. EditPilot AI & Creative Suite
- **EditPilot AI**: Access via the ✨ star button or Home prompt input. Issue natural commands:
  - *"Trim first 2 seconds and speed up by 1.5x"*
  - *"Generate auto captions"*
  - *"Apply cinematic LUT and mute background noise"*
- **Long Video to Shorts**: Ingest landscape 16:9 video, detect viral scene cuts using 3-channel RGB histogram and audio RMS, and auto-crop with adjustable focal offset.
- **Design Studio**: Multi-layer graphic design canvas for posters and thumbnails with PNG, JPG, and standard PDF 1.4 export.

---

## 6. Exporting & Project Backup
- **Exporting Video**: Click **"Export"** in top-right header:
  - **MP4 (Recommended)**: H.264/AAC streaming export with instant cancel.
  - **WebM**: Fast browser-native export.
  - **GIF**: Short looped vertical animation.
  - **SRT**: Standard caption text file.
- **Project Backup (`.capproj`)**: Under menu `File` $\rightarrow$ choose **"Export project (.capproj)"**. This JSON bundle encapsulates your entire timeline and effects for offline portability.

---

## 7. Troubleshooting & Diagnostics
- Open **Menu ▾** $\rightarrow$ **Settings** $\rightarrow$ **System Check** to verify WebCodecs, WebGL2, and OPFS browser hardware support.
- If editing high-bitrate 4K footage on modest hardware, enable **Proxy Mode** in settings for smooth 480p preview playback.

