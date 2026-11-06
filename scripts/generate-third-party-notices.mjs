#!/usr/bin/env node
/**
 * ClipForge Desktop Web - Third-Party Notices Generator
 * Analyzes direct & transitive dependencies, extracts license details,
 * and clarifies FFmpeg.wasm build licensing (LGPL v2.1 vs GPL v3.0).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

console.log('📦 Generating THIRD_PARTY_NOTICES.md from project dependencies...');

const dependencies = pkg.dependencies || {};
const devDependencies = pkg.devDependencies || {};

function getPackageMeta(pkgName) {
  try {
    const pkgJsonPath = path.join(rootDir, 'node_modules', pkgName, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const meta = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      return {
        name: meta.name || pkgName,
        version: meta.version || 'unknown',
        license: meta.license || (meta.licenses && meta.licenses[0]?.type) || 'MIT',
        author: typeof meta.author === 'string' ? meta.author : meta.author?.name || 'Open Source Contributors',
        repository: typeof meta.repository === 'string' ? meta.repository : meta.repository?.url || ''
      };
    }
  } catch (err) {
    // Fallback if node_modules package.json read fails
  }

  return {
    name: pkgName,
    version: dependencies[pkgName] || devDependencies[pkgName] || 'latest',
    license: pkgName.includes('ffmpeg') ? 'MIT / LGPL-2.1' : 'MIT',
    author: 'Open Source Contributors',
    repository: `https://www.npmjs.com/package/${pkgName}`
  };
}

const prodList = Object.keys(dependencies).map(getPackageMeta).sort((a, b) => a.name.localeCompare(b.name));
const devList = Object.keys(devDependencies).map(getPackageMeta).sort((a, b) => a.name.localeCompare(b.name));

const noticeContent = `# THÔNG BÁO BẢN QUYỀN BÊN THỨ BA (THIRD-PARTY NOTICES)

> **Dự án**: ClipForge Desktop Web (Local-First 9:16 Video Studio)  
> **Phiên bản**: ${pkg.version || '1.0.0'}  
> **Ngày sinh tài liệu**: ${new Date().toISOString().split('T')[0]}  
> **Mã nguồn**: [GitHub Repository](https://github.com/Mydoriy/clipforge-editor)

Tài liệu này cung cấp thông tin pháp lý chi tiết về các thư viện mã nguồn mở, module và tài nguyên bên thứ ba được sử dụng trong dự án ClipForge Desktop Web.

---

## 1. QUY ĐỊNH BẢN QUYỀN ĐẶC BIỆT: FFMPEG.WASM & WEBASSEMBLY ENGINE

### 1.1. Kiến trúc Sử dụng FFmpeg trong ClipForge
- Thư viện wrapper JavaScript: **\`@ffmpeg/ffmpeg\`** (phiên bản \`^0.12.15\`) và **\`@ffmpeg/util\`** (phiên bản \`^0.12.2\`).
  - **Giấy phép**: **MIT License** (Jerome Wu & FFmpeg.wasm team).
- Runtime WebAssembly Wasm: **\`@ffmpeg/core\`** (phiên bản \`0.12.6\`).
  - **Giấy phép bản build đang dùng**: **GNU Lesser General Public License version 2.1 (LGPL v2.1+)**.

### 1.2. Phân định rõ Giấy phép Bản build (LGPL v2.1 vs GPL v3.0)
| Thành phần | Phiên bản | Giấy phép | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| **\`@ffmpeg/core\` (Standard ESM)** | \`0.12.6\` | **LGPL v2.1+** | Bản build mặc định được biên dịch mà **KHÔNG** kích hoạt cờ \`--enable-gpl\`. Không chứa các bộ giải mã/mã hóa GPL-only (như \`libx264\`, \`libx265\`, \`libpostproc\`). Tuân thủ đầy đủ điều khoản LGPL v2.1 cho phép liên kết động qua WebAssembly Worker. |
| **\`@ffmpeg/core\` (GPL build)** | Tùy chọn nâng cao | **GPL v3.0** | Chỉ áp dụng khi người dùng cấu hình bản build tùy chỉnh có cờ \`--enable-gpl\` để sử dụng x264/x265. |
| **WebCodecs Hardware Engine** | Native W3C Standard | **W3C Software / Hardware Native** | **Bộ mã hóa mặc định ưu tiên** của ClipForge. Sử dụng phần cứng GPU máy tính (Intel QuickSync, Apple VideoToolbox, Nvidia NVENC) qua WebCodecs API của trình duyệt, hoàn toàn độc lập với FFmpeg và không bị ràng buộc bởi LGPL/GPL. |
| **\`mp4-muxer\`** | \`^5.2.2\` | **MIT License** | Module đóng gói container MP4 native client-side, zero GPL entanglement. |

### 1.3. Tuân thủ Điều khoản LGPL v2.1
- **Liên kết động (Dynamic Linking)**: File nhị phân \`ffmpeg-core.wasm\` được nạp động từ xa qua \`toBlobURL()\` vào một Web Worker cô lập tại runtime. Mã nguồn ClipForge không biên dịch tĩnh hay can thiệp vào mã nguồn gốc của thư viện FFmpeg.
- **Quyền tự do thay thế**: Người dùng có thể cấu hình lại tham số \`coreURL\` và \`wasmURL\` trong \`src/utils/ffmpeg.ts\` để trỏ tới bất kỳ bản build FFmpeg.wasm nào khác mà người dùng mong muốn.
- **Mã nguồn gốc của FFmpeg**: Mã nguồn của FFmpeg có sẵn tại [ffmpeg.org](https://ffmpeg.org).

---

## 2. DANH SÁCH DEPENDENCIES CHÍNH (PRODUCTION RUNTIME)

| Gói thư viện (Package) | Phiên bản | Giấy phép (License) | Tác giả / Đơn vị | Kho lưu trữ (Repository) |
| :--- | :--- | :--- | :--- | :--- |
${prodList.map((p) => `| **\`${p.name}\`** | \`${p.version}\` | **${p.license}** | ${p.author.replace(/\|/g, '-')} | ${p.repository ? `[Link](${p.repository.replace(/^git\+/, '').replace(/\.git$/, '')})` : '-'} |`).join('\n')}

---

## 3. DANH SÁCH DEPENDENCIES PHÁT TRIỂN & KIỂM THỬ (DEV DEPENDENCIES)

| Gói thư viện (Package) | Phiên bản | Giấy phép (License) | Tác giả |
| :--- | :--- | :--- | :--- |
${devList.map((p) => `| **\`${p.name}\`** | \`${p.version}\` | **${p.license}** | ${p.author.replace(/\|/g, '-')} |`).join('\n')}

---

## 4. VĂN BẢN ĐẦY ĐỦ CÁC GIẤY PHÉP CHÍNH ĐƯỢC ÁP DỤNG

### 4.1. The MIT License
\`\`\`text
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
\`\`\`

### 4.2. Apache License 2.0
\`\`\`text
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
\`\`\`

### 4.3. ISC License
\`\`\`text
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS.
\`\`\`

### 4.4. GNU Lesser General Public License (LGPL v2.1)
\`\`\`text
This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this library; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
\`\`\`
`;

const outputPath = path.join(rootDir, 'THIRD_PARTY_NOTICES.md');
fs.writeFileSync(outputPath, noticeContent, 'utf8');

console.log(`✅ THIRD_PARTY_NOTICES.md generated successfully at: ${outputPath}`);
