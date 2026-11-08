import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIMITIVE_LIBRARY,
  synthesizeGraphFromQuery,
  extractLuma90p,
  synthesizeFromReferenceFrames,
  saveCompositeToMyEffects,
  exportCompositeToCapfx,
} from '../engine/localCompositeSynthesizer.ts';
import { resolve } from '../engine/effectResolver.ts';

test('M5.1 - Primitive Library Completeness (17 Declarative Core Primitives)', () => {
  const requiredPrimitives = [
    'core.primitive.blur.gauss',
    'core.primitive.blur.directional',
    'core.primitive.blur.radial',
    'core.primitive.channel_shift',
    'core.primitive.displace_noise',
    'core.primitive.zoom_scale_rotate',
    'core.primitive.translate',
    'core.primitive.mask_wipe',
    'core.primitive.flash_exposure',
    'core.primitive.vignette',
    'core.primitive.grain',
    'core.primitive.pixelate',
    'core.primitive.mirror',
    'core.primitive.color_matrix',
    'core.primitive.lut',
    'core.primitive.easing',
    'core.primitive.keyframe',
  ];

  assert.equal(Object.keys(PRIMITIVE_LIBRARY).length, 17, 'Must have exactly 17 primitive building blocks');

  for (const primId of requiredPrimitives) {
    const prim = PRIMITIVE_LIBRARY[primId];
    assert.ok(prim, `Primitive '${primId}' must exist in library`);
    assert.equal(prim.id, primId);
    assert.ok(prim.name?.vi, `Primitive '${primId}' must have Vietnamese name`);
    assert.ok(prim.name?.en, `Primitive '${primId}' must have English name`);
    assert.ok(prim.category, `Primitive '${primId}' must declare category`);
    assert.ok(prim.paramSchema, `Primitive '${primId}' must have paramSchema`);
    assert.ok(prim.fragmentBody, `Primitive '${primId}' must have fragmentBody GLSL code`);
  }
});

test('M5.2 - Deterministic Rule-Based Graph Synthesis from Text Query (No LLM, Offline)', () => {
  // 1. "glitch" query -> displace + channel_shift + flash
  const glitch1 = synthesizeGraphFromQuery('rung giật glitch nhiễu', 'effect');
  assert.ok(glitch1, 'Must synthesize glitch graph');
  assert.equal(glitch1.kind, 'effect');
  assert.ok(glitch1.graph.nodes.some((n) => n.ref === 'core.primitive.displace_noise'));
  assert.ok(glitch1.graph.nodes.some((n) => n.ref === 'core.primitive.channel_shift'));
  assert.ok(glitch1.graph.nodes.some((n) => n.ref === 'core.primitive.flash_exposure'));

  // Determinism check: identical query yields identical node structure
  const glitch2 = synthesizeGraphFromQuery('rung giật glitch nhiễu', 'effect');
  assert.deepEqual(glitch1.graph, glitch2.graph, 'Synthesis must be 100% deterministic & repeatable');

  // 2. "whip" query -> translate + directional blur
  const whip = synthesizeGraphFromQuery('chuyển cảnh quét lia whip pan', 'transition');
  assert.ok(whip, 'Must synthesize whip pan transition graph');
  assert.equal(whip.kind, 'transition');
  assert.ok(whip.graph.nodes.some((n) => n.ref === 'core.primitive.translate'));
  assert.ok(whip.graph.nodes.some((n) => n.ref === 'core.primitive.blur.directional'));

  // 3. "vintage" query -> color_matrix + grain + vignette
  const vintage = synthesizeGraphFromQuery('bộ lọc phim cũ retro vintage', 'filter');
  assert.ok(vintage, 'Must synthesize vintage filter graph');
  assert.equal(vintage.kind, 'filter');
  assert.ok(vintage.graph.nodes.some((n) => n.ref === 'core.primitive.color_matrix'));
  assert.ok(vintage.graph.nodes.some((n) => n.ref === 'core.primitive.grain'));
  assert.ok(vintage.graph.nodes.some((n) => n.ref === 'core.primitive.vignette'));

  // 4. "noir" query -> color_matrix + grain + vignette
  const noir = synthesizeGraphFromQuery('phong cách đen trắng noir', 'filter');
  assert.ok(noir, 'Must synthesize noir filter graph');
  assert.equal(noir.graph.nodes.length, 3);
});

test('M5.3 - Resolver Tier 4 Integration via Query', async () => {
  // Test resolving a query that has no exact match in installed or registry
  const res = await resolve(
    {
      query: 'hiệu ứng giật glitch màn hình',
      context: { kind: 'effect' },
    },
    { installedItems: [], registryPacks: [] }
  );

  assert.equal(res.tier, 4, 'Must hit Tier 4: Local Composite Synthesis');
  assert.equal(res.status, 'local_composite');
  assert.equal(res.action, 'apply_composite');
  assert.equal(res.trustLevel, 'local_fallback');
  assert.equal(res.matchLevel, 'approximate');
  assert.ok(res.graph && res.graph.nodes.length >= 2, 'Graph must have at least 2 connected nodes');
});

test('M5.4 - Analysis-by-Synthesis with Reference Frames (Luma 90p, SSIM & Histogram)', async () => {
  // Create a synthetic 1920x1080 frame (or smaller buffer for test speed)
  const width = 160;
  const height = 90;
  const testFrame = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      testFrame[idx] = Math.floor((x / width) * 255); // R gradient
      testFrame[idx + 1] = Math.floor((y / height) * 255); // G gradient
      testFrame[idx + 2] = 128; // B
      testFrame[idx + 3] = 255; // A
    }
  }

  // 1. Verify 90p luma extraction
  const luma90p = extractLuma90p(testFrame, width, height);
  assert.equal(luma90p.length, 160 * 90, 'Luma 90p must be exactly 160x90 = 14,400 bytes');

  // 2. Run Analysis-by-Synthesis with normal threshold (should pass on gradient frame)
  const matchResult = await synthesizeFromReferenceFrames({
    referenceFrames: [testFrame],
    frameWidth: width,
    frameHeight: height,
    maxTimeMs: 2000,
    acceptanceThreshold: 0.60,
  });

  assert.equal(matchResult.success, true, 'Analysis-by-synthesis must find match above threshold');
  assert.ok(matchResult.score >= 0.60, `Score (${matchResult.score}) must exceed 0.60`);
  assert.equal(matchResult.trustLevel, 'local_fallback');
  assert.equal(matchResult.fidelity, 'approximate');
  assert.ok(matchResult.spec?.graph, 'Must return graph in spec');

  // 3. Strict Rule: If score is under threshold, return "không đủ giống", do NOT force create
  const strictResult = await synthesizeFromReferenceFrames({
    referenceFrames: [testFrame],
    frameWidth: width,
    frameHeight: height,
    maxTimeMs: 1000,
    acceptanceThreshold: 0.999, // Unattainable threshold
  });

  assert.equal(strictResult.success, false, 'Must reject when score is below strict threshold');
  assert.ok(strictResult.reason.includes('không đủ giống'), 'Reason must explicitly state "không đủ giống"');
  assert.equal(strictResult.spec, undefined, 'Spec must NOT be created when under threshold');
});

test('M5.5 - Analysis-by-Synthesis Cancellation via AbortSignal', async () => {
  const width = 160;
  const height = 90;
  const testFrame = new Uint8ClampedArray(width * height * 4);

  const controller = new AbortController();
  // Abort immediately before running
  controller.abort();

  const startTime = Date.now();
  const abortResult = await synthesizeFromReferenceFrames({
    referenceFrames: [testFrame],
    frameWidth: width,
    frameHeight: height,
    maxTimeMs: 15000, // 15s budget
    signal: controller.signal,
  });

  const duration = Date.now() - startTime;
  assert.ok(duration < 200, `Aborted search must exit immediately in under 200ms (took ${duration}ms)`);
  assert.equal(abortResult.success, false);
});

test('M5.6 - Export Composite Graph to .capfx ZIP Package', async () => {
  const compositeItem = {
    id: 'local.composite.glitch-test',
    kind: 'effect',
    paramSchema: {
      intensity: { type: 'number', default: 1.0, min: 0.1, max: 2.0 },
    },
    graph: {
      nodes: [
        { id: 'n1', ref: 'core.primitive.displace_noise', params: { amount: 10 } },
        { id: 'n2', ref: 'core.primitive.channel_shift', params: { shift: 5 } },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
    },
    tags: ['composite', 'glitch'],
    aliases: { vi: ['Ghép Glitch Thử Nghiệm'], en: ['Composite Glitch Test'] },
    preview: { thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=' },
    cost: { samplesPerPixel: 2, passes: 1 },
    since: '1.0.0',
  };

  const capfxBytes = await exportCompositeToCapfx(compositeItem);
  assert.ok(capfxBytes instanceof Uint8Array, 'Export must return Uint8Array');
  assert.ok(capfxBytes.length > 100, 'Pack bytes must be non-empty');
  // Check ZIP magic header: PK\x03\x04 (0x50, 0x4b, 0x03, 0x04)
  assert.equal(capfxBytes[0], 0x50, 'ZIP byte 0 must be P');
  assert.equal(capfxBytes[1], 0x4b, 'ZIP byte 1 must be K');
  assert.equal(capfxBytes[2], 0x03, 'ZIP byte 2 must be 0x03');
  assert.equal(capfxBytes[3], 0x04, 'ZIP byte 3 must be 0x04');
});

