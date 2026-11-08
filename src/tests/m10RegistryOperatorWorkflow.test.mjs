import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  validatePack,
  packDirectory,
  signPack,
  previewPack,
  yankVersion,
  buildRegistryIndex,
  runCapfxCli,
  ALLOWED_SPDX_LICENSES,
  DISALLOWED_EXECUTABLE_EXTENSIONS,
} from '../../scripts/capfxTool.mjs';

import {
  OFFICIAL_REGISTRY_KEYS,
  verifyEd25519Signature,
  canonicalStringify,
} from '../utils/ed25519Verifier.ts';

import { unpackCapfx } from '../utils/capfxZip.ts';

// Test Ed25519 Primary Keypair (2026)
const PRIMARY_PUB_HEX = OFFICIAL_REGISTRY_KEYS[0].publicKeyHex;
const PRIMARY_PRIV_HEX = 'f521a723d0d98d47cc6e655b7fe389b333f4f7a8fa9cc63d3c52899e9a0efe85';

// Sample Valid Pack Definition
const createValidPackData = (id = 'community.test-effect', version = '1.0.0') => ({
  formatVersion: '1.0.0',
  id,
  version,
  name: {
    vi: 'Hiệu ứng thử nghiệm CI',
    en: 'CI Test Effect',
  },
  author: 'ClipForge Community QA',
  license: 'MIT',
  redistributable: true,
  createdAt: '2026-11-08T00:00:00.000Z',
  items: [
    {
      id: 'glitch-wave',
      kind: 'effect',
      paramSchema: {
        intensity: {
          type: 'number',
          label: { vi: 'Độ mạnh', en: 'Intensity' },
          default: 1.0,
          min: 0.0,
          max: 2.0,
        },
      },
      shader: {
        language: 'glsl300es',
        fragmentBody: `
          float shift = (hash(uv, uSeed) * 0.02 - 0.01) * uParams.x;
          vec4 col = texture(uTexA, uv + vec2(shift, 0.0));
          return col;
        `,
        passes: 1,
      },
      tags: ['glitch', 'wave', 'shake'],
      aliases: {
        vi: ['giật', 'sóng', 'nhiễu'],
        en: ['jitter', 'wave', 'distortion'],
      },
      preview: {
        thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
        loopFrames: 30,
      },
      requires: {
        webgl2: true,
      },
      cost: {
        samplesPerPixel: 2,
        passes: 1,
      },
      since: '1.0.0',
    },
  ],
  assets: [],
});

test('M10.1 - CI PR Ingestion Gates: Schema, License, Shader, Bounds & Provenance', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capfx-m10-ci-'));

  try {
    // 1. Valid Pack passes all checks
    const validPack = createValidPackData();
    const packJsonPath = path.join(tmpDir, 'pack.json');
    fs.writeFileSync(packJsonPath, JSON.stringify(validPack, null, 2), 'utf8');

    const report = await validatePack(tmpDir);
    assert.equal(report.valid, true, 'Valid pack must pass all CI gates');
    assert.equal(report.errors.length, 0);

    // 2. Gate 2: SPDX License Whitelist
    validPack.license = 'GPL-3.0'; // Disallowed license
    fs.writeFileSync(packJsonPath, JSON.stringify(validPack, null, 2), 'utf8');
    const licenseReport = await validatePack(tmpDir);
    assert.equal(licenseReport.valid, false);
    assert.ok(
      licenseReport.errors.some((e) => e.includes('[License]')),
      'Must reject non-whitelisted SPDX license'
    );

    // Verify allowed license list
    assert.ok(ALLOWED_SPDX_LICENSES.includes('MIT'));
    assert.ok(ALLOWED_SPDX_LICENSES.includes('CC0-1.0'));
    assert.ok(ALLOWED_SPDX_LICENSES.includes('Apache-2.0'));
    assert.ok(ALLOWED_SPDX_LICENSES.includes('In-House'));

    // 3. Gate 3: Shader Static Analysis (Forbidden loops & bounds)
    validPack.license = 'MIT';
    validPack.items[0].shader.fragmentBody = `
      int i = 0;
      while (i < 10) { i++; }
      return texture(uTexA, uv);
    `;
    fs.writeFileSync(packJsonPath, JSON.stringify(validPack, null, 2), 'utf8');
    const loopReport = await validatePack(tmpDir);
    assert.equal(loopReport.valid, false);
    assert.ok(
      loopReport.errors.some((e) => e.includes('ERR_GLSL_DISALLOWED_LOOP')),
      'Must reject while loop in shader'
    );

    // 4. Gate 5: Performance Budget (Passes > 3)
    validPack.items[0].shader.fragmentBody = 'return texture(uTexA, uv);';
    validPack.items[0].shader.passes = 5;
    fs.writeFileSync(packJsonPath, JSON.stringify(validPack, null, 2), 'utf8');
    const budgetReport = await validatePack(tmpDir);
    assert.equal(budgetReport.valid, false);
    assert.ok(
      budgetReport.errors.some((e) => e.includes('passes')),
      'Must reject shader with passes > 3'
    );

    // 5. Gate 7: Thumbnail size bound (<= 8KB)
    validPack.items[0].shader.passes = 1;
    // Generate oversized base64 thumbnail > 8KB (12000 base64 chars)
    validPack.items[0].preview.thumb = 'data:image/webp;base64,' + 'A'.repeat(12000);
    fs.writeFileSync(packJsonPath, JSON.stringify(validPack, null, 2), 'utf8');
    const thumbReport = await validatePack(tmpDir);
    assert.equal(thumbReport.valid, false);
    assert.ok(
      thumbReport.errors.some((e) => e.includes('[Preview]')),
      'Must reject thumbnail > 8KB'
    );

    // 6. Gate 9: Executable File Scan & Provenance
    validPack.items[0].preview.thumb = 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=';
    fs.writeFileSync(packJsonPath, JSON.stringify(validPack, null, 2), 'utf8');

    // Create an illegal executable/script file in pack directory
    const maliciousJsPath = path.join(tmpDir, 'exploit.js');
    fs.writeFileSync(maliciousJsPath, 'console.log("hacked")', 'utf8');

    const execReport = await validatePack(tmpDir);
    assert.equal(execReport.valid, false);
    assert.ok(
      execReport.errors.some((e) => e.includes('[Provenance]')),
      'Must reject executable / active script files (.js, .wasm, .exe)'
    );

    fs.unlinkSync(maliciousJsPath);

    // Create malicious SVG with <script>
    const svgDir = path.join(tmpDir, 'assets');
    fs.mkdirSync(svgDir, { recursive: true });
    const xssSvgPath = path.join(svgDir, 'malicious.svg');
    fs.writeFileSync(xssSvgPath, '<svg><script>alert(1)</script></svg>', 'utf8');

    const svgReport = await validatePack(tmpDir);
    assert.equal(svgReport.valid, false);
    assert.ok(
      svgReport.errors.some((e) => e.includes('SVG')),
      'Must reject SVG files with script injection'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('M10.2 - CLI capfx validate: Programmatic & Command-Line Runner', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capfx-m10-cli-'));

  try {
    const validPack = createValidPackData('community.cli-demo', '1.0.0');
    fs.writeFileSync(path.join(tmpDir, 'pack.json'), JSON.stringify(validPack, null, 2), 'utf8');

    // Programmatic validate
    const res = await validatePack(tmpDir);
    assert.equal(res.valid, true);
    assert.equal(res.packId, 'community.cli-demo');

    // CLI execution
    const codeSuccess = await runCapfxCli(['validate', tmpDir]);
    assert.equal(codeSuccess, 0, 'CLI validate must exit with 0 on valid pack');

    // Make pack invalid (corrupt schema)
    validPack.name = null;
    fs.writeFileSync(path.join(tmpDir, 'pack.json'), JSON.stringify(validPack, null, 2), 'utf8');

    const codeFail = await runCapfxCli(['validate', tmpDir]);
    assert.equal(codeFail, 1, 'CLI validate must exit with 1 on invalid pack');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('M10.3 - CLI capfx pack: ZIP Container Packaging & SHA-256 Calculation', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capfx-m10-pack-'));

  try {
    const validPack = createValidPackData('community.pack-test', '1.0.0');
    fs.writeFileSync(path.join(tmpDir, 'pack.json'), JSON.stringify(validPack, null, 2), 'utf8');

    // Add asset file
    const assetsDir = path.join(tmpDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    const sampleLut = 'TITLE "Sample LUT"\nLUT_3D_SIZE 2\n0.0 0.0 0.0\n1.0 1.0 1.0\n';
    fs.writeFileSync(path.join(assetsDir, 'warm.cube'), sampleLut, 'utf8');

    // Pack directory
    const outCapfxPath = path.join(tmpDir, 'bundle.capfx');
    const packResult = await packDirectory(tmpDir, outCapfxPath);

    assert.equal(packResult.success, true);
    assert.ok(fs.existsSync(outCapfxPath), 'Output .capfx file must exist');
    assert.ok(packResult.sizeBytes > 0);
    assert.ok(packResult.sha256 && packResult.sha256.length === 64);

    // Verify ZIP archive by unpacking
    const zipBytes = new Uint8Array(fs.readFileSync(outCapfxPath));
    const unpacked = await unpackCapfx(zipBytes);

    assert.ok(unpacked.pack);
    assert.equal(unpacked.pack.id, 'community.pack-test');
    assert.ok(unpacked.files['assets/warm.cube'], 'Must contain asset file in zip');
    assert.equal(unpacked.integrityVerified, true, 'SHA-256 integrity verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('M10.4 - CLI capfx sign: Ed25519 Cryptographic Signing with CI/KMS Secret', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capfx-m10-sign-'));

  try {
    const validPack = createValidPackData('community.signed-pack', '1.0.0');
    const packJsonPath = path.join(tmpDir, 'pack.json');
    fs.writeFileSync(packJsonPath, JSON.stringify(validPack, null, 2), 'utf8');

    // Sign with Primary private key
    const signResult = await signPack(packJsonPath, PRIMARY_PRIV_HEX);
    assert.equal(signResult.success, true);
    assert.ok(signResult.signature && signResult.signature.length === 128);
    assert.equal(signResult.verified, true);

    // Read back file and verify signature
    const updatedContent = JSON.parse(fs.readFileSync(packJsonPath, 'utf8'));
    assert.equal(updatedContent.signature, signResult.signature);

    const canonical = canonicalStringify(updatedContent);
    const isValid = await verifyEd25519Signature(canonical, signResult.signature, PRIMARY_PUB_HEX);
    assert.equal(isValid, true, 'Signature must verify against primary public key');

    // Reject invalid key
    const invalidSign = await signPack(packJsonPath, 'short-key');
    assert.equal(invalidSign.success, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('M10.5 - CLI capfx preview: Thumbnail & Golden-Frame Determinism', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capfx-m10-preview-'));

  try {
    const validPack = createValidPackData('community.preview-pack', '1.0.0');
    fs.writeFileSync(path.join(tmpDir, 'pack.json'), JSON.stringify(validPack, null, 2), 'utf8');

    const preview = await previewPack(tmpDir);
    assert.equal(preview.success, true);
    assert.equal(preview.summary.id, 'community.preview-pack');
    assert.equal(preview.summary.thumbnail.validLimit, true);
    assert.equal(preview.goldenFrames.length, 5);

    for (const frame of preview.goldenFrames) {
      assert.equal(frame.deterministicMatch, true, `Step ${frame.progress} must be 100% deterministic`);
      assert.equal(frame.ssim, 1.0);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('M10.6 - Registry Build & Emergency Yank (Kill-Switch Propagation)', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capfx-m10-registry-'));

  try {
    // 1. Create simulated packs directory
    const packsDir = path.join(tmpDir, 'packs');
    const packA = path.join(packsDir, 'com.test.alpha', '1.0.0');
    fs.mkdirSync(packA, { recursive: true });
    fs.writeFileSync(
      path.join(packA, 'pack.json'),
      JSON.stringify(createValidPackData('com.test.alpha', '1.0.0'), null, 2),
      'utf8'
    );

    const packB = path.join(packsDir, 'com.test.beta', '1.0.0');
    fs.mkdirSync(packB, { recursive: true });
    fs.writeFileSync(
      path.join(packB, 'pack.json'),
      JSON.stringify(createValidPackData('com.test.beta', '1.0.0'), null, 2),
      'utf8'
    );

    const registryDir = path.join(tmpDir, 'registry');

    // 2. Build index
    const buildResult = await buildRegistryIndex({
      packsDir,
      outputDir: registryDir,
      privateKeyHex: PRIMARY_PRIV_HEX,
    });

    assert.equal(buildResult.success, true);
    assert.equal(buildResult.totalPackages, 2);
    assert.ok(fs.existsSync(buildResult.indexPath));

    const indexContent = JSON.parse(fs.readFileSync(buildResult.indexPath, 'utf8'));
    assert.equal(indexContent.packages.length, 2);
    assert.ok(indexContent.signature, 'Built index must have Ed25519 signature');

    // 3. Emergency Yank: Revoke buggy beta version
    const yankResult = await yankVersion({
      id: 'com.test.beta',
      version: '1.0.0',
      reason: 'Lỗi rò rỉ bộ nhớ GPU trên WebGL2 context',
      replacementId: 'com.test.alpha@1.0.0',
      indexPath: buildResult.indexPath,
      privateKeyHex: PRIMARY_PRIV_HEX,
    });

    assert.equal(yankResult.success, true);
    assert.equal(yankResult.totalRevoked, 1);
    assert.equal(yankResult.revokedEntry.id, 'com.test.beta');
    assert.equal(yankResult.revokedEntry.version, '1.0.0');

    // Verify index.json updated and re-signed
    const reloadedIndex = JSON.parse(fs.readFileSync(buildResult.indexPath, 'utf8'));
    assert.equal(reloadedIndex.revoked.length, 1);
    assert.equal(reloadedIndex.revoked[0].id, 'com.test.beta');
    assert.ok(reloadedIndex.signature, 'Index must be re-signed after yank');

    // Verify signature of revoked index
    const canonical = canonicalStringify(reloadedIndex);
    const sigValid = await verifyEd25519Signature(canonical, reloadedIndex.signature, PRIMARY_PUB_HEX);
    assert.equal(sigValid, true, 'Re-signed index signature must be valid');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('M10.7 - Documentation & Governance Completeness: SPEC, RUNBOOK, CONTRIBUTING & TAKEDOWN', () => {
  const root = process.cwd();

  // 1. EFFECT_PACK_SPEC.md
  const specPath = path.join(root, 'EFFECT_PACK_SPEC.md');
  assert.ok(fs.existsSync(specPath), 'EFFECT_PACK_SPEC.md must exist');
  const specContent = fs.readFileSync(specPath, 'utf8');
  assert.ok(specContent.includes('PKZIP 2.0'), 'Spec must describe PKZIP container');
  assert.ok(specContent.includes('pack.json'), 'Spec must document pack.json manifest');
  assert.ok(specContent.includes('<packId>/<itemId>@<version>'), 'Spec must document namespacing format');
  assert.ok(specContent.includes('GLSL ES 3.00'), 'Spec must define GLSL ES 3.00 shader rules');
  assert.ok(specContent.includes('hash(uv, uSeed)'), 'Spec must mandate deterministic PRNG hash');
  assert.ok(specContent.includes('paramSchema'), 'Spec must document paramSchema');
  assert.ok(specContent.includes('8 KB'), 'Spec must mandate thumbnail <= 8KB');

  // 2. REGISTRY_RUNBOOK.md
  const runbookPath = path.join(root, 'REGISTRY_RUNBOOK.md');
  assert.ok(fs.existsSync(runbookPath), 'REGISTRY_RUNBOOK.md must exist');
  const runbookContent = fs.readFileSync(runbookPath, 'utf8');
  assert.ok(runbookContent.includes('Static Distribution'), 'Runbook must document static hosting');
  assert.ok(runbookContent.includes('require-corp'), 'Runbook must specify COEP require-corp & CORP');
  assert.ok(runbookContent.includes('Emergency Yank'), 'Runbook must provide emergency yank protocol');
  assert.ok(runbookContent.includes('Key Rotation'), 'Runbook must detail Ed25519 key rotation');
  assert.ok(runbookContent.includes('Rollback'), 'Runbook must detail 60-second rollback');

  // 3. CONTRIBUTING_PACKS.md
  const contribPath = path.join(root, 'CONTRIBUTING_PACKS.md');
  assert.ok(fs.existsSync(contribPath), 'CONTRIBUTING_PACKS.md must exist');
  const contribContent = fs.readFileSync(contribPath, 'utf8');
  assert.ok(contribContent.includes('capfx validate'), 'Contributing must describe capfx validate');
  assert.ok(contribContent.includes('capfx preview'), 'Contributing must describe capfx preview');
  assert.ok(contribContent.includes('capfx pack'), 'Contributing must describe capfx pack');

  // 4. TAKEDOWN_POLICY.md
  const takedownPath = path.join(root, 'TAKEDOWN_POLICY.md');
  assert.ok(fs.existsSync(takedownPath), 'TAKEDOWN_POLICY.md must exist');
  const takedownContent = fs.readFileSync(takedownPath, 'utf8');
  assert.ok(takedownContent.includes('24 giờ'), 'Takedown policy must commit to 24-hour SLA');
  assert.ok(takedownContent.includes('copyright@clipforge.app'), 'Must provide designated takedown email');
  assert.ok(takedownContent.includes('Ghost Reference'), 'Must explain safe ghost reference user protection');
});
