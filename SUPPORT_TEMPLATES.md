# MẪU PHẢN HỒI NHANH HỖ TRỢ KỸ THUẬT (SUPPORT RESPONSE TEMPLATES)

> **Dự án**: ClipForge Desktop Web  
> **Áp dụng cho**: GitHub Issues, Discord Support, Email Kỹ thuật & Form Góp ý trực tiếp trong ứng dụng.  
> **Cam kết SLA**: Phản hồi ticket P0 trong vòng 2 giờ; P1 trong 8 giờ; P2/Góp ý trong 24 giờ.

---

## 1. PHÂN LOẠI TICKET & MỨC ĐỘ ƯU TIÊN (SEVERITY MATRIX)

| Mức độ | Định nghĩa | Ví dụ | SLA phản hồi |
| :--- | :--- | :--- | :--- |
| **P0 (Khẩn cấp)** | Lỗi sập ứng dụng diện rộng, mất dữ liệu người dùng, export tê liệt toàn bộ | Không mở được editor, export 100% video đều crash tab | **< 2 giờ** |
| **P1 (Cao)** | Lỗi tính năng quan trọng nhưng có giải pháp thay thế cục bộ | Export 4K bị đứng nhưng 1080p chạy được, mất quyền file | **< 8 giờ** |
| **P2 (Trung bình)** | Lỗi giao diện nhỏ, sai lệch căn lề, trục trặc tính năng phụ | Waveform audio hiển thị chậm, nút bấm bị lệch 1-2px | **< 24 giờ** |
| **P3 (Đề xuất)** | Yêu cầu tính năng mới, mẫu template mới, góp ý trải nghiệm | Đề xuất thêm hiệu ứng chuyển cảnh mới | **< 48 giờ** |

---

## 2. MẪU 1: YÊU CẦU THÔNG TIN CHẨN ĐOÁN KỸ THUẬT (DIAGNOSTIC REQUEST)

*Dùng khi người dùng báo lỗi chung chung (vd: "App bị lỗi", "Không dùng được", "Video không chạy") mà chưa cung cấp chi tiết kỹ thuật.*

```markdown
Chào bạn,

Cảm ơn bạn đã báo cáo sự cố khi sử dụng ClipForge Desktop Web!

Vì ClipForge hoạt động theo kiến trúc 100% Client-Side (mọi quá trình dựng và render đều diễn ra cục bộ trên máy tính của bạn thông qua WebCodecs và WebGL2, không gửi video lên máy chủ), chúng mình cần thêm một số thông tin chẩn đoán kỹ thuật để tái hiện và khắc phục chính xác lỗi này:

1. **Thông tin chẩn đoán (Diagnostic JSON)**:
   - Trong ứng dụng, bạn bấm vào biểu tượng bánh răng **Cài đặt** (hoặc mở menu **Giới thiệu & Hỗ trợ**).
   - Chọn mục **"Kiểm tra hệ thống"** (System Check) hoặc trong modal **"Báo lỗi & Góp ý"**.
   - Bấm nút **"Tải chẩn đoán (JSON)"** hoặc **"Sao chép chẩn đoán"** và gửi đính kèm vào phản hồi này.
   *(Khối thông tin này đã được ẩn danh tuyệt đối: không chứa tên tệp, nội dung video hay thông tin cá nhân của bạn).*

2. **Môi trường sử dụng**:
   - Tên và phiên bản trình duyệt (vd: Google Chrome 130, Microsoft Edge 130, Safari 17.5...).
   - Hệ điều hành (vd: Windows 11 64-bit, macOS Sonoma, Ubuntu 24.04...).
   - Cấu hình phần cứng ước tính (Dung lượng RAM, card đồ họa rời hay tích hợp).

3. **3 Bước tái hiện sự cố (Steps to Reproduce)**:
   - Bước 1: [Bạn đã thực hiện thao tác gì, ví dụ: Import video MP4 1080p 60fps]
   - Bước 2: [Thao tác tiếp theo, ví dụ: Cắt clip tại giây thứ 5 và áp dụng bộ lọc màu]
   - Bước 3: [Thời điểm xảy ra lỗi, ví dụ: Bấm nút Export thì thanh tiến trình đứng yên]

Ngay khi nhận được thông tin trên, đội ngũ kỹ thuật ClipForge sẽ phản hồi giải pháp xử lý ngay cho bạn!

Trân trọng,  
Đội ngũ Hỗ trợ Kỹ thuật ClipForge
```

---

## 3. MẪU 2: PHẢN HỒI NHANH LỖI EXPORT BỊ LỖI HOẶC TREO Ở 99%

*Dùng khi người dùng gặp sự cố tiến trình render video dừng lại ở 98-99% hoặc báo "Export failed".*

```markdown
Chào bạn,

Cảm ơn bạn đã phản ánh về sự cố xuất video (Export freeze / timeout)!

Hiện tượng thanh tiến trình dừng lại ở 98-99% thường do một trong các nguyên nhân: bộ mã hóa phần cứng GPU (Hardware Encoder) của trình duyệt bị quá tải khi đóng gói muxing MP4, hoặc ổ cứng hệ thống không còn đủ dung lượng chứa tệp tạm thời.

Bạn vui lòng thử nhanh các bước xử lý sau nhé:

1. **Hạ nhẹ độ phân giải xuất**:
   - Nếu bạn đang xuất 4K hoặc 60 FPS, hãy thử chuyển sang **1080p Full HD (30 FPS)** hoặc **720p HD**.
2. **Kích hoạt Dedicated WebCodecs Worker**:
   - Vào **Cài đặt (Settings)** → cuộn xuống mục **Tính năng thử nghiệm (Feature Flags)**.
   - BẬT tùy chọn **"Dedicated WebCodecs Worker (Tách render ngầm)"**. Tính năng này chuyển toàn bộ luồng mã hóa sang background thread, tránh bị ảnh hưởng bởi giao diện chính.
3. **Giải phóng tài nguyên máy**:
   - Tạm thời đóng các tab trình duyệt nặng hoặc phần mềm đang chạy ngầm.
   - Kiểm tra ổ đĩa hệ thống (ổ C: trên Windows) còn trống tối thiểu 2GB.
4. **Sử dụng bộ render dự phòng**:
   - Nếu trình duyệt của bạn không hỗ trợ tăng tốc phần cứng H.264, ClipForge sẽ tự động chuyển sang chế độ MediaRecorder/FFmpeg Wasm fallback.

Bạn có thể tham khảo thêm hướng dẫn chi tiết tại trang: https://clipforge-editor.vercel.app/help

Nếu vẫn gặp lỗi, bạn hãy gửi lại cho mình file **Diagnostic JSON** như hướng dẫn ở trên để chúng mình hỗ trợ sâu hơn nhé!
```

---

## 4. MẪU 3: PHẢN HỒI NHANH LỖI THIẾU RAM / PREVIEW GIẬT LAG

*Dùng khi người dùng gặp hiện tượng timeline giật, phát không mượt hoặc thông báo Out of Memory.*

```markdown
Chào bạn,

ClipForge xử lý các khung hình video bằng WebGL2 trực tiếp trong bộ nhớ RAM của trình duyệt. Khi dự án có nhiều clip 4K bitrate cao hoặc nhiều lớp hiệu ứng chữ chồng lấn, trình duyệt có thể bị nghẽn bộ nhớ.

Để preview mượt mà ngay lập tức, bạn có thể áp dụng các mẹo sau:

1. **Bật chế độ Xem trước Proxy (Proxy Preview)**:
   - Vào Cài đặt → chuyển độ phân giải preview xuống 360p hoặc 540p. Video xuất ra cuối cùng vẫn đảm bảo độ nét 1080p/4K gốc.
2. **Dọn dẹp bộ nhớ đệm (Cache Cleaning)**:
   - Vào tab **Quản lý dung lượng** trong Cài đặt → Bấm lần lượt: **"Dọn cache Proxy"**, **"Dọn cache Waveform"** và **"Dọn cache Thumbnail"**.
3. **Bật Tăng tốc phần cứng trong Chrome/Edge**:
   - Mở `chrome://settings/system` trên thanh địa chỉ → kiểm tra mục **"Use graphics acceleration when available"** đã được BẬT.

Bạn có thể bấm nút **"Kiểm tra hệ thống"** (System Check) trên thanh công cụ để xem dung lượng RAM và khả năng WebGL2 của máy nhé!
```

---

## 5. MẪU 4: PHẢN HỒI LỖI MẤT QUYỀN TRUY CẬP TỆP (FILE PERMISSION LOSS)

*Dùng khi clip bị hiện tam giác vàng sau khi người dùng tắt mở lại trình duyệt.*

```markdown
Chào bạn,

Bạn đừng lo lắng nhé, **dự án và toàn bộ vết cắt của bạn vẫn còn nguyên 100% trong cơ sở dữ liệu IndexedDB**!

Hiện tượng clip hiển thị cảnh báo "Mất quyền truy cập tệp gốc" là do cơ chế bảo mật Sandbox mặc định của trình duyệt Chromium (File System Access API). Khi bạn tắt tab hoặc khởi động lại máy, trình duyệt sẽ tự động khóa quyền truy cập tệp trên ổ cứng để bảo vệ bạn.

Cách khôi phục cực kỳ đơn giản (dưới 10 giây):
- **Cách 1**: Bấm trực tiếp vào clip có biểu tượng cảnh báo → chọn **"Cấp lại quyền đọc file" (Allow)**.
- **Cách 2**: Mở thư mục chứa video trên máy tính của bạn, **kéo thả lại đúng tệp video đó vào panel Thư viện**. ClipForge sẽ tự động so khớp mã định danh và tái kết nối toàn bộ timeline ngay lập tức mà không làm mất bất kỳ hiệu ứng nào!
```

---

## 6. MẪU 5: PHẢN HỒI TRÌNH DUYỆT CHƯA HỖ TRỢ ĐẦY ĐỦ WEBCODECS

*Dùng cho người dùng sử dụng trình duyệt cũ hoặc các phiên bản không có WebCodecs API.*

```markdown
Chào bạn,

ClipForge Desktop Web ứng dụng công nghệ WebCodecs và WebGL2 mới nhất của web hiện đại để cho phép dựng và xuất video mà không cần cài đặt phần mềm cồng kềnh.

Để có trải nghiệm mượt mà nhất và thời gian xuất video nhanh gấp 10 lần:
- Chúng mình khuyến nghị bạn sử dụng **Google Chrome (bản 106 trở lên)** hoặc **Microsoft Edge (bản 106 trở lên)** trên máy tính.
- Nếu bạn đang dùng Safari hoặc Firefox, ClipForge vẫn hoạt động thông qua chế độ tương thích dự phòng (MediaRecorder & FFmpeg Wasm), tuy nhiên tốc độ xuất video sẽ phụ thuộc vào CPU.

Bạn có thể kiểm tra mức độ tương thích của trình duyệt hiện tại bằng cách truy cập:  
👉 https://clipforge-editor.vercel.app/help và bấm nút **"Kiểm tra hệ thống"**.
```

