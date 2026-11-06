# KẾ HOẠCH NÂNG CẤP PHIÊN BẢN KẾ TIẾP: CLIPFORGE v1.1 & CHIẾN LƯỢC DESKTOP (ROADMAP v1.1)

> **Dự án**: ClipForge Desktop Web  
> **Phiên bản mục tiêu**: v1.1.0 (Q1/2027)  
> **Căn cứ lập kế hoạch**: Dữ liệu thực nghiệm từ [BETA_REPORT.md](file:///d:/Editor/BETA_REPORT.md) (20 testers, 5 kịch bản) và hệ thống đo lường kỹ thuật ẩn danh (Telemetry Dashboard).  
> **Trạng thái**: KẾ HOẠCH CHIẾN LƯỢC (Chỉ lập kế hoạch, chưa triển khai mã nguồn).

---

## 1. TỔNG QUAN ĐỘNG LỰC NÂNG CẤP TỪ THỰC TẾ BETA & TELEMETRY

Từ kết quả thử nghiệm 20 người dùng thực tế và dữ liệu đo lường kỹ thuật trong đợt Closed Beta v1.0:
- **Tỉ lệ xuất thành công**: Đạt **95%** trên toàn bộ các bài test, nhưng **4.2% lỗi xuất** tập trung ở các máy tính văn phòng cũ có GPU tích hợp khi người dùng thử xuất video độ phân giải cao 4K/60fps.
- **Thời gian xử lý trung vị (p50 / p95)**:
  - 720p HD: p50 = 8.2s / p95 = 14.5s (Cực nhanh)
  - 1080p Full HD: p50 = 22.4s / p95 = 45.1s (Đạt chuẩn trải nghiệm người dùng)
  - 4K Ultra HD: p50 = 84.0s / p95 = 162.0s (Cần tối ưu giảm tải GPU)
- **Hành vi người dùng**: 14/20 testers là các nhà sáng tạo nội dung TikTok/Reels đề xuất mạnh mẽ các công cụ tự động hóa thông minh (cắt khoảng lặng tự động, kho âm thanh trending, chia sẻ trực tiếp lên mạng xã hội).
- **Rào cản Sandbox trình duyệt**: Trình duyệt thu hồi quyền truy cập tệp khi tắt tab (`File System Access API`) khiến một số người dùng phổ thông bỡ ngỡ khi mở lại dự án ngày hôm sau.

---

## 2. CHI TIẾT 3 NHÓM HẠNG MỤC PHIÊN BẢN v1.1

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLIPFORGE v1.1 ROADMAP MATRIX                      │
├─────────────────────────┬─────────────────────────┬─────────────────────┤
│ 1. Sửa lỗi & Ổn định    │ 2. Tính năng được yêu   │ 3. Tối ưu hiệu năng │
│    (Stability & Fixes)  │    cầu nhiều nhất       │    (Performance)    │
├─────────────────────────┼─────────────────────────┼─────────────────────┤
│ • Watchdog GPU Timeout  │ • Auto Silence Remover  │ • Dedicated Worker  │
│ • Batch Relink Media    │ • Extended SFX Library  │ • Whisper INT8      │
│ • Audio Clock Resilience│ • Web Share Target API  │ • Texture Pool      │
│                         │ • GLSL Shader Motion    │                     │
└─────────────────────────┴─────────────────────────┴─────────────────────┘
```

---

### NHÓM 1: SỬA LỖI & TĂNG CƯỜNG ĐỘ ỔN ĐỊNH (STABILITY & BUG FIXES)

#### 1.1. Watchdog chống treo GPU khi xuất 4K (`ERR_WEBCODECS_TIMEOUT`)
- **Lý do**: Telemetry ghi nhận một số GPU tích hợp (Intel HD Graphics đời 6–8) bị reset driver khi mã hóa hardware H.264 các đoạn video 4K phức tạp, dẫn đến thanh tiến trình dừng ở 98-99%.
- **Giải pháp**: Xây dựng bộ đếm thời gian giám sát (Watchdog Timer 15s). Nếu không có chunk mã hóa mới từ `VideoEncoder`, hệ thống tự động lưu trạng thái, khôi phục luồng và chuyển mượt sang bộ render dự phòng `MediaRecorder` hoặc giảm bitrate mà không làm sập tab của người dùng.
- **Ước lượng công**: 2.5 ngày công (Story Points: 3).
- **Rủi ro**: Phải cân chỉnh ngưỡng timeout linh hoạt theo độ dài khung hình để không nhận nhầm các frame đồ họa cực nặng là bị treo.

#### 1.2. Cơ chế cấp lại quyền đọc tệp hàng loạt (Batch File Permission Relink)
- **Lý do**: Beta testers phản ánh việc nhấp từng clip để cấp lại quyền sau khi mở lại trình duyệt gây bất tiện khi dự án có nhiều tệp media.
- **Giải pháp**: Thêm thanh banner nổi trên timeline: *"Phát hiện 3 tệp cần cấp lại quyền đọc"*. Người dùng chỉ cần nhấp 1 nút duy nhất để mở hộp thoại cấp quyền hàng loạt của Chromium, hoặc tự động đọc lại từ bộ nhớ đệm Blob IndexedDB nếu còn lưu trữ.
- **Ước lượng công**: 2 ngày công (Story Points: 2).
- **Rủi ro**: Cơ chế bảo mật Sandbox của trình duyệt bắt buộc phải có thao tác tương tác người dùng (`user gesture activation`) nên không thể tự động cấp quyền âm thầm.

#### 1.3. Bộ lọc bù trôi xung nhịp âm thanh cho Safari & Firefox (Audio Clock Drift Resilience)
- **Lý do**: Trên Safari iOS và Firefox, khi người dùng chuyển tab hoặc mở trung tâm thông báo, `AudioContext.currentTime` bị trình duyệt giảm tần số gọi tick, khiến độ trôi lệch hình - tiếng có lúc chạm ngưỡng 38ms (sát ngưỡng cho phép 40ms).
- **Giải pháp**: Tích hợp thuật toán bù trôi nhịp (Jitter Clock Compensation Filter), tự động điều chỉnh tốc độ playback của `audioEngine` trong phạm vi $\pm 0.5\%$ để giữ A/V drift luôn dưới 15ms.
- **Ước lượng công**: 2 ngày công (Story Points: 2).
- **Rủi ro**: Nếu thuật toán điều chỉnh nhịp quá gắt có thể gây tiếng lách tách (micro-crackles) âm thanh ở các thiết bị loa nhạy cảm.

---

### NHÓM 2: TÍNH NĂNG ĐƯỢC YÊU CẦU NHIỀU NHẤT (MOST REQUESTED FEATURES)

#### 2.1. Cắt tự động khoảng lặng giọng nói (Smart Silence Remover / Jump Cut)
- **Lý do**: 14/20 testers là nhà sáng tạo nội dung vlog, podcast và video TikTok yêu cầu tính năng tự động loại bỏ các đoạn ngừng nghỉ ngập ngừng để tiết kiệm 70% thời gian dựng thô.
- **Giải pháp**: Quét phân tích biên độ âm thanh RMS qua `OfflineAudioContext`, nhận diện các khoảng lặng có biên độ $< -36$dB kéo dài $> 0.4$ giây. Tự động đề xuất danh sách vết cắt và thực thi các thao tác `splitClip` và `rippleDelete` có hỗ trợ hoàn tác Undo (Ctrl+Z).
- **Ước lượng công**: 4.5 ngày công (Story Points: 5).
- **Rủi ro**: Có thể cắt lẹm vào các âm gió hoặc hơi thở tự nhiên của người nói nếu không cho phép người dùng tùy chỉnh ngưỡng nhạy cảm (Decibel Threshold slider).

#### 2.2. Mở rộng Kho Hiệu ứng Âm thanh SFX & Nhạc nền Thịnh hành
- **Lý do**: Kho mẫu hiện tại có 15 SFX cơ bản, chưa đủ đáp ứng nhu cầu làm video ngắn bắt trend (Whoosh, Pop, Ding, Glitch, Cinematic Boom, Riser, Vinyl Scratch).
- **Giải pháp**: Bổ sung thêm 60+ âm thanh chất lượng cao 48kHz chuẩn CC0 / In-House. Ứng dụng kiến trúc On-demand Cache: chỉ tải và lưu vào CacheStorage khi người dùng bấm nghe thử để không làm phình kích thước bundle ban đầu.
- **Ước lượng công**: 2 ngày công (Story Points: 2).
- **Rủi ro**: Cần kiểm duyệt bản quyền âm thanh nghiêm ngặt để đảm bảo 100% không dính gậy bản quyền Content ID của TikTok/YouTube.

#### 2.3. Chia sẻ nhanh sang Ứng dụng Di động (Web Share API Level 2)
- **Lý do**: Người dùng sau khi xuất video trên điện thoại hoặc máy tính bảng muốn gửi trực tiếp sang ứng dụng TikTok, Instagram Reels hoặc CapCut mobile mà không cần tìm file trong thư mục Downloads.
- **Giải pháp**: Bổ sung nút "Chia sẻ nhanh" gọi `navigator.share({ files: [outputBlob], title: 'My Video' })`.
- **Ước lượng công**: 1.5 ngày công (Story Points: 1).
- **Rủi ro**: Một số trình duyệt trên máy tính để bàn (Windows cũ, Linux) chưa hỗ trợ Web Share API với tệp tin nhị phân; cần fallback sang nút "Lưu về máy" truyền thống.

#### 2.4. Bộ chuyển cảnh động chuẩn điện ảnh (Dynamic GLSL Shader Transitions)
- **Lý do**: Người dùng mong muốn có thêm các chuyển cảnh thịnh hành (Zoom In/Out, Whip Pan, Film Glitch, Light Leak) thay vì chỉ có Fade / Crossfade đơn giản.
- **Giải pháp**: Bổ sung 6 GLSL fragment shaders chạy trực tiếp trên pipeline WebGL2 của `sharedCompositor`, hỗ trợ điều chỉnh thời lượng chuyển cảnh từ 0.2s đến 1.5s.
- **Ước lượng công**: 3.5 ngày công (Story Points: 3).
- **Rủi ro**: Shader phức tạp có thể làm tụt fps preview trên các máy GPU yếu; cần tự động giảm độ phân giải chuyển cảnh trong chế độ Proxy Preview.

---

### NHÓM 3: TỐI ƯU HIỆU NĂNG & DUNG LƯỢNG (PERFORMANCE OPTIMIZATIONS)

#### 3.1. Chuyển đổi hoàn toàn sang Dedicated WebCodecs Processing Worker
- **Lý do**: Khi timeline có $>10$ clip xếp chồng hoặc nhiều track chữ động, luồng giao diện chính (Main Thread) bị chiếm dụng ~35% CPU, có thể gây lag nhẹ thanh trượt Playhead.
- **Giải pháp**: Chuẩn hóa cờ `experimental_webcodecs_worker` thành kiến trúc cốt lõi. Chuyển toàn bộ `OffscreenCanvas`, WebGL2 render context và `VideoEncoder` sang chạy ngầm trên Web Worker riêng biệt.
- **Ước lượng công**: 4 ngày công (Story Points: 5).
- **Rủi ro**: Việc đồng bộ trạng thái playhead và canvas preview giữa Main thread và Worker thread đòi hỏi xử lý MessageChannel chặt chẽ để tránh race conditions.

#### 3.2. Lượng tử hóa Model Whisper ONNX INT8 & Nạp theo nhu cầu
- **Lý do**: Model Whisper Tiny FP32 hiện tại nặng ~40MB, khiến người dùng mạng chậm phải chờ 20-30s trong lần nạp đầu tiên.
- **Giải pháp**: Thay thế bằng mô hình Whisper Tiny INT8 lượng tử hóa (kích thước chỉ còn **~18MB**, giảm 55% thời gian tải mạng và giảm 60% mức chiếm dụng RAM heap khi suy luận).
- **Ước lượng công**: 2.5 ngày công (Story Points: 3).
- **Rủi ro**: Tỉ lệ nhận dạng từ ngữ tiếng Việt có thể giảm nhẹ 1-2% ở các đoạn âm thanh nhiều tạp âm lớn; cần xây dựng bộ lọc giảm ồn (Noise Gate) trước khi đưa vào model.

#### 3.3. Tái sử dụng Texture WebGL (Virtual Texture Pooling)
- **Lý do**: Telemetry ghi nhận việc gọi `gl.createTexture()` và `gl.deleteTexture()` liên tục khi người dùng lia chuột nhanh trên timeline gây ra các quãng ngưng thu gom rác (Garbage Collection pauses) kéo dài 15-25ms.
- **Giải pháp**: Xây dựng lớp `TexturePool` quản lý tái sử dụng các GPU textures cùng kích thước thay vì cấp phát mới.
- **Ước lượng công**: 2 ngày công (Story Points: 2).
- **Rủi ro**: Cần cơ chế dọn dẹp triệt để khi đổi dự án để tránh giữ tài nguyên VRAM nhàn rỗi.

---

## 3. ĐÁNH GIÁ CHUYÊN SÂU: CÓ NÊN PHÁT TRIỂN BẢN DESKTOP (TAURI)?

### 3.1. Bối cảnh & Động lực xem xét
Một số người dùng chuyên nghiệp đề xuất xây dựng phiên bản Desktop bằng **Tauri (Rust + Webview)** để có thể nhúng **FFmpeg Native** và tận dụng bộ tăng tốc phần cứng card đồ họa rời (NVIDIA NVENC, Intel QuickSync native, Apple VideoToolbox native).

### 3.2. Bảng Ma trận So sánh Toàn diện (Web PWA vs Tauri Desktop)

| Tiêu chí | ClipForge Web (PWA Hiện tại) | ClipForge Desktop (Tauri + Native FFmpeg) |
| :--- | :--- | :--- |
| **Kích thước tải về** | **$< 2$ MB** (Tải tức thì qua trình duyệt) | **~15 – 25 MB** (Rất nhẹ so với Electron $>150$MB) |
| **Rào cản cài đặt** | **Số 0**: Bấm link là dựng ngay, không cần quyền Admin. | Cần tải bộ cài (.exe, .dmg, .deb), cần ký số chứng chỉ (code signing). |
| **Tốc độ Export 1080p** | $45 - 60$ fps (Nhanh gấp 1.5 lần thời gian thực) | **$180 - 300$ fps** (Nhanh gấp 6–10 lần nhờ GPU NVENC native) |
| **Khả năng xuất 4K/60fps dài $>15$ phút** | Có thể bị giới hạn bởi RAM heap của tab trình duyệt (2–4GB). | **Rất mạnh mẽ**, tận dụng toàn bộ RAM máy tính và VRAM card rời. |
| **Hỗ trợ Codec mở rộng** | Bị giới hạn bởi chuẩn trình duyệt (H.264, VP9, AV1 cơ bản). | **Không giới hạn**: ProRes, H.265 (HEVC), DNxHD, FLAC, MKV native. |
| **Hệ thống tệp (File I/O)** | Sandbox bảo mật (Cần cấp lại quyền khi đóng tab). | Đọc/ghi trực tiếp vào ổ cứng không cần hỏi lại quyền. |
| **Chi phí bảo trì & CI/CD** | Rất thấp: 1 bản build duy nhất chạy mọi hệ điều hành. | Trung bình - Cao: Phải biên dịch, test và bảo trì 3 pipeline (Windows, macOS Intel/Apple Silicon, Linux). |

### 3.3. Tái sử dụng Kiến trúc nếu triển khai Tauri
Nhờ kiến trúc module hóa chặt chẽ của ClipForge v1.0, **khoảng 85% - 90% mã nguồn hiện tại được tái sử dụng trực tiếp**:
- Toàn bộ giao diện React, Tailwind, Zustand Store, i18n, Onboarding, Modals và Canvas WebGL2 giữ nguyên 100%.
- Chỉ cần thay thế 2 lớp giao tiếp biên:
  1. *Lớp File I/O*: Chuyển từ `File System Access API` sang Tauri Rust File System Commands (`tauri::fs`).
  2. *Lớp Video Encoder*: Tùy chọn gọi `ffmpeg-sidecar` biên dịch sẵn thông qua Tauri IPC command thay cho `mp4-muxer`.

### 3.4. KHUYẾN NGHỊ CHIẾN LƯỢC (STRATEGIC RECOMMENDATION)

> [!IMPORTANT]
> **Khuyến nghị của Product Engineer**: **CHƯA NÊN LÀM BẢN TAURI Ở THỜI ĐIỂM HIỆN TẠI (v1.0 / v1.1). NÊN LÊN KẾ HOẠCH CHO GIAI ĐOẠN v1.2 HOẶC KHI PHÂN KHÚC PRO CÓ NHU CẦU LỚN.**

**Lý do chiến lược**:
1. **Lợi thế cạnh tranh lớn nhất (Moat)** của ClipForge là: **"Mở web là dựng được ngay – Không cần cài đặt – Không cần tạo tài khoản – Không tải video lên server"**. Nếu bắt người dùng tải file `.exe`/`.dmg`, ClipForge sẽ mất đi lợi thế tiếp cận nhanh (conversion funnel) so với CapCut Desktop chính thức hay Premiere.
2. **Bản WebCodecs v1.0 hiện tại đã rất xuất sắc**: Tỉ lệ xuất thành công 95%, xuất 1080p chỉ mất 20 giây với mức chiếm dụng RAM đỉnh $< 45$MB, hoàn toàn thỏa mãn 90% nhu cầu sáng tạo video ngắn 9:16 (TikTok, Reels, Shorts).
3. **Định vị lộ trình hợp lý**:
   - **Phiên bản v1.1 (Ưu tiên số 1)**: Tập trung hoàn thiện bản Web PWA với tính năng tự động cắt khoảng lặng, mở rộng kho âm thanh SFX và nâng cấp Dedicated WebCodecs Worker.
   - **Phiên bản v1.2 (Tùy chọn tương lai)**: Đóng gói bản **"ClipForge Pro Studio (Tauri)"** dành riêng cho người dùng chuyên nghiệp cần dựng video 4K dài, hỗ trợ xuất H.265/ProRes và xuất hàng loạt tốc độ cao.

---

## 4. TỔNG KẾT NGUỒN LỰC & THỜI GIAN DỰ KIẾN (v1.1)

| Hạng mục | Nhóm | Ước lượng | Mức độ ưu tiên |
| :--- | :--- | :---: | :---: |
| 1. Watchdog chống timeout GPU 4K | Sửa lỗi & Ổn định | 2.5 ngày | P1 |
| 2. Cấp quyền tệp hàng loạt (Batch Relink) | Sửa lỗi & Ổn định | 2 ngày | P1 |
| 3. Bù trôi xung nhịp âm thanh Safari/Firefox | Sửa lỗi & Ổn định | 2 ngày | P2 |
| 4. Cắt tự động khoảng lặng (Silence Remover) | Tính năng mới | 4.5 ngày | P0 (Nổi bật nhất) |
| 5. Kho âm thanh SFX mở rộng On-demand | Tính năng mới | 2 ngày | P1 |
| 6. Chia sẻ nhanh Web Share API | Tính năng mới | 1.5 ngày | P2 |
| 7. Chuyển cảnh GLSL Shader Motion | Tính năng mới | 3.5 ngày | P2 |
| 8. Dedicated WebCodecs Worker mặc định | Hiệu năng | 4 ngày | P1 |
| 9. Whisper ONNX INT8 Quantization (~18MB) | Hiệu năng | 2.5 ngày | P1 |
| 10. Virtual Texture Pooling WebGL | Hiệu năng | 2 ngày | P2 |
| **TỔNG CỘNG** | **10 Hạng mục** | **26.5 ngày công** | **Sprint 4 tuần** |
