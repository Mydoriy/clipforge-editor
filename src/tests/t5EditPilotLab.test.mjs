import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAB_ACTION_TYPES,
  validateLabAction,
  extractTimestampFromQuery,
  answerTechniqueQuestionWithEvidence,
  setCachedEvidencePacks,
  getCachedEvidencePacks,
  clearCachedEvidencePacksForTesting,
} from '../engine/editPilotLabExtension.ts';

test('T5.1: Action validation validates all 5 valid lab actions with scalar parameters', () => {
  // 1. learnFromReference
  const act1 = validateLabAction({
    action: 'learnFromReference',
    refUrl: 'https://example.com/reference.mp4',
    videoId: 'ref_123',
  });
  assert.equal(act1.valid, true);
  assert.equal(act1.action.action, 'learnFromReference');
  assert.equal(act1.action.refUrl, 'https://example.com/reference.mp4');

  // 2. swapShot
  const act2 = validateLabAction({
    action: 'swapShot',
    slotId: 'slot_0',
    mediaId: 'user_clip_1',
    fitMode: 'trim',
  });
  assert.equal(act2.valid, true);
  assert.equal(act2.action.action, 'swapShot');
  assert.equal(act2.action.slotId, 'slot_0');
  assert.equal(act2.action.mediaId, 'user_clip_1');

  // 3. applyLearned
  const act3 = validateLabAction({
    action: 'applyLearned',
    itemId: 'user.learned/whip-blur@1.0.0',
    target: 'clip_video_main',
    intensity: 0.85,
  });
  assert.equal(act3.valid, true);
  assert.equal(act3.action.action, 'applyLearned');
  assert.equal(act3.action.itemId, 'user.learned/whip-blur@1.0.0');

  // 4. saveLearned
  const act4 = validateLabAction({
    action: 'saveLearned',
    itemId: 'user.learned/rgb-shift@1.0.0',
    destination: 'my_effects',
  });
  assert.equal(act4.valid, true);
  assert.equal(act4.action.action, 'saveLearned');

  // 5. explainSegment
  const act5 = validateLabAction({
    action: 'explainSegment',
    segmentId: 'seg_intro',
    timeSec: 3.5,
  });
  assert.equal(act5.valid, true);
  assert.equal(act5.action.action, 'explainSegment');
});

test('T5.2: Strict code injection defense blocks malicious code and arbitrary scripts', () => {
  // Test eval() attempt
  const maliciousEval = validateLabAction({
    action: 'applyLearned',
    itemId: 'eval("stealToken()")',
    target: 'clip_1',
  });
  assert.equal(maliciousEval.valid, false);
  assert.match(maliciousEval.error, /CẤM: Action chứa mã thực thi/i);

  // Test <script> tag attempt
  const maliciousScript = validateLabAction({
    action: 'swapShot',
    slotId: '<script>alert(1)</script>',
    mediaId: 'clip_1',
  });
  assert.equal(maliciousScript.valid, false);
  assert.match(maliciousScript.error, /CẤM: Action chứa mã thực thi/i);

  // Test function definition attempt
  const maliciousFn = validateLabAction({
    action: 'saveLearned',
    itemId: 'function() { return window.localStorage; }',
  });
  assert.equal(maliciousFn.valid, false);
  assert.match(maliciousFn.error, /CẤM: Action chứa mã thực thi/i);

  // Test invalid action type
  const unknownAct = validateLabAction({
    action: 'executeArbitraryCommand',
    cmd: 'rm -rf /',
  });
  assert.equal(unknownAct.valid, false);
});

test('T5.3: Natural language timestamp extraction accurately parses time formats', () => {
  assert.equal(extractTimestampFromQuery('chuyển cảnh ở 00:03 dùng kỹ thuật gì?'), 3);
  assert.equal(extractTimestampFromQuery('hiệu ứng tại 01:25 là gì?'), 85);
  assert.equal(extractTimestampFromQuery('kỹ thuật ở 5s trông thế nào?'), 5);
  assert.equal(extractTimestampFromQuery('đoạn chuyển cảnh 12.5s'), 12.5);
  assert.equal(extractTimestampFromQuery('giây thứ 7 dùng hiệu ứng gì?'), 7);
  assert.equal(extractTimestampFromQuery('video này hay quá'), null);
});

test('T5.4: Evidence-backed Q&A provides objective metrics and Learn & Save action when evidence exists', () => {
  clearCachedEvidencePacksForTesting();

  const mockEvidencePack = {
    eventId: 'evt_001',
    type: 'transition',
    startSec: 2.2,
    endSec: 3.8,
    durationSec: 1.6,
    metrics: {
      lumaDelta: 42.5,
      flashIntensity: 15.0,
      shakeFrequency: 1.2,
    },
    filmstrip: [
      {
        timestampSec: 3.0,
        dataUrl: 'data:image/svg+xml;utf8,<svg width="100" height="100"><rect fill="blue"/></svg>',
        masked: true,
      },
    ],
  };

  const mockLearnedItem = {
    id: 'whip-blur-01',
    fullId: 'user.learned/whip-blur-01@1.0.0',
    name: { vi: 'Chuyển cảnh lướt nhanh Whip Blur', en: 'Whip Blur Transition' },
    kind: 'transition',
    verifiedScore: 0.88,
    provenance: {
      analyzedAt: 1710000000,
    },
    spec: {
      nodes: [{ primitiveId: 'core.primitive.blur.directional' }],
      edges: [],
    },
  };

  setCachedEvidencePacks([mockEvidencePack]);

  const answer = answerTechniqueQuestionWithEvidence(
    'chuyển cảnh ở 00:03 dùng kỹ thuật gì?',
    [mockEvidencePack],
    [mockLearnedItem]
  );

  assert.equal(answer.hasEvidence, true);
  assert.equal(answer.timestampSec, 3);
  assert.ok(answer.evidence);
  assert.equal(answer.evidence.frameTimestampSec, 3);
  assert.equal(answer.evidence.verifiedScore, 0.88);
  assert.equal(answer.evidence.primitiveId, 'core.primitive.blur.directional');
  assert.equal(answer.evidence.techniqueKind, 'transition');
  assert.equal(answer.evidence.metrics.lumaDelta, 42.5);

  // Check suggested action for "Học & lưu"
  assert.ok(answer.suggestedAction);
  assert.equal(answer.suggestedAction.type, 'learn_and_save');
  assert.equal(answer.suggestedAction.actionPayload.action, 'saveLearned');
  assert.equal(answer.suggestedAction.actionPayload.itemId, 'user.learned/whip-blur-01@1.0.0');
});

test('T5.5: Non-negotiable refusal when no evidence exists: strict anti-hallucination', () => {
  clearCachedEvidencePacksForTesting();

  // Query a timestamp that has NO measurement data
  const answer = answerTechniqueQuestionWithEvidence(
    'hiệu ứng ở 00:45 dùng kỹ thuật gì?',
    [], // empty evidence
    []
  );

  assert.equal(answer.hasEvidence, false);
  assert.equal(answer.timestampSec, 45);
  assert.equal(answer.evidence, undefined);
  assert.match(answer.answerText.vi, /Chưa có bằng chứng đo đạc/i);
  assert.match(answer.answerText.vi, /Hãy tải hoặc thả video vào Phòng Học & Remix/i);

  // Must provide action directing to Lab instead of a hallucinated answer
  assert.ok(answer.suggestedAction);
  assert.equal(answer.suggestedAction.type, 'open_lab');
  assert.equal(answer.suggestedAction.actionPayload.action, 'learnFromReference');
});

test('T5.6: Query without timestamp requests exact timestamp clarification', () => {
  const answer = answerTechniqueQuestionWithEvidence('kỹ thuật này là gì?');
  assert.equal(answer.hasEvidence, false);
  assert.match(answer.answerText.vi, /Vui lòng chỉ rõ mốc thời gian/i);
});

test('T5.7: Evidence pack cache management operates reliably in memory', () => {
  clearCachedEvidencePacksForTesting();
  assert.equal(getCachedEvidencePacks().length, 0);

  const pack1 = {
    eventId: 'e1',
    type: 'effect',
    startSec: 1,
    endSec: 2,
    durationSec: 1,
    metrics: { lumaDelta: 10 },
    filmstrip: [],
  };
  setCachedEvidencePacks([pack1]);
  assert.equal(getCachedEvidencePacks().length, 1);
  assert.equal(getCachedEvidencePacks()[0].eventId, 'e1');

  clearCachedEvidencePacksForTesting();
  assert.equal(getCachedEvidencePacks().length, 0);
});
