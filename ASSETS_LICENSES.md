# GIẤY PHÉP TÀI NGUYÊN & NGUỒN GỐC TÀI SẢN (ASSETS LICENSES)

> **Dự án**: ClipForge Desktop Web (Local-First 9:16 Video Studio)  
> **Phiên bản**: 1.0.0  
> **Ngày phê duyệt**: Tháng 11/2026  
> **Cam kết pháp lý**: Toàn bộ tài nguyên dựng sẵn (nhạc, font, sticker, LUT, Lottie, template) tích hợp trong ứng dụng 100% tuân thủ các giấy phép mở: **Creative Commons Zero (CC0)**, **MIT License**, **SIL Open Font License (OFL)** hoặc **Tự phát triển nội bộ (In-House)**. Tuyệt đối không chứa tài nguyên vi phạm bản quyền thương mại có phí.

---

## 1. PHÔNG CHỮ (TYPOGRAPHY & FONTS)
Tất cả các phông chữ được nhúng và hỗ trợ trong Design Studio cũng như Subtitle Engine đều là phông chữ mã nguồn mở, được cấp phép cho cả mục đích cá nhân và thương mại.

| Tên Font | Tác giả / Foundry | Nguồn | Giấy phép | Quyền sử dụng thương mại |
| :--- | :--- | :--- | :--- | :--- |
| **Plus Jakarta Sans** | Tokotype (Gumpita Rahayu) | [Google Fonts / GitHub](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | **SIL Open Font License 1.1 (OFL)** | Có (Không hạn chế) |
| **Inter** | Rasmus Andersson | [Google Fonts / GitHub](https://fonts.google.com/specimen/Inter) | **SIL Open Font License 1.1 (OFL)** | Có (Không hạn chế) |
| **Roboto** | Christian Robertson (Google) | [Google Fonts](https://fonts.google.com/specimen/Roboto) | **Apache License 2.0** | Có (Không hạn chế) |
| **Montserrat** | Julieta Ulanovsky | [Google Fonts](https://fonts.google.com/specimen/Montserrat) | **SIL Open Font License 1.1 (OFL)** | Có (Không hạn chế) |
| **Dancing Script** | Impallari Type | [Google Fonts](https://fonts.google.com/specimen/Dancing+Script) | **SIL Open Font License 1.1 (OFL)** | Có (Không hạn chế) |
| **Oswald** | Vernon Adams | [Google Fonts](https://fonts.google.com/specimen/Oswald) | **SIL Open Font License 1.1 (OFL)** | Có (Không hạn chế) |
| **System Fonts Fallback** | Apple / Microsoft / Google | Native OS Rendering | **System License** | Theo HĐH người dùng |

---

## 2. NHẠC NỀN & HIỆU ỨNG ÂM THANH (AUDIO & SFX)
Ứng dụng sử dụng hai nguồn tài nguyên âm thanh chính: tổng hợp toán học trực tiếp (procedural synthesis) và kho nhạc mẫu CC0.

| Hạng mục | Danh mục chi tiết | Nguồn gốc | Giấy phép | Mô tả kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **Hiệu ứng SFX Tức thì** | Whoosh, Pop, Click, Ding, Boom, Laser, Riser | **Tự tạo nội bộ (In-House)** | **MIT / CC0** | Được tổng hợp thời gian thực bằng Web Audio API Oscillators, BiquadFilter, White Noise buffer tại \`src/engine/audioEngine.ts\`. Không sử dụng file âm thanh mẫu ghi âm bản quyền. |
| **Nhạc Nền Mẫu (Music Loops)** | Lo-Fi Chill, Acoustic Vibe, Upbeat Travel, Cyber Synth, Phonk Beat | **Freemusicarchive & In-House CC0** | **Creative Commons Zero 1.0 (CC0)** | Miễn phí bản quyền hoàn toàn (Royalty-Free / Public Domain Dedication). Người dùng có thể tự do kiếm tiền (Monetization) trên TikTok, YouTube và Reels. |

---

## 3. NHÃN DÁN & BIỂU TƯỢNG (STICKERS & VECTOR GRAPHICS)

| Bộ tài nguyên | Thành phần | Nguồn gốc | Giấy phép | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Lucide Icon Library** | Hơn 500+ vector icons giao diện và sticker | [Lucide Project](https://lucide.dev) | **ISC License** | Tương đương MIT, cho phép nhúng, chỉnh sửa và phân phối thương mại. |
| **Emoji & Vector Badges** | Huy hiệu 9:16, khung tròn, sticker giảm giá, trending tags | **Tự vẽ nội bộ (In-House SVG)** | **MIT / CC0** | Mã SVG thuần được làm sạch tự động bằng \`DOMPurify\` trước khi hiển thị. |

---

## 4. BỘ LỌC MÀU 3D LUT (.CUBE)

| Tên LUT | Kiểu hiệu ứng | Nguồn gốc | Giấy phép | Thuật toán tạo |
| :--- | :--- | :--- | :--- | :--- |
| **Cinematic Teal & Orange** | Tone màu phim bom tấn Hollywood | **Tự tạo (In-House)** | **CC0 / MIT** | Ma trận toán học 3D 17x17x17 chuyển dải sáng sang ấm cam (#FF9933) và dải tối sang xanh teal (#006680). |
| **Warm Sunset Gold** | Ánh nắng chiều hoàng hôn ấm áp | **Tự tạo (In-House)** | **CC0 / MIT** | Tăng cường kênh đỏ/vàng trên đường cong Gamma sRGB. |
| **Film Noir High Contrast** | Đen trắng điện ảnh cổ điển | **Tự tạo (In-House)** | **CC0 / MIT** | Chuyển đổi quang thông Rec.709 với hệ số Y = 0.2126R + 0.7152G + 0.0722B và đẩy tương phản sigmoid. |
| **Cyberpunk Neon** | Tím hồng neon tương lai | **Tự tạo (In-House)** | **CC0 / MIT** | Dịch pha dải màu xanh tím và hồng ngoại vi. |
| **Vintage 90s Film** | Màu phim nhựa thập niên 90 | **Tự tạo (In-House)** | **CC0 / MIT** | Làm bạc dải đen (lift blacks) và áp hạt giả lập. |

---

## 5. HOẠT ẢNH VECTOR LOTTIE (ANIMATIONS)

| Tên Animation | Mục đích sử dụng | Nguồn gốc | Giấy phép |
| :--- | :--- | :--- | :--- |
| **Pulse Ring** | Hiệu ứng nhấn mạnh nút quay và điểm chú ý | **In-House Bezier JSON** | **CC0 / MIT** |
| **Success Checkmark** | Xác nhận hoàn thành export / lưu trữ | **In-House Bezier JSON** | **CC0 / MIT** |
| **Particle Confetti** | Mừng hoàn thành dự án / áp template | **\`canvas-confetti\` (Kiril Vatev)** | **ISC License** |
| **Loading Spinner** | Vòng xoay tiến trình xử lý WebAssembly | **In-House SVG Animation** | **CC0 / MIT** |

---

## 6. THƯ VIỆN MẪU DỰ ÁN DỰNG SẴN (22 VIDEO TEMPLATES)
Toàn bộ 22 mẫu template trong mục "Templates" (\`src/pages/SectionPage.tsx\`) được nhóm phát triển ClipForge sáng tạo từ đầu, bao gồm cấu trúc đa track (Video + Audio + Text + Filter + Transition):

1. **TikTok Viral Hook (9:16)** - Phù hợp mở đầu cuốn hút 3 giây đầu.
2. **Reels Travelogue Cinematic** - Dựng video du lịch lướt nhanh.
3. **YouTube Shorts Gadget Review** - Bố cục review sản phẩm công nghệ.
4. **Podcast Waveform Highlight** - Video trích đoạn podcast có sóng âm.
5. **Flash Sale 9:16 E-Commerce** - Mẫu quảng cáo bán hàng giảm giá chớp nhoáng.
6. **Fitness Workout Tracker** - Mẫu đếm thời gian tập gym/workout.
7. **Culinary Recipe Quick-Cut** - Dựng video nấu ăn chuyển cảnh theo nhịp.
8. **Cyberpunk Music Visualizer** - Mẫu visualizer neon tương lai.
9. **Typography Beat Sync** - Chữ nhảy theo nhịp nhạc sôi động.
10. **Cinematic Vlog Intro** - Mở đầu vlog phong cách điện ảnh.
11. **Before / After Split** - So sánh trước và sau khi biến đổi.
12. **Daily Routine Mini-Vlog** - Video một ngày làm việc nhẹ nhàng.
13. **Motivational Speech Reel** - Lời khuyên truyền cảm hứng trên nền tối.
14. **News Breaking Alert** - Bản tin cập nhật tin tức nhanh dạng dọc.
15. **Unboxing Tech Showcase** - Mở hộp thiết bị sắc nét.
16. **Top 5 Countdown** - Danh sách đếm ngược xếp hạng 5 đến 1.
17. **Gaming Highlights Montage** - Highlight gameplay kịch tính.
18. **Fashion Lookbook 9:16** - Trình diễn bộ sưu tập thời trang đường phố.
19. **Real Estate House Tour** - Giới thiệu căn hộ / bất động sản.
20. **Educational Explainer** - Video bài học giải thích kiến thức 60s.
21. **Outro Call To Action (Follow / Subscribe)** - Khung kết thúc kêu gọi tương tác.
22. **Lyric Video Subtitle Pop** - Phụ đề chạy karaoke nghệ thuật.

> **Giấy phép áp dụng cho Mẫu**: **MIT / CC0**. Người dùng có toàn quyền chỉnh sửa, thay thế nội dung, xuất video và đăng tải thương mại mà không cần xin phép hay ghi nguồn.

