#!/usr/bin/env node

/**
 * ClipForge - Assets & Registry Licenses Generator (M11)
 * ============================================================================
 * Automatically parses public/registry/index.json and regenerates Section 7
 * of ASSETS_LICENSES.md with package names, kinds, authors, SPDX licenses,
 * and redistributable permissions.
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const indexPath = path.join(rootDir, 'public', 'registry', 'index.json');
const assetsLicensesPath = path.join(rootDir, 'ASSETS_LICENSES.md');

console.log('📜 Regenerating ASSETS_LICENSES.md from registry index.json...');

if (!fs.existsSync(indexPath)) {
  console.error(`❌ Không tìm thấy index.json tại: ${indexPath}`);
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const packages = index.packages || [];

let currentContent = '';
if (fs.existsSync(assetsLicensesPath)) {
  currentContent = fs.readFileSync(assetsLicensesPath, 'utf8');
}

// Strip existing Section 7 if present
const sectionMarker = '## 7. KHO HIỆU ỨNG MỞ RỘNG (EXTENSION REGISTRY PACKAGES & ITEMS)';
if (currentContent.includes(sectionMarker)) {
  currentContent = currentContent.split(sectionMarker)[0].trimEnd();
}

// Build Section 7 markdown
let section7 = `\n\n---\n\n${sectionMarker}\n\n`;
section7 += `Toàn bộ ${packages.length} gói hiệu ứng mở rộng trong Kho tài nguyên ClipForge được kiểm duyệt chặt chẽ, xác thực chữ ký số Ed25519 và chỉ phân phối khi tuân thủ danh sách giấy phép SPDX hợp lệ:\n\n`;
section7 += `| ID Gói | Tên Hiệu Ứng | Loại | Tác Giả / Nguồn | Giấy Phép (SPDX) | Quyền Phân Phối Lại (.capproj) |\n`;
section7 += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

for (const pkg of packages) {
  const isRedistributable = pkg.spec?.redistributable !== false;
  const redistributableText = isRedistributable
    ? '✅ Có (Nhúng trực tiếp)'
    : '🔒 Không (Chỉ lưu tham chiếu)';
  const author = pkg.spec?.author || 'ClipForge Studio';
  const name = pkg.name || pkg.id;
  const kind = pkg.kind || pkg.spec?.kind || 'effect';
  const license = pkg.license || 'In-House';

  section7 += `| \`${pkg.id}\` | **${name}** | \`${kind}\` | ${author} | **${license}** | ${redistributableText} |\n`;
}

section7 += `\n> **Chính sách phân phối lại (Redistribution Policy)**: Các gói có \`redistributable: false\` tuyệt đối không được nhúng mã nguồn hoặc binary vào tệp dự án chia sẻ \`.capproj\`. Thay vào đó, tệp \`.capproj\` chỉ ghi nhận tham chiếu tải về an toàn \`{ packId, itemId, version, sha256, requiresDownload: true }\` để bảo vệ bản quyền của tác giả.\n`;

const finalDoc = (currentContent + section7).trim() + '\n';
fs.writeFileSync(assetsLicensesPath, finalDoc, 'utf8');

console.log(`✅ Đã tự sinh ASSETS_LICENSES.md thành công (${packages.length} gói hiệu ứng được lập chỉ mục)!`);

