import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolve,
  calculateFuzzyScore,
  normalizeText,
} from '../engine/effectResolver.ts';

// Shared Mock Environment for Resolver tests
const mockInstalled = [
  {
    packId: 'official.glitch-pack',
    version: '1.0.0',
    trustLevel: 'official',
    item: {
      id: 'rgb-shake',
      kind: 'effect',
      paramSchema: {
        intensity: { type: 'number', default: 1.0, min: 0.0, max: 2.0 },
      },
      tags: ['glitch', 'shake', 'rgb'],
      aliases: {
        vi: ['glitch', 'giật', 'nhiễu', 'rung màn hình', 'tách màu'],
        en: ['glitch', 'rgb shake', 'chromatic aberration', 'jitter'],
      },
      preview: {
        thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
      },
      cost: { samplesPerPixel: 2, passes: 1 },
      since: '1.0.0',
    },
  },
  {
    packId: 'community.retro-filters',
    version: '1.2.0',
    trustLevel: 'community',
    item: {
      id: 'vhs-tape-90s',
      kind: 'filter',
      paramSchema: {},
      tags: ['retro', 'vhs', 'vintage', 'tape'],
      aliases: {
        vi: ['băng từ vhs', 'phim cũ', 'scanlines'],
        en: ['vhs tape', 'vintage filter', 'crt scanlines'],
      },
      preview: {
        thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
      },
      cost: { samplesPerPixel: 1, passes: 1 },
      since: '1.0.0',
    },
  },
];

const mockRegistry = [
  {
    formatVersion: '1.0.0',
    id: 'official.transitions-pack',
    version: '1.0.0',
    name: {
      vi: 'Gói Chuyển Cảnh Chính Thức',
      en: 'Official Transitions Pack',
    },
    author: 'ClipForge',
    license: 'MIT',
    redistributable: true,
    createdAt: '2026-11-08T00:00:00Z',
    items: [
      {
        id: 'cross-zoom-wipe',
        kind: 'transition',
        paramSchema: { progress: { type: 'number', default: 0 } },
        tags: ['transition', 'zoom', 'wipe'],
        aliases: {
          vi: ['chuyển cảnh phóng to', 'lướt zoom', 'chuyển cảnh thu phóng'],
          en: ['cross zoom wipe', 'zoom transition'],
        },
        preview: {
          thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
        },
        cost: { samplesPerPixel: 2, passes: 1 },
        since: '1.0.0',
      },
    ],
    assets: [],
  },
];

test('M1.1 - Text Normalization & Bilingual Fuzzy Matching', () => {
  assert.equal(normalizeText('Rung Màn Hình!'), 'rung man hinh');
  assert.equal(normalizeText('  Đậm Nhạt RGB...  '), 'dam nhat rgb');

  // Exact match
  assert.equal(calculateFuzzyScore('rung màn hình', 'rung màn hình'), 1.0);

  // Normalized match with diacritics
  const scoreDiacritics = calculateFuzzyScore('rung man hinh', 'rung màn hình');
  assert.ok(scoreDiacritics >= 0.9);

  // Substring / partial match
  const scorePartial = calculateFuzzyScore('rung', 'rung màn hình');
  assert.ok(scorePartial >= 0.7);

  // Unrelated words
  const scoreUnrelated = calculateFuzzyScore('tuyết rơi mùa đông', 'chuyển cảnh zoom');
  assert.equal(scoreUnrelated, 0);
});

test('M1.2 - Tier 1: Exact Installed Match by specId', async () => {
  // Case 1: Exact namespaced ID
  const res1 = await resolve(
    {
      specId: 'official.glitch-pack/rgb-shake@1.0.0',
      context: { kind: 'effect' },
    },
    { installedItems: mockInstalled, registryPacks: mockRegistry }
  );

  assert.equal(res1.tier, 1);
  assert.equal(res1.status, 'exact_installed');
  assert.equal(res1.action, 'apply_directly');
  assert.equal(res1.matchLevel, 'exact');
  assert.equal(res1.score, 1.0);
  assert.equal(res1.item?.id, 'rgb-shake');

  // Case 2: Exact item slug of matching kind
  const res2 = await resolve(
    {
      specId: 'rgb-shake',
      context: { kind: 'effect' },
    },
    { installedItems: mockInstalled, registryPacks: mockRegistry }
  );

  assert.equal(res2.tier, 1);
  assert.equal(res2.status, 'exact_installed');
  assert.equal(res2.item?.id, 'rgb-shake');
});

test('M1.3 - Tier 2: Fuzzy Alias/Tag Match in INSTALLED items', async () => {
  // Vietnamese synonym
  const resVi = await resolve(
    {
      query: 'rung màn hình',
      context: { kind: 'effect' },
    },
    { installedItems: mockInstalled, registryPacks: mockRegistry }
  );

  assert.equal(resVi.tier, 2);
  assert.equal(resVi.status, 'fuzzy_installed');
  assert.equal(resVi.action, 'apply_directly');
  assert.equal(resVi.matchLevel, 'approximate');
  assert.ok(resVi.score >= 0.7);
  assert.equal(resVi.item?.id, 'rgb-shake');
  assert.equal(resVi.matchedAlias, 'rung màn hình');

  // English synonym
  const resEn = await resolve(
    {
      query: 'jitter',
      context: { kind: 'effect' },
    },
    { installedItems: mockInstalled, registryPacks: mockRegistry }
  );

  assert.equal(resEn.tier, 2);
  assert.equal(resEn.status, 'fuzzy_installed');
  assert.equal(resEn.item?.id, 'rgb-shake');
});

test('M1.4 - Tier 3: Match in Registry Index -> Suggest Install (Can Preview)', async () => {
  // Transition is not installed, but present in mockRegistry
  const res = await resolve(
    {
      query: 'chuyển cảnh phóng to',
      context: { kind: 'transition' },
    },
    { installedItems: mockInstalled, registryPacks: mockRegistry }
  );

  assert.equal(res.tier, 3);
  assert.equal(res.status, 'registry_available');
  assert.equal(res.action, 'prompt_install');
  assert.ok(res.preview?.thumb);
  assert.equal(res.item?.id, 'cross-zoom-wipe');
  assert.equal(res.pack?.id, 'official.transitions-pack');
});

test('M1.5 - Tier 4: Local Composite synthesis from base primitive effects', async () => {
  // Request for glitch that is neither in installed nor in registry
  const res = await resolve(
    {
      query: 'hiệu ứng rung giật màn hình dữ dội',
      context: { kind: 'effect' },
    },
    { installedItems: [], registryPacks: [] }
  );

  assert.equal(res.tier, 4);
  assert.equal(res.status, 'local_composite');
  assert.equal(res.action, 'apply_composite');
  assert.equal(res.matchLevel, 'approximate');
  assert.equal(res.trustLevel, 'local_fallback');
  assert.ok(res.graph);
  assert.ok(res.graph.nodes.length >= 2);
});

test('M1.6 - Tier 5: AI Generation Option (Requires API Key & User Consent)', async () => {
  // Case A: AI key configured and consented
  const resWithAi = await resolve(
    {
      query: 'hạt sao băng rơi neon lấp lánh',
      context: { kind: 'effect' },
    },
    {
      installedItems: [],
      registryPacks: [],
      aiConfig: { hasKey: true, userConsented: true },
    }
  );

  assert.equal(resWithAi.tier, 5);
  assert.equal(resWithAi.status, 'ai_generation_ready');
  assert.equal(resWithAi.action, 'prompt_ai_generation');
  assert.equal(resWithAi.trustLevel, 'ai_generated');

  // Case B: No AI key or user consent not given
  const resNoAi = await resolve(
    {
      query: 'hạt sao băng rơi neon lấp lánh',
      context: { kind: 'effect' },
    },
    {
      installedItems: [],
      registryPacks: [],
      aiConfig: { hasKey: false, userConsented: false },
    }
  );

  assert.equal(resNoAi.tier, 0);
  assert.equal(resNoAi.status, 'unresolved');
  assert.equal(resNoAi.action, 'ghost_placeholder');
  assert.equal(resNoAi.ghostReference?.missing, true);
});

test('M1.7 - Sequential Ladder Stop Verification: Stops at first matching tier', async () => {
  // If an asset matches Tier 1, it stops at Tier 1 even if it also matches Tier 2, 3, 4, 5
  const res = await resolve(
    {
      specId: 'official.glitch-pack/rgb-shake@1.0.0',
      query: 'rung màn hình',
      context: { kind: 'effect' },
    },
    {
      installedItems: mockInstalled,
      registryPacks: mockRegistry,
      aiConfig: { hasKey: true, userConsented: true },
    }
  );

  assert.equal(res.tier, 1, 'Must stop at Tier 1 and not fall through to Tier 2, 3, 4, or 5');
});

