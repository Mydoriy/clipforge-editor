// TODO(mock-registry): Static asset registry builder for offline testing and production distribution
// Generates static /registry/index.json, /packs/<id>/<version>/pack.capfx and signs official packages with Ed25519.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGISTRY_DIR = path.join(__dirname, '..', 'public', 'registry');
const PACKAGES_DIR = path.join(REGISTRY_DIR, 'packages');
const PACKS_DIR = path.join(__dirname, '..', 'public', 'packs');
const INDEX_FILE = path.join(REGISTRY_DIR, 'index.json');

// ClipForge Official Primary Signer 2026 Keypair
const PRIMARY_PUB_HEX = '10108fe56821894d7536e1e480176777fe92d1028b96bcdf85f1dfae1140f642';
const PRIMARY_PRIV_HEX = 'f521a723d0d98d47cc6e655b7fe389b333f4f7a8fa9cc63d3c52899e9a0efe85';

// Helper: Canonical stringify for deterministic Ed25519 signing
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj)
    .filter((k) => k !== 'signature' && k !== 'isInstalled' && k !== 'installedVersion' && k !== 'hasUpdate')
    .sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
}

// Helper: Sign with Ed25519 private key
function signEd25519(dataStr, privHex) {
  const pkcs8 = Buffer.concat([
    Buffer.from('302e020100300506032b657004220420', 'hex'),
    Buffer.from(privHex, 'hex'),
  ]);
  const privKey = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  const sig = crypto.sign(null, Buffer.from(dataStr), privKey);
  return sig.toString('hex');
}

// 36 Starter Specs spanning all 9 asset kinds (Effects, Transitions, Filters, SFX, Stickers, Text, Templates)
const starterSpecs = [
  // 1-8: Video Effects
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
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_image;\nuniform float u_time;\nuniform vec2 u_resolution;\nuniform float u_intensity;\nuniform float u_speed;\nvoid main() {\n  vec2 uv = v_uv;\n  float shift = sin(u_time * 25.0 * u_speed) * 0.015 * u_intensity;\n  float r = texture(u_image, uv + vec2(shift, 0.0)).r;\n  float g = texture(u_image, uv).g;\n  float b = texture(u_image, uv - vec2(shift, 0.0)).b;\n  fragColor = vec4(r, g, b, texture(u_image, uv).a);\n}`,
      uniforms: {
        u_intensity: { type: 'float', default: 1.0, min: 0.0, max: 2.0, label: 'Độ mạnh RGB' },
        u_speed: { type: 'float', default: 1.0, min: 0.1, max: 3.0, label: 'Tốc độ rung' },
      },
    },
    canvasFallback: { fn: 'rgb_shake', params: { shift: 8 } },
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
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_image;\nuniform float u_intensity;\nvoid main() {\n  vec2 uv = v_uv;\n  vec4 color = vec4(0.0);\n  float total = 0.0;\n  vec2 dir = vec2(0.008 * u_intensity, 0.0);\n  for (float i = -4.0; i <= 4.0; i += 1.0) {\n    float weight = 1.0 - abs(i) / 5.0;\n    color += texture(u_image, uv + dir * i) * weight;\n    total += weight;\n  }\n  fragColor = color / total;\n}`,
      uniforms: {
        u_intensity: { type: 'float', default: 1.0, min: 0.2, max: 2.0, label: 'Độ nhòe' },
      },
    },
    canvasFallback: { fn: 'motion_blur', params: { steps: 4 } },
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
    tags: ['film', 'grain', 'analog', 'vintage', 'cinema'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_image;\nuniform float u_time;\nuniform float u_intensity;\nfloat hash(vec2 p) {\n  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);\n}\nvoid main() {\n  vec4 src = texture(u_image, v_uv);\n  float n = (hash(v_uv * 600.0 + fract(u_time * 12.0)) - 0.5) * 0.18 * u_intensity;\n  fragColor = vec4(clamp(src.rgb + n, 0.0, 1.0), src.a);\n}`,
      uniforms: {
        u_intensity: { type: 'float', default: 1.0, min: 0.0, max: 2.0, label: 'Độ đậm hạt' },
      },
    },
    canvasFallback: { fn: 'film_grain', params: { amount: 15 } },
  },
  {
    id: 'com.clipforge.fx.zoom_blur',
    version: '1.0.0',
    name: 'Mờ hướng tâm (Zoom Radial Blur)',
    kind: 'effect',
    description: 'Tạo cảm giác bùng nổ hoặc lao nhanh vào tâm khung hình',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['zoom', 'blur', 'radial', 'impact'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_image;\nuniform float u_intensity;\nvoid main() {\n  vec2 center = vec2(0.5, 0.5);\n  vec2 toCenter = center - v_uv;\n  vec4 col = vec4(0.0);\n  for (int i = 0; i < 8; i++) {\n    float scale = 1.0 - 0.015 * float(i) * u_intensity;\n    col += texture(u_image, center - toCenter * scale);\n  }\n  fragColor = col / 8.0;\n}`,
      uniforms: { u_intensity: { type: 'float', default: 1.0, min: 0.1, max: 2.5, label: 'Cường độ' } },
    },
  },
  {
    id: 'com.clipforge.fx.vhs_distortion',
    version: '1.0.0',
    name: 'Nhiễu từ băng VHS (VHS Distortion Tape)',
    kind: 'effect',
    description: 'Vệt scanline giật ngang đặc trưng của băng từ những năm 90',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['vhs', 'retro', 'tape', 'scanlines', 'analog'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_image;\nuniform float u_time;\nuniform float u_intensity;\nvoid main() {\n  vec2 uv = v_uv;\n  float scanline = sin(uv.y * 800.0) * 0.04 * u_intensity;\n  float glitch = step(0.98, fract(sin(uv.y * 20.0 + u_time * 5.0) * 43758.54)) * 0.02 * u_intensity;\n  vec4 col = texture(u_image, vec2(uv.x + glitch, uv.y));\n  fragColor = vec4(col.rgb - scanline, col.a);\n}`,
      uniforms: { u_intensity: { type: 'float', default: 1.0, min: 0.0, max: 2.0, label: 'Độ giật VHS' } },
    },
  },
  {
    id: 'com.clipforge.fx.glow_pulse',
    version: '1.0.0',
    name: 'Phát quang đập nhịp (Neon Pulse Glow)',
    kind: 'effect',
    description: 'Tăng sáng dạ quang theo nhịp điệu thở mượt mà',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['glow', 'neon', 'pulse', 'light'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_image;\nuniform float u_time;\nuniform float u_intensity;\nvoid main() {\n  vec4 c = texture(u_image, v_uv);\n  float pulse = (sin(u_time * 4.0) * 0.5 + 0.5) * 0.3 * u_intensity;\n  fragColor = vec4(c.rgb + c.rgb * pulse, c.a);\n}`,
      uniforms: { u_intensity: { type: 'float', default: 1.0, min: 0.0, max: 2.0, label: 'Độ sáng' } },
    },
  },
  {
    id: 'com.clipforge.fx.chromatic_aberration',
    version: '1.0.0',
    name: 'Quang sai viền (Lens Edge Dispersion)',
    kind: 'effect',
    description: 'Tách tán sắc thấu kính quang học ở các góc rìa khung hình',
    author: 'Cộng đồng Optics',
    license: 'MIT',
    trustLevel: 'community',
    tags: ['chromatic', 'lens', 'dispersion', 'optics'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_image;\nuniform float u_intensity;\nvoid main() {\n  vec2 dist = v_uv - 0.5;\n  float r = texture(u_image, 0.5 + dist * (1.0 + 0.02 * u_intensity)).r;\n  float g = texture(u_image, v_uv).g;\n  float b = texture(u_image, 0.5 + dist * (1.0 - 0.02 * u_intensity)).b;\n  fragColor = vec4(r, g, b, texture(u_image, v_uv).a);\n}`,
      uniforms: { u_intensity: { type: 'float', default: 1.0, min: 0.0, max: 2.0, label: 'Độ tách viền' } },
    },
  },
  {
    id: 'com.clipforge.fx.light_leak',
    version: '1.0.0',
    name: 'Lọt sáng cổ điển (Warm Light Leak)',
    kind: 'effect',
    description: 'Vệt lọt sáng màu cam vàng ấm áp như chụp bằng máy ảnh film',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['light', 'leak', 'warm', 'vintage', 'film'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_image;\nuniform float u_time;\nuniform float u_intensity;\nvoid main() {\n  vec4 c = texture(u_image, v_uv);\n  float leak = max(0.0, 1.0 - distance(v_uv, vec2(0.1, 0.1)) * 1.5) * (0.8 + 0.2 * sin(u_time * 2.0)) * u_intensity;\n  vec3 warm = vec3(1.0, 0.55, 0.15);\n  fragColor = vec4(c.rgb + warm * leak * 0.45, c.a);\n}`,
      uniforms: { u_intensity: { type: 'float', default: 1.0, min: 0.0, max: 2.0, label: 'Cường độ sáng' } },
    },
  },

  // 9-14: Transitions
  {
    id: 'com.clipforge.trans.cross_zoom',
    version: '1.0.0',
    name: 'Thu phóng chéo (Cross Zoom)',
    kind: 'transition',
    description: 'Chuyển cảnh phóng to mượt mà nối liền 2 phân đoạn video',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['transition', 'zoom', 'cross', 'dynamic'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_texA;\nuniform sampler2D u_texB;\nuniform float u_progress;\nvoid main() {\n  vec2 center = vec2(0.5, 0.5);\n  float p = u_progress;\n  vec2 uvA = center + (v_uv - center) * (1.0 + p * 1.5);\n  vec2 uvB = center + (v_uv - center) * (0.5 + p * 0.5);\n  vec4 colA = texture(u_texA, uvA);\n  vec4 colB = texture(u_texB, uvB);\n  fragColor = mix(colA, colB, p);\n}`,
      uniforms: { u_progress: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Tiến độ' } },
    },
  },
  {
    id: 'com.clipforge.trans.glitch_swipe',
    version: '1.0.0',
    name: 'Gạt nhiễu giật (Glitch Swipe)',
    kind: 'transition',
    description: 'Chuyển tiếp hiện đại bằng cách quét vạch nhiễu kỹ thuật số',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['transition', 'glitch', 'swipe', 'stutter'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_texA;\nuniform sampler2D u_texB;\nuniform float u_progress;\nvoid main() {\n  float p = u_progress;\n  float slice = fract(sin(floor(v_uv.y * 30.0) * 123.45) * 43758.54);\n  float threshold = p + (slice - 0.5) * 0.2;\n  fragColor = v_uv.x < threshold ? texture(u_texB, v_uv) : texture(u_texA, v_uv);\n}`,
      uniforms: { u_progress: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Tiến độ' } },
    },
  },
  {
    id: 'com.clipforge.trans.whip_pan',
    version: '1.0.0',
    name: 'Gạt lia máy nhanh (Whip Pan Speed)',
    kind: 'transition',
    description: 'Lia máy tốc độ cao kèm vệt nhòe phương ngang nối giữa 2 cảnh',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['transition', 'whip', 'pan', 'motion', 'fast'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_texA;\nuniform sampler2D u_texB;\nuniform float u_progress;\nvoid main() {\n  float p = u_progress;\n  vec2 uvA = v_uv - vec2(p, 0.0);\n  vec2 uvB = v_uv + vec2(1.0 - p, 0.0);\n  fragColor = p < 0.5 ? texture(u_texA, uvA) : texture(u_texB, uvB);\n}`,
      uniforms: { u_progress: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Tiến độ' } },
    },
  },
  {
    id: 'com.clipforge.trans.fade_black',
    version: '1.0.0',
    name: 'Hòa tan đen (Dip to Black)',
    kind: 'transition',
    description: 'Chuyển cảnh trầm lắng sang màu đen trước khi mở phân cảnh mới',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['transition', 'fade', 'black', 'classic', 'cinema'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_texA;\nuniform sampler2D u_texB;\nuniform float u_progress;\nvoid main() {\n  float p = u_progress;\n  vec4 col = p < 0.5 ? texture(u_texA, v_uv) * (1.0 - p * 2.0) : texture(u_texB, v_uv) * ((p - 0.5) * 2.0);\n  fragColor = col;\n}`,
      uniforms: { u_progress: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Tiến độ' } },
    },
  },
  {
    id: 'com.clipforge.trans.dissolve',
    version: '1.0.0',
    name: 'Hòa tan mờ chồng (Cross Dissolve)',
    kind: 'transition',
    description: 'Chuyển cảnh mượt mà tiêu chuẩn ngành điện ảnh',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['transition', 'dissolve', 'cross', 'fade', 'smooth'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_texA;\nuniform sampler2D u_texB;\nuniform float u_progress;\nvoid main() {\n  fragColor = mix(texture(u_texA, v_uv), texture(u_texB, v_uv), u_progress);\n}`,
      uniforms: { u_progress: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Tiến độ' } },
    },
  },
  {
    id: 'com.clipforge.trans.spin_blur',
    version: '1.0.0',
    name: 'Xoay tròn 360 độ (Spin Blur Cut)',
    kind: 'transition',
    description: 'Xoay tít khung hình vào tâm tạo cảm giác chuyển động ấn tượng',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['transition', 'spin', 'rotate', 'vortex'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: `#version 300 es\nprecision highp float;\nin vec2 v_uv;\nout vec4 fragColor;\nuniform sampler2D u_texA;\nuniform sampler2D u_texB;\nuniform float u_progress;\nvoid main() {\n  float angle = u_progress * 3.14159;\n  vec2 pt = v_uv - 0.5;\n  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));\n  vec2 rotUv = 0.5 + rot * pt;\n  fragColor = u_progress < 0.5 ? texture(u_texA, rotUv) : texture(u_texB, rotUv);\n}`,
      uniforms: { u_progress: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Tiến độ' } },
    },
  },

  // 15-20: Filters & 3D LUT
  {
    id: 'com.clipforge.filter.teal_orange_3d',
    version: '1.0.0',
    name: 'Điện ảnh Xanh Cam (Teal & Orange 3D LUT)',
    kind: 'filter',
    description: 'Màu da cam ấm áp tương phản sắc sảo với bóng đổ xanh lam Hollywood',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['filter', 'lut', 'teal', 'orange', 'hollywood', 'color_grade'],
    cssFilter: 'contrast(115%) saturate(125%) hue-rotate(-8deg)',
    lutData: 'TITLE "TealOrange3D"\nLUT_3D_SIZE 2\n0.0 0.0 0.0\n0.0 0.2 0.4\n0.8 0.5 0.2\n1.0 0.7 0.3',
  },
  {
    id: 'com.clipforge.filter.vintage_70s',
    version: '1.0.0',
    name: 'Màu phim hoài niệm (1970s Vintage Film)',
    kind: 'filter',
    description: 'Tông màu film ấm vàng ngả nâu hoài niệm cổ điển',
    author: 'Cộng đồng Vintage',
    license: 'CC0',
    trustLevel: 'community',
    tags: ['filter', 'vintage', 'retro', 'sepia', 'warm'],
    cssFilter: 'sepia(35%) contrast(105%) brightness(95%)',
  },
  {
    id: 'com.clipforge.filter.noir_bw',
    version: '1.0.0',
    name: 'Đen trắng điện ảnh (Film Noir B&W)',
    kind: 'filter',
    description: 'Đen trắng tương phản cao nghệ thuật đậm chất điện ảnh cổ điển',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['filter', 'noir', 'bw', 'black_white', 'contrast'],
    cssFilter: 'grayscale(100%) contrast(140%) brightness(90%)',
  },
  {
    id: 'com.clipforge.filter.cyber_neon',
    version: '1.0.0',
    name: 'Neon Viễn Tưởng (Cyberpunk Neon 2077)',
    kind: 'filter',
    description: 'Sắc tím hồng và xanh cyan dạ quang nổi bật cho cảnh đêm',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['filter', 'neon', 'cyberpunk', 'vibrant', 'night'],
    cssFilter: 'saturate(180%) contrast(120%) hue-rotate(35deg)',
  },
  {
    id: 'com.clipforge.filter.warm_sunset',
    version: '1.0.0',
    name: 'Hoàng hôn rực rỡ (Golden Sunset Glow)',
    kind: 'filter',
    description: 'Ánh nắng chiều vàng óng ả làm bừng sáng khung hình',
    author: 'Cộng đồng Indie',
    license: 'MIT',
    trustLevel: 'community',
    tags: ['filter', 'sunset', 'warm', 'golden', 'travel'],
    cssFilter: 'saturate(130%) sepia(20%) brightness(105%)',
  },
  {
    id: 'com.clipforge.filter.film_chrome',
    version: '1.0.0',
    name: 'Dương bản Kodak (Kodak Color Chrome)',
    kind: 'filter',
    description: 'Độ no màu cao và sắc đỏ vàng rực rỡ chuẩn máy cơ Kodak',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['filter', 'kodak', 'chrome', 'film', 'analog'],
    cssFilter: 'contrast(125%) saturate(140%)',
  },

  // 21-26: SFX Sound Effects
  {
    id: 'com.clipforge.sfx.whoosh_sweep',
    version: '1.0.0',
    name: 'Gió vụt nhanh (Fast Air Whoosh)',
    kind: 'sfx',
    description: 'Âm thanh chuyển động lướt qua dứt khoát dùng khi chuyển cảnh',
    author: 'ClipForge Audio Lab',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sfx', 'whoosh', 'fast', 'transition', 'movement'],
    sfxSynthesis: { oscillatorType: 'sawtooth', startFreq: 600, endFreq: 80, duration: 0.28, noiseAmount: 0.5 },
  },
  {
    id: 'com.clipforge.sfx.deep_hit',
    version: '1.0.0',
    name: 'Cú đập âm trầm (Deep Bass Impact)',
    kind: 'sfx',
    description: 'Âm trầm rung dội nhấn mạnh khoảnh khắc giật gân (Boom Impact)',
    author: 'ClipForge Audio Lab',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sfx', 'impact', 'bass', 'hit', 'boom'],
    sfxSynthesis: { oscillatorType: 'sine', startFreq: 180, endFreq: 30, duration: 0.65 },
  },
  {
    id: 'com.clipforge.sfx.vinyl_click',
    version: '1.0.0',
    name: 'Tách đĩa than (Vinyl Crackle Click)',
    kind: 'sfx',
    description: 'Tiếng nổ lách tách nhẹ của đĩa than analog mộc mạc',
    author: 'Cộng đồng Lo-Fi',
    license: 'CC0',
    trustLevel: 'community',
    tags: ['sfx', 'vinyl', 'click', 'lofi', 'analog'],
    sfxSynthesis: { oscillatorType: 'triangle', startFreq: 1200, endFreq: 400, duration: 0.05, noiseAmount: 0.8 },
  },
  {
    id: 'com.clipforge.sfx.ui_chime',
    version: '1.0.0',
    name: 'Chuông pha lê (Crystal UI Chime)',
    kind: 'sfx',
    description: 'Âm thanh tinh tế khi hiển thị icon hoặc nhận thưởng',
    author: 'ClipForge Audio Lab',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sfx', 'chime', 'bell', 'notification', 'clean'],
    sfxSynthesis: { oscillatorType: 'sine', startFreq: 1046, endFreq: 2093, duration: 0.45 },
  },
  {
    id: 'com.clipforge.sfx.glitch_zap',
    version: '1.0.0',
    name: 'Chớp giật điện từ (Electric Glitch Zap)',
    kind: 'sfx',
    description: 'Tiếng giật tia lửa điện khớp với hiệu ứng rung quang sai',
    author: 'ClipForge Audio Lab',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sfx', 'glitch', 'zap', 'electric', 'laser'],
    sfxSynthesis: { oscillatorType: 'square', startFreq: 450, endFreq: 1500, duration: 0.18, noiseAmount: 0.6 },
  },
  {
    id: 'com.clipforge.sfx.camera_shutter',
    version: '1.0.0',
    name: 'Màn trập máy ảnh (Camera Shutter Click)',
    kind: 'sfx',
    description: 'Tiếng bấm máy tách dứt khoát của máy ảnh cơ',
    author: 'ClipForge Audio Lab',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sfx', 'camera', 'shutter', 'photo', 'snap'],
    sfxSynthesis: { oscillatorType: 'triangle', startFreq: 800, endFreq: 200, duration: 0.12, noiseAmount: 0.3 },
  },

  // 27-30: Stickers
  {
    id: 'com.clipforge.sticker.neon_sparkle',
    version: '1.0.0',
    name: 'Ngôi sao dạ quang (Neon Sparkle Star)',
    kind: 'sticker',
    description: 'Icon lấp lánh neon phát sáng chuẩn SVG vector',
    author: 'ClipForge Studio',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sticker', 'svg', 'sparkle', 'star', 'neon'],
    svgData: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill="#1FC8DB" stroke="#ffffff" stroke-width="2"/></svg>',
  },
  {
    id: 'com.clipforge.sticker.confetti_burst',
    version: '1.0.0',
    name: 'Pháo giấy tung bay (Confetti Celebration)',
    kind: 'sticker',
    description: 'Mảnh giấy đa sắc mừng sự kiện hoặc chiến thắng',
    author: 'ClipForge Studio',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sticker', 'confetti', 'party', 'celebrate'],
    svgData: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="25" r="8" fill="#F43F5E"/><rect x="65" y="15" width="12" height="12" fill="#F59E0B" transform="rotate(25 71 21)"/><polygon points="45,60 55,78 35,78" fill="#10B981"/></svg>',
  },
  {
    id: 'com.clipforge.sticker.fire_flame',
    version: '1.0.0',
    name: 'Ngọn lửa rực cháy (Blazing Fire)',
    kind: 'sticker',
    description: 'Biểu tượng ngọn lửa hừng hực nhiệt huyết',
    author: 'Cộng đồng Vector',
    license: 'CC0',
    trustLevel: 'community',
    tags: ['sticker', 'fire', 'flame', 'hot', 'viral'],
    svgData: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 Q75 40 70 70 Q65 95 50 95 Q35 95 30 70 Q25 40 50 5 Z" fill="#F97316"/><path d="M50 35 Q65 60 60 80 Q55 90 50 90 Q45 90 40 80 Q35 60 50 35 Z" fill="#FACC15"/></svg>',
  },
  {
    id: 'com.clipforge.sticker.heart_pulse',
    version: '1.0.0',
    name: 'Trái tim đập (Heart Pulse Love)',
    kind: 'sticker',
    description: 'Trái tim hồng rực rỡ thể hiện tình cảm và yêu thích',
    author: 'ClipForge Studio',
    license: 'CC0',
    trustLevel: 'official',
    tags: ['sticker', 'heart', 'love', 'like', 'pink'],
    svgData: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 85 C20 60 5 40 5 25 A20 20 0 0 1 45 15 L50 22 L55 15 A20 20 0 0 1 95 25 C95 40 80 60 50 85 Z" fill="#EC4899" stroke="#BE185D" stroke-width="3"/></svg>',
  },

  // 31-34: Text Presets
  {
    id: 'com.clipforge.text.hormozi_bold',
    version: '1.0.0',
    name: 'Hormozi Vàng Viền Đen (Hormozi Viral Title)',
    kind: 'textPreset',
    description: 'Chữ hoa vàng tươi viền đen đậm phong cách triệu view',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['text', 'preset', 'hormozi', 'yellow', 'viral', 'hook'],
    textPreset: {
      fontFamily: 'Inter',
      fontSize: 32,
      color: '#FDE047',
      stroke: { color: '#000000', width: 4 },
      shadow: { color: 'rgba(0,0,0,0.8)', blur: 6, x: 2, y: 3 },
    },
  },
  {
    id: 'com.clipforge.text.neon_cyan_glow',
    version: '1.0.0',
    name: 'Cyber Neon Cyan (Phát Quang Xanh)',
    kind: 'textPreset',
    description: 'Chữ phát sáng xanh lam dạ quang nổi bật trên nền tối',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['text', 'preset', 'cyan', 'neon', 'glow'],
    textPreset: {
      fontFamily: 'Inter',
      fontSize: 30,
      color: '#1FC8DB',
      shadow: { color: '#1FC8DB', blur: 12, x: 0, y: 0 },
    },
  },
  {
    id: 'com.clipforge.text.gold_luxury_3d',
    version: '1.0.0',
    name: 'Vàng Kim Hoàng Gia (3D Gold Luxury)',
    kind: 'textPreset',
    description: 'Sắc vàng kim loại sang trọng tạo điểm nhấn thương hiệu',
    author: 'Cộng đồng Typography',
    license: 'OFL',
    trustLevel: 'community',
    tags: ['text', 'preset', 'gold', 'luxury', 'vip'],
    textPreset: {
      fontFamily: 'Inter',
      fontSize: 28,
      color: '#F59E0B',
      stroke: { color: '#78350F', width: 2 },
      shadow: { color: 'rgba(0,0,0,0.9)', blur: 4, x: 3, y: 3 },
    },
  },
  {
    id: 'com.clipforge.text.minimal_white',
    version: '1.0.0',
    name: 'Trắng Tinh Tế (Minimal Clean White)',
    kind: 'textPreset',
    description: 'Phông chữ trắng thanh lịch kèm bóng mờ nhẹ nhàng hiện đại',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['text', 'preset', 'minimal', 'clean', 'white'],
    textPreset: {
      fontFamily: 'Inter',
      fontSize: 26,
      color: '#FFFFFF',
      shadow: { color: 'rgba(0,0,0,0.6)', blur: 4, x: 1, y: 2 },
    },
  },

  // 35-36: Templates
  {
    id: 'com.clipforge.tmpl.viral_tiktok_hook',
    version: '1.0.0',
    name: 'Mẫu TikTok Giật Gân (Viral Hook 3s)',
    kind: 'template',
    description: 'Template hoàn chỉnh 3 giây đầu giữ chân người xem bằng âm thanh và hiệu ứng rung',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['template', 'tiktok', 'hook', 'viral', 'shorts'],
    templateTracks: { duration: 15, tracks: ['video', 'audio', 'text', 'effect'] },
  },
  {
    id: 'com.clipforge.tmpl.ecommerce_sale',
    version: '1.0.0',
    name: 'Mẫu Quảng Cáo Bán Hàng (Flash Sale Product)',
    kind: 'template',
    description: 'Template 9:16 tối ưu chuyển đổi bán hàng trên TikTok Shop & Reels',
    author: 'ClipForge Studio',
    license: 'In-House',
    trustLevel: 'official',
    tags: ['template', 'ecommerce', 'sale', 'ads', 'marketing'],
    templateTracks: { duration: 20, tracks: ['video', 'audio', 'text', 'sticker'] },
  },
];

// Kill switch revocation list (demonstrating security / GPU memory crash kill switch)
const revokedEntries = [
  {
    id: 'com.clipforge.fx.unstable_glitch',
    version: '0.8.0',
    reason: 'Lỗi rò rỉ bộ nhớ GPU WebGL gây treo tab trình duyệt trên card tích hợp',
    revokedAt: '2026-11-01T00:00:00Z',
    replacementId: 'com.clipforge.fx.rgb_shake@1.0.0',
  },
  {
    id: 'com.clipforge.filter.vintage_leaked',
    version: '*',
    reason: 'Thu hồi do vi phạm bản quyền bảng màu điện ảnh thương mại',
    revokedAt: '2026-11-05T00:00:00Z',
    replacementId: 'com.clipforge.filter.teal_orange_3d@1.0.0',
  },
];

function build() {
  if (!fs.existsSync(PACKAGES_DIR)) {
    fs.mkdirSync(PACKAGES_DIR, { recursive: true });
  }
  if (!fs.existsSync(PACKS_DIR)) {
    fs.mkdirSync(PACKS_DIR, { recursive: true });
  }

  const packages = [];

  for (const spec of starterSpecs) {
    const rawContent = JSON.stringify(spec, null, 2);
    const hash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const sizeBytes = Buffer.byteLength(rawContent, 'utf8');

    const pkgPayload = {
      id: spec.id,
      version: spec.version,
      name: spec.name,
      description: spec.description,
      kind: spec.kind,
      trustLevel: spec.trustLevel,
      license: spec.license,
      hash,
      sha256: hash,
      sizeBytes,
      createdAt: new Date().toISOString(),
      spec,
    };

    // Sign official packages with Ed25519 primary key
    if (spec.trustLevel === 'official') {
      const canonical = canonicalStringify(pkgPayload);
      pkgPayload.signature = signEd25519(canonical, PRIMARY_PRIV_HEX);
    }

    packages.push(pkgPayload);

    // Save individual package JSON
    const pkgFilePath = path.join(PACKAGES_DIR, `${spec.id}.json`);
    fs.writeFileSync(pkgFilePath, JSON.stringify(pkgPayload, null, 2), 'utf8');

    // Also support static hosting path: /packs/<id>/<version>/pack.capfx
    const packVersionDir = path.join(PACKS_DIR, spec.id, spec.version);
    fs.mkdirSync(packVersionDir, { recursive: true });
    fs.writeFileSync(path.join(packVersionDir, 'pack.json'), JSON.stringify(pkgPayload, null, 2), 'utf8');
  }

  // Create Registry Index with Ed25519 signature and revoked kill-switch list
  const indexPayload = {
    formatVersion: '1.0.0',
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    repositoryName: 'ClipForge Official & Community Open Registry',
    repositoryUrl: '/registry/index.json',
    revoked: revokedEntries,
    packages,
  };

  const canonicalIndex = canonicalStringify(indexPayload);
  indexPayload.signature = signEd25519(canonicalIndex, PRIMARY_PRIV_HEX);

  fs.writeFileSync(INDEX_FILE, JSON.stringify(indexPayload, null, 2), 'utf8');
  console.log(`Successfully built registry index with ${packages.length} starter packages and ${revokedEntries.length} revoked entries.`);
}

build();
