# EFFECT_PACK_SPEC.md
# Đặc Tả Kỹ Thuật Định Dạng Gói Hiệu Ứng ClipForge (CapFX Specification v1.0.0)

> **Tài liệu tham chiếu chuẩn cho tác giả gói và người vận hành kho.**  
> Định dạng gói hiệu ứng ClipForge (`.capfx`) hoàn toàn **khai báo (strictly declarative)**: chỉ chứa cấu hình dữ liệu JSON + mã đổ bóng GLSL ES 3.00 + tệp tài nguyên nhị phân tĩnh. **Tuyệt đối không thực thi JavaScript hoặc WebAssembly** từ các gói được phân phối.

---

## 1. Cấu Trúc Vỏ Bọc Container (.capfx)

Tệp `.capfx` là tệp lưu trữ nén chuẩn **PKZIP 2.0** với cấu trúc thư mục quy ước:

```text
my-effect-pack.capfx (ZIP PKZIP 2.0)
├── pack.json                     # Bản kê khai chính (Bắt buộc)
├── preview.webp                  # Ảnh bìa gói (WebP, ≤ 8KB, tỉ lệ 1:1 hoặc 16:9)
├── assets/                       # Thư mục chứa tài nguyên tĩnh
│   ├── lut/vintage_warm.cube     # Bảng màu 3D LUT (tùy chọn)
│   ├── lottie/star_burst.json    # Đồ họa động vector Lottie (tùy chọn)
│   ├── svg/badge_verified.svg    # Nhãn dán sticker SVG đã làm sạch (tùy chọn)
│   ├── fonts/Montserrat-Bold.ttf # Font chữ giấy phép mở OFL (tùy chọn)
│   └── audio/whoosh_cinematic.ogg# Âm thanh SFX WAV/OGG CC0 (tùy chọn)
```

### Giới hạn vật lý của tệp lưu trữ:
| Tiêu chí | Giới hạn tối đa | Mục đích |
| :--- | :--- | :--- |
| **Dung lượng toàn gói** | `≤ 50 MB` | Tránh nghẽn băng thông CDN & bộ nhớ trình duyệt |
| **Dung lượng tệp đơn lẻ** | `≤ 25 MB` | Ngăn chặn việc nhúng video thô hoặc LUT độ phân giải quá cao |
| **Số lượng tệp trong gói** | `≤ 100 tệp` | Giới hạn số lượng I/O khi giải nén |
| **Tỉ lệ nén (Compression Ratio)**| `≤ 100:1` | Phòng chống tấn công Zip Bomb (Decompression Bomb) |
| **Đường dẫn tệp (Paths)** | Tương đối, không dấu `/` đầu, không chứa `..` | Ngăn chặn Path Traversal |
| **Phần mở rộng cho phép** | `.json, .glsl, .frag, .vert, .cube, .svg, .ttf, .otf, .woff, .woff2, .wav, .ogg, .webp, .png, .jpg` | Danh sách trắng an toàn, cấm file thực thi |

---

## 2. Bản Kê Khai `pack.json`

Tệp `pack.json` nằm tại thư mục gốc của gói, được thẩm định nghiêm ngặt qua Zod schema:

```json
{
  "formatVersion": "1.0.0",
  "id": "official.glitch-pack",
  "version": "1.2.0",
  "name": {
    "vi": "Gói Glitch & Rung Lắc Điện Ảnh",
    "en": "Cinematic Glitch & Shake Pack"
  },
  "author": "ClipForge Core Team",
  "license": "MIT",
  "redistributable": true,
  "sourceUrl": "https://github.com/Mydoriy/fx-registry/tree/main/packs/official.glitch-pack",
  "createdAt": "2026-11-08T00:00:00.000Z",
  "items": [
    {
      "id": "rgb-shake",
      "kind": "effect",
      "paramSchema": {
        "intensity": {
          "type": "number",
          "label": { "vi": "Độ mạnh RGB", "en": "RGB Intensity" },
          "default": 1.0,
          "min": 0.0,
          "max": 2.0,
          "step": 0.05,
          "easing": "easeInOut"
        },
        "frequency": {
          "type": "number",
          "label": { "vi": "Tần số rung", "en": "Shake Frequency" },
          "default": 25.0,
          "min": 5.0,
          "max": 60.0
        }
      },
      "shader": {
        "language": "glsl300es",
        "fragmentBody": "float shift = (hash(uv, uSeed) * 0.02 - 0.01) * uParams.x;\nfloat r = texture(uTexA, uv + vec2(shift, 0.0)).r;\nfloat g = texture(uTexA, uv).g;\nfloat b = texture(uTexA, uv - vec2(shift, 0.0)).b;\nreturn vec4(r, g, b, texture(uTexA, uv).a);",
        "passes": 1
      },
      "tags": ["glitch", "rgb", "shake", "jitter"],
      "aliases": {
        "vi": ["giật", "nhiễu sóng", "rung màn hình", "tách màu"],
        "en": ["aberration", "rgb split", "screen shake", "displacement"]
      },
      "preview": {
        "thumb": "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=",
        "loopFrames": 30
      },
      "requires": {
        "webgl2": true
      },
      "cost": {
        "samplesPerPixel": 3,
        "passes": 1
      },
      "since": "1.0.0"
    }
  ],
  "assets": [
    {
      "path": "preview.webp",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "size": 3412
    }
  ],
  "signature": "ad6ecdd4b61cfd3fc6ed9ea26bdb58aa773d707ecda2bcb2ebb7c9e3d70167d0afdc8498a1bd6c9a6261f408d73b06435ec4a90235b3fd8da9ed46579669cd0b"
}
```

---

## 3. Không Gian Tên Định Danh (Namespacing)

Mỗi tài nguyên con trong gói được định danh toàn cầu theo quy tắc:
$$\text{specId} = \text{<packId>/<itemId>@<version>}$$

Ví dụ: `official.glitch-pack/rgb-shake@1.2.0`.
- `packId`: Mã định danh gói (chữ thường, số, dấu chấm, dấu gạch ngang).
- `itemId`: Mã tài nguyên trong gói (slug chữ thường và số).
- `version`: Phiên bản SemVer đầy đủ `x.y.z`.

---

## 4. 9 Loại Tài Nguyên Được Hỗ Trợ (`kind`)

| Loại (`kind`) | Mô tả chi tiết | Khối cấu hình bắt buộc |
| :--- | :--- | :--- |
| `effect` | Hiệu ứng hình ảnh video (GLSL shader hoặc 2D Canvas fallback) | `shader` hoặc `canvasFallback` |
| `transition` | Chuyển cảnh giữa 2 clip (`uTexA` và `uTexB`) | `shader` (sử dụng biến `uProgress`) |
| `filter` | Bảng màu, grading điện ảnh (LUT 3D `.cube` hoặc CSS Color Matrix) | `lutData` hoặc `cssFilter` |
| `animation` | Hoạt họa đường cong chuyển động Bezier cho clip | `animationCurve` |
| `textPreset` | Kiểu chữ nghệ thuật, bóng đổ, viền, hoạt họa vào/ra | `textPreset` |
| `sticker` | Nhãn dán hình họa vector SVG tĩnh hoặc hoạt họa | `svgData` hoặc tệp SVG trong `assets` |
| `sfx` | Hiệu ứng âm thanh procedural (Web Audio) hoặc tệp âm thanh WAV/OGG | `sfxSynthesis` hoặc tệp âm thanh trong `assets` |
| `captionStyle`| Phong cách hiển thị phụ đề karaoke / tự động (màu, font, viền, highlight) | `captionStyle` |
| `template` | Dự án mẫu với cấu trúc timeline, nhiều track và keyframe | `templateTracks` |

---

## 5. Quy Chuẩn Đổ Bóng GLSL ES 3.00 & Host Wrapper

Để đảm bảo tính nhất quán tuyệt đối **Preview = Export**, tác giả gói **chỉ viết phần thân hàm (`fragmentBody`)**. Hệ thống Host của ClipForge tự động bọc mã nguồn bên trong một wrapper cố định chuẩn hóa:

```glsl
#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

// 1. Uniforms Cố Định Do Host Cung Cấp:
uniform sampler2D uTexA;      // Frame video nguồn thứ nhất
uniform sampler2D uTexB;      // Frame video nguồn thứ hai (cho transition)
uniform float uProgress;     // Tiến trình hiệu ứng từ 0.0 đến 1.0
uniform float uTime;         // Thời gian tính theo giây
uniform vec2 uResolution;    // Độ phân giải khung hình (width, height)
uniform float uSeed;         // Seed PRNG tất định vĩnh viễn của clip
uniform vec4 uParams;        // Vector chứa 4 tham số người dùng nhanh

// 2. PRNG Tất Định (Preview = Export):
float hash(vec2 p, float s) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031 + s);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 3. Hàm Do Tác Giả Gói Viết:
vec4 effectMain(vec2 uv) {
  // === fragmentBody CỦA TÁC GIẢ BẮT ĐẦU TẠI ĐÂY ===
  ...
  return finalColor;
  // === fragmentBody CỦA TÁC GIẢ KẾT THÚC TẠI ĐÂY ===
}

void main() {
  fragColor = effectMain(vUv);
}
```

### Các quy tắc shader bắt buộc:
1. **CẤM `Math.random()` hoặc hàm ngẫu nhiên thời gian thực**: Mọi nhiễu hạt (noise/grain/glitch) bắt buộc phải tạo từ `hash(uv, uSeed)` để đảm bảo render lại 100 lần kết quả vẫn giống nhau từng pixel.
2. **CẤM `texture2D` hoặc `gl_FragColor`**: Sử dụng chuẩn GLSL 3.00 es: `texture(...)` và giá trị trả về của `effectMain`.
3. **CẤM vòng lặp `while` hoặc `do-while`**: Chỉ cho phép vòng lặp `for` với cận hằng số tĩnh $\le 32$.
4. **Giới hạn số lần lấy mẫu vân ảnh (Texture Samples)**: $\le 16$ lần lấy mẫu mỗi pixel.
5. **Giới hạn số passes**: $\le 3$ render passes.

---

## 6. Định Nghĩa Tham Số `paramSchema`

Mỗi tham số điều khiển trên bảng điều khiển giao diện (Inspector Panel) được định nghĩa theo schema:

```json
{
  "intensity": {
    "type": "number",
    "label": { "vi": "Độ nhòe", "en": "Blur Amount" },
    "default": 1.0,
    "min": 0.0,
    "max": 3.0,
    "step": 0.1,
    "easing": "linear"
  },
  "enableGlow": {
    "type": "boolean",
    "label": { "vi": "Bật ánh sáng phát quang", "en": "Enable Glow" },
    "default": true
  },
  "tintColor": {
    "type": "color",
    "label": { "vi": "Màu phủ", "en": "Tint Color" },
    "default": "#ff007f"
  }
}
```

---

## 7. Yêu Cầu Xem Trước (Preview Thumbnail)

- Thumbnail đại diện cho hiệu ứng phải là định dạng **WebP** hợp lệ.
- Dung lượng thumbnail **bắt buộc $\le 8\text{ KB}$ (8 KB / 8192 bytes)** để đảm bảo khi tải chỉ mục 1,000 hiệu ứng, dung lượng mạng nén Brotli chỉ dưới 300KB.
- Thuộc tính `loopFrames`: Số lượng frame đề xuất cho vòng lặp xem trước (mặc định 30–60 frames).

---

## 8. Giấy Phép Được Phép (SPDX License Whitelist)

Gói đăng ký vào Kho mở ClipForge bắt buộc phải mang một trong các giấy phép phần mềm mã nguồn mở chuẩn SPDX sau:
- `MIT`: Cho phép sử dụng, sửa đổi và phân phối tự do.
- `Apache-2.0`: Giấy phép mở có bảo vệ bằng sáng chế.
- `CC0-1.0`: Miền công cộng (Public Domain), không ràng buộc bản quyền.
- `BSD-2-Clause` / `BSD-3-Clause`: Giấy phép tự do kiểu BSD.
- `OFL-1.1`: Dành riêng cho các kiểu phông chữ (SIL Open Font License).
- `ISC`, `Unlicense`: Giấy phép tự do tối giản.
- `In-House`: Hiệu ứng do chính đội ngũ phát triển ClipForge phát triển.
- `Proprietary`: Gói độc quyền có bản quyền rõ ràng (chỉ dùng với `redistributable: false`).
