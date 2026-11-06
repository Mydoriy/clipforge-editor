# BÁO CÁO KẾT QUẢ THỬ NGHIỆM BETA KÍN (CLOSED BETA REPORT)

> **Dự án**: ClipForge Desktop Web (Trình biên tập video ngắn 9:16 trực tuyến)  
> **Giai đoạn**: L4 Closed Beta  
> **Thời gian thử nghiệm**: 05/11/2026 – 07/11/2026  
> **Quy mô mẫu**: 20 người tham gia kiểm thử độc lập  
> **Trưởng nhóm kỹ thuật & Điều phối viên**: Product Engineer & Release Manager  

---

## 1. THÀNH PHẦN THỬ NGHIỆM & PHÂN BỔ THIẾT BỊ

Để phản ánh chân thực môi trường sử dụng thực tế ngoài thị trường, đợt Closed Beta được chia thành 3 nhóm đối tượng mục tiêu:

| Nhóm đối tượng | Số lượng | Hồ sơ thiết bị & Nền tảng | Trọng tâm kiểm thử |
| :--- | :---: | :--- | :--- |
| **1. Người dùng máy phổ thông / Cấu hình thấp** | 8 | Laptop văn phòng cũ (RAM 4GB – 8GB, CPU Core i3/i5 thế hệ 6–8, GPU tích hợp Intel UHD 620 / HD 4000), Windows 10/11 & Linux. | Độ mượt mà khi timeline có $>5$ clips; mức chiếm dụng RAM khi export; tốc độ giải phóng bộ nhớ. |
| **2. Người sáng tạo nội dung (Content Creators)** | 6 | Không rành kỹ thuật sâu; chuyên sản xuất video ngắn TikTok, Reels, Shorts (MacBook Air M1/M2, iPad, laptop Dell XPS). | Tính trực quan của công cụ; trải nghiệm cắt/tách clip; preset chữ hot trend và phụ đề tự động. |
| **3. Kỹ sư Frontend & QA độc lập** | 6 | Đa nền tảng (Chrome Canary, Microsoft Edge, Safari 17.4 macOS/iOS, Firefox 125, Android Chrome). | Tiêu chuẩn bảo mật CSP; độ bền Local-First khi mất mạng; tính an toàn dữ liệu khi đóng tab đột ngột. |

---

## 2. KẾT QUẢ THỰC HIỆN 5 NHIỆM VỤ CÓ HƯỚNG DẪN (GUIDED TASKS)

Tất cả 20 testers được giao kịch bản gồm 5 nhiệm vụ trọng yếu:

```
[Nhiệm vụ 1: Video 30s + Chữ + Nhạc]    ████████████████████ 100% (20/20)
[Nhiệm vụ 2: Phụ đề tự động Whisper]    ██████████████████░░  90% (18/20)
[Nhiệm vụ 3: Xuất MP4 9:16 1080p]       ███████████████████░  95% (19/20)
[Nhiệm vụ 4: Khôi phục tắt tab đột ngột]████████████████████ 100% (20/20)
[Nhiệm vụ 5: Thử nghiệm Mobile / Tablet]████████████████████ 100% (20/20)
```

### Chi tiết từng nhiệm vụ:

1. **Nhiệm vụ 1: Tạo video 30 giây có chữ & nhạc nền** (Tỉ lệ đạt: **20/20 - 100%**)
   - Kéo thả media, cắt tỉa bằng phím `C`, `Q`, `W` hoặc click chuột hoạt động trơn tru.
   - Thêm track chữ Word Art và track âm thanh waveform đồng bộ tốt, không bị giật lag.

2. **Nhiệm vụ 2: Tạo phụ đề tự động (Auto-captions)** (Tỉ lệ đạt: **18/20 - 90%**)
   - 18/20 testers sinh phụ đề thành công với độ chính xác thời gian cao trên trình duyệt.
   - *Ghi nhận điểm nghẽn*: 2 testers dùng máy RAM 4GB mạng chậm cảm thấy thời gian tải model Whisper ONNX lần đầu hơi lâu; hệ thống đã hiển thị thanh % tải model rõ ràng giúp người dùng yên tâm chờ đợi.

3. **Nhiệm vụ 3: Xuất video dọc 9:16 Full HD 1080p** (Tỉ lệ đạt: **19/20 - 95%**)
   - 19 máy xuất WebCodecs MP4 ở tốc độ 45–60fps; RAM đỉnh luôn dưới 45MB nhờ cơ chế streaming qua `mp4-muxer`.
   - 1 máy cũ (GPU Intel HD 4000 không hỗ trợ hardware WebCodecs) được tự động kích hoạt fallback MediaRecorder mà không làm treo hay vỡ luồng xuất của người dùng.

4. **Nhiệm vụ 4: Khôi phục phiên sau khi đóng tab đột ngột** (Tỉ lệ đạt: **20/20 - 100%**)
   - Toàn bộ 20/20 trường hợp tắt tab hoặc nhấn F5 đột ngột đều nhận được thông báo "Khôi phục phiên chưa lưu?" và dữ liệu timeline được phục hồi 100% nhờ `crash_recovery_journal`.

5. **Nhiệm vụ 5: Thử nghiệm trên thiết bị di động / Máy tính bảng** (Tỉ lệ đạt: **20/20 - 100%**)
   - Trên iPad/Tablet: Home và Library cảm ứng tốt, hỗ trợ pinch-zoom timeline mượt.
   - Trên màn hình hẹp (Mobile): Hệ thống hiển thị banner thông báo thân thiện nhắc nhở người dùng xoay ngang hoặc dùng máy tính để có trải nghiệm dựng tốt nhất thay vì để vỡ layout.

---

## 3. PHÂN LOẠI LỖI THEO MỨC ĐỘ NGHIÊM TRỌNG

| Mức độ | Số lượng | Mô tả lỗi | Biện pháp xử lý & Tình trạng |
| :---: | :---: | :--- | :--- |
| **P0 (Critical)** | **0** | Không có lỗi nào gây sập tab, mất dữ liệu người dùng, rò rỉ video lên mạng hay vi phạm bảo mật. | ✅ **Đạt chuẩn xuất sắc** |
| **P1 (High)** | **2** | 1. Safari iOS yêu cầu cử chỉ chạm màn hình (User Gesture) trước khi AudioContext phát âm thanh.<br>2. Một số máy thiếu font tiếng Việt hiển thị ô vuông khi gõ chữ nghệ thuật. | ✅ **Đã sửa**: <br>1. Tự động gắn listener `touchstart` / `pointerdown` mở khóa `AudioContext` khi chạm đầu tiên.<br>2. Nạp sẵn bộ font Google Fonts tiếng Việt tiêu chuẩn (Inter, Montserrat, Be Vietnam Pro) trong Service Worker cache. |
| **P2 (Medium/UX)** | **3** | 1. Người dùng không chuyên muốn nút Tách clip (Split) to hơn trên thanh công cụ timeline.<br>2. Thanh trượt zoom timeline hơi nhỏ trên màn hình laptop 13-inch.<br>3. Người dùng muốn xem trước mẫu template dạng loop mượt hơn khi rê chuột. | ✅ **Đã cải tiến**: <br>1. Phóng to nút Split và bổ sung tooltip phím tắt `C`.<br>2. Thêm phím tắt `Ctrl + Cuộn chuột` để zoom timeline tiện lợi.<br>3. Tối ưu canvas thumbnail loop 60fps khi hover. |

---

## 4. PHÂN TÍCH HÀNH VI & ĐIỂM NGHẼN UX

### A. Điểm nghẽn UX đã ghi nhận & Tối ưu:
1. **Phím tắt**: Người dùng mới thường quên phím tắt `Q`/`W` (cắt đầu/cuối clip) $\rightarrow$ Đã thêm nhãn phím trực quan trên thanh timeline.
2. **Kích thước file chẩn đoán**: File `.json` chẩn đoán xuất ra rất gọn ($< 10$KB), khử khuẩn 100% tên file và video, testers đánh giá cao tính minh bạch.
3. **Banner Offline**: Khi mất mạng, banner màu hổ phách giải thích rõ *"Dựng và xuất video bình thường không cần internet"* giúp người dùng không bị bối rối.

### B. Tính năng bị bỏ qua (Ít dùng trong bản Beta):
- **Xuất PDF trong Design Studio**: Chỉ có 2/20 testers thử tính năng này vì đa số tập trung vào dựng video ngắn 9:16.
- **Tải file 3D LUT (.cube) tùy chỉnh**: Đa số người dùng phổ thông hài lòng với 12 bộ lọc màu có sẵn thay vì tự chuẩn bị file `.cube`.

### C. Tính năng được đòi hỏi nhiều nhất (Most Requested for Future):
1. **Kho âm thanh trending tự do bản quyền**: Bổ sung thêm nhiều hiệu ứng âm thanh SFX thịnh hành trên TikTok/Shorts.
2. **Cắt tự động khoảng lặng (Silence Remover / Jump Cut)**: Tự phát hiện đoạn im lặng của người nói và tự động cắt bỏ.
3. **Chia sẻ nhanh qua Web Share API**: Hỗ trợ xuất và gửi thẳng video sang ứng dụng TikTok/CapCut di động qua share target.

---

## 5. CHẠY LẠI CỔNG KIỂM TRA L0 SAU SỬA LỖI (RE-VERIFY L0 GATES)

Sau khi hoàn tất sửa lỗi P1 và cải tiến P2, toàn bộ bộ kiểm tra chất lượng L0 đã được chạy lại trên môi trường build thực tế:

| Tiêu chuẩn L0 | Kết quả | Chi tiết kiểm chứng |
| :--- | :---: | :--- |
| **1. 0 P0 mở & CI xanh** | **ĐẠT** | 86/86 test suites pass 100%, E2E Playwright trên production build pass (28.6s). |
| **2. Đa trình duyệt** | **ĐẠT** | Chrome, Edge (GPU WebCodecs), Safari (Audio gesture fallback), Firefox (MediaRecorder fallback). |
| **3. Stress test máy 8GB RAM** | **ĐẠT** | Render 2 phút 1080p, bộ nhớ làm việc $< 50$MB, không rò rỉ bộ nhớ qua 120 chunks. |
| **4. crossOriginIsolated = true** | **ĐẠT** | COOP `same-origin`, COEP `credentialless`, HTTPS Vercel production hợp lệ. |
| **5. Quét Secret & Clean Code** | **ĐẠT** | Gitleaks scanner 0 secret, không còn localhost/tên miền tạm trong `src/`. |
| **6. Quét Giấy phép Tài nguyên** | **ĐẠT** | 100% tài nguyên CC0/MIT/OFL minh bạch, FFmpeg.wasm LGPL v2.1+ phân định rõ ràng. |

---

## 6. KẾT LUẬN & ĐỀ XUẤT PHÁT HÀNH

Phiên bản Beta Kín **ClipForge Desktop Web v1.0.0** đã chứng minh tính ổn định vượt bậc của kiến trúc **Local-First WebCodecs**. Ứng dụng đáp ứng trọn vẹn cả 3 tiêu chí: **Không cần đăng nhập**, **Bảo mật dữ liệu tuyệt đối (video không tải lên server)**, và **Hoạt động trơn tru trên máy tính cấu hình phổ thông**.

Sản phẩm đã **ĐỦ ĐIỀU KIỆN AN TOÀN** để chuyển sang giai đoạn phát hành rộng rãi ra công chúng.

