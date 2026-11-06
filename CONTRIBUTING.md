# HƯỚNG DẪN ĐÓNG GÓP MÃ NGUỒN (CONTRIBUTING GUIDE)

Chào mừng bạn đến với dự án **ClipForge Desktop Web**! Chúng tôi hoan nghênh mọi đóng góp từ cộng đồng nhằm xây dựng một trình biên tập video ngắn 9:16 chuyên nghiệp, 100% Client-Side và hoàn toàn miễn phí.

---

## 1. NGUYÊN TẮC PHÁT TRIỂN CỐT LÕI (DEVELOPMENT PHILOSOPHY)

Dự án áp dụng nguyên lý **"Ponytail - Lazy Senior Dev Mode"**:
1. **Đoạn mã tốt nhất là đoạn mã không phải viết**: Giải quyết triệt để vấn đề với ít dòng mã mới nhất có thể. Tận dụng các helper, hook, dịch vụ có sẵn trong codebase trước khi viết mới.
2. **Không trừu tượng hóa sớm (No Over-engineering)**: Không thêm wrapper, cấu hình thừa hay boilerplate cho những trường hợp tương lai chưa xảy ra.
3. **Bất biến trong cấu trúc lõi**: Không bao giờ cắt giảm khâu xác thực dữ liệu tại biên tin cậy (Zod schema), cơ chế xử lý lỗi chống mất mát dữ liệu của người dùng, hoặc các tiêu chuẩn accessibility (a11y).
4. **Hàm thuần túy cho Timeline**: Toàn bộ logic can thiệp thời gian clip (split, trim, snap, ripple, undo/redo) bắt buộc phải là hàm thuần túy (pure functions) để dễ dàng kiểm thử tự động.

---

## 2. QUY TRÌNH THIẾT LẬP MÔI TRƯỜNG PHÁT TRIỂN

```bash
# 1. Clone repository
git clone https://github.com/Mydoriy/clipforge-editor.git
cd clipforge-editor

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Tạo file cấu hình môi trường từ mẫu
cp .env.example .env

# 4. Khởi chạy dev server với Vite
npm run dev
```

---

## 3. QUY ƯỚC ĐẶT TÊN NHÁNH & COMMIT (CONVENTIONAL COMMITS)

Dự án tuân thủ nghiêm ngặt chuẩn **Conventional Commits**:

### 3.1. Cấu trúc commit:
```text
<type>(<scope>): <mô tả ngắn gọn bằng chữ thường, thể mệnh lệnh>

[thân bài giải thích lý do, ngữ cảnh nếu cần]
```

### 3.2. Các `type` được chấp nhận:
- `feat`: Tính năng mới (ví dụ: `feat(timeline): add multi-track snapping threshold`).
- `fix`: Sửa lỗi (ví dụ: `fix(export): resolve memory leak when closing video frame`).
- `perf`: Cải thiện hiệu năng (ví dụ: `perf(canvas): memoize offscreen composite layers`).
- `test`: Thêm hoặc cập nhật test suites (ví dụ: `test(w9): verify asset licenses completeness`).
- `docs`: Cập nhật tài liệu (ví dụ: `docs: update user guide with new shortcuts`).
- `chore`: Tác vụ bảo trì phụ thuộc, build config, CI script (ví dụ: `chore: update dependencies`).

---

## 4. BỘ KIỂM TRA BẮT BUỘC TRƯỚC KHI COMMIT (PRE-COMMIT CHECKS)

Dự án đã cấu hình **Husky Pre-commit hook** để tự động kiểm tra mã nguồn trước mỗi lần commit. Bạn có thể tự chạy kiểm tra thủ công bằng chuỗi lệnh sau:

```bash
# 1. Chạy toàn bộ test suites (Node native test runner)
npm test

# 2. Chạy test logic thuần túy (Vitest)
npm run test:vitest

# 3. Kiểm tra tính đồng bộ 100% của từ điển đa ngôn ngữ (i18n Parity)
npm run check:i18n

# 4. Kiểm tra cú pháp và định dạng mã nguồn (ESLint)
npm run lint

# 5. Kiểm tra tính toàn vẹn kiểu dữ liệu (TypeScript Strict)
npm run typecheck

# 6. Kiểm tra đóng gói phiên bản sản xuất (Production Build)
npm run build
```

> ⚠️ **Quy tắc bắt buộc**: Không được sử dụng cờ `--no-verify` để bỏ qua husky hook khi commit mã nguồn vào nhánh chính. Mọi Pull Request vi phạm quy chuẩn test sẽ không được xem xét merge.

---

## 5. QUY TRÌNH TẠO PULL REQUEST (PR PROCESS)

1. Tạo một nhánh mới từ nhánh `main`: `git checkout -b feat/ten-tinh-nang-moi`.
2. Thực hiện các chỉnh sửa tối giản, mạch lạc.
3. Chạy toàn bộ 6 bước kiểm tra ở mục 4 để đảm bảo không phát sinh lỗi hồi quy (regression).
4. Đẩy nhánh lên GitHub: `git push origin feat/ten-tinh-nang-moi`.
5. Tạo Pull Request trên GitHub với mô tả chi tiết:
   - Mục đích của thay đổi.
   - Các file liên quan được chỉnh sửa.
   - Bằng chứng test đã pass (kết quả chạy lệnh test).
   - Những nội dung cố tình bỏ qua (nếu có) và rủi ro người dùng cần biết.

Cảm ơn sự đóng góp quý báu của bạn cho sự phát triển của ClipForge Desktop Web!

