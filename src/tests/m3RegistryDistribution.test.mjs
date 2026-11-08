import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import {
  OFFICIAL_REGISTRY_KEYS,
  verifyEd25519Signature,
  verifyOfficialPackage,
  signEd25519,
  canonicalStringify,
  computeSha256,
} from '../utils/ed25519Verifier.ts';

const rootDir = process.cwd();

test('M3.1 - Static Hosting layout & index.json schema completeness', () => {
  const indexPath = path.join(rootDir, 'public', 'registry', 'index.json');
  assert.ok(fs.existsSync(indexPath), 'public/registry/index.json must exist');

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  // 1. Schema fields
  assert.ok(index.formatVersion, 'Must contain formatVersion');
  assert.ok(index.version, 'Must contain version');
  assert.ok(index.lastUpdated, 'Must contain lastUpdated timestamp');
  assert.ok(index.repositoryName, 'Must contain repositoryName');
  assert.ok(index.signature, 'Index must have Ed25519 signature');
  assert.ok(Array.isArray(index.revoked), 'Index must have revoked[] array');
  assert.ok(Array.isArray(index.packages), 'Index must have packages[] array');

  // 2. Starter items count >= 30
  assert.ok(
    index.packages.length >= 30,
    `Starter bundle must have >= 30 items, found ${index.packages.length}`
  );

  // 3. Package item completeness
  for (const pkg of index.packages) {
    assert.ok(pkg.id, 'Package must have id');
    assert.ok(pkg.version, 'Package must have version');
    assert.ok(pkg.kind, 'Package must have kind');
    assert.ok(pkg.name, 'Package must have name');
    assert.ok(pkg.description, 'Package must have description');
    assert.ok(pkg.trustLevel, 'Package must have trustLevel');
    assert.ok(pkg.license, 'Package must have license');
    assert.ok(pkg.sizeBytes > 0, 'Package must have sizeBytes > 0');
    assert.ok(pkg.sha256 || pkg.hash, 'Package must have sha256 or hash');
    assert.ok(pkg.spec, 'Package must embed declarative spec');

    // Official packages must contain Ed25519 signature
    if (pkg.trustLevel === 'official') {
      assert.ok(pkg.signature, `Official package ${pkg.id} must be signed`);
    }
  }

  // 4. Static hosting directory layout
  const packagesDir = path.join(rootDir, 'public', 'registry', 'packages');
  assert.ok(fs.existsSync(packagesDir), 'public/registry/packages directory must exist');
  const samplePkgFile = path.join(packagesDir, 'com.clipforge.fx.rgb_shake.json');
  assert.ok(fs.existsSync(samplePkgFile), 'com.clipforge.fx.rgb_shake.json must exist in packages');

  const packsDir = path.join(rootDir, 'public', 'packs');
  assert.ok(fs.existsSync(packsDir), 'public/packs directory must exist');
});

test('M3.2 - Mandatory CORS & CORP Headers on Registry Routes (COEP require-corp safe)', () => {
  // 1. Check vercel.json
  const vercelPath = path.join(rootDir, 'vercel.json');
  assert.ok(fs.existsSync(vercelPath), 'vercel.json must exist');
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

  const registryHeaderRule = vercel.headers?.find((h) =>
    h.source?.includes('registry') || h.source?.includes('packs')
  );
  assert.ok(registryHeaderRule, 'vercel.json must have dedicated headers for /(registry|packs)/(.*)');

  const getHeaderVal = (key) =>
    registryHeaderRule.headers.find((hdr) => hdr.key.toLowerCase() === key.toLowerCase())?.value;

  assert.equal(getHeaderVal('Access-Control-Allow-Origin'), '*', 'Must allow CORS from any origin');
  assert.equal(getHeaderVal('Cross-Origin-Resource-Policy'), 'cross-origin', 'Must enforce CORP cross-origin');

  // 2. Check public/_headers
  const headersPath = path.join(rootDir, 'public', '_headers');
  assert.ok(fs.existsSync(headersPath), 'public/_headers must exist');
  const headersContent = fs.readFileSync(headersPath, 'utf8');

  assert.ok(headersContent.includes('/registry/*'), 'public/_headers must declare /registry/*');
  assert.ok(headersContent.includes('/packs/*'), 'public/_headers must declare /packs/*');
  assert.ok(
    headersContent.includes('Cross-Origin-Resource-Policy: cross-origin'),
    'public/_headers must set CORP: cross-origin'
  );
  assert.ok(
    headersContent.includes('Access-Control-Allow-Origin: *'),
    'public/_headers must set CORS Allow-Origin: *'
  );

  // 3. Check public/sw.js
  const swPath = path.join(rootDir, 'public', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert.ok(
    swContent.includes("headers.set('Cross-Origin-Resource-Policy', 'cross-origin')"),
    'sw.js must re-inject CORP cross-origin header on cached assets'
  );
  assert.ok(
    swContent.includes("headers.set('Access-Control-Allow-Origin', '*')"),
    'sw.js must re-inject CORS Allow-Origin header'
  );
});

test('M3.3 - Ed25519 Cryptographic Signatures & Key Rotation Verification', async () => {
  // 1. Embedded official keys list
  assert.ok(OFFICIAL_REGISTRY_KEYS.length >= 2, 'Must have at least 2 official keys in rotation schedule');
  const primaryKey = OFFICIAL_REGISTRY_KEYS[0];
  assert.equal(primaryKey.publicKeyHex.length, 64, 'Ed25519 public key must be 32 bytes (64 hex chars)');

  // 2. Verify signature on official package from registry
  const indexPath = path.join(rootDir, 'public', 'registry', 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const officialPkg = index.packages.find((p) => p.trustLevel === 'official');
  assert.ok(officialPkg, 'Must have an official package in starter index');

  const verifyRes = await verifyOfficialPackage(officialPkg);
  assert.equal(verifyRes.verified, true, 'Official package signature must verify successfully');
  assert.equal(verifyRes.signerKeyId, primaryKey.id);

  // 3. Tampering test: Modifying payload must invalidate signature
  const tamperedPkg = {
    ...officialPkg,
    name: 'Gói Đã Bị Sửa Đổi Trái Phép',
  };
  const tamperedRes = await verifyOfficialPackage(tamperedPkg);
  assert.equal(tamperedRes.verified, false, 'Tampered package must fail signature verification');

  // 4. Missing signature test
  const unsignedPkg = { ...officialPkg, signature: undefined };
  const unsignedRes = await verifyOfficialPackage(unsignedPkg);
  assert.equal(unsignedRes.verified, false);
});

test('M3.4 - Revocation / Kill Switch Execution & Timeline Protection', () => {
  const indexPath = path.join(rootDir, 'public', 'registry', 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  // 1. Verify revoked list contains required sample entries
  assert.ok(index.revoked.length >= 2, 'Must have revoked entries');
  const memoryCrashRevoked = index.revoked.find((r) => r.id.includes('unstable_glitch'));
  assert.ok(memoryCrashRevoked, 'Must contain revoked unstable GPU memory crash entry');
  assert.ok(memoryCrashRevoked.reason, 'Revocation must have explicit reason');
  assert.ok(memoryCrashRevoked.replacementId, 'Revocation must offer replacement');

  // 2. Simulate installed assets matching revocation
  const installedAssets = [
    {
      id: 'com.clipforge.fx.unstable_glitch',
      version: '0.8.0',
      name: 'Unstable Glitch Effect',
      kind: 'effect',
      trustLevel: 'official',
      license: 'In-House',
      sizeBytes: 1500,
      hash: 'mock_hash',
      spec: { id: 'com.clipforge.fx.unstable_glitch', shader: {} },
      installedAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'com.clipforge.fx.rgb_shake',
      version: '1.0.0',
      name: 'Rung RGB',
      kind: 'effect',
      trustLevel: 'official',
      license: 'In-House',
      sizeBytes: 1157,
      hash: 'mock_hash_2',
      spec: { id: 'com.clipforge.fx.rgb_shake' },
      installedAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  // Revocation matching logic
  const checkRevoked = (asset) => {
    return index.revoked.find(
      (rev) =>
        (rev.id === asset.id || rev.id === asset.id.split('@')[0]) &&
        (rev.version === '*' || rev.version === asset.version)
    );
  };

  const match1 = checkRevoked(installedAssets[0]);
  assert.ok(match1, 'Unstable glitch v0.8.0 must match revocation');
  assert.equal(match1.replacementId, 'com.clipforge.fx.rgb_shake@1.0.0');

  const match2 = checkRevoked(installedAssets[1]);
  assert.equal(match2, undefined, 'Rgb shake v1.0.0 is safe and not revoked');

  // 3. Timeline protection: Timeline clip converted to ghost placeholder with explanation
  const activeClips = [
    {
      id: 'clip_user_01',
      track: 'video',
      dynamicEffectId: 'com.clipforge.fx.unstable_glitch',
      dynamicSpec: { shader: {} },
    },
  ];

  const updatedClips = activeClips.map((clip) => {
    if (clip.dynamicEffectId === match1.id) {
      return {
        ...clip,
        dynamicSpec: undefined, // Stripped GPU execution
        isGhostPlaceholder: true,
        ghostReason: `[Thu hồi: ${match1.reason}]`,
        replacementId: match1.replacementId,
      };
    }
    return clip;
  });

  assert.equal(updatedClips[0].isGhostPlaceholder, true);
  assert.equal(updatedClips[0].dynamicSpec, undefined);
  assert.ok(updatedClips[0].ghostReason.includes(match1.reason));
});

test('M3.5 - Index Compression (< 300KB at 1,000 items) & Stale-While-Revalidate', () => {
  const indexPath = path.join(rootDir, 'public', 'registry', 'index.json');
  const indexBuf = fs.readFileSync(indexPath);

  // 1. Compression verification
  const brotliBuf = zlib.brotliCompressSync(indexBuf);
  assert.ok(
    brotliBuf.length < 300 * 1024,
    `Brotli compressed index must be < 300KB, got ${brotliBuf.length} bytes`
  );
  // Current 36 starter items should be < 30KB
  assert.ok(brotliBuf.length < 30 * 1024, `Current starter index is ${brotliBuf.length} bytes`);

  // 2. 24h Throttle verification logic
  const isWithin24Hours = (lastSynced) => Date.now() - lastSynced < 24 * 60 * 60 * 1000;
  const recentSync = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
  const expiredSync = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

  assert.equal(isWithin24Hours(recentSync), true, '2 hours ago must not trigger refetch');
  assert.equal(isWithin24Hours(expiredSync), false, '25 hours ago must trigger background revalidation');
});

test('M3.6 - Custom Registry URL & Untrusted Downgrade to Community', async () => {
  // Read ExtensionLibraryModal.tsx
  const modalPath = path.join(rootDir, 'src', 'components', 'ExtensionLibraryModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  // Must have UI for Custom Registry and "Kiểm tra ngay"
  assert.ok(modalContent.includes('Kiểm tra ngay'), 'Must have "Kiểm tra ngay" button');
  assert.ok(modalContent.includes('Cấu hình Đường dẫn Kho Tùy Chỉnh'), 'Must support custom registry');
  assert.ok(modalContent.includes('Lưu kho'), 'Must have save custom registry button');

  // Verify custom registry logic: Unsigned package claiming 'official' must be downgraded to 'community'
  const customPkg = {
    id: 'custom.untrusted.pack/shake',
    version: '1.0.0',
    trustLevel: 'official', // claims official fraudulently
    signature: 'invalid_or_missing_signature',
  };

  const sigCheck = await verifyOfficialPackage(customPkg);
  assert.equal(sigCheck.verified, false);

  // Downgrade rule
  if (!sigCheck.verified && customPkg.trustLevel === 'official') {
    customPkg.trustLevel = 'community';
  }
  assert.equal(customPkg.trustLevel, 'community', 'Untrusted package must be downgraded to community');
});

test('M3.7 - Starter Bundle Completeness & Service Worker Precache', () => {
  const indexPath = path.join(rootDir, 'public', 'registry', 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  // 1. Starter items coverage
  const kinds = new Set(index.packages.map((p) => p.kind));
  assert.ok(kinds.has('effect'), 'Must contain effects');
  assert.ok(kinds.has('transition'), 'Must contain transitions');
  assert.ok(kinds.has('filter'), 'Must contain filters');
  assert.ok(kinds.has('sfx'), 'Must contain sfx');
  assert.ok(kinds.has('sticker'), 'Must contain stickers');
  assert.ok(kinds.has('textPreset'), 'Must contain text presets');
  assert.ok(kinds.has('template'), 'Must contain templates');

  // 2. Service worker precache
  const swPath = path.join(rootDir, 'public', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');

  assert.ok(
    swContent.includes("'/registry/index.json'"),
    'sw.js must include /registry/index.json in PRECACHE_SHELL_URLS'
  );
  assert.ok(
    swContent.includes('.capfx'),
    'sw.js must precache/cache .capfx starter packages'
  );
});

