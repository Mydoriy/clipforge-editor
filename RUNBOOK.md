# SỔ TAY VẬN HÀNH & XỬ LÝ SỰ CỐ (SRE & OPERATIONS RUNBOOK)

> **Ứng dụng**: ClipForge Desktop Web  
> **Phiên bản**: v1.0.0  
> **Production URL**: [https://clipforge-editor.vercel.app](https://clipforge-editor.vercel.app)  
> **Đối tượng áp dụng**: Release Engineers, QA Leads, DevOps & Technical Support

---

## 1. QUY TRÌNH TRIỂN KHAI PHIÊN BẢN MỚI (DEPLOYMENT RUNBOOK)

### 1.1. Bước 1: Kiểm thử chất lượng toàn diện trước khi phát hành
Chạy toàn bộ 6 bài kiểm tra bắt buộc trên máy local hoặc CI:
```bash
# 1. Chạy 45 test suites cốt lõi (Node native test runner)
npm test

# 2. Chạy test logic thuần túy (Vitest)
npm run test:vitest

# 3. Kiểm tra tính đồng bộ 100% của từ điển i18n
npm run check:i18n

# 4. Kiểm tra linting và typecheck
npm run lint
npm run typecheck

# 5. Đóng gói bản build kiểm tra kích thước bundle
npm run build
```

### 1.2. Bước 2: Commit và đẩy mã nguồn lên nhánh chính
```bash
git add .
git commit -m "feat(release): release v1.0.0 with full production verification"
git push origin main
```

### 1.3. Bước 3: Triển khai lên Vercel Production
```bash
npx vercel --prod --yes
```

### 1.4. Bước 4: Xác minh Tiêu đề Bảo mật & Khả năng Vận hành của Production
Sử dụng `curl` để kiểm tra các tiêu đề bắt buộc cho SharedArrayBuffer và CSP:
```bash
curl.exe -I https://clipforge-editor.vercel.app
```
**Danh sách kiểm tra tiêu đề bắt buộc (Checklist)**:
- [x] `HTTP/1.1 200 OK`
- [x] `Cross-Origin-Opener-Policy: same-origin`
- [x] `Cross-Origin-Embedder-Policy: credentialless`
- [x] `Content-Security-Policy`: có chứa `'wasm-unsafe-eval'` (cho FFmpeg/ONNX Wasm).
- [x] `X-Frame-Options: DENY`

---

## 2. QUY TRÌNH ROLLBACK KHẨN CẤP (EMERGENCY ROLLBACK PROTOCOL)

Khi phiên bản mới phát sinh lỗi nghiêm trọng ảnh hưởng đến người dùng trên Production (P0):

### Cách 1: Rollback tức thì qua Vercel CLI (Khuyên dùng - Dưới 30 giây)
1. Liệt kê các bản deploy gần nhất:
   ```bash
   npx vercel ls
   ```
2. Thực hiện rollback về bản deploy ổn định trước đó:
   ```bash
   npx vercel rollback <deployment-url-hoac-id>
   ```
   *Ví dụ: `npx vercel rollback clipforge-editor-m147jkr2u-zm-usic.vercel.app`*

### Cách 2: Rollback qua Git Revert
Nếu cần đồng bộ lại mã nguồn trên Git repository:
```bash
# 1. Revert commit lỗi gần nhất
git revert HEAD --no-edit

# 2. Đẩy lên nhánh main
git push origin main

# 3. Triển khai bản build an toàn lên Production
npx vercel --prod --yes
```

### 2.3. Bằng chứng kiểm thử Rollback thực tế (Rollback Drill Verification)
- **Ngày diễn tập thực tế**: 07/11/2026.
- **Kịch bản**: Triển khai bản build giả định lỗi $\rightarrow$ Thực thi lệnh rollback về deployment ID an toàn qua `npx vercel rollback`.
- **Thời gian hoàn tất chuyển mạch Edge**: 21 giây.
- **Kết quả xác minh**: Lưu lượng người dùng được định tuyến về deployment ổn định ngay lập tức; header COOP/COEP không bị gián đoạn; dữ liệu IndexedDB của người dùng client hoàn toàn nguyên vẹn.

---

## 3. CÁCH ĐỌC & PHÂN TÍCH THÔNG TIN CHẨN ĐOÁN (SYSTEM DIAGNOSTICS INTERPRETER)

Khi người dùng báo lỗi qua modal **"Báo lỗi & Góp ý"** hoặc bấm **"Sao chép thông tin chẩn đoán"**, hệ thống sinh ra một khối dữ liệu kỹ thuật chuẩn JSON. Dưới đây là bảng hướng dẫn giải mã cho bộ phận hỗ trợ kỹ thuật:

### 3.1. Cấu trúc mẫu dữ liệu chẩn đoán
```json
{
  "appVersion": "1.0.0",
  "buildDate": "2026.11",
  "timestamp": "2026-11-06T16:30:00.000Z",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ... Chrome/130.0.0.0",
  "screen": { "width": 1920, "height": 1080, "pixelRatio": 1 },
  "systemCheck": {
    "webCodecs": true,
    "webGL2": true,
    "webGPU": false,
    "fileSystemAccess": true,
    "opfs": true,
    "sharedArrayBuffer": true,
    "mediaRecorder": true,
    "deviceMemoryGB": 8,
    "hardwareConcurrency": 8,
    "storageEstimate": { "usageMB": 420, "quotaMB": 50000, "percent": 0.84 }
  },
  "recentLogs": [
    { "type": "info", "msg": "Initialized Dexie IndexedDB v2 successfully" }
  ]
}
```

### 3.2. Ma trận phân tích nguyên nhân gốc (Root Cause Analysis Matrix)

| Trường thông tin | Giá trị cảnh báo | Nguyên nhân gốc (Root Cause) | Giải pháp xử lý (Actionable Fix) |
| :--- | :--- | :--- | :--- |
| `sharedArrayBuffer` | `false` | Tiêu đề COOP/COEP bị chặn (thường do truy cập qua iframe lồng, extension chặn header, hoặc mạng nội bộ proxy rewrite header). | Hướng dẫn người dùng mở web trực tiếp trong tab độc lập hoặc tắt extension can thiệp tiêu đề mạng. |
| `webCodecs` | `false` | Trình duyệt cũ hoặc người dùng đã tắt **Hardware Acceleration** trong cài đặt trình duyệt. | Yêu cầu người dùng bật lại: `chrome://settings/system` $\rightarrow$ Bật *"Use graphics acceleration when available"* và khởi động lại trình duyệt. |
| `deviceMemoryGB` | `< 4` | Thiết bị người dùng RAM thấp ($\le 4$GB), dễ gặp lỗi tràn bộ nhớ khi decode video 4K/60fps. | Hướng dẫn người dùng bật **Proxy Mode** trong Cài đặt để ứng dụng tự động giảm độ phân giải preview xuống 480p mượt mà. |
| `storageEstimate.percent` | `> 80%` | Bộ nhớ đệm IndexedDB hoặc OPFS của trình duyệt sắp đầy hạn mức (`QuotaExceededError`). | Hướng dẫn người dùng vào **Quản lý lưu trữ (Cloud Storage)** trên thanh sidebar để dọn dẹp cache thumbnail/waveform hoặc xuất file `.capproj` sao lưu rồi dọn Thùng rác. |
| `fileSystemAccess` | `false` | Người dùng đang dùng Firefox hoặc Safari (chưa hỗ trợ W3C File System Access API). | Hệ thống tự động kích hoạt fallback cơ chế nạp file qua thẻ `<input type="file">` và tải file thành phẩm về qua download link truyền thống. Khuyên dùng Chrome/Edge để có trải nghiệm streaming tốt nhất. |

---

## 4. HỆ THỐNG GIÁM SÁT UPTIME & CẢNH BÁO DEPLOY LỖI (UPTIME & DEPLOY MONITORING)

### 4.1. Cấu hình Uptime Monitor
Hệ thống sử dụng các bộ giám sát độc lập (Better Uptime / Checkly / UptimeRobot) để kiểm tra tính sẵn sàng của Production 24/7:
- **Primary Endpoint**: `https://clipforge-editor.vercel.app/`
- **Lightweight Heartbeat Endpoint**: `https://clipforge-editor.vercel.app/robots.txt`
- **Tần suất kiểm tra (Interval)**: 60 giây / lần.
- **Tiêu chí phản hồi hợp lệ (Health Criteria)**:
  - Mã trạng thái HTTP: `200 OK`.
  - Tiêu đề bảo mật bắt buộc: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`.
  - Độ trễ phản hồi (Response Latency): p95 $\le 1200$ms.

### 4.2. Kênh cảnh báo tức thì (Alerting Channels)
- **Discord / Slack Webhook**: Thông báo ngay lập tức khi phát hiện 2 lần kiểm tra liên tiếp thất bại (`DOWN`).
- **Email khẩn cấp**: Gửi tới Release Team (`devops@clipforge.local`).
- **Deploy Failure Alerts**: Vercel Webhook tích hợp với GitHub Actions CI; khi trạng thái bản build là `ERROR` hoặc `CANCELED`, hệ thống chặn việc chuyển giao Production và gửi thông báo lỗi kèm link build logs.

---

## 5. LỊCH TRÌNH BẢO TRÌ ĐỊNH KỲ HẰNG THÁNG (MONTHLY MAINTENANCE SCHEDULE)

Dự án áp dụng quy trình kiểm tra bảo trì định kỳ vào **thứ Hai đầu tiên của mỗi tháng**:

| Tuần trong tháng | Hạng mục thực hiện | Công cụ / Lệnh kiểm tra | Người phụ trách |
| :--- | :--- | :--- | :--- |
| **Tuần 1** | Cập nhật Dependency (Minor & Patch) | `Dependabot` tự động mở PR; chạy `npm test && npm run build` để kiểm chứng tương thích. | Core Dev |
| **Tuần 2** | Quét lỗ hổng bảo mật & CVE | Chạy `npm audit --omit=dev --audit-level=high` và rà soát các gói phụ thuộc. | Security Lead |
| **Tuần 3** | Kiểm tra thay đổi API trình duyệt | Rà soát Chromium, Firefox, WebKit release notes về WebCodecs, WebGL2, OPFS, Web Locks. | Engine Dev |
| **Tuần 4** | Kiểm tra lại giấy phép (License Compliance) | Chạy `npm run generate:licenses` và kiểm tra tài nguyên âm thanh/font/mẫu mới. | Legal / Lead |

### Lệnh thực thi kiểm tra bảo trì nhanh:
```bash
npm run maintenance
```
Lệnh trên sẽ tự động chạy toàn bộ 4 bước kiểm tra trên và xuất bảng tổng kết trạng thái hệ thống.


