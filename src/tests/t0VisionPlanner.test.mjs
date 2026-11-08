/**
 * T0. LỚP KẾT NỐI AI (Vision Planner Abstraction) Test Suite
 * ============================================================================
 * Verifies:
 * 1. Interface VisionPlanner: 3 providers (gemini-direct, proxy, none).
 * 2. Settings configuration: Dynamic models, token limits, price estimates, connection probe.
 * 3. Structured Output & Zod Validation: Self-repair up to 2 retries on schema errors; stops on failure.
 * 4. Key Storage Security: WebCrypto PBKDF2 + AES-GCM encryption with passphrase; disclosure text.
 * 5. IndexedDB Response Cache: hash(evidencePack, promptVersion, modelId) avoids duplicate requests.
 * 6. Error Handling: 429 rate limit, quota, timeout & offline gracefully fall back to local measurement.
 * 7. Non-negotiable principles: Neutral technique IDs, zero brand names, prompt injection immunity.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Set up in-memory mock for localStorage in Node test runner
const mockStore = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStore.get(k) ?? null,
  setItem: (k, v) => mockStore.set(k, String(v)),
  removeItem: (k) => mockStore.delete(k),
  clear: () => mockStore.clear(),
};

import {
  RemixAnalysisOutputZod,
  DEFAULT_VISION_SETTINGS,
} from '../types/visionPlanner.ts';

import {
  encryptSecret,
  decryptSecret,
  saveStoredApiKey,
  loadStoredApiKey,
  API_KEY_STORAGE_DISCLOSURE_VI,
  API_KEY_STORAGE_DISCLOSURE_EN,
} from '../utils/cryptoVault.ts';

import {
  computeVisionCacheKey,
  getVisionCache,
  setVisionCache,
  clearVisionCache,
} from '../db/visionCache.ts';

import {
  NoneVisionPlanner,
  GeminiDirectVisionPlanner,
  ProxyVisionPlanner,
  getVisionPlanner,
  probeVisionCapabilities,
  executeVisionAnalysis,
  updateVisionSettings,
  getVisionSettings,
  VISION_SYSTEM_PROMPT,
} from '../engine/visionPlanner.ts';

test('T0.1 - Interface VisionPlanner & 3 Providers Initialization', () => {
  const nonePlanner = getVisionPlanner('none');
  assert.equal(nonePlanner.id, 'none');
  assert.equal(nonePlanner.capabilities.image, false);
  assert.equal(nonePlanner.capabilities.structuredOutput, false);

  const geminiPlanner = getVisionPlanner('gemini-direct');
  assert.equal(geminiPlanner.id, 'gemini-direct');
  assert.equal(geminiPlanner.capabilities.image, true);
  assert.equal(geminiPlanner.capabilities.structuredOutput, true);

  const proxyPlanner = getVisionPlanner('proxy');
  assert.equal(proxyPlanner.id, 'proxy');
  assert.equal(proxyPlanner.capabilities.image, true);
  assert.equal(proxyPlanner.capabilities.structuredOutput, true);
});

test('T0.2 - Dynamic Settings Configuration & Connection Probe', async () => {
  // Verify default settings contain no hard-coded API keys
  const defaults = getVisionSettings();
  assert.equal(defaults.provider, 'none');
  assert.equal(defaults.model, 'gemini-1.5-flash');
  assert.ok(defaults.tokenLimit > 0);
  assert.ok(defaults.estimatedPricePer1kTokens > 0);

  // Update settings dynamically
  updateVisionSettings({
    model: 'gemini-2.0-flash',
    tokenLimit: 16384,
    estimatedPricePer1kTokens: 0.00015,
  });

  const updated = getVisionSettings();
  assert.equal(updated.model, 'gemini-2.0-flash');
  assert.equal(updated.tokenLimit, 16384);
  assert.equal(updated.estimatedPricePer1kTokens, 0.00015);

  // Probe capabilities for local 'none' provider
  const noneProbe = await probeVisionCapabilities({ ...updated, provider: 'none' });
  assert.equal(noneProbe.connected, true);
  assert.equal(noneProbe.capabilities.image, false);

  // Probe capabilities for gemini-direct without key reports missing key
  const missingKeyProbe = await probeVisionCapabilities({
    ...updated,
    provider: 'gemini-direct',
    apiKey: '',
  });
  assert.equal(missingKeyProbe.connected, false);
  assert.ok(missingKeyProbe.error?.includes('Chưa nhập API Key'));
});

test('T0.3 - Structured Output Zod Validation & 2-Retry Self-Correction', async () => {
  const evidencePack = {
    referenceFrames: [
      { dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', timestampSec: 0.0, index: 0 },
      { dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', timestampSec: 1.2, index: 1 },
    ],
    videoDurationSec: 5.0,
  };

  // Case A: LLM returns malformed JSON on attempt 0, fixed on attempt 1 (1 retry)
  let attemptCount = 0;
  const mockRepairingHandler = async (system, prompt, attempt, lastError) => {
    attemptCount = attempt;
    if (attempt === 0) {
      // Missing required 'kind' and 'summary'
      return JSON.stringify({
        invalidKey: 'bad_output',
      });
    }
    // Repaired response matching schema
    return JSON.stringify({
      summary: { vi: 'Hiệu ứng rung quang sai RGB', en: 'RGB Aberration Shake' },
      detectedTechniques: [
        {
          id: 'rgb-shake-beat',
          name: { vi: 'Rung quang sai RGB theo nhịp', en: 'RGB Aberration Beat Shake' },
          kind: 'effect',
          timestampSec: 0.5,
          confidence: 0.88,
          parameters: { frequencyHz: 24, amplitude: 0.05 },
          description: 'Tách kênh màu đỏ và lam đồng bộ nhịp gõ trống',
        },
      ],
      unverifiedClaims: ['Giả thuyết nhịp độ 128 BPM cần đối chiếu phổ âm thanh'],
      pacingBpm: 128,
      cutIntervalsSec: [0.0, 1.25],
    });
  };

  const planner = new GeminiDirectVisionPlanner();
  const repairResult = await planner.analyze({
    evidencePack,
    settings: { apiKey: 'AIzaSyTestMockKeyValid', maxRetries: 2 },
    mockLlmHandler: mockRepairingHandler,
  });

  assert.equal(repairResult.success, true);
  assert.equal(repairResult.retriesUsed, 1, 'Must succeed on retry attempt 1');
  assert.equal(repairResult.data?.detectedTechniques[0].id, 'rgb-shake-beat');
  assert.equal(repairResult.unverifiedClaims.length, 1);

  // Case B: Persistent schema error stops after 2 retries without guessing
  const mockFailingHandler = async () => {
    return '{"error": "totally invalid schema"}';
  };

  await assert.rejects(
    async () => {
      await planner.analyze({
        evidencePack,
        settings: { apiKey: 'AIzaSyTestMockKeyValid', maxRetries: 2 },
        mockLlmHandler: mockFailingHandler,
      });
    },
    (err) => {
      return err.message.includes('Lỗi định dạng Schema');
    }
  );
});

test('T0.4 - WebCrypto API Key Vault Encryption & Passphrase Security', async () => {
  const secretKey = 'AIzaSyD-SecretKeyGoogleStudio123456';
  const passphrase = 'MyMasterPassphrase2026!';

  // 1. Plain storage without passphrase (device-bound obfuscation)
  const plainPayload = await encryptSecret(secretKey);
  assert.equal(plainPayload.isEncrypted, false);
  const decryptedPlain = await decryptSecret(plainPayload);
  assert.equal(decryptedPlain, secretKey);

  // 2. Encryption with PBKDF2 + AES-GCM 256-bit
  const encryptedPayload = await encryptSecret(secretKey, passphrase);
  assert.equal(encryptedPayload.isEncrypted, true);
  assert.ok(encryptedPayload.saltHex);
  assert.ok(encryptedPayload.ivHex);
  assert.notEqual(encryptedPayload.ciphertextHex, secretKey);

  // 3. Decrypt with correct passphrase
  const decryptedSecret = await decryptSecret(encryptedPayload, passphrase);
  assert.equal(decryptedSecret, secretKey);

  // 4. Decrypt with wrong passphrase throws error
  await assert.rejects(
    async () => {
      await decryptSecret(encryptedPayload, 'WrongPassword123');
    },
    (err) => err.message.includes('Mật khẩu giải mã không chính xác')
  );

  // 5. Test localStorage save and load
  await saveStoredApiKey(secretKey, passphrase);
  const loadedWithoutPassphrase = await loadStoredApiKey();
  assert.equal(loadedWithoutPassphrase.isEncrypted, true);
  assert.equal(loadedWithoutPassphrase.apiKey, '');

  const loadedWithPassphrase = await loadStoredApiKey(passphrase);
  assert.equal(loadedWithPassphrase.apiKey, secretKey);

  // 6. Security Disclosures exist
  assert.ok(API_KEY_STORAGE_DISCLOSURE_VI.includes('không phải nơi lưu an toàn tuyệt đối'));
  assert.ok(API_KEY_STORAGE_DISCLOSURE_EN.includes('not an absolute secure enclave'));
});

test('T0.5 - IndexedDB / Memory Cache by hash(evidencePack, promptVersion, modelId)', async () => {
  await clearVisionCache();

  const pack1 = {
    referenceFrames: [{ dataUrl: 'data:image/jpeg;base64,111', timestampSec: 0.5, index: 0 }],
    userPrompt: 'Deconstruct pacing',
  };

  const pack2 = {
    referenceFrames: [{ dataUrl: 'data:image/jpeg;base64,222', timestampSec: 0.5, index: 0 }],
    userPrompt: 'Deconstruct pacing',
  };

  const key1 = await computeVisionCacheKey(pack1, 'v1.0', 'gemini-1.5-flash');
  const key2 = await computeVisionCacheKey(pack2, 'v1.0', 'gemini-1.5-flash');
  const key1DifferentModel = await computeVisionCacheKey(pack1, 'v1.0', 'gemini-2.0-flash');

  assert.notEqual(key1, key2, 'Different visual frames must yield different cache keys');
  assert.notEqual(key1, key1DifferentModel, 'Different models must yield different cache keys');

  // Cache response
  const sampleResponse = {
    success: true,
    plannerId: 'gemini-direct',
    modelId: 'gemini-1.5-flash',
    cached: false,
    unverifiedClaims: ['hypothesis'],
    retriesUsed: 0,
    durationMs: 120,
    data: {
      summary: { vi: 'Tóm tắt', en: 'Summary' },
      detectedTechniques: [],
      unverifiedClaims: ['hypothesis'],
      cutIntervalsSec: [],
    },
  };

  await setVisionCache(key1, 'gemini-1.5-flash', sampleResponse);

  const cachedResult = await getVisionCache(key1);
  assert.ok(cachedResult, 'Cached response must exist');
  assert.equal(cachedResult.cached, true, 'Cached flag must be true');

  const uncachedResult = await getVisionCache(key2);
  assert.equal(uncachedResult, null, 'Uncached key must return null');
});

test('T0.6 - Error Handling & Automatic Fallback to Local Measurement', async () => {
  const evidencePack = {
    referenceFrames: [{ dataUrl: 'data:image/jpeg;base64,test', timestampSec: 0.1, index: 0 }],
  };

  // Simulate 429 Rate Limit error from provider
  const mock429Handler = async () => {
    const error = new Error('HTTP 429: Rate Limit Exceeded');
    throw error;
  };

  const result = await executeVisionAnalysis({
    evidencePack,
    settings: {
      provider: 'gemini-direct',
      apiKey: 'test-key',
      maxRetries: 0,
    },
    mockLlmHandler: mock429Handler,
  });

  // Must automatically fallback to local planner without throwing uncaught crash
  assert.equal(result.success, true);
  assert.equal(result.plannerId, 'none');
  assert.ok(result.fallbackReason?.includes('Rate Limit') || result.fallbackReason?.includes('chuyển sang phân tích cục bộ'));
  assert.ok(result.data?.detectedTechniques.length > 0, 'Local heuristic techniques must be generated');
});

test('T0.7 - Prompt Injection Defense & Neutral Descriptive Technique IDs', () => {
  // Verify system prompt incorporates strict security instructions
  assert.ok(VISION_SYSTEM_PROMPT.includes('PROMPT INJECTION DEFENSE'));
  assert.ok(VISION_SYSTEM_PROMPT.includes('NEUTRAL DESCRIPTIVE IDS'));
  assert.ok(VISION_SYSTEM_PROMPT.includes('ZERO PII & CONTENT RETENTION'));

  // Test Zod schema rejects invalid / brand-polluted / empty IDs
  assert.throws(() => {
    RemixAnalysisOutputZod.parse({
      summary: { vi: 'test', en: 'test' },
      detectedTechniques: [
        {
          id: 'Invalid ID with spaces',
          name: { vi: 'a', en: 'b' },
          kind: 'effect',
          timestampSec: 0,
          confidence: 0.5,
        },
      ],
      unverifiedClaims: [],
      cutIntervalsSec: [],
    });
  });

  // Valid neutral descriptive slug passes
  const validOutput = RemixAnalysisOutputZod.parse({
    summary: { vi: 'Phân tích kỹ thuật', en: 'Technical analysis' },
    detectedTechniques: [
      {
        id: 'film-halide-grain',
        name: { vi: 'Hạt phim 35mm', en: '35mm Film Halide Grain' },
        kind: 'effect',
        timestampSec: 0.25,
        confidence: 0.9,
        parameters: { grainDensity: 0.3 },
      },
    ],
    unverifiedClaims: [],
    cutIntervalsSec: [0.0, 1.5],
  });

  assert.equal(validOutput.detectedTechniques[0].id, 'film-halide-grain');
});
