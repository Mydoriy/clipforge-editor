/**
 * Unit Tests for M8: Deterministic Execution Engine (Preview = Export Guarantee)
 * ============================================================================
 * Verifies:
 * 1. Timeline Clip Pinning: Rejects unpinned clips and enforces { packId, itemId, version, sha256 }.
 * 2. Export Spec Resolution: Strict version/sha256 matching; forbids silent upgrades.
 * 3. Deterministic Clip Seed: Idempotent PRNG seed generation and persistence in clip.seed.
 * 4. Golden-Frame Verification at 5 progress steps [0.0, 0.25, 0.5, 0.75, 1.0]:
 *    Enforces SSIM >= 0.98 and PSNR >= 40dB.
 * 5. Non-deterministic / Drift Detection: Detects and rejects Math.random() or seed divergence.
 * 6. Suite Verification: Batch verification for official specs in CI pipeline.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOLDEN_FRAME_PROGRESS_STEPS,
  SSIM_GOLDEN_THRESHOLD,
  PSNR_GOLDEN_THRESHOLD,
  DEFAULT_DETERMINISTIC_SEED,
  generateDeterministicClipSeed,
  ensureClipDeterministicIntegrity,
  validateTimelineClipPinning,
  resolveSpecForExport,
  deterministicHash2D,
  renderTestFrameBuffer,
  runGoldenFrameVerification,
  verifyAllOfficialSpecsGoldenFrames,
} from '../engine/deterministicPreviewExport.ts';
import { compareFrames } from '../utils/goldenFrameTest.ts';

test('M8.1 - Timeline Clip Pinning: Only allows clips with pinned packId, itemId, version, and sha256', () => {
  // A. Unpinned clip without pinnedAsset is rejected from timeline
  const unpinnedClip = {
    id: 'clip-unpinned-01',
    name: 'Glitch Effect Clip',
    dynamicEffectId: 'retro-glitch',
  };

  const check1 = validateTimelineClipPinning(unpinnedClip);
  assert.equal(check1.allowedOnTimeline, false);
  assert.match(check1.error || '', /chưa được ghim phiên bản và hash/);

  // B. Incompletely pinned clip (missing sha256) is rejected
  const incompleteClip = {
    id: 'clip-incomplete-02',
    pinnedAsset: {
      packId: 'official.effects',
      itemId: 'glitch',
      version: '1.0.0',
      // sha256 missing
    },
  };

  const check2 = validateTimelineClipPinning(incompleteClip);
  assert.equal(check2.allowedOnTimeline, false);

  // C. Fully pinned clip is allowed onto timeline
  const pinnedClip = {
    id: 'clip-valid-03',
    pinnedAsset: {
      packId: 'official.retro-pack',
      itemId: 'vhs-glitch',
      version: '1.2.0',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  };

  const check3 = validateTimelineClipPinning(pinnedClip);
  assert.equal(check3.allowedOnTimeline, true);
  assert.equal(check3.error, undefined);

  // D. Supports pinnedEffect field as alias
  const aliasClip = {
    id: 'clip-alias-04',
    pinnedEffect: {
      packId: 'official.transitions',
      itemId: 'cross-dissolve',
      version: '2.0.0',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    },
  };
  const check4 = validateTimelineClipPinning(aliasClip);
  assert.equal(check4.allowedOnTimeline, true);
});

test('M8.2 - Export Spec Resolution: Strict version/sha256 lock without silent upgrade', () => {
  const installedSpecs = [
    {
      id: 'official.effects/cinematic-glow',
      version: '1.0.0',
      name: { vi: 'Hào quang điện ảnh', en: 'Cinematic Glow' },
      kind: 'effect',
      author: 'CapCut Official',
    },
    {
      id: 'official.effects/cinematic-glow',
      version: '1.1.0', // Minor update installed later
      name: { vi: 'Hào quang điện ảnh v1.1', en: 'Cinematic Glow v1.1' },
      kind: 'effect',
      author: 'CapCut Official',
    },
    {
      id: 'official.transitions/whip-pan',
      version: '1.0.0',
      name: { vi: 'Chuyển cảnh lia', en: 'Whip Pan' },
      kind: 'transition',
      author: 'CapCut Official',
    },
  ];

  const pinned = {
    packId: 'official.effects',
    itemId: 'cinematic-glow',
    version: '1.0.0',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };

  // A. Successfully resolves pinned version 1.0.0 (does NOT silently upgrade to 1.1.0)
  const resolved = resolveSpecForExport(pinned, installedSpecs);
  assert.equal(resolved.verified, true);
  assert.equal(resolved.spec.version, '1.0.0');
  assert.equal(resolved.spec.id, 'official.effects/cinematic-glow');

  // B. Fails and throws if project demands version not present
  const missingPinned = {
    packId: 'official.effects',
    itemId: 'cinematic-glow',
    version: '0.9.0',
    sha256: 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
  };

  assert.throws(
    () => resolveSpecForExport(missingPinned, installedSpecs),
    /Không tìm thấy đúng phiên bản spec đã ghim/
  );

  // C. Fails if pinned asset info is corrupted or missing sha256
  assert.throws(
    () => resolveSpecForExport({ packId: 'pkg', itemId: 'glow', version: '1.0.0', sha256: '' }, installedSpecs),
    /Thông tin ghim của clip bị thiếu/
  );
});

test('M8.3 - Deterministic Clip Seed Generation: Idempotent and persistent in clip state', () => {
  const clipId = 'timeline-clip-intro-42';

  // A. Generating seed multiple times with same clipId gives identical result
  const seed1 = generateDeterministicClipSeed(clipId);
  const seed2 = generateDeterministicClipSeed(clipId);
  assert.equal(seed1, seed2);
  assert.ok(typeof seed1 === 'number' && seed1 > 0);

  // B. Different clip ID produces different seed
  const otherSeed = generateDeterministicClipSeed('timeline-clip-outro-99');
  assert.notEqual(seed1, otherSeed);

  // C. ensureClipDeterministicIntegrity initializes and persists seed on the clip object
  const clip = { id: clipId, name: 'Intro' };
  const integrity = ensureClipDeterministicIntegrity(clip);
  assert.equal(integrity.seed, seed1);
  assert.equal(clip.seed, seed1);

  // D. Existing clip seed is strictly preserved (never overwritten)
  const existingClip = { id: clipId, seed: 777.7 };
  const integrity2 = ensureClipDeterministicIntegrity(existingClip);
  assert.equal(integrity2.seed, 777.7);
  assert.equal(existingClip.seed, 777.7);
});

test('M8.4 - Golden-Frame Verification: 5 Progress Steps with SSIM >= 0.98 and PSNR >= 40dB', () => {
  // Verify 5 standard progress steps [0.0, 0.25, 0.5, 0.75, 1.0]
  assert.deepEqual(Array.from(GOLDEN_FRAME_PROGRESS_STEPS), [0.0, 0.25, 0.5, 0.75, 1.0]);

  const officialSpec = {
    id: 'official.effects/grain-and-jitter',
    version: '1.0.0',
  };

  const report = runGoldenFrameVerification(officialSpec, 42.0);

  assert.equal(report.specId, 'official.effects/grain-and-jitter');
  assert.equal(report.version, '1.0.0');
  assert.equal(report.passed, true);
  assert.equal(report.steps.length, 5);

  // Each milestone must satisfy broadcast standards
  for (const step of report.steps) {
    assert.ok(
      step.ssim >= SSIM_GOLDEN_THRESHOLD,
      `Step ${step.progress} failed SSIM: ${step.ssim} < ${SSIM_GOLDEN_THRESHOLD}`
    );
    assert.ok(
      step.psnr >= PSNR_GOLDEN_THRESHOLD,
      `Step ${step.progress} failed PSNR: ${step.psnr} < ${PSNR_GOLDEN_THRESHOLD}`
    );
    assert.equal(step.maxDiff, 0, `Deterministic render buffers must be bit-identical`);
    assert.equal(step.isMatch, true);
  }

  assert.equal(report.minSsim, 1.0);
  assert.ok(report.minPsnr >= 40.0);
});

test('M8.5 - Non-deterministic / Seed Divergence Detection: Prevents Math.random drift', () => {
  const seedPreview = 42.0;
  const seedExportDiverged = 999.0; // Simulates random seed variation or Math.random()

  // 1. Same seed produces 100% bit-identical buffers
  const bufPreview = renderTestFrameBuffer(0.5, 1.0, seedPreview, 'preview', 32, 32);
  const bufExportMatch = renderTestFrameBuffer(0.5, 1.0, seedPreview, 'export', 32, 32);
  const matchResult = compareFrames(bufPreview, bufExportMatch, SSIM_GOLDEN_THRESHOLD, PSNR_GOLDEN_THRESHOLD);
  assert.equal(matchResult.isMatch, true);
  assert.equal(matchResult.maxDiff, 0);

  // 2. Different seeds produce distinct noise buffers (drift detected)
  const bufExportDiverged = renderTestFrameBuffer(0.5, 1.0, seedExportDiverged, 'export', 32, 32);
  const divergedResult = compareFrames(bufPreview, bufExportDiverged, SSIM_GOLDEN_THRESHOLD, PSNR_GOLDEN_THRESHOLD);
  assert.ok(divergedResult.maxDiff > 0, 'Seed mismatch must cause detected pixel differences');

  // 3. deterministicHash2D is 100% deterministic
  const h1 = deterministicHash2D(0.35, 0.72, 123.45);
  const h2 = deterministicHash2D(0.35, 0.72, 123.45);
  assert.equal(h1, h2);
});

test('M8.6 - Suite Verification: Batch Golden-Frame Verification for Official Specs', () => {
  const officialCatalog = [
    { id: 'official.transitions/cross-dissolve', version: '1.0.0' },
    { id: 'official.transitions/whip-pan', version: '1.0.0' },
    { id: 'official.effects/retro-glitch', version: '1.0.0' },
    { id: 'official.filters/cinematic-teal-orange', version: '1.0.0' },
    { id: 'official.animations/zoom-pulse', version: '1.0.0' },
  ];

  const suiteResult = verifyAllOfficialSpecsGoldenFrames(officialCatalog);

  assert.equal(suiteResult.allPassed, true);
  assert.equal(suiteResult.totalTested, 5);
  assert.equal(suiteResult.reports.length, 5);
  for (const report of suiteResult.reports) {
    assert.equal(report.passed, true);
    assert.equal(report.steps.length, 5);
  }
});
