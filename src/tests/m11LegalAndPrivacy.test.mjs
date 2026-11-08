import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  packageProjectForExport,
} from '../utils/extensionRegistryManager.ts';

import {
  getTelemetryConsent,
  setTelemetryConsent,
  isTelemetryEnabled,
  trackEvent,
  sanitizeTelemetryData,
  trackExtensionInstallSuccess,
  trackExtensionInstallError,
  getStoredTelemetryEvents,
  clearStoredTelemetryEvents,
} from '../utils/telemetry.ts';

const rootDir = process.cwd();

// Mock localStorage for Node test runner
const mockStorage = new Map();
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: {
      getItem: (k) => mockStorage.get(k) ?? null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
      clear: () => mockStorage.clear(),
    },
  };
} else if (!globalThis.window.localStorage) {
  globalThis.window.localStorage = {
    getItem: (k) => mockStorage.get(k) ?? null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
  };
}

test('M11.1 - ASSETS_LICENSES.md auto-generated from registry index.json', () => {
  const assetsLicPath = path.join(rootDir, 'ASSETS_LICENSES.md');
  assert.ok(fs.existsSync(assetsLicPath), 'ASSETS_LICENSES.md must exist');

  const content = fs.readFileSync(assetsLicPath, 'utf8');
  assert.ok(
    content.includes('## 7. KHO HIỆU ỨNG MỞ RỘNG (EXTENSION REGISTRY PACKAGES & ITEMS)'),
    'Must contain Section 7 for Extension Registry'
  );

  // Check that registry starter packages are listed with license, author, and redistributable status
  assert.ok(content.includes('com.clipforge.fx.rgb_shake'), 'Must list com.clipforge.fx.rgb_shake');
  assert.ok(content.includes('com.clipforge.fx.motion_blur'), 'Must list com.clipforge.fx.motion_blur');
  assert.ok(content.includes('In-House'), 'Must list In-House license');
  assert.ok(content.includes('CC0'), 'Must list CC0 license');
  assert.ok(content.includes('Quyền Phân Phối Lại'), 'Must document redistribution column');
});

test('M11.2 - Non-redistributable items (redistributable=false) are NEVER bundled into .capproj', async () => {
  const dummyInstalled = [
    {
      id: 'com.clipforge.fx.open_effect',
      version: '1.0.0',
      name: 'Hiệu ứng Mã nguồn mở',
      kind: 'effect',
      trustLevel: 'community',
      license: 'MIT',
      spec: {
        id: 'com.clipforge.fx.open_effect',
        version: '1.0.0',
        name: 'Hiệu ứng Mã nguồn mở',
        kind: 'effect',
        author: 'Open Community',
        license: 'MIT',
        redistributable: true, // Allowed to embed
        shader: { language: 'glsl300es', fragmentBody: 'return vec4(1.0);' },
        paramSchema: {},
      },
      installedAt: Date.now(),
      updatedAt: Date.now(),
      lastUsedAt: Date.now(),
      sizeBytes: 1024,
      hash: 'open-hash',
    },
    {
      id: 'com.clipforge.fx.commercial_filter',
      version: '2.0.0',
      name: 'Bộ lọc màu thương mại',
      kind: 'filter',
      trustLevel: 'official',
      license: 'Proprietary',
      spec: {
        id: 'com.clipforge.fx.commercial_filter',
        version: '2.0.0',
        name: 'Bộ lọc màu thương mại',
        kind: 'filter',
        author: 'Studio Commercial Pro',
        license: 'Proprietary',
        redistributable: false, // FORBIDDEN to embed!
        shader: { language: 'glsl300es', fragmentBody: 'return vec4(0.5);' },
        paramSchema: {},
      },
      installedAt: Date.now(),
      updatedAt: Date.now(),
      lastUsedAt: Date.now(),
      sizeBytes: 50000,
      hash: 'commercial-hash',
    },
  ];

  const projectToExport = {
    title: 'Dự án bảo vệ bản quyền',
    tracksData: {
      clips: [
        {
          id: 'clip-1',
          dynamicEffectId: 'com.clipforge.fx.open_effect',
          dynamicEffectVersion: '1.0.0',
        },
        {
          id: 'clip-2',
          dynamicEffectId: 'com.clipforge.fx.commercial_filter',
          dynamicEffectVersion: '2.0.0',
        },
      ],
    },
  };

  const packaged = await packageProjectForExport(projectToExport, dummyInstalled);

  // 1. Open / redistributable effect MUST be embedded
  assert.ok(packaged.embeddedSpecs['com.clipforge.fx.open_effect'], 'Open effect must be embedded');
  assert.equal(packaged.embeddedSpecs['com.clipforge.fx.open_effect'].redistributable, true);

  // 2. Proprietary effect (redistributable: false) MUST NOT be embedded
  assert.equal(
    packaged.embeddedSpecs['com.clipforge.fx.commercial_filter'],
    undefined,
    'Non-redistributable effect must NEVER be embedded in project export'
  );

  // 3. Pinned reference must record requiresDownload: true
  assert.equal(
    packaged.pinnedAssets['com.clipforge.fx.commercial_filter'].requiresDownload,
    true,
    'Must require downloading separately'
  );
  assert.equal(
    packaged.pinnedAssets['com.clipforge.fx.commercial_filter'].redistributable,
    false
  );
});

test('M11.3 - Telemetry is OFF by default; Opt-in tracks ONLY anonymous public package ID & errorType', () => {
  // Reset localStorage mock
  clearStoredTelemetryEvents();
  setTelemetryConsent('denied');
  assert.equal(isTelemetryEnabled(), false, 'Telemetry must be disabled by default or when denied');

  // Attempt to track events while disabled
  trackExtensionInstallSuccess('official.glitch-pack', 120);
  trackExtensionInstallError('official.glitch-pack', 'ERR_GLSL_DISALLOWED_LOOP');

  let events = getStoredTelemetryEvents();
  assert.equal(events.length, 0, 'No events recorded when telemetry is disabled');

  // Explicit Opt-In
  setTelemetryConsent('granted');
  assert.equal(isTelemetryEnabled(), true);

  // Track valid extension install events
  trackExtensionInstallSuccess('official.glitch-pack', 150);
  trackExtensionInstallError('community.risky-fx', 'ERR_SANDBOX_TIMEOUT');

  events = getStoredTelemetryEvents();
  assert.equal(events.length, 2);

  // Verify event payload contains ONLY public packageId and duration/errorType
  const successEvt = events.find((e) => e.name === 'extension_install_success');
  assert.ok(successEvt);
  assert.equal(successEvt.data.packageId, 'official.glitch-pack');
  assert.equal(successEvt.data.durationMs, 150);

  const errorEvt = events.find((e) => e.name === 'extension_install_error');
  assert.ok(errorEvt);
  assert.equal(errorEvt.data.packageId, 'community.risky-fx');
  assert.equal(errorEvt.data.errorType, 'ERR_SANDBOX_TIMEOUT');

  // Verify Sanitizer DROPS search queries, prompts, and filenames
  const dirtyData = {
    packageId: 'official.glitch-pack',
    query: 'nhạc remix giật giật tiktok',
    search: 'glitch shake',
    searchTerm: 'secret search',
    prompt: 'tạo hiệu ứng cho video sinh nhật của tôi',
    filename: 'C:\\Users\\Admin\\Desktop\\video_rieng_tu.mp4',
    content: 'raw video binary content',
  };

  const sanitized = sanitizeTelemetryData(dirtyData);
  assert.equal(sanitized.packageId, 'official.glitch-pack');
  assert.equal(sanitized.query, undefined, 'Search query must be stripped');
  assert.equal(sanitized.search, undefined, 'Search term must be stripped');
  assert.equal(sanitized.searchTerm, undefined, 'SearchTerm must be stripped');
  assert.equal(sanitized.prompt, undefined, 'Prompt must be stripped');
  assert.equal(sanitized.filename, undefined, 'Filename must be stripped');
  assert.equal(sanitized.content, undefined, 'Content must be stripped');

  // Reset consent back to denied after test
  setTelemetryConsent('denied');
  clearStoredTelemetryEvents();
});

test('M11.4 - Privacy Policy: Explains local search, CDN metadata, Offline-Only mode & Self-hosting', () => {
  const privacyPath = path.join(rootDir, 'src', 'pages', 'Privacy.tsx');
  assert.ok(fs.existsSync(privacyPath), 'Privacy.tsx must exist');

  const content = fs.readFileSync(privacyPath, 'utf8');

  // Check required disclosures
  assert.ok(
    content.includes('Extension Store Privacy') || content.includes('Kho Hiệu ứng Mở rộng'),
    'Must contain Extension Store Privacy section'
  );
  assert.ok(
    content.includes('Zero-Query Leak') || content.includes('Tìm kiếm 100% Cục bộ'),
    'Must disclose 100% local in-memory search'
  );
  assert.ok(
    content.includes('địa chỉ IP') && content.includes('ID của gói'),
    'Must disclose that CDN only sees IP and requested package ID URL'
  );
  assert.ok(
    content.includes('Chế độ Chỉ offline') || content.includes('Offline-Only'),
    'Must explain Offline-Only mode option'
  );
  assert.ok(
    content.includes('Tự Lưu Trữ') || content.includes('Self-Hosted'),
    'Must explain Self-Hosted custom registry option'
  );
  assert.ok(
    content.includes('Không Telemetry mặc định'),
    'Must disclose that telemetry is strictly off by default'
  );
});

test('M11.5 - UI Transparency: Item cards display license, author/source & redistributable badge', () => {
  const modalPath = path.join(rootDir, 'src', 'components', 'ExtensionLibraryModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'ExtensionLibraryModal.tsx must exist');

  const content = fs.readFileSync(modalPath, 'utf8');

  // Item details check
  assert.ok(content.includes('pkg.license'), 'Item card must render pkg.license');
  assert.ok(content.includes('pkg.spec.author'), 'Item card must render author/source');
  assert.ok(content.includes('Tự do phân phối'), 'Item card must render redistributable badge');
  assert.ok(content.includes('Không phân phối lại'), 'Item card must render non-redistributable badge');
});
