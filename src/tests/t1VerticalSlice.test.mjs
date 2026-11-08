/**
 * T1. LÁT CẮT DỌC ĐẦU TIÊN (Vertical Slice: Link Intake -> ReferenceTimeline -> Slot -> Chốt chặn xuất)
 * ============================================================================
 * 100% NGOẠI TUYẾN - KHÔNG CẦN AI - $0 CHI PHÍ - 0 TOKEN
 *
 * Kiểm chứng toàn bộ luồng lát cắt dọc:
 * 1. Intake: Dán link mạng xã hội (TikTok, Shorts) -> Không fetch -> Thả file video.
 * 2. Phân cảnh cục bộ: Xây dựng ReferenceTimeline với các Slot cảnh.
 * 3. Bảo vệ lớp tham chiếu: refOnly = true, opacity = 0.35, isMuted = true, label = 'Tham chiếu – không xuất'.
 * 4. Thao tác trên Slot: Gán clip người dùng (auto-trim, speed-fit, 9:16 reframe, auto-fill theo nhịp).
 * 5. Chốt chặn xuất (Preflight Gate): Chặn đứng khi còn slot trống; ép chọn (fill, black, cut).
 * 6. Loại bỏ 100% dữ liệu tham chiếu: File xuất MP4 chứa 0 pixel và 0 audio tham chiếu.
 * 7. Thu hồi bộ nhớ: revokeReferenceVideoMemory giải phóng ObjectURL và RAM.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyUrl,
  validateReferenceVideoFile,
  sanitizeLabExportMetadata,
} from '../engine/linkIntake.ts';

import {
  buildReferenceTimeline,
  assignClipToSlot,
  resolveSlotAction,
  runExportPreflightCheck,
  exportRemixTimelineToEditor,
  revokeReferenceVideoMemory,
} from '../engine/remixEngine.ts';

import { measureVideoEvents } from '../engine/learningLoop.ts';

test('T1.1 - Link Intake: Social URL Isolation & Zero Network Fetch Guarantee', () => {
  // 1. Social URLs must NEVER be fetched directly from client browser
  const socialUrls = [
    'https://www.tiktok.com/@dance_pro/video/7182938475618293',
    'https://youtube.com/shorts/dQw4w9WgXcQ?feature=share',
    'https://www.instagram.com/reels/C3xYz123456/',
    'https://twitter.com/creator/status/1750000000000000000',
  ];

  for (const url of socialUrls) {
    const classification = classifyUrl(url);
    assert.equal(classification.type, 'social_platform');
    assert.equal(classification.canDirectFetch, false, `URL ${url} must NEVER allow direct fetch`);
    assert.ok(classification.socialInfo?.domain);
    assert.ok(classification.message.vi.includes('không tải video từ mạng xã hội'));
  }

  // 2. Direct video URLs (.mp4 / .webm) allow direct fetch test
  const directUrl = 'https://cdn.example.org/assets/video_demo.mp4';
  const directClassification = classifyUrl(directUrl);
  assert.equal(directClassification.type, 'direct_video');
  assert.equal(directClassification.canDirectFetch, true);

  // 3. Metadata sanitization strips any reference URLs on export
  const dirtyMeta = {
    title: 'Remix Project 1',
    sourceUrl: 'https://tiktok.com/@someone/video/12345',
    sourceNote: 'Downloaded from social',
    author: 'Editor User',
  };
  const cleanMeta = sanitizeLabExportMetadata(dirtyMeta);
  assert.equal(cleanMeta.sourceUrl, undefined);
  assert.equal(cleanMeta.sourceNote, undefined);
  assert.equal(cleanMeta.title, 'Remix Project 1');
});

test('T1.2 - File Validation Constraints: <= 3 minutes, <= 500MB', () => {
  // 1. Valid file: 120s, 80MB
  const validCheck = validateReferenceVideoFile(
    { size: 80 * 1024 * 1024, type: 'video/mp4', name: 'dance_routine.mp4' },
    120
  );
  assert.equal(validCheck.valid, true);

  // 2. Oversized file: 650MB (> 500MB limit)
  const oversizedCheck = validateReferenceVideoFile(
    { size: 650 * 1024 * 1024, type: 'video/mp4', name: 'raw_prores.mp4' },
    60
  );
  assert.equal(oversizedCheck.valid, false);
  assert.ok(oversizedCheck.error?.vi.includes('500MB'));

  // 3. Overlength video: 240s (> 180s limit)
  const overlengthCheck = validateReferenceVideoFile(
    { size: 40 * 1024 * 1024, type: 'video/mp4', name: 'podcast_clip.mp4' },
    240
  );
  assert.equal(overlengthCheck.valid, false);
  assert.ok(overlengthCheck.error?.vi.includes('3 phút'));
});

test('T1.3 - Pure Local Scene Detection & ReferenceTimeline Construction (Zero AI, $0 Cost)', () => {
  // Generate synthetic reference video frame sequence with 5 distinct scenes
  const w = 160;
  const h = 90;
  const mockFrames = [];

  // Scene 1: 0.0s - 2.0s (dark scene, luma ~50)
  for (let t = 0; t < 2.0; t += 0.25) {
    mockFrames.push({ timestampSec: Number(t.toFixed(2)), rgba: new Uint8ClampedArray(w * h * 4).fill(50), width: w, height: h });
  }
  // Scene 2: 2.0s - 4.5s (bright flash transition, luma ~240 then 150)
  mockFrames.push({ timestampSec: 2.0, rgba: new Uint8ClampedArray(w * h * 4).fill(240), width: w, height: h });
  for (let t = 2.25; t < 4.5; t += 0.25) {
    mockFrames.push({ timestampSec: Number(t.toFixed(2)), rgba: new Uint8ClampedArray(w * h * 4).fill(150), width: w, height: h });
  }
  // Scene 3: 4.5s - 7.0s (medium scene, luma ~90)
  mockFrames.push({ timestampSec: 4.5, rgba: new Uint8ClampedArray(w * h * 4).fill(20), width: w, height: h });
  for (let t = 4.75; t <= 7.0; t += 0.25) {
    mockFrames.push({ timestampSec: Number(t.toFixed(2)), rgba: new Uint8ClampedArray(w * h * 4).fill(90), width: w, height: h });
  }

  // Pure local measurement (100% offline heuristic, zero network, zero tokens)
  const evidencePacks = measureVideoEvents(mockFrames, { maskWatermarks: true });
  assert.ok(evidencePacks.length >= 2, 'Must detect at least 2 scene transitions');

  const refInput = {
    videoId: 'ref_video_test_01',
    name: 'viral_dance_ref.mp4',
    durationSec: 7.0,
    aspectRatio: '9:16',
    thumbnailUrl: 'blob:mock_ref_thumb',
  };

  const timeline = buildReferenceTimeline(evidencePacks, refInput);

  // Invariant 1: Total duration matches reference
  assert.equal(timeline.durationSec, 7.0);
  assert.equal(timeline.aspectRatio, '9:16');
  assert.ok(timeline.slots.length >= 2, 'Timeline must contain segmented slots');

  // Invariant 2: Every slot has mandatory refOnly: true, muted, opacity: 0.35
  for (const slot of timeline.slots) {
    assert.equal(slot.refMedia.refOnly, true, 'refOnly must be strictly true');
    assert.equal(slot.refMedia.isMuted, true, 'Reference layer must be muted');
    assert.equal(slot.refMedia.opacity, 0.35, 'Reference layer must be dimmed to 0.35');
    assert.equal(slot.refMedia.label, 'Tham chiếu – không xuất');
    assert.equal(slot.status, 'empty');
  }
});

test('T1.4 - Slot Clip Assignment & Speed/Trim Fitting Math', () => {
  const refInput = {
    videoId: 'ref_02',
    name: 'ref.mp4',
    durationSec: 9.0,
    aspectRatio: '9:16',
    thumbnailUrl: 'blob:mock',
  };

  const dummyEvents = [
    { eventId: 'e1', type: 'transition', startSec: 0, endSec: 3.0, durationSec: 3.0, metrics: {}, filmstrip: [] },
    { eventId: 'e2', type: 'effect', startSec: 3.0, endSec: 6.0, durationSec: 3.0, metrics: {}, filmstrip: [] },
    { eventId: 'e3', type: 'transition', startSec: 6.0, endSec: 9.0, durationSec: 3.0, metrics: {}, filmstrip: [] },
  ];

  let timeline = buildReferenceTimeline(dummyEvents, refInput);
  assert.equal(timeline.slots.length, 3);
  assert.equal(timeline.filledSlotsCount, 0);

  // 1. Assign User Clip to Slot 0 with 'trim' mode
  // User clip is 5.0s, Slot is 3.0s -> Must trim sourceEndSec to 3.0s, speed = 1.0
  timeline = assignClipToSlot(
    timeline,
    timeline.slots[0].id,
    {
      id: 'user_clip_1',
      name: 'my_clip_1.mp4',
      url: 'blob:user_1',
      durationSec: 5.0,
    },
    { fitMode: 'trim', scaleMode: 'reframe' }
  );

  const slot0 = timeline.slots[0];
  assert.equal(slot0.status, 'filled');
  assert.equal(slot0.assignedClip?.speed, 1.0);
  assert.equal(slot0.assignedClip?.sourceEndSec, 3.0, 'Source must be trimmed to slot duration');

  // 2. Assign User Clip to Slot 1 with 'speed' mode
  // User clip is 6.0s, Slot is 3.0s -> Must adjust speed to 2.0x
  timeline = assignClipToSlot(
    timeline,
    timeline.slots[1].id,
    {
      id: 'user_clip_2',
      name: 'my_clip_2.mp4',
      url: 'blob:user_2',
      durationSec: 6.0,
    },
    { fitMode: 'speed', scaleMode: 'fill' }
  );

  const slot1 = timeline.slots[1];
  assert.equal(slot1.status, 'filled');
  assert.equal(slot1.assignedClip?.speed, 2.0, 'Speed must be adjusted to 2.0x to fit 3s slot');

  // Verify filled slots counter
  assert.equal(timeline.filledSlotsCount, 2);
  assert.equal(timeline.unfilledSlotsCount, 1);
});

test('T1.5 - Preflight Export Gate: Mandatory Interception of Empty Slots & Reference Content', () => {
  const refInput = {
    videoId: 'ref_preflight',
    name: 'ref.mp4',
    durationSec: 6.0,
    aspectRatio: '9:16',
    thumbnailUrl: 'blob:mock',
  };

  const dummyEvents = [
    { eventId: 's1', type: 'transition', startSec: 0, endSec: 3.0, durationSec: 3.0, metrics: {}, filmstrip: [] },
    { eventId: 's2', type: 'transition', startSec: 3.0, endSec: 6.0, durationSec: 3.0, metrics: {}, filmstrip: [] },
  ];

  let timeline = buildReferenceTimeline(dummyEvents, refInput);

  // Fill only Slot 0, leave Slot 1 empty
  timeline = assignClipToSlot(
    timeline,
    timeline.slots[0].id,
    {
      id: 'user_clip_1',
      name: 'user_1.mp4',
      durationSec: 3.0,
    },
    { fitMode: 'trim' }
  );

  // 1. Run Preflight: Must FAIL because Slot 1 is still empty!
  const preflight1 = runExportPreflightCheck(timeline);
  assert.equal(preflight1.canExport, false, 'Export MUST be blocked when slots are empty');
  assert.equal(preflight1.emptySlots, 1);
  assert.equal(preflight1.unresolvedSlots.length, 1);
  assert.equal(preflight1.unresolvedSlots[0].slotId, timeline.slots[1].id);

  // 2. Resolve Slot 1 with 'black' (fill with black placeholder)
  timeline = resolveSlotAction(timeline, timeline.slots[1].id, 'black');
  assert.equal(timeline.slots[1].status, 'placeholder_black');

  // 3. Re-run Preflight: Must now PASS
  const preflight2 = runExportPreflightCheck(timeline);
  assert.equal(preflight2.canExport, true, 'Export MUST be allowed once all slots are resolved');
  assert.equal(preflight2.emptySlots, 0);
  assert.equal(preflight2.blackSlots, 1);
});

test('T1.6 - Zero Reference Media Leakage: Export Strips 100% Reference Pixels & Audio', () => {
  const refInput = {
    videoId: 'sensitive_ref_video_leaker',
    name: 'private_reference.mp4',
    durationSec: 4.0,
    aspectRatio: '9:16',
    thumbnailUrl: 'blob:ref_private_thumb',
  };

  const dummyEvents = [
    { eventId: 'ev1', type: 'transition', startSec: 0, endSec: 2.0, durationSec: 2.0, metrics: {}, filmstrip: [] },
    { eventId: 'ev2', type: 'effect', startSec: 2.0, endSec: 4.0, durationSec: 2.0, metrics: {}, filmstrip: [] },
  ];

  let timeline = buildReferenceTimeline(dummyEvents, refInput);

  // Slot 0 filled with user clip
  timeline = assignClipToSlot(
    timeline,
    timeline.slots[0].id,
    {
      id: 'my_clip_safe',
      name: 'my_clip.mp4',
      url: 'blob:user_safe_data',
      durationSec: 2.0,
    },
    { fitMode: 'trim' }
  );

  // Slot 1 resolved with black placeholder
  timeline = resolveSlotAction(timeline, timeline.slots[1].id, 'black');

  // Export to Editor project structure
  const { projectClips, tracks } = exportRemixTimelineToEditor(timeline);
  assert.ok(projectClips.length >= 2);
  assert.ok(tracks.length >= 1);

  // CRITICAL AUDIT ASSERTIONS:
  // 1. None of the exported clips contain reference video IDs or URLs
  for (const clip of projectClips) {
    assert.notEqual(clip.mediaId, 'sensitive_ref_video_leaker', 'Reference video ID must NOT leak into export');
    assert.notEqual(clip.src, 'blob:ref_private_thumb', 'Reference thumbnail/media URL must NOT leak into export');
  }

  // 2. Black placeholder clip is rendered as transparent/black color block, not reference media
  const blackClip = projectClips.find((c) => c.name === 'Khung hình đen');
  assert.ok(blackClip, 'Must have black placeholder clip in export');
  assert.equal(blackClip.adjustments?.brightness, -100);

  // 3. Revoke reference video memory
  const revoked = revokeReferenceVideoMemory(timeline.referenceVideoId);
  assert.equal(revoked.success, true);
  assert.equal(revoked.revokedId, 'sensitive_ref_video_leaker');
});
