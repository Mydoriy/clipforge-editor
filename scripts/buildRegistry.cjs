// TODO(mock-registry): Local development static asset registry for offline testing and initial seeding
// In production, this can be served from any static CDN or S3/GCS bucket.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PACKAGES_DIR = path.join(__dirname, '..', 'public', 'registry', 'packages');
const INDEX_FILE = path.join(__dirname, '..', 'public', 'registry', 'index.json');

const starterSpecs = [
  {
    id: 'com.clipforge.fx.rgb_shake',
    version: '1.0.0',
    name: 'Rung RGB (RGB Shake)',
    kind: 'effect',
    description: 'Hiệu ứng tách kênh RGB và rung lắc theo tần số âm thanh / nhịp điệu',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['rgb', 'shake', 'glitch', 'aberration', 'dynamic'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_speed;

void main() {
  vec2 uv = v_uv;
  float shift = sin(u_time * 25.0 * u_speed) * 0.015 * u_intensity;
  float r = texture(u_image, uv + vec2(shift, 0.0)).r;
  float g = texture(u_image, uv).g;
  float b = texture(u_image, uv - vec2(shift, 0.0)).b;
  float a = texture(u_image, uv).a;
  fragColor = vec4(r, g, b, a);
}`,
      uniforms: {
        u_intensity: { type: 'float', default: 1.0, min: 0.0, max: 2.0, label: 'Độ mạnh RGB' },
        u_speed: { type: 'float', default: 1.0, min: 0.1, max: 3.0, label: 'Tốc độ rung' },
      },
    },
    canvasFallback: {
      fn: 'rgb_shake',
      params: { shift: 8 },
    },
  },
  {
    id: 'com.clipforge.fx.motion_blur',
    version: '1.0.0',
    name: 'Làm mờ chuyển động (Motion Blur)',
    kind: 'effect',
    description: 'Mờ quang học định hướng mượt mà cho các cảnh quay hành động hoặc chuyển động nhanh',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['blur', 'motion', 'speed', 'smooth'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_intensity;

void main() {
  vec2 uv = v_uv;
  vec4 color = vec4(0.0);
  float total = 0.0;
  vec2 dir = vec2(0.008 * u_intensity, 0.0);
  for (float i = -4.0; i <= 4.0; i += 1.0) {
    float weight = 1.0 - abs(i) / 5.0;
    color += texture(u_image, uv + dir * i) * weight;
    total += weight;
  }
  fragColor = color / total;
}`,
      uniforms: {
        u_intensity: { type: 'float', default: 1.0, min: 0.2, max: 2.0, label: 'Độ nhòe' },
      },
    },
    canvasFallback: {
      fn: 'motion_blur',
      params: { steps: 4 },
    },
  },
  {
    id: 'com.clipforge.fx.film_halide',
    version: '1.0.0',
    name: 'Hạt phim 35mm (35mm Film Grain)',
    kind: 'effect',
    description: 'Mô phỏng cấu trúc hạt muối bạc (silver halide) của cuộn phim nhựa 35mm cổ điển',
    author: 'Cộng đồng OpenGrain',
    license: 'CC0',
    trustLevel: 'community',
    tags: ['grain', 'film', 'vintage', 'halide', 'retro'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_time;
uniform float u_intensity;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 base = texture(u_image, v_uv);
  float noise = (rand(v_uv * 100.0 + fract(u_time)) - 0.5) * 0.2 * u_intensity;
  fragColor = vec4(clamp(base.rgb + noise, 0.0, 1.0), base.a);
}`,
      uniforms: {
        u_intensity: { type: 'float', default: 1.0, min: 0.1, max: 2.0, label: 'Mật độ hạt' },
      },
    },
    canvasFallback: {
      fn: 'film_halide',
      params: { density: 60 },
    },
  },
  {
    id: 'com.clipforge.trans.cross_zoom',
    version: '1.0.0',
    name: 'Thu phóng chuyển tiếp (Cross Zoom)',
    kind: 'transition',
    description: 'Chuyển cảnh phóng to mượt mà kết hợp hòa trộn khung hình hiện đại',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['transition', 'zoom', 'crossfade', 'smooth'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_progress;

void main() {
  vec2 center = vec2(0.5);
  float zoom = 1.0 + u_progress * 0.4;
  vec2 uv = (v_uv - center) / zoom + center;
  vec4 color = texture(u_image, uv);
  fragColor = color * (1.0 - u_progress * 0.15);
}`,
      uniforms: {
        u_progress: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Tiến độ' },
      },
    },
    canvasFallback: {
      fn: 'cross_zoom',
      params: { maxZoom: 1.4 },
    },
  },
  {
    id: 'com.clipforge.trans.glitch_swipe',
    version: '1.0.0',
    name: 'Lướt Glitch (Glitch Swipe)',
    kind: 'transition',
    description: 'Chuyển cảnh giật tín hiệu kỹ thuật số kèm vuốt ngang thời thượng',
    author: 'PixelForge Labs',
    license: 'MIT',
    trustLevel: 'community',
    tags: ['transition', 'glitch', 'swipe', 'cyber'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_progress;

void main() {
  vec2 uv = v_uv;
  float slice = step(0.5, fract(uv.y * 14.0));
  float offset = (slice - 0.5) * 0.07 * sin(u_progress * 3.14159);
  uv.x += offset;
  fragColor = texture(u_image, uv);
}`,
      uniforms: {
        u_progress: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Tiến độ' },
      },
    },
    canvasFallback: {
      fn: 'glitch',
      params: { displacement: 12 },
    },
  },
  {
    id: 'com.clipforge.filter.teal_orange_3d',
    version: '1.0.0',
    name: 'Điện ảnh Xanh Cam (Teal & Orange 3D)',
    kind: 'filter',
    description: 'Phối màu Hollywood kinh điển: da cam ấm áp tương phản bóng xanh lam',
    author: 'ClipForge Colorist',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['filter', 'lut', 'teal', 'orange', 'cinematic'],
    lutData: `TITLE "Teal_Orange_3D"
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.1 0.0
0.0 1.0 0.2
1.0 1.0 0.1
0.0 0.2 1.0
1.0 0.1 1.0
0.1 1.0 1.0
1.0 0.95 0.9`,
    cssFilter: 'contrast(120%) saturate(135%) sepia(20%) hue-rotate(170deg)',
  },
  {
    id: 'com.clipforge.sfx.whoosh_sweep',
    version: '1.0.0',
    name: 'Vút gió chuyển cảnh (Whoosh Sweep)',
    kind: 'sfx',
    description: 'Âm thanh vút gió tần số kép tổng hợp bằng Web Audio API không tốn dung lượng',
    author: 'ClipForge Sound',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['sfx', 'whoosh', 'sweep', 'transition', 'audio'],
    sfxSynthesis: {
      oscillatorType: 'sine',
      startFreq: 850,
      endFreq: 110,
      duration: 0.42,
      noiseAmount: 0.25,
      reverb: true,
    },
  },
  {
    id: 'com.clipforge.sticker.neon_sparkle',
    version: '1.0.0',
    name: 'Ngôi sao lấp lánh (Neon Sparkle)',
    kind: 'sticker',
    description: 'Ngôi sao vector 8 cánh phát sáng neon màu cyan sắc nét mọi độ phân giải',
    author: 'ClipForge Vectors',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sticker', 'neon', 'star', 'sparkle', 'svg'],
    svgData: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <path d="M50 0 L58 38 L98 50 L58 62 L50 100 L42 62 L2 50 L42 38 Z" fill="#06b6d4" stroke="#ffffff" stroke-width="2" filter="url(#glow)"/>
</svg>`,
  },
];

const packages = starterSpecs.map((spec) => {
  const jsonStr = JSON.stringify(spec);
  const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');
  const sizeBytes = Buffer.byteLength(jsonStr, 'utf-8');

  const pkg = {
    id: spec.id,
    version: spec.version,
    name: spec.name,
    description: spec.description,
    kind: spec.kind,
    trustLevel: spec.trustLevel,
    license: spec.license,
    hash,
    sizeBytes,
    createdAt: new Date().toISOString(),
    spec,
  };

  const pkgFilePath = path.join(PACKAGES_DIR, `${spec.id}.json`);
  fs.writeFileSync(pkgFilePath, JSON.stringify(pkg, null, 2), 'utf-8');
  console.log(`Created package: ${spec.id}.json (${sizeBytes} bytes, hash: ${hash.slice(0, 10)}...)`);
  return pkg;
});

const registryIndex = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  repositoryName: 'ClipForge Official & Community Open Registry',
  packages,
};

fs.writeFileSync(INDEX_FILE, JSON.stringify(registryIndex, null, 2), 'utf-8');
console.log(`Created registry index with ${packages.length} packages at ${INDEX_FILE}`);

