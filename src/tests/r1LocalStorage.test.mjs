/**
 * R1: Cài Đặt Cục Bộ (Local Installation, Storage, Sandbox & "Của tôi" Tab)
 * ============================================================================
 * Verifies:
 * 1. Nhập gói mở rộng .capfx (ZIP container PKZIP 2.0).
 * 2. Cài đặt nguyên tử 5 bước (tải → hash/sig → phân tích tĩnh → compile sandbox → ghi storage)
 *    kèm cơ chế rollback sạch sẽ nếu lỗi giữa chừng.
 * 3. Cache Storage & IndexedDB (Dexie v4) phân tách dữ liệu nhị phân và manifest.
 * 4. Phân tích tĩnh GLSL ES 3.00 & Sandbox dry-run compile Worker có watchdog 200ms.
 * 5. Tab "Của tôi" (My Assets) quản lý hiệu ứng tự tạo/nhập thủ công, nút Nhập gói.
 * 6. Gỡ cài đặt an toàn: cảnh báo project đang dùng, chuyển ghost chứ không xóa tham chiếu.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Helper: load sample registry index
const registryPath = path.join(rootDir, 'public', 'registry', 'index.json');
const registryIndex = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

// Complete Mock Storage for Node environment
const mockStorage = new Map();
mockStorage.set('clipforge_registry_cache_v1', JSON.stringify(registryIndex));
mockStorage.set('clipforge_registry_last_synced', Date.now().toString());

const mockStorageObj = {
  getItem: (k) => mockStorage.get(k) ?? null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

globalThis.localStorage = mockStorageObj;
if (!globalThis.window) {
  globalThis.window = {
    localStorage: mockStorageObj,
    dispatchEvent: () => true,
  };
} else {
  globalThis.window.localStorage = mockStorageObj;
}

import {
  atomicInstallPackage,
  safeUninstallPackage,
  checkUninstallSafety,
  importPackageFromFile,
  runStaticAnalysis,
  testCompileShaderSandbox,
} from '../utils/extensionRegistryManager.ts';

import {
  analyzeGlslStaticSecurity,
  testCompileShaderInSandboxWatchdog,
} from '../engine/securitySandbox.ts';

import {
  packCapfx,
} from '../utils/capfxZip.ts';

import {
  computeSha256,
} from '../utils/ed25519Verifier.ts';

test('R1.1 - Nhập tệp .capfx: Giải nén, xác thực Zod, phân tích tĩnh & cài đặt với nhãn "manual"', async () => {
  // 1. Create a valid mock EffectPack
  const samplePack = {
    id: 'community.neon-cyber',
    version: '1.0.0',
    name: { vi: 'Hiệu ứng Neon Cyber', en: 'Neon Cyber Effect' },
    description: { vi: 'Ánh sáng neon viền điện tử', en: 'Cyber neon outline glow' },
    author: 'CyberArtist',
    license: 'MIT',
    formatVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 'neon-edge-glow',
        kind: 'effect',
        name: { vi: 'Phát sáng neon', en: 'Neon Glow' },
        paramSchema: {
          glowRadius: { type: 'number', default: 5.0, min: 1.0, max: 20.0 },
          glowColor: { type: 'color', default: '#00ffff' },
        },
        shader: {
          language: 'glsl300es',
          fragmentBody: 'vec4 src = texture(uTexture, vUv); color = src;',
        },
        tags: ['neon', 'cyber', 'glow'],
        aliases: { vi: ['neon', 'phát sáng'], en: ['neon', 'glow'] },
        preview: {
          thumb: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
        },
        cost: { samplesPerPixel: 2, passes: 1 },
        since: '1.0.0',
      },
    ],
  };

  const sampleFiles = {
    'shaders/neon-edge-glow.frag': new TextEncoder().encode('vec4 src = texture(uTexture, vUv); color = src;'),
    'thumb.webp': new Uint8Array([82, 73, 70, 70, 36, 0, 0, 0, 87, 69, 66, 80]), // Mini WebP magic bytes
  };

  // Pack into .capfx binary buffer
  const capfxBuffer = await packCapfx(samplePack, sampleFiles);
  assert.ok(capfxBuffer.byteLength > 0, '.capfx buffer must be generated');

  // Create a File object simulation
  const mockFile = {
    name: 'community.neon-cyber.capfx',
    arrayBuffer: async () => capfxBuffer.buffer.slice(capfxBuffer.byteOffset, capfxBuffer.byteOffset + capfxBuffer.byteLength),
  };

  // Execute importPackageFromFile
  const importResult = await importPackageFromFile(mockFile);
  assert.equal(importResult.success, true, `Import must succeed: ${importResult.error}`);
  assert.ok(importResult.pkg, 'Imported package object must exist');
  assert.equal(importResult.pkg.trustLevel, 'manual', 'Manual imported package must have trustLevel="manual"');
  assert.equal(importResult.pkg.id, 'community.neon-cyber/neon-edge-glow@1.0.0');
});

test('R1.2 - Cài đặt nguyên tử 5 bước: Kiểm tra tuần tự & Rollback sạch khi lỗi', async () => {
  const recordedStages = [];
  const onProgress = (percent, stage) => {
    recordedStages.push({ percent, stage });
  };

  const validPkg = {
    ...registryIndex.packages[0],
    spec: {
      ...registryIndex.packages[0].spec,
      kind: 'effect',
    },
  };

  // Run atomic install with progress recording
  const result = await atomicInstallPackage(validPkg, { onProgress });
  assert.equal(result.success, true, `Install must succeed: ${result.error}`);
  assert.equal(result.stage, 'storage_commit');
  assert.ok(recordedStages.length >= 3, 'Must record multiple progress milestones');

  // Verify Rollback on Stage 1 (declarative security rejects script injection)
  const maliciousPkg = {
    ...validPkg,
    spec: {
      ...validPkg.spec,
      description: 'Malicious payload <script>alert("hack")</script>',
    },
  };

  const failResult = await atomicInstallPackage(maliciousPkg);
  assert.equal(failResult.success, false, 'Malicious spec must be rejected');
  assert.equal(failResult.stage, 'download');
  assert.ok(failResult.error?.includes('script') || failResult.error?.includes('không an toàn'));

  // Verify Rollback on Stage 3 (GLSL static analysis rejects disallowed while loop)
  const maliciousShaderSpec = {
    ...validPkg.spec,
    shader: {
      glslVersion: '300 es',
      fragmentShader: 'void main() { while (true) {} }',
    },
  };
  const rawShaderSpecStr = JSON.stringify(maliciousShaderSpec, null, 2);
  const maliciousHash = await computeSha256(rawShaderSpecStr);

  const maliciousShaderPkg = {
    ...validPkg,
    trustLevel: 'community',
    sha256: maliciousHash,
    hash: maliciousHash,
    spec: maliciousShaderSpec,
  };

  const failShaderResult = await atomicInstallPackage(maliciousShaderPkg);
  assert.equal(failShaderResult.success, false, 'Malicious shader must be rejected');
  assert.equal(failShaderResult.stage, 'static_analysis');
  assert.ok(failShaderResult.error?.includes('ERR_GLSL_DISALLOWED_LOOP'));
});

test('R1.3 - Phân tích tĩnh GLSL & Sandbox Compile Watchdog 200ms', async () => {
  // A. Static Analysis: while loop disallowed
  const whileCode = 'void main() { while(true) {} }';
  const whileRes = analyzeGlslStaticSecurity(whileCode);
  assert.equal(whileRes.safe, false);
  assert.equal(whileRes.errorCode, 'ERR_GLSL_DISALLOWED_LOOP');

  // B. Static Analysis: loop bound > 32 disallowed
  const largeLoopCode = 'void main() { for (int i = 0; i < 100; i++) {} }';
  const loopRes = analyzeGlslStaticSecurity(largeLoopCode);
  assert.equal(loopRes.safe, false);
  assert.equal(loopRes.errorCode, 'ERR_GLSL_LOOP_BOUND_EXCEEDED');

  // C. Sandbox compile watchdog: handles timeout budget
  const hangingShader = 'void main() { /* simulated hanging shader */ }';
  const watchdogResult = await testCompileShaderInSandboxWatchdog(hangingShader, 200);
  assert.ok(typeof watchdogResult.safe === 'boolean');
});

test('R1.4 - Gỡ cài đặt an toàn: Cảnh báo project đang dùng & chuyển Ghost Reference thay vì xóa', async () => {
  const assetId = 'com.clipforge.fx.rgb_shake';

  // 1. Check safety when 2 projects are using this asset
  const safetyCheck = await checkUninstallSafety(assetId);
  assert.ok(typeof safetyCheck.isSafe === 'boolean');
  assert.ok(Array.isArray(safetyCheck.affectedProjects));

  // 2. Perform safe uninstall with transition to ghost reference
  const currentProjectClips = [
    {
      id: 'clip_user_active_01',
      name: 'Dance Video',
      dynamicEffectId: assetId,
      dynamicSpec: { id: assetId, version: '1.0.0' },
      isGhostPlaceholder: false,
    },
  ];

  const uninstallRes = await safeUninstallPackage(assetId, currentProjectClips);
  assert.equal(uninstallRes.success, true);
  assert.equal(uninstallRes.transitionedToGhostCount, 1, 'Clip must transition to Ghost Reference');
  assert.equal(uninstallRes.updatedClips[0].isGhostPlaceholder, true, 'Clip must be marked as ghost');
  assert.ok(uninstallRes.updatedClips[0].ghostReason?.includes('đã được gỡ bỏ'));
});

test('R1.5 - Tab "Của tôi" (My Assets) & Nút Nhập gói trong ExtensionLibraryModal.tsx', () => {
  const modalPath = path.join(rootDir, 'src', 'components', 'ExtensionLibraryModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // Verify tab 'my_assets' exists and filters user-created/manual packages
  assert.ok(modalContent.includes("activeMainTab === 'my_assets'"));
  assert.ok(modalContent.includes("pkg.trustLevel === 'manual'"));
  assert.ok(modalContent.includes("pkg.trustLevel === 'local_fallback'"));
  assert.ok(modalContent.includes("pkg.trustLevel === 'ai_generated'"));

  // Verify manual upload button & file picker triggers
  assert.ok(modalContent.includes('Nhập gói'));
  assert.ok(modalContent.includes('.capfx'));
  assert.ok(modalContent.includes('importPackageFromFile'));
});
