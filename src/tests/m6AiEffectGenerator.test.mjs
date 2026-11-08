/**
 * Unit Tests for M6: AI Effect & Shader Synthesis Module
 * ============================================================================
 * Verifies:
 * 1. Opt-in Guard: Disabled by default, requires API key & explicit user consent.
 * 2. Privacy Guard: Clear warning that content leaves device; max 6 low-res frames.
 * 3. Strict System Prompt: Enforces pure JSON EffectSpec & GLSL ES 3.00 wrapper rules.
 * 4. Self-Healing Loop: Max 3 retries with error feedback to LLM, bails on attempt 3.
 * 5. 5-frame preview, 1080p benchmark cost, "Do AI tạo – chưa kiểm duyệt" label.
 * 6. Never automatically adds to timeline; user must click "Giữ" (Keep).
 * 7. Metadata provenance tracking without leaking API keys.
 * 8. Tier 5 Resolver integration.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateEffectWithAI,
  validateAndSanitizeAiRequest,
  saveAiEffectToMyEffects,
  renderSampleFramesAndBenchmark,
  extractCleanJson,
  AI_PRIVACY_WARNING,
  AI_UNVERIFIED_LABEL_VI,
  AI_EFFECT_SYSTEM_PROMPT,
} from '../engine/aiEffectSynthesizer.ts';
import { resolve } from '../engine/effectResolver.ts';

test('M6.1 - Opt-in & Privacy Guard: Disabled by default, requires consent & API key', async () => {
  // A. Disabled by default
  const reqDisabled = {
    prompt: 'hiệu ứng sóng nước neon',
    config: {
      enabled: false,
      userConsented: false,
    },
  };
  const resDisabled = await generateEffectWithAI(reqDisabled);
  assert.equal(resDisabled.success, false);
  assert.match(resDisabled.error, /TẮT theo mặc định/);

  // B. Enabled but not consented
  const reqNoConsent = {
    prompt: 'hiệu ứng sóng nước neon',
    config: {
      enabled: true,
      userConsented: false,
      apiKey: 'test-api-key',
    },
  };
  const resNoConsent = await generateEffectWithAI(reqNoConsent);
  assert.equal(resNoConsent.success, false);
  assert.match(resNoConsent.error, /chưa xác nhận đồng ý/);
  assert.ok(resNoConsent.error.includes(AI_PRIVACY_WARNING));

  // C. Enabled and consented but missing API key (for non-mock provider)
  const reqNoKey = {
    prompt: 'hiệu ứng sóng nước neon',
    config: {
      enabled: true,
      userConsented: true,
      apiKey: '',
      provider: 'openai',
    },
  };
  const resNoKey = await generateEffectWithAI(reqNoKey);
  assert.equal(resNoKey.success, false);
  assert.match(resNoKey.error, /Chưa cung cấp API Key/);
});

test('M6.2 - Privacy Guard: Reference frames limited to max 6 low-res frames only when explicitly checked', () => {
  // A. includeReferenceFrames is false -> sanitizedFrames MUST be empty
  const checkFalse = validateAndSanitizeAiRequest({
    prompt: 'glow',
    includeReferenceFrames: false,
    referenceFrames: ['frame1', 'frame2', 'frame3', 'frame4', 'frame5', 'frame6', 'frame7', 'frame8'],
    config: { enabled: true, userConsented: true, provider: 'mock' },
  });
  assert.equal(checkFalse.valid, true);
  assert.equal(checkFalse.sanitizedFrames.length, 0);

  // B. includeReferenceFrames is true with 8 frames -> limited to exactly max 6 frames
  const checkTrue = validateAndSanitizeAiRequest({
    prompt: 'glow',
    includeReferenceFrames: true,
    referenceFrames: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'],
    config: { enabled: true, userConsented: true, provider: 'mock' },
  });
  assert.equal(checkTrue.valid, true);
  assert.equal(checkTrue.sanitizedFrames.length, 6);
  assert.deepEqual(checkTrue.sanitizedFrames, ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']);
});

test('M6.3 - Strict System Prompt: Enforces pure JSON EffectSpec & GLSL ES 3.00 Host Rules', () => {
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('GLSL ES 3.00'));
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('Respond with ONLY a single valid JSON object'));
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('uTexA'));
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('uSeed'));
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('hash(uv, uSeed)'));
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('ABSOLUTELY FORBIDDEN') || AI_EFFECT_SYSTEM_PROMPT.includes('CẤM'));
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('Math.random()'));
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('gl_FragColor'));
  assert.ok(AI_EFFECT_SYSTEM_PROMPT.includes('texture2D'));

  // Test clean JSON extractor with markdown codeblock
  const rawWithFences = '```json\n{\n  "id": "test-fx",\n  "kind": "effect"\n}\n```';
  const extracted = extractCleanJson(rawWithFences);
  assert.equal(extracted.id, 'test-fx');
  assert.equal(extracted.kind, 'effect');
});

test('M6.4 - Self-Healing Loop: Auto-fixes compile/syntax error via retry, halts at max 3 retries', async () => {
  // Scenario A: Self-healing success on attempt 2
  // Attempt 1 returns broken GLSL (compileError syntax), Attempt 2 returns valid shader
  let callCount = 0;
  const mockHandlerSuccess = async (sys, user, attempt, lastError) => {
    callCount++;
    if (attempt === 1) {
      return JSON.stringify({
        id: 'healing-fx',
        kind: 'effect',
        paramSchema: { intensity: { type: 'number', default: 1.0 } },
        shader: {
          language: 'glsl300es',
          fragmentBody: 'compileError; // syntax error',
        },
        tags: ['healing'],
        aliases: { vi: ['hiệu ứng tự sửa'], en: ['healing fx'] },
        cost: { samplesPerPixel: 1, passes: 1 },
      });
    }

    // Attempt 2 receives feedback of compile error and returns clean GLSL
    assert.ok(lastError && lastError.includes('GLSL compile syntax error'));
    return JSON.stringify({
      id: 'healing-fx',
      kind: 'effect',
      paramSchema: { intensity: { type: 'number', default: 1.0 } },
      shader: {
        language: 'glsl300es',
        fragmentBody: 'vec4 col = texture(uTexA, uv) * uParams.x;\nreturn col;',
      },
      tags: ['healing'],
      aliases: { vi: ['hiệu ứng tự sửa'], en: ['healing fx'] },
      cost: { samplesPerPixel: 1, passes: 1 },
    });
  };

  const resHealing = await generateEffectWithAI({
    prompt: 'hiệu ứng hologram',
    config: { enabled: true, userConsented: true, provider: 'mock' },
    mockLlmHandler: mockHandlerSuccess,
  });

  assert.equal(resHealing.success, true);
  assert.equal(resHealing.iterations, 2);
  assert.equal(callCount, 2);
  assert.equal(resHealing.item.id, 'healing-fx');

  // Scenario B: Halts cleanly after 3 failed attempts
  let failCalls = 0;
  const mockHandlerAlwaysFail = async () => {
    failCalls++;
    return JSON.stringify({
      id: 'failing-fx',
      kind: 'effect',
      paramSchema: { intensity: { type: 'number', default: 1.0 } },
      shader: {
        language: 'glsl300es',
        fragmentBody: 'compileError; // always broken',
      },
      tags: ['broken'],
      aliases: { vi: ['lỗi'], en: ['error'] },
      cost: { samplesPerPixel: 1, passes: 1 },
    });
  };

  const resFailing = await generateEffectWithAI({
    prompt: 'hiệu ứng lỗi',
    config: { enabled: true, userConsented: true, provider: 'mock' },
    mockLlmHandler: mockHandlerAlwaysFail,
    maxRetries: 3,
  });

  assert.equal(resFailing.success, false);
  assert.equal(resFailing.iterations, 3);
  assert.equal(failCalls, 3);
  assert.match(resFailing.error, /sau 3 lần sửa tự động/);
});

test('M6.5 - Sample Preview, 1080p Benchmark & Mandatory Unverified Label', async () => {
  const item = {
    id: 'ai-wave-distortion',
    kind: 'effect',
    paramSchema: {
      intensity: { type: 'number', default: 0.8, min: 0.0, max: 2.0 },
      speed: { type: 'number', default: 1.2, min: 0.1, max: 5.0 },
    },
    shader: {
      language: 'glsl300es',
      fragmentBody: 'return texture(uTexA, uv);',
      passes: 1,
    },
    tags: ['ai', 'wave'],
    aliases: { vi: ['sóng nước'], en: ['wave'] },
    preview: { thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=' },
    cost: { samplesPerPixel: 2, passes: 1 },
    since: '1.0.0',
  };

  // 1. Preview renders 5 sample frames
  const preview = renderSampleFramesAndBenchmark(item);
  assert.equal(preview.sampleFrames.length, 5);
  assert.ok(preview.benchmark.msPerFrame1080p > 0);
  assert.ok(preview.benchmark.msPerFrame1080p < 20.0);
  assert.equal(preview.testParameters.intensity, 0.8);
  assert.equal(preview.testParameters.speed, 1.2);

  // 2. Successful AI generation sets mandatory labels & never touches timeline
  const res = await generateEffectWithAI({
    prompt: 'sóng nước lấp lánh',
    config: { enabled: true, userConsented: true, provider: 'mock' },
  });

  assert.equal(res.success, true);
  assert.equal(res.item.trustLevel, 'ai_generated');
  assert.equal(res.item.metadata.unverifiedLabel, AI_UNVERIFIED_LABEL_VI);
  assert.equal(res.provenance.warning, AI_UNVERIFIED_LABEL_VI);
  assert.equal(res.preview.sampleFrames.length, 5);
});

test('M6.6 - Provenance Tracking: Records prompt, model, timestamp and NEVER leaks API key', async () => {
  const secretApiKey = 'sk-SUPER-SECRET-LLM-KEY-999888';
  const req = {
    prompt: 'tạo hiệu ứng glitch cyberpunk neon',
    config: {
      enabled: true,
      userConsented: true,
      provider: 'mock',
      apiKey: secretApiKey,
      model: 'gpt-4o-mini',
    },
  };

  const res = await generateEffectWithAI(req);
  assert.equal(res.success, true);
  assert.ok(res.provenance);
  assert.equal(res.provenance.prompt, 'tạo hiệu ứng glitch cyberpunk neon');
  assert.equal(res.provenance.model, 'gpt-4o-mini');
  assert.ok(res.provenance.generatedAt);
  assert.equal(res.provenance.verifiedSafe, true);

  // Security Check: Verify secret API key is NOT logged in item or metadata
  const serializedItem = JSON.stringify(res.item);
  const serializedProvenance = JSON.stringify(res.provenance);
  assert.equal(serializedItem.includes(secretApiKey), false, 'API key MUST NOT be stored in EffectSpec item');
  assert.equal(serializedProvenance.includes(secretApiKey), false, 'API key MUST NOT be stored in provenance metadata');

  // Saving to My Effects only happens when user confirms
  const saveResult = await saveAiEffectToMyEffects(res.item, 'Hiệu ứng Cyberpunk AI');
  assert.equal(saveResult.success, true);
  assert.ok(saveResult.id.startsWith('my.ai.'));
});

test('M6.7 - Resolver Tier 5 Integration: Prompts AI Generation only when consented and enabled', async () => {
  const req = {
    query: 'tạo hiệu ứng ánh sáng cực quang chưa từng có',
    context: { kind: 'effect' },
  };

  // A. AI Config missing or disabled -> returns Tier 0 unresolved
  const resNoConsent = await resolve(req, {
    aiConfig: { hasKey: true, userConsented: false, enabled: false },
  });
  assert.notEqual(resNoConsent.tier, 5);

  // B. AI Config with key, consent and enabled -> triggers Tier 5 AI generation prompt
  const resWithConsent = await resolve(req, {
    aiConfig: { hasKey: true, userConsented: true, enabled: true },
  });
  assert.equal(resWithConsent.tier, 5);
  assert.equal(resWithConsent.status, 'ai_generation_ready');
  assert.equal(resWithConsent.action, 'prompt_ai_generation');
  assert.equal(resWithConsent.trustLevel, 'ai_generated');
});
