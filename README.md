# ClipForge - Trình dựng video ngắn dọc 9:16 trên trình duyệt

Trình chỉnh sửa video ngắn 9:16 (1080×1920) chạy hoàn toàn trên trình duyệt dành cho creators TikTok / Reels / Shorts.

## 🚀 Cách chạy ứng dụng
Chỉ cần nhấp đúp trực tiếp vào file `index.html` để mở bằng Google Chrome hoặc Microsoft Edge (không cần cài đặt, không cần server backend).

---

## 📁 Cấu trúc thư mục mã nguồn (Modular Architecture)
Toàn bộ mã nguồn đã được tách rời theo từng module chuyên biệt nằm trong thư mục `src/`, giúp dễ dàng bảo trì và mở rộng:

```text
Editor/
├── index.html              # Bộ khung giao diện HTML5, modals và SVG icons
├── README.md               # Hướng dẫn sử dụng & tài liệu kỹ thuật
└── src/
    ├── css/
    │   └── style.css       # Toàn bộ CSS giao diện, theme xám trung tính, layout & responsive
    └── js/
        ├── state.js        # Quản lý trạng thái dự án, I18N đa ngữ, Undo/Redo (Command Pattern), IndexedDB
        ├── audio.js        # Web Audio API, synthesizer mẫu âm thanh, phân tích nhịp Beat Sync
        ├── graph.js        # Thuật toán Cubic Bezier solver, Easing presets & Modal Graph Editor
        ├── particles.js    # Hệ thống hạt thủ tục (Confetti, Sparkles, Floating Hearts)
        ├── shapes.js       # Shape Layer (Rect, Circle, Star, Arrow, Line) & Trim Path animation
        ├── effects.js      # Bộ lọc hiệu ứng WebGL/Canvas, Chroma Key tách phông, Chỉnh màu & 3D LUT parser
        ├── captions.js     # Trình phân tích SRT & chia nhịp kịch bản cho Caption Studio
        ├── renderer.js     # Động cơ render Frame Canvas 1080×1920 (Blur Fill, Pan & Scan, Pre-comp, v.v.)
        ├── timeline.js     # Quản lý timeline đa rãnh, kéo thả, cắt clip, snapping, audio waveform
        ├── inspector.js    # Panel thuộc tính Inspector bên phải, binding controls & nút keyframe
        ├── hooks.js        # Thư viện Hook Lab (8 preset 3s đầu), Loop Check mode & Template slots
        ├── exporter.js     # Trình xuất video MP4 (WebCodecs H.264 + mp4-muxer / MediaRecorder WebM)
        └── app.js          # Khởi tạo ứng dụng, phím tắt (Hotkeys), Drag & Drop media, gắn sự kiện giao diện
```

---

## ✨ Tính năng Giai đoạn 1 (Nền tảng NLE 9:16)
- **100% Client-side**: Video & âm thanh không rời máy tính, tự lưu dữ liệu vào IndexedDB.
- **Khung dọc 9:16 & Vùng an toàn TikTok**: Lớp phủ guide TikTok (top 160px, bottom 480px, left 120px, right 160px) bật/tắt tức thì, không bao giờ xuất vào video.
- **Nền mờ (Blur Fill)**: Biến video ngang 16:9 thành dọc 9:16 với nền mờ hậu cảnh hoặc lấp đầy (Cover).
- **Timeline đa rãnh**: Rãnh Video/Overlay, Chữ (Text) và Âm thanh (Audio); cắt (Split - phím S), kéo mép trim, nhân đôi (Ctrl+D), xóa, hít nam châm (Snapping), sóng âm thanh (Audio Waveform).
- **8 Hiệu ứng & 4 Chuyển cảnh thủ tục**: Zoom Punch, Shake/Wiggle, RGB Split, Glitch, VHS, Film Grain, Vignette, Flash Cut, Dissolve, Slide, Zoom In.
- **Xuất MP4 1080×1920 30/60fps**: Đóng gói MP4 trực tiếp qua WebCodecs + `mp4-muxer` (fallback MediaRecorder WebM).

---

## ⚡ Tính năng Giai đoạn 2 (Pro Creator & TikTok Trends)
1. **Graph Editor cho Keyframe**: Đồ thị đường cong Bezier kéo chuột trực tiếp; Presets: Linear, Ease, Ease-In, Ease-Out, Ease-In-Out, **Bật nảy (Bounce)**, và **Vọt lố (Back-Overshoot)**.
2. **Speed Ramp (Đồ thị tốc độ)**: Đồ thị tốc độ phi tuyến tích phân hình thang; Presets: **Montage**, **Hero Moment**, **Bullet Time**.
3. **Beat Sync (Đồng bộ nhịp điệu)**: Phân tích tần số thấp bằng Web Audio; đánh dấu beat trên timeline; **Cắt theo nhịp** và **Nháy hiệu ứng theo beat** (Flash, Shake, Zoom Punch, RGB Split).
4. **Caption Studio**: Dán kịch bản hoặc nhập file `.SRT`; chia từ và mốc thời gian; **6 Style chữ thời thượng** (*Karaoke Sáng từng từ*, *Hộp Nền Đen*, *Viền Neon*, *Pop-In Nảy*, *Máy Đánh Chữ*, *TikTok Pill*); hỗ trợ đầy đủ phông tiếng Việt.
5. **Lớp Điều Chỉnh, Blend Mode, Mask & Chroma Key**:
   - **Adjustment Layer**: Áp dụng hiệu ứng và chỉnh màu lên toàn bộ các lớp bên dưới.
   - **Blend Mode**: Normal, Screen, Multiply, Overlay, Lighten, Darken, Color Dodge, Difference.
   - **Mặt nạ (Mask)**: Hình chữ nhật hoặc Elip với độ mờ cạnh viền (Feather).
   - **Chroma Key**: Tách phông xanh chọn màu, dung sai (Tolerance) và độ mịn viền (Smoothness).
6. **Chỉnh màu (Color Grading) & 3D LUT**: Exposure, Contrast, Saturation, Temperature, Tint; nạp file 3D LUT `.cube` chuẩn Adobe/DaVinci.
7. **Hook Lab, Loop Check & Template Studio**:
   - **Hook Lab**: 8 preset giữ chân người xem 3 giây đầu (Zoom Punch, Flash Glitch, RGB Split, Đếm ngược 3-2-1, Whip Pan, Strobe, Vignette, Khung Neon).
   - **Loop Check**: Kiểm tra video lặp vô tận (infinite seamless loop) giữa đoạn nối cuối và đầu.
   - **Template Studio**: Lưu thành file `.clipforge.template.json` với các ô Media Slot thay thế nội dung 1 chạm.

---

## 🚀 Tính năng Giai đoạn 3 (Motion Graphics & Kinetic Tools)
1. **Particle System (Hệ thống hạt rơi thủ tục 60fps)**:
   - Các Preset: **Pháo giấy (Confetti)**, **Bụi sáng lấp lánh (Sparkles/Stardust)**, **Tim bay dâng trào (Floating Hearts)**.
   - Tùy chỉnh tham số: Số lượng hạt (Count), Tốc độ (Speed), Kích thước (Size).
2. **Shape Layer & Trim Path (Hình khối vector & Vẽ viền After Effects)**:
   - Các hình khối: Chữ nhật (Rect), Bo góc (Rounded Rect), Tròn (Circle), Ngôi sao (Star), Mũi tên (Arrow), Đường kẻ (Line).
   - Hiệu ứng **Trim Path**: Điều khiển `Trim Start`, `Trim End` (0–100%) và `Trim Offset` để vẽ đường viền hoạt họa.
3. **Text Animator theo Ký tự / Từ (Kiểu After Effects)**:
   - Đơn vị chia: Từng ký tự (*Character*) hoặc từng từ (*Word*).
   - Range Selector & Stagger delay giữa các ký tự.
   - 4 Kiểu Animator: *Mờ Dần & Trồi Lên (Fade Rise)*, *Phóng To Nảy (Scale Bounce)*, *Sóng Nhấp Nhô (Wave)*, *Xoay Xuất Hiện (Spin)*.
4. **Point Tracking (Bám theo chuyển động)**:
   - Kéo hồng tâm Tracking trực tiếp trên màn hình Preview để gán mốc chuyển động cho vật thể/gương mặt.
   - Chữ hoặc sticker tự động bám dính theo quỹ đạo di chuyển xuyên suốt video.
5. **Pre-comp (Gộp nhóm clip)**:
   - Nút **📦 Gộp nhóm (Pre-comp)** gom nhiều clip thành một khối duy nhất, áp hiệu ứng và biến đổi chung qua kỹ thuật Offscreen Canvas.
6. **Sticker Động (Trending Badges)**:
   - Thư viện Sticker vector: *HOT Flame 🔥*, *NEW Badge ⚡*, *Follow Button ➕*, *Down Arrow ⬇️*, *Warning Alert ⚠️*, *100% Top ⭐*.
7. **Text-To-Speech (Giọng đọc AI bằng Web Speech API)**:
   - Chuyển văn bản tiếng Việt thành giọng đọc lồng tiếng trực tiếp, tùy chỉnh tốc độ và tự động nạp clip âm thanh vào timeline.
8. **Pan & Scan (Crop theo Keyframe biến 16:9 thành 9:16)**:
   - Chế độ căn khung `Pan & Scan`: Cho phép keyframe trục ngang `Crop Pan X` (0% đến 100%) để camera tự động lia theo chủ thể chuyển động trong video ngang 16:9 mà không bị mất người.
