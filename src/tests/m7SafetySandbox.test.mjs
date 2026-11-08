/**
 * Unit Tests for M7: Safety & Sandbox Engine
 * ============================================================================
 * Verifies:
 * 1. Package limits, Zip-bomb rejection, path traversal rejection, extension whitelist.
 * 2. GLSL Static Analysis: #extension whitelist, while/do-while ban, for bounds <= 32,
 *    texture sampling limit <= 16, code length <= 16KB, passes <= 3, host samplers only.
 * 3. Dry-run Sandbox compile with 200ms watchdog timeout rejection.
 * 4. Runtime Watchdog: Frame budget monitoring, auto-bypass on overload, context loss recovery.
 * 5. Asset Sanitization (SVG, Lottie, .cube, Font magic bytes) & unauthorized subresources ban.
 * 6. Standardized Error Codes & Diagnostic Info Generation.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateArchiveSecurity,
  analyzeGlslStaticSecurity,
  testCompileShaderInSandboxWatchdog,
  RuntimeEffectWatchdog,
  sanitizePackageAssets,
  generateDiagnosticInfo,
  SECURITY_FUNDAMENTAL_LIMITS_STATEMENT,
  ARCHIVE_SECURITY_LIMITS,
} from '../engine/securitySandbox.ts';
import { unpackCapfx, packCapfx } from '../utils/capfxZip.ts';

test('M7.1 - Package Archive Security: Rejects Zip-bombs, path traversal and unauthorized extensions', () => {
  // A. Rejects path traversal (".." or absolute paths)
  const traversalFiles1 = {
    'manifest.json': new Uint8Array([1, 2, 3]),
    '../secrets.json': new Uint8Array([4, 5, 6]),
  };
  const resTraversal1 = validateArchiveSecurity(traversalFiles1);
  assert.equal(resTraversal1.safe, false);
  assert.equal(resTraversal1.errorCode, 'ERR_PATH_TRAVERSAL');

  const traversalFiles2 = {
    'manifest.json': new Uint8Array([1, 2, 3]),
    '/etc/passwd': new Uint8Array([4, 5, 6]),
  };
  const resTraversal2 = validateArchiveSecurity(traversalFiles2);
  assert.equal(resTraversal2.safe, false);
  assert.equal(resTraversal2.errorCode, 'ERR_PATH_TRAVERSAL');

  // B. Rejects disallowed extensions (.js, .wasm, .exe, .html)
  const badExtFiles = {
    'manifest.json': new Uint8Array([1, 2, 3]),
    'exploit.js': new Uint8Array([1, 2, 3]),
  };
  const resBadExt = validateArchiveSecurity(badExtFiles);
  assert.equal(resBadExt.safe, false);
  assert.equal(resBadExt.errorCode, 'ERR_FILE_EXT_NOT_ALLOWED');
  assert.match(resBadExt.error, /\.js/);

  // C. Rejects Zip-bomb (compression ratio > 100:1)
  const zipBombFiles = {
    'manifest.json': new Uint8Array(50),
    'massive.cube': { size: 10 * 1024 * 1024 }, // 10MB uncompressed from 50KB pack (200:1 ratio)
  };
  const resZipBomb = validateArchiveSecurity(zipBombFiles, 50 * 1024);
  assert.equal(resZipBomb.safe, false);
  assert.equal(resZipBomb.errorCode, 'ERR_ZIP_BOMB');

  // D. Rejects oversized file (> 25MB)
  const oversizedFile = {
    'manifest.json': new Uint8Array(50),
    'huge.wav': { size: 26 * 1024 * 1024 }, // 26MB
  };
  const resOversized = validateArchiveSecurity(oversizedFile);
  assert.equal(resOversized.safe, false);
  assert.equal(resOversized.errorCode, 'ERR_FILE_TOO_LARGE');

  // E. Valid archive with whitelisted extensions (.json, .glsl, .cube, .svg, .ttf) passes cleanly
  const validFiles = {
    'manifest.json': new Uint8Array([1, 2, 3]),
    'assets/filter.cube': new Uint8Array([4, 5, 6]),
    'assets/icon.svg': new Uint8Array([7, 8, 9]),
    'shaders/effect.glsl': new Uint8Array([10, 11, 12]),
  };
  const resValid = validateArchiveSecurity(validFiles, 1024);
  assert.equal(resValid.safe, true);
});

test('M7.2 - GLSL Static Lexical Analysis: Disallows while/do-while, bounds for-loops <= 32 and samples <= 16', () => {
  // A. FORBID while and do-while loops
  const glslWhile = `
    int i = 0;
    while (i < 10) {
      i++;
    }
    return texture(uTexA, uv);
  `;
  const resWhile = analyzeGlslStaticSecurity(glslWhile);
  assert.equal(resWhile.safe, false);
  assert.equal(resWhile.errorCode, 'ERR_GLSL_DISALLOWED_LOOP');

  const glslDoWhile = `
    int i = 0;
    do { i++; } while (i < 5);
    return texture(uTexA, uv);
  `;
  const resDoWhile = analyzeGlslStaticSecurity(glslDoWhile);
  assert.equal(resDoWhile.safe, false);
  assert.equal(resDoWhile.errorCode, 'ERR_GLSL_DISALLOWED_LOOP');

  // B. For-loop bound must be constant and <= 32
  const glslDynamicFor = `
    for (int i = 0; i < int(uParams.x); i++) {
      uv += 0.01;
    }
    return texture(uTexA, uv);
  `;
  const resDynamic = analyzeGlslStaticSecurity(glslDynamicFor);
  assert.equal(resDynamic.safe, false);
  assert.equal(resDynamic.errorCode, 'ERR_GLSL_LOOP_BOUND_EXCEEDED');
  assert.match(resDynamic.error, /biến động/);

  const glslExcessiveFor = `
    for (int i = 0; i < 64; i++) {
      uv += 0.01;
    }
    return texture(uTexA, uv);
  `;
  const resExcessive = analyzeGlslStaticSecurity(glslExcessiveFor);
  assert.equal(resExcessive.safe, false);
  assert.equal(resExcessive.errorCode, 'ERR_GLSL_LOOP_BOUND_EXCEEDED');
  assert.match(resExcessive.error, /vượt quá giới hạn an toàn tối đa \(32/);

  // C. For-loop with constant <= 32 is valid
  const glslValidFor = `
    for (int i = 0; i < 16; i++) {
      uv += 0.001;
    }
    return texture(uTexA, uv);
  `;
  const resValidFor = analyzeGlslStaticSecurity(glslValidFor);
  assert.equal(resValidFor.safe, true);
  assert.equal(resValidFor.metrics.maxForLoopBound, 16);

  // D. Texture samples limit <= 16
  let glslExcessiveSamples = 'vec4 col = vec4(0.0);\n';
  for (let i = 0; i < 18; i++) {
    glslExcessiveSamples += `col += texture(uTexA, uv + vec2(${i * 0.01}));\n`;
  }
  glslExcessiveSamples += 'return col;';
  const resSamples = analyzeGlslStaticSecurity(glslExcessiveSamples);
  assert.equal(resSamples.safe, false);
  assert.equal(resSamples.errorCode, 'ERR_GLSL_TOO_MANY_SAMPLES');
  assert.equal(resSamples.metrics.textureSamplesCount, 18);

  // E. Disallowed Sampler (only uTexA, uTexB, or declared uniforms allowed)
  const glslUnauthorizedSampler = `
    vec4 col = texture(uExternalSecretTexture, uv);
    return col;
  `;
  const resSampler = analyzeGlslStaticSecurity(glslUnauthorizedSampler);
  assert.equal(resSampler.safe, false);
  assert.equal(resSampler.errorCode, 'ERR_GLSL_DISALLOWED_SAMPLER');

  // F. Code length limit <= 16KB
  const hugeCode = 'vec4 col = texture(uTexA, uv); return col;\n' + ' '.repeat(17 * 1024);
  const resHuge = analyzeGlslStaticSecurity(hugeCode);
  assert.equal(resHuge.safe, false);
  assert.equal(resHuge.errorCode, 'ERR_GLSL_CODE_TOO_LONG');
});

test('M7.3 - Sandbox Compile Watchdog: Rejects GPU hangs within 200ms timeout budget', async () => {
  // A. Normal clean shader compiles in sandbox
  const cleanGlsl = `
    #version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D uTexA;
    void main() { fragColor = texture(uTexA, vUv); }
  `;
  const resClean = await testCompileShaderInSandboxWatchdog(cleanGlsl, 200);
  assert.equal(resClean.safe, true);

  // B. Simulated GPU hang triggers Watchdog timeout and aborts
  const hangingGlsl = `
    #version 300 es
    precision highp float;
    // __HANG_GPU__ flag simulating runaway compilation
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D uTexA;
    void main() { fragColor = texture(uTexA, vUv); }
  `;
  const resHang = await testCompileShaderInSandboxWatchdog(hangingGlsl, 200);
  assert.equal(resHang.safe, false);
  assert.equal(resHang.errorCode, 'ERR_SANDBOX_TIMEOUT');
  assert.match(resHang.error, /Watchdog đã cưỡng chế chấm dứt/);
});

test('M7.4 - Runtime Effect Watchdog: Monitors frame time, auto-bypasses overload and handles context loss', () => {
  let bypassedId = '';
  let bypassReason = '';

  const watchdog = new RuntimeEffectWatchdog({
    frameBudgetMs: 33.3, // 30fps budget
    consecutiveViolationsLimit: 5,
    onBypass: (id, time, reason) => {
      bypassedId = id;
      bypassReason = reason;
    },
  });

  const effectId = 'community.heavy-raymarch';

  // Frames 1 to 4: Slow (45ms) but hasn't reached 5 consecutive frames
  for (let i = 1; i <= 4; i++) {
    const res = watchdog.recordFrame(effectId, 45.0);
    assert.equal(res.bypassed, false, `Frame ${i} should not be bypassed yet`);
    assert.equal(watchdog.isEffectBypassed(effectId), false);
  }

  // Frame 5: 5th consecutive frame exceeding budget -> Auto bypasses!
  const res5 = watchdog.recordFrame(effectId, 48.0);
  assert.equal(res5.bypassed, true);
  assert.equal(watchdog.isEffectBypassed(effectId), true);
  assert.equal(bypassedId, effectId);
  assert.ok(bypassReason.includes('chạy quá nặng'));
  assert.ok(res5.warning.includes('tự động chuyển sang chế độ bypass'));

  // Subsequent frames stay bypassed with zero overhead
  const resSubsequent = watchdog.recordFrame(effectId, 10.0);
  assert.equal(resSubsequent.bypassed, true);

  // Resetting bypass restores execution
  watchdog.resetEffectBypass(effectId);
  assert.equal(watchdog.isEffectBypassed(effectId), false);

  // Context Lost Handler prevents permanent crash
  const mockCanvas = {
    listeners: {},
    addEventListener(event, fn) {
      this.listeners[event] = fn;
    },
    removeEventListener(event) {
      delete this.listeners[event];
    },
  };

  let restoredCalled = false;
  const detach = watchdog.attachCanvasContextLostHandler(mockCanvas, () => {
    restoredCalled = true;
  });

  let defaultPrevented = false;
  // Trigger mock webglcontextlost event
  mockCanvas.listeners['webglcontextlost']({
    preventDefault: () => {
      defaultPrevented = true;
    },
  });
  assert.equal(defaultPrevented, true, 'Must call preventDefault on webglcontextlost');
  assert.equal(watchdog.isContextCurrentlyLost(), true);

  // Trigger webglcontextrestored
  mockCanvas.listeners['webglcontextrestored']();
  assert.equal(watchdog.isContextCurrentlyLost(), false);
  assert.equal(restoredCalled, true);

  detach();
});

test('M7.5 - Asset Sanitization & Subresource Security: Rejects external URLs and sanitizes attachments', () => {
  // A. Rejects external subresources (http:// or https://) inside assets
  const externalSubresourcePack = {
    'manifest.json': '{"id":"test"}',
    'assets/style.json': '{"remoteImage": "https://attacker.com/cookie_stealer.png"}',
  };
  const resSubresource = sanitizePackageAssets(externalSubresourcePack);
  assert.equal(resSubresource.safe, false);
  assert.equal(resSubresource.errorCode, 'ERR_UNAUTHORIZED_SUBRESOURCE');
  assert.match(resSubresource.error, /chứa liên kết tải subresource ra internet bên ngoài/);

  // B. Sanitizes safe internal SVG
  const safeSvgPack = {
    'manifest.json': '{"id":"test"}',
    'assets/badge.svg': '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5"/></svg>',
  };
  const resSvg = sanitizePackageAssets(safeSvgPack);
  assert.equal(resSvg.safe, true);

  // C. Validates Font Binary Magic Bytes
  const invalidFontPack = {
    'manifest.json': '{"id":"test"}',
    'fonts/malicious.ttf': new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), // Windows PE EXE header
  };
  const resFont = sanitizePackageAssets(invalidFontPack);
  assert.equal(resFont.safe, false);
  assert.equal(resFont.errorCode, 'ERR_ASSET_SANITIZATION_FAILED');
  assert.match(resFont.error, /chữ ký nhị phân không hợp lệ/);
});

test('M7.6 - Standardized Error Codes, Diagnostic Info & Fundamental Limits Statement', () => {
  // A. Generates structured diagnostic report
  const diag = generateDiagnosticInfo('ERR_GLSL_LOOP_BOUND_EXCEEDED', {
    packId: 'community.glitch-shader',
    version: '1.2.0',
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    message: 'Biên vòng lặp for (64) vượt quá giới hạn an toàn tối đa (32 lần lặp).',
  });

  assert.equal(diag.errorCode, 'ERR_GLSL_LOOP_BOUND_EXCEEDED');
  assert.equal(diag.packId, 'community.glitch-shader');
  assert.equal(diag.version, '1.2.0');
  assert.ok(diag.sha256);
  assert.ok(diag.timestamp);
  assert.ok(diag.suggestedAction);
  assert.ok(diag.environment);

  // B. Fundamental Limits Statement exists
  assert.ok(SECURITY_FUNDAMENTAL_LIMITS_STATEMENT.includes('Halting Problem'));
  assert.ok(SECURITY_FUNDAMENTAL_LIMITS_STATEMENT.includes('không thể chặn 100%'));
  assert.ok(SECURITY_FUNDAMENTAL_LIMITS_STATEMENT.includes('sandbox'));
});
