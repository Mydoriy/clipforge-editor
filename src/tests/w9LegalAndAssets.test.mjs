import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('W9-1: Logo, Brand & Non-Affiliation Disclaimer', () => {
  const logoFile = fs.readFileSync(path.join(rootDir, 'src/components/Logo.tsx'), 'utf8');
  assert.ok(logoFile.includes('Clip'), 'Logo must contain Clip brand prefix');
  assert.ok(logoFile.includes('Forge'), 'Logo must contain Forge brand suffix');
  assert.ok(
    logoFile.includes('Không liên kết với CapCut hay ByteDance') ||
    logoFile.includes('không liên kết với CapCut hay ByteDance'),
    'Logo tooltip must contain non-affiliation disclaimer'
  );

  const modalsFile = fs.readFileSync(path.join(rootDir, 'src/components/Modals.tsx'), 'utf8');
  assert.ok(
    modalsFile.includes('Không liên kết với CapCut hay ByteDance') ||
    modalsFile.includes('không liên kết với CapCut hay ByteDance'),
    'About modal must clearly state non-affiliation with CapCut or ByteDance'
  );

  const footerFile = fs.readFileSync(path.join(rootDir, 'src/components/Footer.tsx'), 'utf8');
  assert.ok(
    footerFile.includes('không liên kết với CapCut hay ByteDance') ||
    footerFile.includes('Không liên kết với CapCut hay ByteDance'),
    'Footer must clearly state non-affiliation with CapCut or ByteDance'
  );
});

test('W9-2: ASSETS_LICENSES.md completeness (CC0 / MIT / OFL / In-House)', () => {
  const assetsLicPath = path.join(rootDir, 'ASSETS_LICENSES.md');
  assert.ok(fs.existsSync(assetsLicPath), 'ASSETS_LICENSES.md must exist in root directory');

  const content = fs.readFileSync(assetsLicPath, 'utf8');
  assert.ok(content.length > 500, 'ASSETS_LICENSES.md must have comprehensive content');

  // Check required asset categories
  assert.ok(content.includes('SIL Open Font License') || content.includes('OFL'), 'Must specify font OFL license');
  assert.ok(content.includes('CC0') || content.includes('Creative Commons Zero'), 'Must specify CC0 license');
  assert.ok(content.includes('In-House') || content.includes('Tự tạo'), 'Must specify in-house / self-created assets');
  assert.ok(content.includes('3D LUT'), 'Must document 3D LUT matrix origin');
  assert.ok(content.includes('Lottie') || content.includes('Animation'), 'Must document vector animation licenses');
  assert.ok(content.includes('22'), 'Must document all 22 built-in video templates');
});

test('W9-3: THIRD_PARTY_NOTICES.md generation and FFmpeg.wasm LGPL v2.1 vs GPL status', () => {
  const noticesPath = path.join(rootDir, 'THIRD_PARTY_NOTICES.md');
  assert.ok(fs.existsSync(noticesPath), 'THIRD_PARTY_NOTICES.md must exist');

  const content = fs.readFileSync(noticesPath, 'utf8');
  assert.ok(content.includes('LGPL v2.1') || content.includes('LGPL'), 'Must specify FFmpeg.wasm core LGPL v2.1 build license');
  assert.ok(content.includes('GPL'), 'Must distinguish between LGPL v2.1 and GPL v3.0 builds');
  assert.ok(content.includes('@ffmpeg/core'), 'Must explicitly mention @ffmpeg/core runtime');
  assert.ok(content.includes('WebCodecs'), 'Must mention WebCodecs native hardware encoder');
  assert.ok(content.includes('MIT License'), 'Must include MIT license terms');
});

test('W9-4: Terms of Service & Privacy Policy integrity and user responsibility', () => {
  const privacyPath = path.join(rootDir, 'src/pages/Privacy.tsx');
  const content = fs.readFileSync(privacyPath, 'utf8');

  assert.ok(content.includes('Điều khoản Dịch vụ') || content.includes('Terms of Service'), 'Must have Terms of Service section');
  assert.ok(content.includes('Chính sách Bảo mật') || content.includes('Privacy Policy'), 'Must have Privacy Policy section');
  assert.ok(content.includes('Bản quyền Thương hiệu') || content.includes('Trademark'), 'Must contain trademark disclaimer');
  assert.ok(content.includes('Bản quyền Nội dung') || content.includes('Copyright'), 'Must state user content copyright responsibility');
  assert.ok(content.includes('Local-First'), 'Must explain local-first client-side data persistence');
});

test('W9-5: Copyright warning banner on media import', () => {
  const panelPath = path.join(rootDir, 'src/components/CategoryPanel.tsx');
  const content = fs.readFileSync(panelPath, 'utf8');

  assert.ok(
    content.includes('Cảnh báo bản quyền') || content.includes('Lưu ý bản quyền') || content.includes('bản quyền của hình ảnh, video'),
    'CategoryPanel must contain visible copyright warning banner for media uploads'
  );
  assert.ok(
    content.includes('100% cục bộ') || content.includes('Client-Side') || content.includes('trên thiết bị'),
    'Copyright notice must explain client-side local processing'
  );
});

