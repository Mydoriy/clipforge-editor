# CONTRIBUTING_PACKS.md
# Hướng Dẫn Đóng Góp Gói Hiệu Ứng (Package Author Contribution Guide)

> Chào mừng bạn tham gia xây dựng hệ sinh thái mở rộng hiệu ứng cho ClipForge!  
> Để bảo vệ an toàn cho hàng triệu người sáng tạo nội dung, hệ thống Kho hiệu ứng ClipForge áp dụng tiêu chuẩn **100% Khai Báo (Purely Declarative)**: Tuyệt đối không chạy mã JavaScript/WASM từ gói, kiểm soát chặt chẽ tài nguyên GPU và xác thực bản quyền minh bạch.

---

## 1. Yêu Cầu Tiên Quyết & Cài Đặt Công Cụ

Dự án cung cấp sẵn bộ công cụ dòng lệnh **`capfx`** để bạn kiểm thử toàn diện gói trên máy cục bộ trước khi mở Pull Request:

```bash
# Kiểm tra phiên bản công cụ capfx
npm run capfx -- --help
# Hoặc chạy trực tiếp:
node bin/capfx.mjs --help
```

---

## 2. Các Bước Tạo Gói Hiệu Ứng Mới

### Bước 1: Khởi tạo cấu trúc thư mục
Tạo thư mục gói bên trong `packs/<packId>/`:

```text
packs/community.retro-vibe/
├── pack.json             # Bản kê khai chính của gói (Bắt buộc)
├── preview.webp          # Ảnh đại diện hiệu ứng (≤ 8KB)
└── assets/               # Thư mục tài nguyên đính kèm
    └── lut/vintage.cube  # File LUT (nếu có)
```

### Bước 2: Viết `pack.json`
Xem tài liệu đặc tả chi tiết tại [EFFECT_PACK_SPEC.md](file:///d:/Editor/EFFECT_PACK_SPEC.md).

Ví dụ một gói hiệu ứng màu điện ảnh tối giản:
```json
{
  "formatVersion": "1.0.0",
  "id": "community.retro-vibe",
  "version": "1.0.0",
  "name": {
    "vi": "Phong Cách Cổ Điển Retro",
    "en": "Retro Vintage Look"
  },
  "author": "CreativeCommunity",
  "license": "MIT",
  "redistributable": true,
  "createdAt": "2026-11-08T00:00:00Z",
  "items": [
    {
      "id": "retro-warmth",
      "kind": "effect",
      "paramSchema": {
        "warmth": {
          "type": "number",
          "label": { "vi": "Độ ấm", "en": "Warmth" },
          "default": 1.0,
          "min": 0.0,
          "max": 2.0
        }
      },
      "shader": {
        "language": "glsl300es",
        "fragmentBody": "vec4 col = texture(uTexA, uv);\ncol.r += 0.08 * uParams.x;\ncol.b -= 0.05 * uParams.x;\nreturn clamp(col, 0.0, 1.0);",
        "passes": 1
      },
      "tags": ["retro", "vintage", "warm", "color"],
      "aliases": {
        "vi": ["cổ điển", "màu ấm", "phim nhựa", "hoài niệm"],
        "en": ["nostalgic", "warm tone", "analog", "film"]
      },
      "preview": {
        "thumb": "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=",
        "loopFrames": 30
      },
      "requires": {
        "webgl2": true
      },
      "cost": {
        "samplesPerPixel": 1,
        "passes": 1
      },
      "since": "1.0.0"
    }
  ],
  "assets": []
}
```

---

## 3. Kiểm Thử Cục Bộ Bằng CLI `capfx`

Trước khi gửi PR, bạn **bắt buộc** phải chạy qua 3 lệnh kiểm tra cục bộ:

### 1. Kiểm tra toàn diện chuẩn kiểm duyệt (`validate`):
```bash
node bin/capfx.mjs validate packs/community.retro-vibe
```
Lệnh này tự động kiểm tra cả 8 tiêu chí CI:
- Cú pháp Zod schema của `pack.json`.
- Giấy phép SPDX trong danh sách cho phép (MIT, CC0, Apache-2.0, BSD, OFL).
- Phân tích tĩnh shader GLSL (cấm while/do-while, texture sampling $\le 16$, passes $\le 3$).
- Biên dịch thử nghiệm shader với Host wrapper.
- Ngân sách hiệu năng GPU và giới hạn kích thước thumbnail $\le 8\text{ KB}$.
- Kiểm tra trùng lặp ID và từ khóa alias.
- Quét tệp cấm và làm sạch mã độc trong SVG.

### 2. Xem trước và kiểm tra tính tất định (`capfx preview`):
```bash
capfx preview packs/community.retro-vibe
# hoặc:
node bin/capfx.mjs preview packs/community.retro-vibe
```
Kiểm tra golden render tại 5 mốc tiến trình để đảm bảo không có hàm ngẫu nhiên làm lệch chất lượng giữa Preview và Export.

### 3. Đóng gói thử nghiệm tệp `.capfx` (`capfx pack`):
```bash
capfx pack packs/community.retro-vibe --output test-package.capfx
# hoặc:
node bin/capfx.mjs pack packs/community.retro-vibe --output test-package.capfx
```
Tự động tính toán mã băm SHA-256 cho toàn bộ tệp tài nguyên tĩnh và tạo tệp `.capfx` chuẩn ZIP.

---

## 4. Checklist Trước Khi Mở Pull Request

- [ ] Gói đã vượt qua `capfx validate` với `0 lỗi (0 errors)`.
- [ ] Ảnh thumbnail WebP có kích thước thực tế $\le 8\text{ KB}$ (8,192 bytes).
- [ ] Giấy phép được khai báo rõ ràng trong `pack.json` và thuộc danh sách SPDX được công nhận.
- [ ] Không sử dụng `Math.random()`, mọi PRNG hạt nhiễu đều lấy từ hàm `hash(uv, uSeed)`.
- [ ] Mọi asset âm thanh, font chữ, LUT đều có nguồn gốc rõ ràng (CC0 hoặc OFL).
- [ ] Tên nhánh Git theo quy ước: `feat/add-<packId>` (Ví dụ: `feat/add-retro-vibe`).
- [ ] Tiêu đề PR và Commit message theo chuẩn Conventional Commits:  
  `feat(pack): add community.retro-vibe@1.0.0`
