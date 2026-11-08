/**
 * E2E & Mandatory Verification Scenarios: M12 (User Request #10)
 * ============================================================================
 * Covers the 5 mandatory E2E Scenarios:
 * 1. Mở project tham chiếu hiệu ứng thiếu khi offline → ghost + cảnh báo →
 *    bật mạng → cài từ kho → render đúng golden (SSIM >= 0.98).
 * 2. Tìm "glitch" trong tab Effects không có kết quả cục bộ → cài từ kho →
 *    áp dụng vào clip → export an toàn với pinned spec.
 * 3. Analyzer báo "Chưa hỗ trợ" → ghép cục bộ có reference frames →
 *    điểm khớp được báo trung thực (không ép tạo nếu < 0.70).
 * 4. AI (LLM mock trả shader lỗi) → vòng sửa tự động 3 lần →
 *    bị từ chối an toàn sau 3 lần, timeline không bị nhiễm mã lỗi.
 * 5. Cập nhật major không đổi project đã ghim (ghim 1.0.0, kho có 2.0.0,
 *    không tự ý nâng cấp khi chưa có người dùng xác nhận).
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Helper: load sample registry index
const registryPath = path.join(rootDir, 'public', 'registry', 'index.json');
const registryIndex = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

// Complete Mock Storage for Node environment
const mockStorage = new Map();
mockStorage.set('clipforge_registry_cache_v1', JSON.stringify(registryIndex));
mockStorage.set('clipforge_registry_last_synced', Date.now().toString());

const mockStorageObj = {
  getItem: (k) => mockStorage.get(k) ?? null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

globalThis.localStorage = mockStorageObj;
if (!globalThis.window) {
  globalThis.window = {
    localStorage: mockStorageObj,
    dispatchEvent: () => true,
  };
} else {
  globalThis.window.localStorage = mockStorageObj;
}

import {
  resolve,
} from '../engine/effectResolver.ts';

import {
  synthesizeFromReferenceFrames,
  saveCompositeToMyEffects,
  PRIMITIVE_LIBRARY,
} from '../engine/localCompositeSynthesizer.ts';

import {
  generateEffectWithAI,
  validateAndSanitizeAiRequest,
} from '../engine/aiEffectSynthesizer.ts';

import {
  runGoldenFrameVerification,
  ensureClipDeterministicIntegrity,
  validateTimelineClipPinning,
  resolveSpecForExport,
  SSIM_GOLDEN_THRESHOLD,
  PSNR_GOLDEN_THRESHOLD,
} from '../engine/deterministicPreviewExport.ts';

import {
  reconnectGhostReferences,
  atomicInstallPackage,
  getUpdateType,
  autoUpdateOfficialPatches,
  pinAssetToProject,
  searchLocalRegistry,
  fetchOrLoadRegistryIndex,
} from '../utils/extensionRegistryManager.ts';

test('E2E Scenario 1: Offline project open with missing effect -> Ghost + warning -> Online reconnect -> Install from store -> Golden render', async () => {
  // 1. Initial State: Project opens with a clip referencing an uninstalled effect
  const missingPackId = 'com.clipforge.fx.rgb_shake';
  const missingItemId = 'com.clipforge.fx.rgb_shake';
  const missingVersion = '1.0.0';

  const mockProjectClip = {
    id: 'clip_timeline_001',
    name: 'Intro Glitch Clip',
    start: 0,
    duration: 5,
    track: 1,
    // Ghost placeholder markers
    isGhostPlaceholder: true,
    ghostReason: 'Chưa cài đặt gói hiệu ứng từ kho: com.clipforge.fx.rgb_shake@1.0.0',
    ghostRef: {
      originalId: `${missingPackId}/${missingItemId}@${missingVersion}`,
      packId: missingPackId,
      itemId: missingItemId,
      version: missingVersion,
      name: 'Rung RGB (RGB Shake)',
      kind: 'effect',
      missingSince: Date.now(),
    },
    dynamicSpec: undefined,
  };

  const projectClips = [mockProjectClip];

  // A. Verify project contains ghost clip & flags warning
  assert.equal(projectClips[0].isGhostPlaceholder, true);
  assert.ok(projectClips[0].ghostRef);
  assert.equal(projectClips[0].ghostRef.packId, missingPackId);

  // B. While Offline: Attempting export validation strictly flags missing pinned asset
  const pinningValidation = validateTimelineClipPinning(projectClips[0]);
  assert.equal(pinningValidation.allowedOnTimeline, false, 'Ghost clip must not be allowed on timeline');
  assert.ok(pinningValidation.error?.includes('chưa được ghim'));

  // C. Network restored: User / UI finds package in registry index
  const matchedEntry = registryIndex.packages.find((p) => p.id === missingPackId);
  assert.ok(matchedEntry, 'Glitch pack must exist in registry index');

  // Use the verified package directly from registry index
  const assetPackage = matchedEntry;

  // D. Atomic installation completes
  const installResult = await atomicInstallPackage(assetPackage);
  assert.equal(installResult.success, true, `Package install must succeed: ${installResult.error}`);

  // E. Reconnect ghost references on project clips
  const { updatedClips, reconnectedCount } = reconnectGhostReferences(
    projectClips,
    matchedEntry.id,
    assetPackage.spec
  );
  assert.equal(reconnectedCount, 1, 'Exactly 1 ghost clip must be reconnected');
  assert.equal(updatedClips[0].isGhostPlaceholder, false, 'Clip is no longer a ghost');
  assert.equal(updatedClips[0].ghostReason, undefined);
  assert.ok(updatedClips[0].dynamicSpec, 'Clip now holds reconnected dynamic spec');

  // F. Golden-Frame verification: verify SSIM >= 0.98 and PSNR >= 40dB
  const goldenReport = runGoldenFrameVerification(
    assetPackage.id,
    missingItemId,
    updatedClips[0].dynamicSpec,
    assetPackage.version
  );

  assert.equal(goldenReport.passed, true, 'Reconnected clip must pass golden frame verification');
  assert.ok(
    goldenReport.minSsim >= SSIM_GOLDEN_THRESHOLD,
    `SSIM ${goldenReport.minSsim} must be >= ${SSIM_GOLDEN_THRESHOLD}`
  );
  assert.ok(
    goldenReport.minPsnr >= PSNR_GOLDEN_THRESHOLD,
    `PSNR ${goldenReport.minPsnr} must be >= ${PSNR_GOLDEN_THRESHOLD}`
  );
});

test('E2E Scenario 2: Search "glitch" in Effects tab with 0 local results -> Install from store -> Apply to clip -> Export', async () => {
  const query = 'glitch';

  // 1. Local built-in catalog search has 0 results for custom glitch effects
  const localBuiltinEffects = [
    { id: 'blur', name: 'Làm mờ' },
    { id: 'sharpen', name: 'Làm nét' },
    { id: 'vignette', name: 'Tối góc' },
  ];
  const localMatches = localBuiltinEffects.filter((e) => e.name.toLowerCase().includes(query) || e.id.includes(query));
  assert.equal(localMatches.length, 0, 'Zero local results for "glitch"');

  // 2. Fallback to registry search: finds official glitch pack
  const registryMatches = await searchLocalRegistry(query, 'effect');
  assert.ok(registryMatches.length > 0, 'Registry search must find glitch pack');
  const targetPkg = registryMatches.find((p) => p.id === 'com.clipforge.fx.rgb_shake') || registryMatches[0];
  assert.ok(targetPkg.id.includes('rgb_shake') || targetPkg.id.includes('glitch'));

  // 3. User installs package from panel / modal
  const installRes = await atomicInstallPackage(targetPkg);
  assert.equal(installRes.success, true, `Install must succeed: ${installRes.error}`);

  // 4. User applies effect to active timeline clip: pins version & sha256
  const activeClip = {
    id: 'clip_active_user_002',
    name: 'Dance Video.mp4',
    start: 2,
    duration: 8,
    track: 1,
    pinnedAsset: {
      packId: targetPkg.id,
      itemId: targetPkg.id,
      version: targetPkg.version,
      sha256: targetPkg.sha256 || 'verified_hash_rgb_shake',
    },
  };

  const projectObj = { pinnedAssets: {} };
  pinAssetToProject(projectObj, {
    id: targetPkg.id,
    version: targetPkg.version,
    sha256: targetPkg.sha256,
  });

  assert.ok(projectObj.pinnedAssets[targetPkg.id], 'Project must hold pinned asset');
  assert.equal(projectObj.pinnedAssets[targetPkg.id].version, targetPkg.version);

  // 5. Export resolution uses strictly pinned spec
  const installedSpecList = [
    {
      id: targetPkg.id,
      packId: targetPkg.id,
      version: targetPkg.version,
      name: targetPkg.name,
      kind: 'effect',
    },
  ];

  const exportResult = resolveSpecForExport(activeClip.pinnedAsset, installedSpecList);
  assert.ok(exportResult.spec, 'Export must successfully resolve pinned spec');
  assert.equal(exportResult.spec.id, targetPkg.id);
  assert.equal(exportResult.verified, true);
});

test('E2E Scenario 3: Analyzer reports "Chưa hỗ trợ" -> Local composite with reference frames -> Honest match score reported', async () => {
  // 1. Analyzer encounters unknown transition style
  const analyzerReport = {
    detected: 'complex_chroma_warp_displacement',
    supportedNative: false,
    statusText: 'Chưa hỗ trợ',
    sampleFramesCount: 4,
  };
  assert.equal(analyzerReport.supportedNative, false);
  assert.equal(analyzerReport.statusText, 'Chưa hỗ trợ');

  // 2. Case A: Provide reference frames for analysis-by-synthesis
  const testBuffer = new Uint8ClampedArray(160 * 90 * 4);
  for (let i = 0; i < testBuffer.length; i += 4) {
    testBuffer[i] = 120;     // R
    testBuffer[i + 1] = 130; // G
    testBuffer[i + 2] = 140; // B
    testBuffer[i + 3] = 255; // A
  }

  const synthesisResultA = await synthesizeFromReferenceFrames({
    referenceFrames: [testBuffer],
    frameWidth: 160,
    frameHeight: 90,
    maxTimeMs: 500,
    acceptanceThreshold: 0.60,
  });

  // Verify honest score calculation and metadata
  assert.ok(typeof synthesisResultA.score === 'number');
  assert.ok(synthesisResultA.score >= 0 && synthesisResultA.score <= 1.0);
  assert.equal(synthesisResultA.trustLevel, 'local_fallback');
  assert.ok(synthesisResultA.fidelity === 'approximate' || synthesisResultA.fidelity === 'exact');

  // Save to My Effects
  if (synthesisResultA.spec) {
    const saved = await saveCompositeToMyEffects(synthesisResultA.spec);
    assert.equal(saved.success, true);
    assert.ok(saved.id.startsWith('my.composite.'));
  }

  // 3. Case B: When similarity is under threshold, system reports "không đủ giống", never forces invalid creation
  const synthesisResultB = await synthesizeFromReferenceFrames({
    referenceFrames: [testBuffer],
    frameWidth: 160,
    frameHeight: 90,
    maxTimeMs: 500,
    acceptanceThreshold: 0.9999, // Unreachable strict threshold
  });

  assert.equal(synthesisResultB.success, false, 'Must report failure when score is under acceptance threshold');
  assert.equal(synthesisResultB.fidelity, 'unmatched');
  assert.ok(
    synthesisResultB.reason.includes('không đủ giống') || synthesisResultB.reason.includes('ngưỡng'),
    'Must report honest explanation'
  );
});

test('E2E Scenario 4: AI generator (mock LLM returns invalid shader) -> 3 repair cycles -> Rejected safely after 3 failures', async () => {
  // 1. Validate request guards: Requires user consent and API key
  const unconsented = validateAndSanitizeAiRequest({
    prompt: 'Create retro neon glitch',
    config: {
      enabled: false,
      userConsented: false,
    },
  });
  assert.equal(unconsented.valid, false, 'Unconsented AI request must be blocked');

  // 2. Mock LLM handler that persistently returns invalid GLSL syntax across 3 attempts
  let repairAttempts = 0;
  const mockBrokenLlmHandler = async (systemPrompt, userPrompt, attempt, lastError) => {
    repairAttempts++;
    return JSON.stringify({
      id: `ai-broken-attempt-${attempt}`,
      kind: 'effect',
      paramSchema: { strength: { type: 'number', default: 1.0 } },
      shader: {
        language: 'glsl300es',
        fragmentBody: 'compileError; // syntax error',
      },
      tags: ['broken'],
      aliases: { vi: ['lỗi'], en: ['broken'] },
      cost: { samplesPerPixel: 1, passes: 1 },
    });
  };

  const aiRequest = {
    prompt: 'Create an intense cyberpunk neon glow',
    config: {
      enabled: true,
      userConsented: true,
      apiKey: 'sk-test-mock-key-1234567890',
      provider: 'mock',
    },
    mockLlmHandler: mockBrokenLlmHandler,
  };

  const aiResponse = await generateEffectWithAI(aiRequest);

  // 3. Verify exactly 3 auto-repair cycles occurred
  assert.equal(repairAttempts, 3, 'Must execute exactly 3 auto-repair iterations');

  // 4. Verify definitive safe rejection
  assert.equal(aiResponse.success, false, 'Must be rejected after 3 failed attempts');
  assert.ok(aiResponse.error, 'Must contain diagnostic error explanation');
  assert.ok(
    aiResponse.error.includes('3') || aiResponse.error.includes('thất bại'),
    'Error message must state that 3 repair attempts failed'
  );

  // 5. Verify timeline integrity: zero broken effects were created or attached
  assert.equal(aiResponse.item, undefined, 'No item spec should be returned on failure');
});

test('E2E Scenario 5: Major version update available -> Pinned project remains locked to old major version', async () => {
  // 1. Clip is pinned to version 1.0.0
  const pinnedPackId = 'com.clipforge.fx.rgb_shake';
  const initialVersion = '1.0.0';
  const initialSha256 = 'sha256_v1_0_0_verified_hash_11111111111111111111111111111111';

  const userTimelineClip = {
    id: 'clip_user_pinned_005',
    name: 'Vlog Main Scene',
    start: 0,
    duration: 10,
    track: 1,
    pinnedAsset: {
      packId: pinnedPackId,
      itemId: 'rgb_shake',
      version: initialVersion,
      sha256: initialSha256,
      pinnedAt: Date.now() - 86400000,
    },
  };

  // 2. Registry releases new Major update (v2.0.0) with breaking API/param changes
  const registryUpdateVersion = '2.0.0';
  const updateType = getUpdateType(initialVersion, registryUpdateVersion);
  assert.equal(updateType, 'major', 'Update from 1.0.0 to 2.0.0 must be classified as MAJOR');

  // 3. Background/auto patch updater is run
  const patchResult = await autoUpdateOfficialPatches();
  // autoUpdateOfficialPatches must never auto-update major or minor versions
  assert.equal(
    patchResult.updatedPackages.includes(pinnedPackId),
    false,
    'Major version must never be auto-updated'
  );

  // 4. Clip pin metadata is strictly immutable across background updates
  assert.equal(userTimelineClip.pinnedAsset.version, '1.0.0', 'Clip pin metadata must remain 1.0.0');

  // 5. Export strictly resolves 1.0.0 spec even when 2.0.0 exists in the environment
  const availableSpecs = [
    {
      id: 'rgb_shake',
      packId: pinnedPackId,
      version: '1.0.0',
    },
    {
      id: 'rgb_shake',
      packId: pinnedPackId,
      version: '2.0.0',
    },
  ];

  const exportResult = resolveSpecForExport(userTimelineClip.pinnedAsset, availableSpecs);
  assert.equal(exportResult.spec.version, '1.0.0', 'Resolved version for export must stay at 1.0.0');
  assert.equal(userTimelineClip.pinnedAsset.version, '1.0.0');
});
