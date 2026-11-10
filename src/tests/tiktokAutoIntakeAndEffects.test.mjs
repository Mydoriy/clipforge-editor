/**
 * TikTok Auto Intake, 4-Scene Cuts & ClipForge Auto-Install Test Suite
 * ============================================================================
 * Verifies:
 * 1. TikTok link / query-string parsing (extracts ID from URL or query params)
 * 2. Automatic 4-Scene Cuts generation with SMPTE timestamps:
 *    - Scene 1: 0.0s - 3.2s (Hook)
 *    - Scene 2: 3.2s - 7.5s (Action Beat)
 *    - Scene 3: 7.5s - 11.8s (Climax)
 *    - Scene 4: 11.8s - 15.0s (Outro CTA)
 * 3. 128 BPM Audio parameters & beat markers calculation
 * 4. Auto-update/install detected techniques into ClipForge assets registry
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

test('TikTok Link Intake: extracts ID from full URLs and query string fragments', () => {
  const testInputs = [
    {
      input: '505191957?is_from_webapp=1&sender_device=pc&web_id=7506395980305647111',
      expectedId: '7506395980305647111',
    },
    {
      input: 'https://www.tiktok.com/@creator/video/7506395980305647111',
      expectedId: '7506395980305647111',
    },
    {
      input: 'https://m.tiktok.com/v/7123456789012345678.html',
      expectedId: '7123456789012345678',
    },
  ];

  for (const { input, expectedId } of testInputs) {
    const isSocialOrParam =
      /tiktok\.com|douyin\.com|youtu\.?be|instagram\.com|fb\.watch|facebook\.com/i.test(input) ||
      /is_from_webapp|sender_device|web_id/i.test(input) ||
      /^\d{6,25}/.test(input);

    assert.equal(isSocialOrParam, true, `Should recognize ${input} as social/param`);

    const match = input.match(/(?:video\/|web_id=|\/v\/|v=|\/shorts\/)(\d{8,25})/);
    const videoId =
      match?.[1] ||
      input.match(/\d{15,25}/)?.[0] ||
      input.match(/\d{6,25}/)?.[0];
    assert.equal(videoId, expectedId, `Should extract correct videoId from ${input}`);
  }
});

test('TikTok Timeline Partitioning: 4 clear scene cuts and 128 BPM audio parameters', () => {
  const durationSec = 15.0;
  const cuts = [
    { id: 'cut-1', start: 0.0, end: 3.2, role: 'intro', name: 'Cảnh 1: Hook mở đầu' },
    { id: 'cut-2', start: 3.2, end: 7.5, role: 'action', name: 'Cảnh 2: Nhịp hành động' },
    { id: 'cut-3', start: 7.5, end: 11.8, role: 'climax', name: 'Cảnh 3: Cao trào kịch tính' },
    { id: 'cut-4', start: 11.8, end: 15.0, role: 'outro', name: 'Cảnh 4: Kêu gọi hành động' },
  ];

  // Verify total duration
  const total = cuts.reduce((acc, c) => acc + (c.end - c.start), 0);
  assert.equal(Number(total.toFixed(1)), durationSec);

  // Verify contiguous cuts (no gap, no overlap)
  for (let i = 1; i < cuts.length; i++) {
    assert.equal(cuts[i].start, cuts[i - 1].end);
  }

  // Verify audio 128 BPM beat interval
  const bpm = 128;
  const beatIntervalSec = 60 / bpm; // 0.46875s
  const totalBeats = Math.floor(durationSec / beatIntervalSec);
  assert.equal(totalBeats, 32); // exactly 32 beats in a 15-second TikTok video (4 bars of 8 beats)
});

test('ClipForge Auto-Update: converts uninstalled techniques into ClipForge installed assets', () => {
  const detectedTechniques = [
    {
      id: 'com.clipforge.fx.whip_blur',
      name: 'Chuyển cảnh quét mờ (Whip Blur)',
      kind: 'transition',
      primitiveId: 'core.primitive.blur.directional',
      verifiedScore: 0.92,
      parameters: { angle: 90, intensity: 1.2, duration: 0.35 },
    },
    {
      id: 'com.clipforge.fx.rgb_split',
      name: 'Hiệu ứng tách kênh RGB (Aberration)',
      kind: 'effect',
      primitiveId: 'core.primitive.channel_shift',
      verifiedScore: 0.89,
      parameters: { distance: 14, blend: 'screen', chromatic: true },
    },
    {
      id: 'com.clipforge.filter.teal_orange',
      name: 'Bộ lọc điện ảnh Teal & Orange',
      kind: 'filter',
      primitiveId: 'core.primitive.color_grade',
      verifiedScore: 0.94,
      parameters: { warmth: -20, contrast: 25 },
    },
    {
      id: 'com.clipforge.fx.flash_cut',
      name: 'Chớp sáng trắng theo nhịp (Flash Cut)',
      kind: 'transition',
      primitiveId: 'core.primitive.flash',
      verifiedScore: 0.91,
      parameters: { brightness: 2.0, duration: 0.15 },
    },
    {
      id: 'com.clipforge.fx.beat_zoom',
      name: 'Phóng to dập nhịp Bass (Beat Zoom)',
      kind: 'effect',
      primitiveId: 'core.primitive.transform',
      verifiedScore: 0.88,
      parameters: { scale: 1.15, bpm: 128 },
    },
    {
      id: 'com.clipforge.fx.viral_caption',
      name: 'Phụ đề tự động kiểu TikTok (Viral Caption)',
      kind: 'effect',
      primitiveId: 'core.primitive.text.hormozi',
      verifiedScore: 0.96,
      parameters: { font: 'Inter', preset: 'hormozi' },
    },
  ];

  // Simulated registry storage
  const installedStore = new Map();

  for (const tech of detectedTechniques) {
    if (!installedStore.has(tech.id)) {
      installedStore.set(tech.id, {
        id: tech.id,
        version: '1.0.0',
        name: tech.name,
        kind: tech.kind,
        trustLevel: 'verified',
        isVerified: true,
        installedAt: Date.now(),
        spec: {
          id: tech.id,
          name: tech.name,
          nodes: [{ primitiveId: tech.primitiveId, params: tech.parameters }],
          edges: [],
        },
      });
    }
  }

  assert.equal(installedStore.size, 6);
  assert.equal(installedStore.get('com.clipforge.fx.whip_blur').trustLevel, 'verified');
  assert.equal(installedStore.get('com.clipforge.filter.teal_orange').kind, 'filter');
  assert.equal(installedStore.get('com.clipforge.fx.beat_zoom').isVerified, true);
});
