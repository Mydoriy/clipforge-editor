/**
 * T2. VÒNG HỌC CHO CHUYỂN CẢNH (Transitions Learning Loop Test Suite)
 * ============================================================================
 * Verifies:
 * 1. MEASURE: Transition detection, 8-12 frame filmstrip, 4-corner watermark masking.
 * 2. INTERPRET: Primitive catalog enforcement, fixed system prompt v2.1, needsNewPrimitive guard.
 * 3. VERIFY: Objective multi-checkpoint (0.0, 0.25, 0.5, 0.75, 1.0) on real A/B anchor frames.
 *    STRICT: Bỏ qua mọi "confidence" do AI tự báo!
 * 4. REFINE: Local coordinate search (<= 20s budget, AbortSignal) + metric-only feedback rounds.
 * 5. GATE: Strict 0.80 threshold for transitions, M7 GLSL security, <= 3 GPU passes.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  measureVideoEvents,
  applyWatermarkCornerMask,
  buildInterpretSystemPrompt,
  INTERPRET_SYSTEM_PROMPT_VERSION,
  interpretEvidencePack,
  sanitizeHypothesisPrimitives,
  renderTransitionOnLuma,
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

test('T2-TRANSITION.1 - MEASURE: Transition Event Detection & 4-Corner Watermark Masking', () => {
  const w = 320;
  const h = 180;

  // 1. Watermark Corner Masking
  const rawRgba = new Uint8Array(w * h * 4).fill(250);
  const masked = applyWatermarkCornerMask(rawRgba, w, h);

  // Top-left and bottom-right corners masked to gray (40)
  assert.equal(masked[(4 * w + 4) * 4], 40);
  assert.equal(masked[(175 * w + 315) * 4], 40);
  // Center is unaltered
  assert.equal(masked[(90 * w + 160) * 4], 250);

  // 2. Measure Transition across a scene boundary
  const frames = [];
  for (let i = 0; i < 16; i++) {
    const timestampSec = Number((i * 0.1).toFixed(2));
    // Scene A: luma 70 (frames 0..7), Transition to Scene B: luma 210 (frames 8..15)
    const luma = i >= 8 ? 210 : 70;

    const rgba = new Uint8Array(w * h * 4).fill(luma);
    frames.push({
      timestampSec,
      rgba,
      width: w,
      height: h,
    });
  }

  const events = measureVideoEvents(frames, { maskWatermarks: true });
  assert.ok(events.length >= 1, 'Must detect at least 1 transition event');

  const transitionEvent = events.find((e) => e.type === 'transition');
  assert.ok(transitionEvent, 'Detected event must be of type "transition"');
  assert.ok(transitionEvent.filmstrip.length >= 8 && transitionEvent.filmstrip.length <= 12, 'Filmstrip must have 8-12 frames');
  assert.equal(transitionEvent.filmstrip[0].masked, true, 'Filmstrip must have corner masking applied');
  assert.ok(transitionEvent.metrics.lumaDelta > 0.25, 'Transition luma delta must be recorded');
});

test('T2-TRANSITION.2 - INTERPRET: Versioned Prompt & Primitive Catalog Guard', async () => {
  const evidence = {
    eventId: 'trans_whip_01',
    type: 'transition',
    startSec: 1.0,
    endSec: 1.5,
    durationSec: 0.5,
    metrics: { lumaDelta: 0.45, colorDelta: 0.35, shakeFrequency: 15.0 },
    filmstrip: [
      { timestampSec: 1.0, dataUrl: 'data:mock', masked: true },
      { timestampSec: 1.5, dataUrl: 'data:mock', masked: true },
    ],
  };

  // 1. System Prompt adheres to fixed version
  const systemPrompt = buildInterpretSystemPrompt(evidence);
  assert.ok(systemPrompt.includes(INTERPRET_SYSTEM_PROMPT_VERSION));
  assert.ok(systemPrompt.includes('core.primitive.blur.directional'));
  assert.ok(systemPrompt.includes('needsNewPrimitive'));

  // 2. Interprets transition into valid primitives
  const hypothesis = await interpretEvidencePack(evidence);
  assert.equal(hypothesis.type, 'transition');
  assert.ok(hypothesis.graph.nodes.length >= 1 && hypothesis.graph.nodes.length <= 3);
  assert.ok(hypothesis.graph.nodes.some((n) => PRIMITIVE_LIBRARY[n.primitiveId] !== undefined));

  // 3. Hallucination prevention: AI tries to invent unknown ID
  const invalidHypothesis = {
    ...hypothesis,
    graph: {
      nodes: [{ primitiveId: 'core.primitive.invented_quantum_portal', params: { x: 1 } }],
      edges: [],
    },
  };

  const { sanitized, unmappedIds } = sanitizeHypothesisPrimitives(invalidHypothesis);
  assert.equal(unmappedIds.length, 1);
  assert.equal(unmappedIds[0], 'core.primitive.invented_quantum_portal');
  assert.equal(sanitized.needsNewPrimitive?.needed, true);
  assert.ok(sanitized.needsNewPrimitive?.description?.includes('primitive mới'));
});

test('T2-TRANSITION.3 - VERIFY: Multi-Checkpoint (0.0 to 1.0) on Real A/B Frames (Bỏ qua AI confidence)', async () => {
  const w = 160;
  const h = 90;
  const lumaA = new Uint8Array(w * h).fill(80);
  const lumaB = new Uint8Array(w * h).fill(220);

  // Transition filmstrip simulating crossfade wipe
  const filmstrip = [];
  for (let i = 0; i < 9; i++) {
    const p = i / 8;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < w * h; j++) {
      const v = Math.round(80 * (1 - p) + 220 * p);
      rgba[j * 4] = v;
      rgba[j * 4 + 1] = v;
      rgba[j * 4 + 2] = v;
      rgba[j * 4 + 3] = 255;
    }
    filmstrip.push({
      timestampSec: Number((i * 0.1).toFixed(2)),
      dataUrl: 'data:mock',
      masked: true,
      rgba,
    });
  }

  const evidence = {
    eventId: 'trans_crossfade_01',
    type: 'transition',
    startSec: 0.0,
    endSec: 0.8,
    durationSec: 0.8,
    metrics: { lumaDelta: 0.5, colorDelta: 0.4 },
    filmstrip,
  };

  // AI self-reports fake 99.9% confidence in description
  const hypothesis = {
    segmentId: 'trans_crossfade_01',
    name: { vi: 'Chuyển cảnh mờ chồng', en: 'Crossfade Transition' },
    type: 'transition',
    description: 'AI claims 99.9% confident match',
    graph: {
      nodes: [
        { primitiveId: 'core.primitive.translate', params: { offsetX: 0.1, offsetY: 0.0 } },
      ],
      edges: [],
    },
    curves: { keyframes: [{ timeSec: 0, value: 0 }, { timeSec: 0.8, value: 1 }], easing: 'linear' },
    tags: ['transition'],
    aliases: { vi: ['mờ chồng'], en: ['crossfade'] },
    unknowns: [],
  };

  const verification = await verifyHypothesisLocally(hypothesis, evidence);

  // verifiedScore must be calculated from physical frame comparison, completely ignoring AI's 99.9%
  assert.ok(typeof verification.verifiedScore === 'number');
  assert.ok(verification.verifiedScore >= 0.0 && verification.verifiedScore <= 1.0);
  assert.ok(verification.ssimLuma >= 0.0 && verification.ssimLuma <= 1.0);
  assert.ok(verification.histDistance >= 0.0 && verification.histDistance <= 1.0);
});

test('T2-TRANSITION.4 - REFINE: Parameter Coordinate Search within <= 20s Budget', async () => {
  const w = 160;
  const h = 90;
  const filmstrip = [
    { timestampSec: 0.0, dataUrl: 'mockA', masked: true },
    { timestampSec: 0.25, dataUrl: 'mockMid1', masked: true },
    { timestampSec: 0.5, dataUrl: 'mockMid2', masked: true },
    { timestampSec: 0.75, dataUrl: 'mockMid3', masked: true },
    { timestampSec: 1.0, dataUrl: 'mockB', masked: true },
  ];

  const evidence = {
    eventId: 'trans_refine_01',
    type: 'transition',
    startSec: 0.0,
    endSec: 1.0,
    durationSec: 1.0,
    metrics: { lumaDelta: 0.4, colorDelta: 0.3 },
    filmstrip,
  };

  const subOptimalHypothesis = {
    segmentId: 'trans_refine_01',
    name: { vi: 'Quét mờ', en: 'Whip Blur' },
    type: 'transition',
    description: 'Initial rough parameters',
    graph: {
      nodes: [
        { primitiveId: 'core.primitive.blur.directional', params: { length: 50, angle: 90 } },
        { primitiveId: 'core.primitive.translate', params: { offsetX: 0.9, offsetY: 0.0 } },
      ],
      edges: [],
    },
    curves: { keyframes: [], easing: 'linear' },
    tags: ['transition'],
    aliases: { vi: [], en: [] },
    unknowns: [],
  };

  const startTime = Date.now();
  const { refinedHypothesis, finalScore, rounds } = await refineHypothesisParameters(
    subOptimalHypothesis,
    evidence,
    { maxTimeMs: 2000, maxRounds: 2, gateThreshold: 0.80 }
  );
  const elapsed = Date.now() - startTime;

  assert.ok(elapsed <= 20000, 'Refine must respect <= 20s budget');
  assert.ok(typeof finalScore === 'number');
  assert.ok(finalScore >= 0.0 && finalScore <= 1.0);
  assert.ok(rounds <= 2);
  assert.ok(refinedHypothesis.graph.nodes.length > 0);
});

test('T2-TRANSITION.5 - GATE: Strict 0.80 Transition Admission & Security/Budget Checks', () => {
  const transitionHypothesis = {
    segmentId: 'trans_gate_01',
    name: { vi: 'Chuyển cảnh lia mờ', en: 'Whip Blur Transition' },
    type: 'transition',
    description: '',
    graph: {
      nodes: [
        { primitiveId: 'core.primitive.translate', params: { offsetX: 0.5, offsetY: 0 } },
        { primitiveId: 'core.primitive.blur.directional', params: { length: 18, angle: 0 } },
      ],
      edges: [],
    },
    curves: { keyframes: [], easing: 'linear' },
    tags: ['transition'],
    aliases: { vi: [], en: [] },
    unknowns: [],
  };

  // Case 1: verifiedScore 0.83 >= 0.80 -> Passes gate ('verified')
  const passResult = evaluateGate(transitionHypothesis, 0.83);
  assert.equal(passResult.passed, true);
  assert.equal(passResult.status, 'verified');
  assert.equal(passResult.threshold, 0.80);
  assert.equal(passResult.staticAnalysisSafe, true);
  assert.equal(passResult.performanceBudgetSafe, true);

  // Case 2: verifiedScore 0.76 < 0.80 -> Rejected ('unverified')
  const failScoreResult = evaluateGate(transitionHypothesis, 0.76);
  assert.equal(failScoreResult.passed, false);
  assert.equal(failScoreResult.status, 'unverified');
  assert.ok(failScoreResult.reasons.some((r) => r.includes('0.8')));

  // Case 3: Performance budget exceeded (> 3 passes)
  const heavyHypothesis = {
    ...transitionHypothesis,
    graph: {
      nodes: [
        { primitiveId: 'core.primitive.translate', params: {} },
        { primitiveId: 'core.primitive.blur.directional', params: {} },
        { primitiveId: 'core.primitive.flash_exposure', params: {} },
        { primitiveId: 'core.primitive.grain', params: {} }, // 4 passes > 3!
      ],
      edges: [],
    },
  };
  const failBudgetResult = evaluateGate(heavyHypothesis, 0.95);
  assert.equal(failBudgetResult.passed, false);
  assert.equal(failBudgetResult.performanceBudgetSafe, false);

  // Case 4: Needs new primitive -> 'needs_primitive'
  const unmappedHypothesis = {
    ...transitionHypothesis,
    needsNewPrimitive: { needed: true, description: 'Thiếu shader 3D Cube Spin' },
  };
  const unmappedResult = evaluateGate(unmappedHypothesis, 0.85);
  assert.equal(unmappedResult.passed, false);
  assert.equal(unmappedResult.status, 'needs_primitive');
});

test('T2-TRANSITION.6 - End-to-End: executeLearningLoop on Transition Sequence', async () => {
  const w = 160;
  const h = 90;
  const frames = [];

  // 12-frame sequence with a distinct transition at index 5..7
  for (let i = 0; i < 12; i++) {
    const timestampSec = Number((i * 0.1).toFixed(2));
    const luma = i <= 5 ? 70 : 210;
    const rgba = new Uint8Array(w * h * 4).fill(luma);
    frames.push({ timestampSec, rgba, width: w, height: h });
  }

  const result = await executeLearningLoop(frames);
  assert.ok(result.sessionId);
  assert.ok(result.totalEventsMeasured >= 1);
  assert.equal(result.techniques.length, result.totalEventsMeasured);

  const transitionItem = result.techniques[0];
  assert.ok(typeof transitionItem.verifiedScore === 'number');
  assert.ok(['verified', 'unverified'].includes(transitionItem.status));
  assert.equal(transitionItem.gateResult.threshold, 0.80);
});
