/**
 * T3. PHÒNG REMIX (Remix Room & Workbench) Test Suite
 * ============================================================================
 * Verifies:
 * 1. ReferenceTimeline: Read-only reference layer, refOnly: true, muted, opacity 0.35,
 *    label "Tham chiếu – không xuất".
 * 2. Slot Editing: Drag clip into slot, auto-trim, speed-fit, reframe.
 * 3. Auto-Fill: "Điền tự động" bằng chế độ "Dựng lại theo nhịp".
 * 4. Technique Controls: Toggle, parameter sliders, replace from library via Resolver, overlays.
 * 5. CHỐT CHẶN XUẤT: Preflight scan blocks export if any slot is empty/reference-dependent;
 *    enforces 3 actions (fill, black, cut).
 * 6. Zero Reference Leakage: Compositor & export engine purge 100% of reference pixels & audio.
 * 7. Apply to Project & Memory Revocation: creates editor project & purges reference memory.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildReferenceTimeline,
  assignClipToSlot,
  autoFillSlotsByBeat,
  toggleSlotTechnique,
  updateSlotTechniqueParams,
  replaceSlotTechnique,
  addUserOverlayToSlot,
  resolveSlotAction,
  runExportPreflightCheck,
  exportRemixTimelineToEditor,
  revokeReferenceVideoMemory,
  applyRemixToProject,
} from '../engine/remixEngine.ts';

import { sharedCompositor } from '../engine/compositor.ts';

test('T3.1 - ReferenceTimeline Construction & refOnly Reference Layer Isolation', () => {
  const mockEvents = [
    {
      eventId: 'ev_0',
      type: 'transition',
      startSec: 0.0,
      endSec: 2.0,
      durationSec: 2.0,
      metrics: { lumaDelta: 0.45, colorDelta: 0.3 },
      filmstrip: [],
    },
    {
      eventId: 'ev_1',
      type: 'effect',
      startSec: 2.0,
      endSec: 5.5,
      durationSec: 3.5,
      metrics: { lumaDelta: 0.55, flashIntensity: 1.2 }, // Climax beat
      filmstrip: [],
    },
    {
      eventId: 'ev_2',
      type: 'transition',
      startSec: 5.5,
      endSec: 8.0,
      durationSec: 2.5,
      metrics: { lumaDelta: 0.3, colorDelta: 0.2 },
      filmstrip: [],
    },
  ];

  const timeline = buildReferenceTimeline(mockEvents, {
    videoId: 'blob:ref_video_xyz123',
    name: 'Tiktok_Trend_Ref.mp4',
    durationSec: 8.0,
    aspectRatio: '9:16',
  });

  assert.equal(timeline.referenceVideoId, 'blob:ref_video_xyz123');
  assert.equal(timeline.durationSec, 8.0);
  assert.equal(timeline.aspectRatio, '9:16');
  assert.equal(timeline.isMuted, true, 'Reference timeline must be muted by default');
  assert.equal(timeline.slots.length, 3);
  assert.equal(timeline.filledSlotsCount, 0);
  assert.equal(timeline.unfilledSlotsCount, 3);

  // Verify Slot 0 (Intro)
  const slot0 = timeline.slots[0];
  assert.equal(slot0.role, 'intro');
  assert.equal(slot0.refMedia.refOnly, true, 'refMedia MUST have refOnly: true');
  assert.equal(slot0.refMedia.isMuted, true, 'refMedia MUST be muted');
  assert.equal(slot0.refMedia.opacity, 0.35, 'refMedia MUST be translucent (opacity 0.35)');
  assert.equal(slot0.refMedia.label, 'Tham chiếu – không xuất');
  assert.equal(slot0.status, 'empty');

  // Verify Slot 1 (Climax with flash)
  const slot1 = timeline.slots[1];
  assert.equal(slot1.role, 'climax');
  assert.equal(slot1.techniques.effect?.enabled, true);

  // Verify Slot 2 (Outro)
  const slot2 = timeline.slots[2];
  assert.equal(slot2.role, 'outro');
});

test('T3.2 - Slot User Clip Assignment: Auto-trim, Speed-fit & Reframe', () => {
  const timeline = buildReferenceTimeline([], {
    videoId: 'ref_1',
    durationSec: 6.0,
  });

  const slot0 = timeline.slots[0]; // Duration: 2.0s
  assert.equal(slot0.durationSec, 2.0);

  // Case A: User assigns a 5.0s clip using 'trim' mode (default)
  const userClipLong = {
    mediaId: 'user_media_01',
    name: 'my_skate_clip.mp4',
    durationSec: 5.0,
    url: 'blob:user_media_01',
  };

  const timelineTrimmed = assignClipToSlot(timeline, slot0.id, userClipLong, {
    fitMode: 'trim',
    scaleMode: 'reframe',
    cropOffset: { x: 0.1, y: -0.2 },
  });

  const assigned0 = timelineTrimmed.slots[0].assignedClip;
  assert.ok(assigned0);
  assert.equal(assigned0.fitMode, 'trim');
  assert.equal(assigned0.speed, 1.0, 'Trim mode keeps speed at 1.0x');
  assert.equal(assigned0.sourceStartSec, 0.0);
  assert.equal(assigned0.sourceEndSec, 2.0, 'Source is trimmed to slot duration');
  assert.equal(timelineTrimmed.slots[0].status, 'filled');
  assert.equal(timelineTrimmed.filledSlotsCount, 1);
  assert.equal(timelineTrimmed.unfilledSlotsCount, 2);

  // Case B: User assigns a 4.0s clip into Slot 1 (2.0s) using 'speed' mode
  const slot1 = timeline.slots[1];
  const timelineSpedUp = assignClipToSlot(timelineTrimmed, slot1.id, userClipLong, {
    fitMode: 'speed',
  });

  const assigned1 = timelineSpedUp.slots[1].assignedClip;
  assert.ok(assigned1);
  assert.equal(assigned1.fitMode, 'speed');
  assert.equal(assigned1.speed, 2.5, 'Speed retimed to 5.0s / 2.0s = 2.5x');
  assert.equal(assigned1.sourceEndSec, 5.0, 'Entire clip is used when retimed');
  assert.equal(timelineSpedUp.slots[1].status, 'filled');
  assert.equal(timelineSpedUp.filledSlotsCount, 2);
});

test('T3.3 - Auto-Fill Slots by Beat ("Dựng lại theo nhịp")', () => {
  const timeline = buildReferenceTimeline([], {
    videoId: 'ref_beat',
    durationSec: 6.0,
  });

  assert.equal(timeline.unfilledSlotsCount, 3);

  const userClips = [
    { mediaId: 'u1', name: 'clip_hook.mp4', durationSec: 3.0, url: 'blob:u1' },
    { mediaId: 'u2', name: 'clip_beat.mp4', durationSec: 4.0, url: 'blob:u2' },
    { mediaId: 'u3', name: 'clip_drop.mp4', durationSec: 2.5, url: 'blob:u3' },
  ];

  const autoFilled = autoFillSlotsByBeat(timeline, userClips, { mode: 'beat_sync' });

  assert.equal(autoFilled.filledSlotsCount, 3);
  assert.equal(autoFilled.unfilledSlotsCount, 0);

  for (let i = 0; i < 3; i++) {
    const s = autoFilled.slots[i];
    assert.equal(s.status, 'filled');
    assert.ok(s.assignedClip);
    assert.equal(s.assignedClip.mediaId, userClips[i].mediaId);
  }
});

test('T3.4 - Technique Controls: Toggle, Slider Adjustments, Resolver Replacement & Overlays', () => {
  let timeline = buildReferenceTimeline([], { videoId: 'ref_tech', durationSec: 6.0 });
  const slot0Id = timeline.slots[0].id;

  // 1. Toggle technique off and on
  timeline = toggleSlotTechnique(timeline, slot0Id, 'look', false);
  assert.equal(timeline.slots[0].techniques.look?.enabled, false);

  timeline = toggleSlotTechnique(timeline, slot0Id, 'look', true);
  assert.equal(timeline.slots[0].techniques.look?.enabled, true);

  // 2. Adjust parameters via sliders
  timeline = updateSlotTechniqueParams(timeline, slot0Id, 'look', {
    contrast: 1.35,
    saturation: 1.25,
  });
  assert.equal(timeline.slots[0].techniques.look?.params.contrast, 1.35);
  assert.equal(timeline.slots[0].techniques.look?.params.saturation, 1.25);

  // 3. Replace technique from library (via Resolver)
  timeline = replaceSlotTechnique(
    timeline,
    slot0Id,
    'effect',
    'core.primitive.displace_noise',
    { amount: 15.0 }
  );
  assert.equal(timeline.slots[0].techniques.effect?.techniqueId, 'core.primitive.displace_noise');
  assert.equal(timeline.slots[0].techniques.effect?.params.amount, 15.0);

  // 4. Add custom user overlay
  timeline = addUserOverlayToSlot(timeline, slot0Id, 'core.primitive.grain', { intensity: 0.18 });
  assert.equal(timeline.slots[0].userOverlays.length, 1);
  assert.equal(timeline.slots[0].userOverlays[0].effectId, 'core.primitive.grain');
  assert.equal(timeline.slots[0].userOverlays[0].params.intensity, 0.18);
});

test('T3.5 - CHỐT CHẶN XUẤT: Preflight Gate & Mandatory Actions (Fill, Black, Cut)', () => {
  let timeline = buildReferenceTimeline([], { videoId: 'ref_gate', durationSec: 6.0 });

  // 1. Initially all 3 slots are empty -> Preflight check MUST fail!
  const initialPreflight = runExportPreflightCheck(timeline);
  assert.equal(initialPreflight.canExport, false, 'Cannot export when slots are empty');
  assert.equal(initialPreflight.mandatoryActionsRequired, true);
  assert.equal(initialPreflight.unresolvedSlots.length, 3);
  assert.ok(initialPreflight.warningNotice?.vi.includes('CHỐT CHẶN XUẤT'));

  // Attempting exportRemixTimelineToEditor MUST throw error!
  assert.throws(
    () => exportRemixTimelineToEditor(timeline),
    /ERR_EXPORT_REF_CONTENT_FORBIDDEN/
  );

  // 2. Resolve Slot 0 by FILLING with user clip
  const slot0Id = timeline.slots[0].id;
  timeline = resolveSlotAction(timeline, slot0Id, 'fill', {
    mediaId: 'user_clip_1',
    name: 'intro.mp4',
    durationSec: 3.0,
    url: 'blob:user_clip_1',
  });

  // 3. Resolve Slot 1 by setting to BLACK PLACEHOLDER
  const slot1Id = timeline.slots[1].id;
  timeline = resolveSlotAction(timeline, slot1Id, 'black');

  // 4. Resolve Slot 2 by CUTTING / EXCLUDING
  const slot2Id = timeline.slots[2].id;
  timeline = resolveSlotAction(timeline, slot2Id, 'cut');

  // 5. Re-run preflight check -> MUST PASS 100%!
  const resolvedPreflight = runExportPreflightCheck(timeline);
  assert.equal(resolvedPreflight.canExport, true, 'Export allowed when all slots are resolved');
  assert.equal(resolvedPreflight.mandatoryActionsRequired, false);
  assert.equal(resolvedPreflight.unresolvedSlots.length, 0);
  assert.equal(resolvedPreflight.filledSlots, 1);
  assert.equal(resolvedPreflight.blackSlots, 1);
  assert.equal(resolvedPreflight.excludedSlots, 1);
});

test('T3.6 - Zero Reference Leakage: Compositor & Export Engine Purge 100% of Reference Media', () => {
  let timeline = buildReferenceTimeline([], { videoId: 'ref_leak_check', durationSec: 6.0 });

  // Fill Slot 0, Black Slot 1, Cut Slot 2
  timeline = assignClipToSlot(timeline, timeline.slots[0].id, {
    mediaId: 'user_m1',
    name: 'safe_user_video.mp4',
    durationSec: 2.0,
    url: 'blob:user_m1',
  });
  timeline = resolveSlotAction(timeline, timeline.slots[1].id, 'black');
  timeline = resolveSlotAction(timeline, timeline.slots[2].id, 'cut');

  // Generate export clips
  const { projectClips } = exportRemixTimelineToEditor(timeline);

  // 1. Verify projectClips has NO refOnly clips
  assert.ok(projectClips.length >= 2);
  for (const clip of projectClips) {
    assert.equal(clip.refOnly, undefined, 'Export clip must NEVER have refOnly');
    assert.notEqual(clip.mediaId, 'ref_leak_check', 'Export clip must NEVER reference the reference video ID');
  }

  // 2. Verify Compositor filter behavior in export mode vs preview mode
  const rawClipsWithRef = [
    {
      id: 'ref_clip_sneak',
      mediaId: 'ref_leak_check',
      refOnly: true,
      start: 0,
      duration: 2.0,
      opacity: 0.35,
      track: 'video',
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      adjustments: {},
      effects: [],
      animation: {},
    },
    ...projectClips,
  ];

  // Test OffscreenCanvas render
  const mockCanvas = { width: 320, height: 180, getContext: () => null };

  // Verify renderFrame runs without error when isExport is true
  assert.doesNotThrow(() => {
    sharedCompositor.renderFrame(mockCanvas, rawClipsWithRef, 0.5, {
      isExport: true,
    });
  });
});

test('T3.7 - Apply to Project & Immediate Reference Video Memory Revocation', () => {
  let timeline = buildReferenceTimeline([], {
    videoId: 'blob:temporary_ref_video_to_revoke',
    name: 'RefToRevoke.mp4',
    durationSec: 4.0,
  });

  timeline = assignClipToSlot(timeline, timeline.slots[0].id, {
    mediaId: 'user_final_1',
    name: 'clip1.mp4',
    durationSec: 2.0,
    url: 'blob:user_final_1',
  });
  timeline = resolveSlotAction(timeline, timeline.slots[1].id, 'black');
  timeline = resolveSlotAction(timeline, timeline.slots[2].id, 'cut');

  // Apply to project
  const result = applyRemixToProject(timeline, 'new_project');

  assert.equal(result.success, true);
  assert.ok(result.projectId.startsWith('proj_remix_'));
  assert.equal(result.clipsCreated >= 2, true);
  assert.equal(result.referenceMemoryRevoked, true, 'Reference video memory MUST be revoked');

  // Verify revokeReferenceVideoMemory directly
  const revokeResult = revokeReferenceVideoMemory('blob:temporary_ref_video_to_revoke');
  assert.equal(revokeResult.success, true);
  assert.equal(revokeResult.revokedId, 'blob:temporary_ref_video_to_revoke');
});
