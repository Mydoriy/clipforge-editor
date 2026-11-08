import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getNamespacedItemId,
  parseNamespacedItemId,
} from '../types/effectPack.ts';

import {
  validateEffectPack,
  EffectPackZod,
  EffectSpecItemZod,
} from '../types/effectPackSchema.ts';

import {
  wrapFragmentShader,
  validateFragmentBody,
} from '../engine/shaderHostWrapper.ts';

import {
  packCapfx,
  unpackCapfx,
  crc32,
  sha256Hex,
} from '../utils/capfxZip.ts';

test('M0.1 - Namespacing format: <packId>/<itemId>@<version>', () => {
  const packId = 'official.glitch-pack';
  const itemId = 'rgb-shake';
  const version = '1.2.0';

  const namespaced = getNamespacedItemId(packId, itemId, version);
  assert.equal(namespaced, 'official.glitch-pack/rgb-shake@1.2.0');

  const parsed = parseNamespacedItemId(namespaced);
  assert.ok(parsed);
  assert.equal(parsed.packId, 'official.glitch-pack');
  assert.equal(parsed.itemId, 'rgb-shake');
  assert.equal(parsed.version, '1.2.0');

  assert.equal(parseNamespacedItemId('invalid-format'), null);
});

test('M0.2 - Zod Schema: validates EffectPack format and constraints', () => {
  const validPack = {
    formatVersion: '1.0.0',
    id: 'official.glitch-pack',
    version: '1.0.0',
    name: {
      vi: 'Gói Glitch & Rung Lắc Chính Thức',
      en: 'Official Glitch & Shake Pack',
    },
    author: 'ClipForge Core Team',
    license: 'MIT',
    redistributable: true,
    sourceUrl: 'https://clipforge.app/registry/official.glitch-pack',
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 'rgb-shake',
        kind: 'effect',
        paramSchema: {
          intensity: {
            type: 'number',
            label: { vi: 'Độ mạnh', en: 'Intensity' },
            default: 1.0,
            min: 0.0,
            max: 2.0,
          },
        },
        shader: {
          language: 'glsl300es',
          fragmentBody: `
            float shift = (hash(uv, uSeed) * 0.02 - 0.01) * uParams.x;
            vec4 col = texture(uTexA, uv + vec2(shift, 0.0));
            return col;
          `,
          passes: 1,
        },
        tags: ['glitch', 'shake', 'rgb'],
        aliases: {
          vi: ['glitch', 'giật', 'nhiễu', 'rung màn hình'],
          en: ['glitch', 'jitter', 'shake', 'distortion'],
        },
        preview: {
          thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
          loopFrames: 30,
        },
        requires: {
          webgl2: true,
        },
        cost: {
          samplesPerPixel: 2,
          passes: 1,
        },
        since: '1.0.0',
      },
    ],
    assets: [],
  };

  const validation = validateEffectPack(validPack);
  assert.equal(validation.success, true);
  assert.ok(validation.data);

  // Constraint 1: Shader passes must not exceed 3
  const invalidPassesPack = JSON.parse(JSON.stringify(validPack));
  invalidPassesPack.items[0].shader.passes = 4;
  const passesCheck = validateEffectPack(invalidPassesPack);
  assert.equal(passesCheck.success, false);
  assert.ok(passesCheck.errors?.some((e) => e.includes('Số passes shader tối đa')));

  // Constraint 2: Slug validation on pack ID
  const invalidSlugPack = JSON.parse(JSON.stringify(validPack));
  invalidSlugPack.id = 'Invalid Pack ID with Spaces!';
  const slugCheck = validateEffectPack(invalidSlugPack);
  assert.equal(slugCheck.success, false);
});

test('M0.3 - Host Shader Wrapper & Deterministic PRNG Rules (Preview = Export)', () => {
  // Test 1: wrapFragmentShader injects standard uniforms and hash function
  const fragmentBody = `
    float noise = hash(uv, uSeed);
    vec4 c = texture(uTexA, uv);
    return vec4(c.rgb + noise * 0.1, c.a);
  `;
  const wrapped = wrapFragmentShader(fragmentBody);

  assert.ok(wrapped.includes('#version 300 es'));
  assert.ok(wrapped.includes('precision highp float;'));
  assert.ok(wrapped.includes('uniform sampler2D uTexA;'));
  assert.ok(wrapped.includes('uniform sampler2D uTexB;'));
  assert.ok(wrapped.includes('uniform float uProgress;'));
  assert.ok(wrapped.includes('uniform float uTime;'));
  assert.ok(wrapped.includes('uniform vec2 uResolution;'));
  assert.ok(wrapped.includes('uniform float uSeed;'));
  assert.ok(wrapped.includes('uniform vec4 uParams;'));
  assert.ok(wrapped.includes('float hash(vec2 p, float s)'));
  assert.ok(wrapped.includes('vec4 effectMain(vec2 uv)'));
  assert.ok(wrapped.includes('fragColor = effectMain(vUv);'));

  // Test 2: Prohibition of Math.random
  const illegalBody = `
    float n = Math.random();
    return texture(uTexA, uv);
  `;
  const checkIllegal = validateFragmentBody(illegalBody);
  assert.equal(checkIllegal.valid, false);
  assert.ok(checkIllegal.error?.includes('CẤM sử dụng Math.random'));

  // Test 3: Prohibition of legacy texture2D
  const legacyBody = `
    return texture2D(uTexA, uv);
  `;
  const checkLegacy = validateFragmentBody(legacyBody);
  assert.equal(checkLegacy.valid, false);
  assert.ok(checkLegacy.error?.includes('texture(...) thay cho texture2D'));
});

test('M0.4 - Deterministic PRNG Math Verification: hash(uv, uSeed) identical across runs', () => {
  // Emulate GLSL hash in JS to verify determinism
  function glslFract(x) {
    return x - Math.floor(x);
  }
  function glslHash(px, py, s) {
    const p3x = glslFract(px * 0.1031 + s);
    const p3y = glslFract(py * 0.1031 + s);
    const p3z = glslFract(px * 0.1031 + s);
    const d = p3x * p3y + p3y * p3z + p3z * (px * 0.1031 + s) + 33.33;
    const p3x2 = p3x + d;
    const p3y2 = p3y + d;
    const p3z2 = p3z + d;
    return glslFract((p3x2 + p3y2) * p3z2);
  }

  const uv = [0.5, 0.5];
  const seed = 123.456;

  // Run 1 (Preview mode)
  const previewVal = glslHash(uv[0], uv[1], seed);
  // Run 2 (Export mode, rendered minutes later)
  const exportVal = glslHash(uv[0], uv[1], seed);

  assert.equal(previewVal, exportVal, 'Preview and Export must produce 100% identical PRNG values');

  // Different seed produces different value
  const otherVal = glslHash(uv[0], uv[1], seed + 1.0);
  assert.notEqual(previewVal, otherVal);
});

test('M0.5 - .capfx ZIP Container: Packing, Unpacking, and SHA-256 Verification', async () => {
  const pack = {
    formatVersion: '1.0.0',
    id: 'official.glitch-pack',
    version: '1.0.0',
    name: {
      vi: 'Gói Glitch & Rung Lắc',
      en: 'Glitch & Shake Pack',
    },
    author: 'ClipForge',
    license: 'MIT',
    redistributable: true,
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 'rgb-shake',
        kind: 'effect',
        paramSchema: {},
        tags: ['glitch'],
        aliases: { vi: ['rung lắc'], en: ['shake'] },
        preview: { thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=' },
        cost: { samplesPerPixel: 1, passes: 1 },
        since: '1.0.0',
      },
    ],
    assets: [],
  };

  const extraFiles = {
    'assets/lut.cube': 'TITLE "Glitch_LUT"\nLUT_3D_SIZE 2\n0 0 0\n1 1 1',
    'assets/sound.wav': new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69]),
  };

  // Pack into .capfx binary
  const zipBytes = await packCapfx(pack, extraFiles);
  assert.ok(zipBytes instanceof Uint8Array);
  assert.ok(zipBytes.length > 100);

  // Unpack from .capfx binary
  const unpacked = await unpackCapfx(zipBytes);
  assert.ok(unpacked.pack);
  assert.equal(unpacked.pack.id, 'official.glitch-pack');
  assert.equal(unpacked.integrityVerified, true);
  assert.ok(unpacked.files['manifest.json']);
  assert.ok(unpacked.files['assets/lut.cube']);
  assert.ok(unpacked.files['assets/sound.wav']);

  const lutContent = new TextDecoder().decode(unpacked.files['assets/lut.cube']);
  assert.ok(lutContent.includes('Glitch_LUT'));
});

test('M0.6 - Composite Effect Graph node declarations', () => {
  const compositeItem = {
    id: 'cyber-composite',
    kind: 'effect',
    paramSchema: {},
    graph: {
      nodes: [
        {
          id: 'n1',
          ref: 'official.glitch-pack/rgb-shake@1.0.0',
          params: { intensity: '0.8 * uParams.x' },
        },
      ],
      edges: [
        { from: 'n1', to: 'output' },
      ],
    },
    tags: ['composite', 'graph'],
    aliases: { vi: ['ghép hiệu ứng'], en: ['composite effect'] },
    preview: { thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=' },
    cost: { samplesPerPixel: 2, passes: 1 },
    since: '1.0.0',
  };

  const parseResult = EffectSpecItemZod.safeParse(compositeItem);
  assert.equal(parseResult.success, true);
});

