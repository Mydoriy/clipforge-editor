const fs = require('fs');
const path = require('path');

// Run using Node with dynamic import of capfxZip
async function main() {
  const { packCapfx } = await import('../src/utils/capfxZip.ts');

  const samplePack = {
    formatVersion: '1.0.0',
    id: 'official.glitch-pack',
    version: '1.0.0',
    name: {
      vi: 'Bộ Hiệu Ứng Glitch & Rung Lắc',
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
          speed: {
            type: 'number',
            label: { vi: 'Tốc độ', en: 'Speed' },
            default: 1.0,
            min: 0.1,
            max: 3.0,
          },
        },
        shader: {
          language: 'glsl300es',
          fragmentBody: `
            float shift = (hash(uv, uSeed) * 0.02 - 0.01) * uParams.x;
            float r = texture(uTexA, uv + vec2(shift, 0.0)).r;
            float g = texture(uTexA, uv).g;
            float b = texture(uTexA, uv - vec2(shift, 0.0)).b;
            float a = texture(uTexA, uv).a;
            return vec4(r, g, b, a);
          `,
          passes: 1,
        },
        tags: ['glitch', 'shake', 'rgb', 'vhs'],
        aliases: {
          vi: ['glitch', 'giật', 'nhiễu', 'rung màn hình', 'tách màu'],
          en: ['glitch', 'rgb shake', 'chromatic aberration', 'jitter'],
        },
        preview: {
          thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
          loopFrames: 30,
        },
        requires: {
          webgl2: true,
        },
        cost: {
          samplesPerPixel: 3,
          passes: 1,
        },
        since: '1.0.0',
      },
      {
        id: 'glitch-transition',
        kind: 'transition',
        paramSchema: {
          progress: {
            type: 'number',
            label: { vi: 'Tiến độ', en: 'Progress' },
            default: 0.0,
            min: 0.0,
            max: 1.0,
          },
        },
        shader: {
          language: 'glsl300es',
          fragmentBody: `
            float slice = step(0.5, fract(uv.y * 12.0));
            float noiseOffset = (hash(vec2(slice, uv.y), uSeed) - 0.5) * 0.08 * sin(uProgress * 3.14159);
            vec2 offsetUv = uv + vec2(noiseOffset, 0.0);
            vec4 colA = texture(uTexA, offsetUv);
            vec4 colB = texture(uTexB, offsetUv);
            return mix(colA, colB, uProgress);
          `,
          passes: 1,
        },
        tags: ['transition', 'glitch', 'wipe'],
        aliases: {
          vi: ['chuyển cảnh glitch', 'lướt nhiễu', 'chuyển cảnh giật'],
          en: ['glitch transition', 'noise wipe', 'glitch swipe'],
        },
        preview: {
          thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
          loopFrames: 24,
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

  const extraFiles = {
    'assets/glitch_cube.cube': 'TITLE "Glitch_Tone"\nLUT_3D_SIZE 2\n0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1',
  };

  const capfxBytes = await packCapfx(samplePack, extraFiles);
  const outPath = path.join(__dirname, '..', 'public', 'registry', 'packages', 'official.glitch-pack.capfx');
  fs.writeFileSync(outPath, capfxBytes);
  console.log(`Generated official.glitch-pack.capfx (${capfxBytes.length} bytes) at ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

