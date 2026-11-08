/**
 * T4. TỰ ĐỘNG LƯU KỸ THUẬT ĐÃ HỌC (Auto-Save Learned Technique) Test Suite
 * ============================================================================
 * Verifies:
 * 1. LearnedItem format: namespace user.learned/<id>@<semver>, trustLevel "ai_learned_verified",
 *    provenance (SHA-256 refHash, plannerId, modelId, promptVersion), redistributable: false.
 * 2. Two Thresholds: HIGH (>= 0.82) -> Auto-save with toast vs LOW (0.75-0.81) -> Review Inbox.
 * 3. Fingerprint & Deduplication: Hamming distance <= 4, variant counter, SemVer version bump
 *    on improved score without overwriting.
 * 4. Neutral Synthetic Thumbnail: SVG geometric pattern with ZERO reference video pixels.
 * 5. Brand & Username Filter: strips "CapCut", "TikTok", @usernames to clean neutral names.
 * 6. Template Auto-generation: Slots + Recipe without any media, saved to Templates > "Của tôi".
 * 7. Management: list, search, rename, status update, delete, M4 quota tracking.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateAndSaveLearnedTechnique,
  computeTechniqueFingerprint,
  calculateHammingDistance,
  renderNeutralThumbnail,
  sanitizeTechniqueName,
  generateLearnedTemplate,
  listLearnedItems,
  renameLearnedItem,
  updateLearnedItemStatus,
  deleteLearnedItem,
  getLearnedStorageUsageBytes,
  clearLearnedStoreForTesting,
} from '../engine/learnedTechniqueManager.ts';

import { LearnedItemZod } from '../types/learnedTechnique.ts';
import { buildReferenceTimeline } from '../engine/remixEngine.ts';

test.beforeEach(() => {
  clearLearnedStoreForTesting();
});

test('T4.1 - LearnedItem Data Model, Namespace & Provenance Integrity', async () => {
  const result = await evaluateAndSaveLearnedTechnique({
    rawName: 'Rung quang sai RGB theo beat',
    kind: 'effect',
    spec: {
      graph: [{ primitiveId: 'core.primitive.channel_shift', params: { shift: 8 } }],
      params: { shift: 8 },
    },
    verifiedScore: 0.88,
    provenance: {
      refHash: 'sha256_mock_hash_abc123',
      analyzedAt: 1731050000000,
      plannerId: 'gemini-direct',
      modelId: 'gemini-2.5-pro',
      promptVersion: 'v2.1',
    },
    tags: ['rgb', 'shake', 'beat'],
  });

  assert.equal(result.action, 'saved_auto');
  const item = result.item;
  assert.ok(item);

  // 1. Check Namespace & SemVer
  assert.ok(item.id.startsWith('user.learned/'));
  assert.equal(item.version, '1.0.0');
  assert.equal(item.fullId, `${item.id}@1.0.0`);

  // 2. Check Trust Level & Redistribution
  assert.equal(item.trustLevel, 'ai_learned_verified');
  assert.equal(item.redistributable, false, 'Must never redistribute learned items publicly');

  // 3. Check Provenance (local only)
  assert.equal(item.provenance.refHash, 'sha256_mock_hash_abc123');
  assert.equal(item.provenance.plannerId, 'gemini-direct');
  assert.equal(item.provenance.promptVersion, 'v2.1');

  // 4. Validate with Zod schema
  assert.doesNotThrow(() => LearnedItemZod.parse(item));
});

test('T4.2 - Two-Threshold Routing: HIGH (Auto) vs LOW (Inbox) & Settings Controls', async () => {
  const baseInput = {
    rawName: 'Quét mờ góc rộng',
    kind: 'transition',
    spec: { graph: [{ primitiveId: 'core.primitive.blur.directional', params: { length: 14 } }] },
    provenance: {
      refHash: 'hash_threshold_test',
      analyzedAt: Date.now(),
      plannerId: 'none',
      modelId: 'local-heuristic',
      promptVersion: 'v1.0',
    },
  };

  // Case A: High score (0.86 >= 0.82) in 'auto' mode -> Auto-saved
  const highResult = await evaluateAndSaveLearnedTechnique({
    ...baseInput,
    verifiedScore: 0.86,
  });
  assert.equal(highResult.action, 'saved_auto');
  assert.equal(highResult.item?.status, 'auto');
  assert.ok(highResult.toastMessage?.vi.includes('Đã lưu'));
  assert.ok(highResult.toastMessage?.vi.includes('Hoàn tác'));

  clearLearnedStoreForTesting();

  // Case B: Moderate score (0.78, between 0.75 and 0.82) -> Routed to Inbox
  const midResult = await evaluateAndSaveLearnedTechnique({
    ...baseInput,
    rawName: 'Quét mờ góc vừa',
    verifiedScore: 0.78,
  });
  assert.equal(midResult.action, 'routed_to_inbox');
  assert.equal(midResult.item?.status, 'inbox');
  assert.ok(midResult.toastMessage?.vi.includes('Cần xem'));

  clearLearnedStoreForTesting();

  // Case C: Low score (< 0.75) -> Rejected
  const lowResult = await evaluateAndSaveLearnedTechnique({
    ...baseInput,
    verifiedScore: 0.65,
  });
  assert.equal(lowResult.action, 'rejected_low_score');

  // Case D: High score with Settings mode = 'always_ask' -> Routes to Inbox
  const askResult = await evaluateAndSaveLearnedTechnique(
    {
      ...baseInput,
      verifiedScore: 0.90,
    },
    { settings: { mode: 'always_ask', highThreshold: 0.82, lowThreshold: 0.75 } }
  );
  assert.equal(askResult.action, 'routed_to_inbox');
  assert.equal(askResult.item?.status, 'inbox');

  // Case E: Settings mode = 'off' -> Disabled
  const offResult = await evaluateAndSaveLearnedTechnique(
    {
      ...baseInput,
      verifiedScore: 0.95,
    },
    { settings: { mode: 'off', highThreshold: 0.82, lowThreshold: 0.75 } }
  );
  assert.equal(offResult.action, 'disabled');
});

test('T4.3 - Perceptual Fingerprinting & Deduplication (Hamming Distance <= 4)', async () => {
  const specA = {
    graph: [{ primitiveId: 'core.primitive.channel_shift', params: { shift: 6 } }],
    params: { shift: 6 },
  };

  const fpA = computeTechniqueFingerprint(specA, 'effect');
  assert.equal(typeof fpA, 'string');
  assert.equal(fpA.length, 16);

  // 1. Initial save of technique
  const firstSave = await evaluateAndSaveLearnedTechnique({
    rawName: 'Tách kênh màu',
    kind: 'effect',
    spec: specA,
    verifiedScore: 0.84,
    provenance: {
      refHash: 'hash_1',
      analyzedAt: 1000,
      plannerId: 'none',
      modelId: 'local',
      promptVersion: '1.0',
    },
  });
  assert.equal(firstSave.action, 'saved_auto');
  assert.equal(firstSave.item?.version, '1.0.0');

  // 2. Re-learning the exact same technique with slightly lower or equal score
  // MUST NOT create a new item; increments variant count
  const duplicateSave = await evaluateAndSaveLearnedTechnique({
    rawName: 'Tách kênh màu đỏ lam',
    kind: 'effect',
    spec: specA,
    verifiedScore: 0.83,
    provenance: {
      refHash: 'hash_2',
      analyzedAt: 2000,
      plannerId: 'none',
      modelId: 'local',
      promptVersion: '1.0',
    },
  });

  assert.equal(duplicateSave.action, 'variant_incremented');
  assert.equal(duplicateSave.item?.variantCount, 1);
  assert.equal(duplicateSave.item?.version, '1.0.0');

  // 3. Re-learning with noticeably higher score (0.84 -> 0.92)
  // MUST bump SemVer version without overwriting the previous spec
  const upgradeSave = await evaluateAndSaveLearnedTechnique({
    rawName: 'Tách kênh màu tối ưu cao',
    kind: 'effect',
    spec: specA,
    verifiedScore: 0.92,
    provenance: {
      refHash: 'hash_3',
      analyzedAt: 3000,
      plannerId: 'gemini-direct',
      modelId: 'gemini-2.5-pro',
      promptVersion: '2.0',
    },
  });

  assert.equal(upgradeSave.action, 'version_bumped');
  assert.equal(upgradeSave.item?.version, '1.1.0');
  assert.equal(upgradeSave.item?.verifiedScore, 0.92);
});

test('T4.4 - Neutral Synthetic Thumbnail (ZERO Reference Frame Pixels)', () => {
  const thumbSvgDataUrl = renderNeutralThumbnail('transition', 'Quét mờ nhanh');
  assert.ok(thumbSvgDataUrl.startsWith('data:image/svg+xml'));

  const decodedSvg = decodeURIComponent(thumbSvgDataUrl);
  // Ensure it renders purely synthetic geometric SVG elements
  assert.ok(decodedSvg.includes('<svg'));
  assert.ok(decodedSvg.includes('linearGradient'));
  assert.ok(decodedSvg.includes('circle'));
  // Ensure no media reference url is leaked
  assert.equal(decodedSvg.includes('blob:'), false);
  assert.equal(decodedSvg.includes('.mp4'), false);
  assert.equal(decodedSvg.includes('.webm'), false);
});

test('T4.5 - Brand Name & Username Sanitization Filter', () => {
  // Case A: Name containing social / commercial brands
  const badName1 = 'Hiệu ứng CapCut TikTok hot trend 2026';
  const clean1 = sanitizeTechniqueName(badName1);
  assert.equal(clean1.vi.toLowerCase().includes('capcut'), false);
  assert.equal(clean1.vi.toLowerCase().includes('tiktok'), false);
  assert.ok(clean1.vi.includes('hot trend 2026'));

  // Case B: Name containing @username
  const badName2 = 'Rung màu theo nhạc của @creator.pro_123';
  const clean2 = sanitizeTechniqueName(badName2);
  assert.equal(clean2.vi.includes('@creator'), false);
  assert.equal(clean2.vi.trim(), 'Rung màu theo nhạc của');

  // Case C: Name containing ONLY forbidden brands -> Falls back to descriptive default
  const badName3 = 'CapCut TikTok ByteDance';
  const clean3 = sanitizeTechniqueName(badName3);
  assert.equal(clean3.vi, 'Hiệu ứng học từ AI');
});

test('T4.6 - Auto-Generate Template from Remix Timeline (Zero Media Content)', () => {
  const timeline = buildReferenceTimeline([], {
    videoId: 'blob:ref_for_template_generation',
    name: 'DanceBeat.mp4',
    durationSec: 6.0,
    aspectRatio: '9:16',
  });

  const template = generateLearnedTemplate(timeline, 'Mẫu nhảy theo nhịp TikTok');

  // 1. Template metadata
  assert.ok(template.id.startsWith('tpl_learned_'));
  assert.equal(template.aspectRatio, '9:16');
  assert.equal(template.durationSec, 6.0);
  assert.equal(template.category, 'Của tôi');

  // 2. Ensure brand is stripped from template name
  assert.equal(template.name.toLowerCase().includes('tiktok'), false);

  // 3. Ensure ZERO media is stored
  assert.equal(template.slots.length, 3);
  for (const slot of template.slots) {
    assert.equal(slot.mediaUrl, undefined);
    assert.equal(slot.src, undefined);
    assert.ok(slot.techniques);
  }

  // 4. Thumbnail uses neutral synthetic placeholder
  assert.ok(template.thumbnailUrl.startsWith('data:image/svg+xml'));
});

test('T4.7 - Management CRUD & Storage Quota Tracking', async () => {
  // 1. Create 2 learned items
  await evaluateAndSaveLearnedTechnique({
    rawName: 'Làm mờ chuyển động',
    kind: 'transition',
    spec: { graph: [] },
    verifiedScore: 0.88,
    provenance: { refHash: 'h1', analyzedAt: 1, plannerId: 'none', modelId: 'local', promptVersion: '1' },
    tags: ['blur', 'fast'],
  });

  await evaluateAndSaveLearnedTechnique({
    rawName: 'Màu phim cổ điển',
    kind: 'look',
    spec: { graph: [] },
    verifiedScore: 0.77, // Inbox status
    provenance: { refHash: 'h2', analyzedAt: 2, plannerId: 'none', modelId: 'local', promptVersion: '1' },
    tags: ['vintage', 'film'],
  });

  // 2. List & Query filter
  const allItems = listLearnedItems();
  assert.equal(allItems.length, 2);

  const inboxItems = listLearnedItems({ status: 'inbox' });
  assert.equal(inboxItems.length, 1);
  assert.equal(inboxItems[0].kind, 'look');

  const searchResults = listLearnedItems({ query: 'cổ điển' });
  assert.equal(searchResults.length, 1);

  // 3. Rename
  const targetItem = allItems[0];
  const renameOk = renameLearnedItem(targetItem.fullId, 'Chuyển cảnh quét tia chớp');
  assert.equal(renameOk, true);
  assert.equal(targetItem.name.vi, 'Chuyển cảnh quét tia chớp');

  // 4. Update status (e.g. user clicks "Keep" in inbox)
  const inboxItem = inboxItems[0];
  const keepOk = updateLearnedItemStatus(inboxItem.fullId, 'auto');
  assert.equal(keepOk, true);
  assert.equal(inboxItem.status, 'auto');

  // 5. Storage Quota Calculation
  const totalBytes = getLearnedStorageUsageBytes();
  assert.ok(totalBytes > 0);

  // 6. Delete Item
  const deleteOk = deleteLearnedItem(targetItem.fullId);
  assert.equal(deleteOk, true);
  assert.equal(listLearnedItems().length, 1);
});
