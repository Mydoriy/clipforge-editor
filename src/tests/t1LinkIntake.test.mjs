/**
 * T1. LINK INTAKE & REFERENCE VIDEO VALIDATION Test Suite
 * ============================================================================
 * Verifies:
 * 1. URL Classification:
 *    - Direct video (.mp4, .webm, .mov) -> canDirectFetch: true
 *    - Social platforms (TikTok, YouTube, Insta, Facebook, X) -> social_platform, never fetch
 *    - Unsupported URLs -> unsupported
 * 2. CORS Handling: Detects CORS blocking and prompts to download & drop file.
 * 3. Constraints:
 *    - File size <= 500MB (rejects > 500MB)
 *    - Duration <= 3 minutes / 180s (rejects > 180s)
 * 4. Origin Attribution Privacy:
 *    - Strips sourceUrl/sourceNote when exporting to .capfx or .caprecipe.
 * 5. Copyright Notice:
 *    - Mandatory first-time and per-import copyright reminder.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyUrl,
  validateReferenceVideoFile,
  sanitizeLabExportMetadata,
  fetchDirectVideoWithCorsHandling,
} from '../engine/linkIntake.ts';

import {
  LAB_LIMITS,
  LAB_COPYRIGHT_NOTICE,
} from '../types/lab.ts';

test('T1.1 - URL Classification: Direct Videos vs Social Platforms vs Unsupported', () => {
  // 1. Direct Video files
  const mp4Result = classifyUrl('https://example.com/assets/sample-dance.mp4');
  assert.equal(mp4Result.type, 'direct_video');
  assert.equal(mp4Result.canDirectFetch, true);

  const webmResult = classifyUrl('https://cdn.test.org/clip.webm?token=abc');
  assert.equal(webmResult.type, 'direct_video');
  assert.equal(webmResult.canDirectFetch, true);

  const movResult = classifyUrl('https://storage.provider.io/render.mov');
  assert.equal(movResult.type, 'direct_video');

  // 2. Social Media Platforms (strictly NO fetch, extract source info)
  const tiktokResult = classifyUrl('https://www.tiktok.com/@creator/video/7123456789');
  assert.equal(tiktokResult.type, 'social_platform');
  assert.equal(tiktokResult.canDirectFetch, false);
  assert.equal(tiktokResult.socialInfo?.platformName, 'TikTok');
  assert.ok(tiktokResult.message.vi.includes('không tải video từ mạng xã hội'));

  const youtubeResult = classifyUrl('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(youtubeResult.type, 'social_platform');
  assert.equal(youtubeResult.canDirectFetch, false);
  assert.equal(youtubeResult.socialInfo?.platformName, 'YouTube');

  const instaResult = classifyUrl('https://www.instagram.com/reel/C3abc123/');
  assert.equal(instaResult.type, 'social_platform');
  assert.equal(instaResult.canDirectFetch, false);
  assert.equal(instaResult.socialInfo?.platformName, 'Instagram');

  const xResult = classifyUrl('https://x.com/filmmaker/status/1234567890');
  assert.equal(xResult.type, 'social_platform');
  assert.equal(xResult.socialInfo?.platformName, 'X (Twitter)');

  // 3. Unsupported URLs
  const articleResult = classifyUrl('https://news.ycombinator.com/item?id=123');
  assert.equal(articleResult.type, 'unsupported');
  assert.equal(articleResult.canDirectFetch, false);

  const emptyResult = classifyUrl('');
  assert.equal(emptyResult.type, 'unsupported');
});

test('T1.2 - Direct Video CORS Block Detection & Guidance', async () => {
  // Simulate browser fetch failure due to CORS (TypeError: Failed to fetch)
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const corsError = new TypeError('Failed to fetch');
    throw corsError;
  };

  try {
    const fetchRes = await fetchDirectVideoWithCorsHandling('https://private-cdn.com/sample.mp4');
    assert.equal(fetchRes.success, false);
    assert.equal(fetchRes.isCorsBlocked, true);
    assert.ok(fetchRes.error?.includes('CORS'));
    assert.ok(fetchRes.error?.includes('tải video về máy và thả tệp'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T1.3 - Reference File Size Constraint (<= 500MB)', () => {
  assert.equal(LAB_LIMITS.MAX_SIZE_BYTES, 500 * 1024 * 1024);

  // 1. Valid size (150MB)
  const validFile = {
    name: 'test-vlog.mp4',
    size: 150 * 1024 * 1024,
    type: 'video/mp4',
  };
  const validRes = validateReferenceVideoFile(validFile);
  assert.equal(validRes.valid, true);

  // 2. Exceeded size (520MB)
  const oversizedFile = {
    name: 'huge-movie.mp4',
    size: 520 * 1024 * 1024,
    type: 'video/mp4',
  };
  const oversizedRes = validateReferenceVideoFile(oversizedFile);
  assert.equal(oversizedRes.valid, false);
  assert.ok(oversizedRes.error?.vi.includes('vượt quá giới hạn tối đa 500MB'));
});

test('T1.4 - Reference Duration Constraint (<= 3 minutes / 180s)', () => {
  assert.equal(LAB_LIMITS.MAX_DURATION_SEC, 180);

  const testFile = { name: 'clip.mp4', size: 10 * 1024 * 1024, type: 'video/mp4' };

  // 1. Valid duration (45 seconds)
  const validDuration = validateReferenceVideoFile(testFile, 45.0);
  assert.equal(validDuration.valid, true);

  // 2. Boundary duration (180 seconds)
  const boundaryDuration = validateReferenceVideoFile(testFile, 180.0);
  assert.equal(boundaryDuration.valid, true);

  // 3. Exceeded duration (181 seconds)
  const invalidDuration = validateReferenceVideoFile(testFile, 181.5);
  assert.equal(invalidDuration.valid, false);
  assert.ok(invalidDuration.error?.vi.includes('vượt quá giới hạn 3 phút'));
});

test('T1.5 - Origin Attribution Privacy (Source Link Stripped from Export)', () => {
  // Session metadata contains source note
  const rawSessionRecipe = {
    id: 'remix-neon-shake',
    version: '1.0.0',
    name: 'Neon Shake Recipe',
    sourceUrl: 'https://www.tiktok.com/@creator/video/7123456789',
    sourceNote: {
      url: 'https://www.tiktok.com/@creator/video/7123456789',
      platform: 'TikTok',
    },
    metadata: {
      originUrl: 'https://instagram.com/reel/123',
      creator: 'LocalUser',
    },
    items: [
      {
        id: 'rgb-shake-item',
        videoUrl: 'https://private.com/clip.mp4',
        parameters: { speed: 1.2 },
      },
    ],
  };

  // Execute sanitization for export
  const exported = sanitizeLabExportMetadata(rawSessionRecipe);

  assert.equal(exported.sourceUrl, undefined);
  assert.equal(exported.sourceNote, undefined);
  assert.equal(exported.metadata.originUrl, undefined);
  assert.equal(exported.items[0].videoUrl, undefined);
  assert.equal(exported.items[0].parameters.speed, 1.2, 'Parameters must be preserved');
  assert.equal(exported.metadata.creator, 'LocalUser', 'Local non-link metadata must be preserved');
});

test('T1.6 - Copyright Reminder & Legal Guard', () => {
  assert.ok(LAB_COPYRIGHT_NOTICE.vi.includes('NHẮC NHỞ BẢN QUYỀN'));
  assert.ok(LAB_COPYRIGHT_NOTICE.vi.includes('chỉ trích xuất thông số kỹ thuật'));
  assert.ok(LAB_COPYRIGHT_NOTICE.vi.includes('tuyệt đối không sao chép'));
  assert.ok(LAB_COPYRIGHT_NOTICE.en.includes('COPYRIGHT NOTICE'));
});
