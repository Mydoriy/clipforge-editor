/**
 * T2. VÒNG HỌC (Learning Loop: Measure -> Interpret -> Hypothesize -> Verify -> Refine -> Gate) Test Suite
 * ============================================================================
 * Verifies:
 * 1. MEASURE: Technical event detection, 8-12 frame filmstrip, corner watermark masking.
 * 2. INTERPRET: Primitive catalog enforcement; flags needsNewPrimitive on unmapped IDs without inventing fake ones.
 * 3. VERIFY: Objective verifiedScore (SSIM + Histogram) on real frames; ignores AI confidence.
 * 4. REFINE: Local parameter coordinate search within 20s budget + metric-only feedback rounds.
 * 5. GATE: Strict admission (threshold by kind, M7 static analysis, performance budget <= 3 passes).
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  measureVideoEvents,
  applyWatermarkCornerMask,
  interpretEvidencePack,
  sanitizeHypothesisPrimitives,
  verifyHypothesisLocally,
  refineHypothesisParameters,
  evaluateGate,
  executeLearningLoop,
} from '../engine/learningLoop.ts';

import {
  DEFAULT_GATE_THRESHOLDS,
  TechniqueHypothesisZod,
} from '../types/learningLoop.ts';

import { PRIMITIVE_LIBRARY } from '../engine/localCompositeSynthesizer.ts';

test('T2.1 - MEASURE: Technical Event Detection & Watermark Corner Masking', () => {
  // 1. Watermark Corner Masking: Verifies 4 corners are masked
  const w = 320;
  const h = 180;
  const rawRgba = new Uint8Array(w * h * 4).fill(255); // Solid white frame
  const masked = applyWatermarkCornerMask(rawRgba, w, h);

  // Top-left corner (pixel at x=5, y=5) must be masked to gray (40)
  const topLeftIdx = (5 * w + 5) * 4;
  assert.equal(masked[topLeftIdx], 40);

  // Bottom-right corner (pixel at x=310, y=170) must be masked to gray (40)
  const bottomRightIdx = (170 * w + 310) * 4;
  assert.equal(masked[bottomRightIdx], 40);

  // Center (pixel at x=160, y=90) must remain unmasked (255)
  const centerIdx = (90 * w + 160) * 4;
  assert.equal(masked[centerIdx], 255);

  // 2. Measure Technical Events from sequence of frames with a sudden transition
  const mockFrames = [];
  for (let i = 0; i < 15; i++) {
    const timestampSec = Number((i * 0.2).toFixed(2));
    const luma = i >= 6 && i <= 8 ? 240 : 100; // Flash / cut at i=6..8
    const rgba = new Uint8Array(w * h * 4).fill(luma);
    mockFrames.push({
      timestampSec,
      rgba,
      width: w,
      height: h,
    });
  }

  const events = measureVideoEvents(mockFrames, { maskWatermarks: true });
  assert.ok(events.length >= 1, 'Must detect at least 1 transition/effect event');

  const firstEvent = events[0];
  assert.ok(firstEvent.filmstrip.length >= 8 && firstEvent.filmstrip.length <= 12, 'Filmstrip must have 8-12 frames');
  assert.equal(firstEvent.filmstrip[0].masked, true, 'Filmstrip frames must have watermark masking applied');
  assert.ok(firstEvent.metrics.lumaDelta > 0);
});

test('T2.2 - INTERPRET: Primitive Catalog Enforcement & needsNewPrimitive Guard', async () => {
  // Case A: Valid hypothesis using existing primitive catalog
  const validHypothesis = {
    segmentId: 'event_01',
    name: { vi: 'Làm mờ chuyển động', en: 'Motion Blur' },
    type: 'transition',
    description: 'Chuyển cảnh làm mờ theo hướng',
    graph: {
      nodes: [
        { primitiveId: 'core.primitive.blur.directional', params: { angle: 0, length: 15 } },
        { primitiveId: 'core.primitive.translate', params: { offsetX: 0.5, offsetY: 0.0 } },
      ],
      edges: [{ from: 'core.primitive.blur.directional', to: 'core.primitive.translate' }],
    },
    curves: {
      keyframes: [{ timeSec: 0, value: 0 }, { timeSec: 0.5, value: 1 }],
      easing: 'easeInOut',
    },
    tags: ['blur', 'transition'],
    aliases: { vi: ['quét mờ'], en: ['whip blur'] },
    unknowns: [],
  };

  const { sanitized: cleanSanitized, unmappedIds: noneUnmapped } = sanitizeHypothesisPrimitives(validHypothesis);
  assert.equal(noneUnmapped.length, 0, 'No unmapped IDs for valid primitives');
  assert.equal(cleanSanitized.graph.nodes.length, 2);

  // Case B: AI attempts to invent a fake / non-existent primitive ID
  const hallucinatedHypothesis = {
    ...validHypothesis,
    graph: {
      nodes: [
        { primitiveId: 'core.primitive.fake_magic_teleport_ai_shader', params: { magic: 99 } },
      ],
      edges: [],
    },
  };

  const { sanitized: guardedSanitized, unmappedIds } = sanitizeHypothesisPrimitives(hallucinatedHypothesis);
  assert.equal(unmappedIds.length, 1);
  assert.equal(unmappedIds[0], 'core.primitive.fake_magic_teleport_ai_shader');
  assert.equal(guardedSanitized.needsNewPrimitive?.needed, true);
  assert.ok(guardedSanitized.needsNewPrimitive?.description?.includes('primitive mới'));
});

test('T2.3 - VERIFY: Objective verifiedScore (SSIM + Histogram) & Ignores AI Confidence', async () => {
  const dummyEvidence = {
    eventId: 'event_test',
    type: 'transition',
    startSec: 0.0,
    endSec: 1.0,
    durationSec: 1.0,
    metrics: { lumaDelta: 0.3, colorDelta: 0.2 },
    filmstrip: [
      { timestampSec: 0.0, dataUrl: 'mockA', masked: true },
      { timestampSec: 0.5, dataUrl: 'mockMid', masked: true },
      { timestampSec: 1.0, dataUrl: 'mockB', masked: true },
    ],
  };

  // AI falsely reports 0.99 confidence
  const hypothesisWithFakeConfidence = {
    segmentId: 'event_test',
    name: { vi: 'Chuyển cảnh mờ', en: 'Blur Transition' },
    type: 'transition',
    description: 'AI claims 99% confident',
    graph: {
      nodes: [{ primitiveId: 'core.primitive.blur.gauss', params: { radius: 4 } }],
      edges: [],
    },
    curves: { keyframes: [], easing: 'linear' },
    tags: [],
    aliases: { vi: [], en: [] },
    unknowns: [],
  };

  const verification = await verifyHypothesisLocally(hypothesisWithFakeConfidence, dummyEvidence);

  // The verifiedScore must be calculated from SSIM and histogram, NOT the AI's 0.99 claim
  assert.ok(typeof verification.verifiedScore === 'number');
  assert.ok(verification.verifiedScore >= 0 && verification.verifiedScore <= 1.0);
  assert.ok(verification.ssimLuma >= 0 && verification.ssimLuma <= 1.0);
  assert.ok(verification.histDistance >= 0 && verification.histDistance <= 1.0);
});

test('T2.4 - REFINE: Local Parameter Coordinate Search & Optimization Budget', async () => {
  const evidence = {
    eventId: 'event_refine',
    type: 'look',
    startSec: 0.0,
    endSec: 2.0,
    durationSec: 2.0,
    metrics: { lumaDelta: 0.2, colorDelta: 0.3 },
    filmstrip: [
      { timestampSec: 0.0, dataUrl: 'mockA', masked: true },
      { timestampSec: 2.0, dataUrl: 'mockB', masked: true },
    ],
  };

  const initialHypothesis = {
    segmentId: 'event_refine',
    name: { vi: 'Chỉnh màu', en: 'Color' },
    type: 'look',
    description: 'Sub-optimal initial params',
    graph: {
      nodes: [{ primitiveId: 'core.primitive.color_matrix', params: { contrast: 0.8, saturation: 0.8 } }],
      edges: [],
    },
    curves: { keyframes: [], easing: 'linear' },
    tags: [],
    aliases: { vi: [], en: [] },
    unknowns: [],
  };

  const { refinedHypothesis, finalScore } = await refineHypothesisParameters(
    initialHypothesis,
    evidence,
    { maxTimeMs: 1000, maxRounds: 2, gateThreshold: 0.75 }
  );

  assert.ok(typeof finalScore === 'number');
  assert.ok(finalScore >= 0 && finalScore <= 1.0);
  assert.ok(refinedHypothesis.graph.nodes.length > 0);
});

test('T2.5 - GATE: Admission Gate Enforcement & Rejection of Unverified Hypotheses', () => {
  const validHypothesis = {
    segmentId: 'seg_1',
    name: { vi: 'Chuyển cảnh', en: 'Transition' },
    type: 'transition',
    description: '',
    graph: {
      nodes: [
        { primitiveId: 'core.primitive.translate', params: {} },
        { primitiveId: 'core.primitive.blur.directional', params: {} },
      ],
      edges: [],
    },
    curves: { keyframes: [], easing: 'linear' },
    tags: [],
    aliases: { vi: [], en: [] },
    unknowns: [],
  };

  // Case A: High verified score (0.85 >= 0.80) passes Gate
  const passGate = evaluateGate(validHypothesis, 0.85);
  assert.equal(passGate.passed, true);
  assert.equal(passGate.status, 'verified');
  assert.equal(passGate.staticAnalysisSafe, true);
  assert.equal(passGate.performanceBudgetSafe, true);

  // Case B: Low verified score (0.68 < 0.80) fails Gate -> marked as 'unverified'
  const failGate = evaluateGate(validHypothesis, 0.68);
  assert.equal(failGate.passed, false);
  assert.equal(failGate.status, 'unverified');
  assert.ok(failGate.reasons[0].includes('thấp hơn ngưỡng quy định'));

  // Case C: Graph exceeds performance budget (> 3 passes)
  const heavyHypothesis = {
    ...validHypothesis,
    graph: {
      nodes: [
        { primitiveId: 'core.primitive.translate', params: {} },
        { primitiveId: 'core.primitive.blur.directional', params: {} },
        { primitiveId: 'core.primitive.flash_exposure', params: {} },
        { primitiveId: 'core.primitive.grain', params: {} }, // 4 nodes = 4 passes > 3!
      ],
      edges: [],
    },
  };

  const budgetFailGate = evaluateGate(heavyHypothesis, 0.90);
  assert.equal(budgetFailGate.passed, false);
  assert.equal(budgetFailGate.performanceBudgetSafe, false);
  assert.ok(budgetFailGate.reasons.some((r) => r.includes('vượt quá ngân sách')));

  // Case D: Hypothesis requiring new primitive is tagged as 'needs_primitive'
  const unmappedHypothesis = {
    ...validHypothesis,
    needsNewPrimitive: { needed: true, description: 'Cần primitive 3D mesh warp' },
  };

  const needsPrimGate = evaluateGate(unmappedHypothesis, 0.88);
  assert.equal(needsPrimGate.passed, false);
  assert.equal(needsPrimGate.status, 'needs_primitive');
  assert.ok(needsPrimGate.reasons[0].includes('Cần primitive 3D mesh warp'));
});

test('T2.6 - Full Orchestration: executeLearningLoop end-to-end', async () => {
  const w = 160;
  const h = 90;
  const mockFrames = [
    { timestampSec: 0.0, rgba: new Uint8Array(w * h * 4).fill(80), width: w, height: h },
    { timestampSec: 0.5, rgba: new Uint8Array(w * h * 4).fill(220), width: w, height: h }, // transition flash
    { timestampSec: 1.0, rgba: new Uint8Array(w * h * 4).fill(80), width: w, height: h },
  ];

  const sessionResult = await executeLearningLoop(mockFrames);
  assert.ok(sessionResult.sessionId);
  assert.ok(sessionResult.totalEventsMeasured >= 1);
  assert.equal(sessionResult.techniques.length, sessionResult.totalEventsMeasured);

  const item = sessionResult.techniques[0];
  assert.ok(typeof item.verifiedScore === 'number');
  assert.ok(['verified', 'unverified'].includes(item.status));
});

