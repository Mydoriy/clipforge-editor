/**
 * M5. GHÉP CỤC BỘ TỪ HIỆU ỨNG CƠ BẢN (Local Composite Effect Synthesizer)
 * ============================================================================
 * Privacy-First, 100% Offline, Deterministic Graph Synthesis (Zero Network, Zero LLM).
 *
 * Core Capabilities:
 * 1. Primitive Library: 17 atomic building blocks (blur, shift, displace, transform, vignette, grain, etc.)
 * 2. Deterministic Rule-Based Query Synthesis: Keywords -> Graph Template (Reproducible, instant)
 * 3. Analysis-by-Synthesis for Reference Frames: Evaluates candidates on 90p luma with SSIM + Histogram distance.
 *    Strict Guarantee: If score < threshold (0.70), returns "không đủ giống", NEVER force-creates!
 * 4. Export & Storage: Saves to "Hiệu ứng của tôi" and exports to standalone .capfx ZIP container.
 * ============================================================================
 */

import type { EffectItemKind, EffectSpecItem, EffectGraph, ParamSchema } from '../types/effectPack.ts';
import type { EffectSpec, AssetPackage } from '../types/extensionRegistry.ts';
import { computeSSIM } from '../utils/goldenFrameTest.ts';
import { computeRgbHistogram, compareHistograms } from './sceneDetector.ts';
import { db, type InstalledAssetEntity } from '../db/index.ts';
import { packCapfx } from '../utils/capfxZip.ts';
import { computeSha256 } from '../utils/ed25519Verifier.ts';

// ============================================================================
// 1. THƯ VIỆN PRIMITIVE CORE (17 Khối Khai Báo Cơ Bản)
// ============================================================================

export interface PrimitiveDefinition {
  id: string;
  name: { vi: string; en: string };
  category: 'blur' | 'distortion' | 'color' | 'transform' | 'transition' | 'filter' | 'timing';
  paramSchema: ParamSchema;
  fragmentBody: string;
}

export const PRIMITIVE_LIBRARY: Record<string, PrimitiveDefinition> = {
  // 1. Gauss Blur
  'core.primitive.blur.gauss': {
    id: 'core.primitive.blur.gauss',
    name: { vi: 'Làm mờ Gauss', en: 'Gaussian Blur' },
    category: 'blur',
    paramSchema: {
      radius: { type: 'number', default: 4.0, min: 0.0, max: 20.0, label: { vi: 'Bán kính', en: 'Radius' } },
    },
    fragmentBody: `
      vec2 texOffset = 1.0 / uResolution;
      vec4 col = texture(uTexA, vUv) * 0.36;
      col += texture(uTexA, vUv + vec2(texOffset.x * uParams.x, 0.0)) * 0.24;
      col += texture(uTexA, vUv - vec2(texOffset.x * uParams.x, 0.0)) * 0.24;
      col += texture(uTexA, vUv + vec2(0.0, texOffset.y * uParams.x)) * 0.08;
      col += texture(uTexA, vUv - vec2(0.0, texOffset.y * uParams.x)) * 0.08;
      fragColor = col;
    `,
  },

  // 2. Directional Motion Blur
  'core.primitive.blur.directional': {
    id: 'core.primitive.blur.directional',
    name: { vi: 'Mờ chuyển động theo hướng', en: 'Directional Motion Blur' },
    category: 'blur',
    paramSchema: {
      angle: { type: 'number', default: 0.0, min: 0.0, max: 360.0, label: { vi: 'Góc', en: 'Angle' } },
      length: { type: 'number', default: 12.0, min: 0.0, max: 60.0, label: { vi: 'Độ dài', en: 'Length' } },
    },
    fragmentBody: `
      float rad = radians(uParams.x);
      vec2 dir = vec2(cos(rad), sin(rad)) * (uParams.y / uResolution);
      vec4 sum = vec4(0.0);
      for(int i = -3; i <= 3; i++) {
        sum += texture(uTexA, vUv + dir * (float(i) / 3.0));
      }
      fragColor = sum / 7.0;
    `,
  },

  // 3. Radial Zoom Blur
  'core.primitive.blur.radial': {
    id: 'core.primitive.blur.radial',
    name: { vi: 'Mờ phóng tâm', en: 'Radial Zoom Blur' },
    category: 'blur',
    paramSchema: {
      strength: { type: 'number', default: 0.2, min: 0.0, max: 1.0, label: { vi: 'Cường độ', en: 'Strength' } },
    },
    fragmentBody: `
      vec2 center = vec2(0.5);
      vec2 toCenter = center - vUv;
      vec4 sum = vec4(0.0);
      for(int i = 0; i < 5; i++) {
        float scale = 1.0 - uParams.x * (float(i) / 4.0) * 0.1;
        sum += texture(uTexA, (vUv - center) * scale + center);
      }
      fragColor = sum / 5.0;
    `,
  },

  // 4. Channel Shift (RGB Split)
  'core.primitive.channel_shift': {
    id: 'core.primitive.channel_shift',
    name: { vi: 'Tách kênh màu RGB', en: 'RGB Channel Shift' },
    category: 'distortion',
    paramSchema: {
      shift: { type: 'number', default: 6.0, min: 0.0, max: 30.0, label: { vi: 'Độ lệch', en: 'Shift' } },
    },
    fragmentBody: `
      vec2 offset = vec2(uParams.x / uResolution.x, 0.0);
      float r = texture(uTexA, vUv + offset).r;
      float g = texture(uTexA, vUv).g;
      float b = texture(uTexA, vUv - offset).b;
      fragColor = vec4(r, g, b, 1.0);
    `,
  },

  // 5. Displace Noise (Glitch Block Displacement)
  'core.primitive.displace_noise': {
    id: 'core.primitive.displace_noise',
    name: { vi: 'Biến dạng hạt nhiễu', en: 'Displacement Noise' },
    category: 'distortion',
    paramSchema: {
      amount: { type: 'number', default: 10.0, min: 0.0, max: 40.0, label: { vi: 'Mức độ', en: 'Amount' } },
      frequency: { type: 'number', default: 16.0, min: 1.0, max: 50.0, label: { vi: 'Tần số', en: 'Frequency' } },
    },
    fragmentBody: `
      float block = floor(vUv.y * uParams.y);
      float noise = hash21(vec2(block, floor(uTime * 12.0)));
      vec2 disp = vUv;
      if (noise > 0.7) {
        disp.x += (noise - 0.7) * (uParams.x / uResolution.x) * 3.0;
      }
      fragColor = texture(uTexA, disp);
    `,
  },

  // 6. Zoom Scale Rotate
  'core.primitive.zoom_scale_rotate': {
    id: 'core.primitive.zoom_scale_rotate',
    name: { vi: 'Thu phóng xoay', en: 'Zoom Scale & Rotate' },
    category: 'transform',
    paramSchema: {
      scale: { type: 'number', default: 1.15, min: 0.5, max: 3.0, label: { vi: 'Tỉ lệ', en: 'Scale' } },
      rotation: { type: 'number', default: 0.0, min: -180.0, max: 180.0, label: { vi: 'Góc xoay', en: 'Rotation' } },
    },
    fragmentBody: `
      vec2 center = vec2(0.5);
      vec2 p = vUv - center;
      float rad = radians(uParams.y);
      float c = cos(rad);
      float s = sin(rad);
      mat2 rot = mat2(c, -s, s, c);
      vec2 newUv = (rot * p) / max(0.01, uParams.x) + center;
      fragColor = texture(uTexA, clamp(newUv, 0.0, 1.0));
    `,
  },

  // 7. Translate
  'core.primitive.translate': {
    id: 'core.primitive.translate',
    name: { vi: 'Dịch chuyển', en: 'Translate Offset' },
    category: 'transform',
    paramSchema: {
      offsetX: { type: 'number', default: 0.2, min: -1.0, max: 1.0, label: { vi: 'Lệch X', en: 'Offset X' } },
      offsetY: { type: 'number', default: 0.0, min: -1.0, max: 1.0, label: { vi: 'Lệch Y', en: 'Offset Y' } },
    },
    fragmentBody: `
      vec2 offset = vec2(uParams.x, uParams.y);
      vec2 uv = fract(vUv + offset);
      fragColor = texture(uTexA, uv);
    `,
  },

  // 8. Mask Wipe Transition
  'core.primitive.mask_wipe': {
    id: 'core.primitive.mask_wipe',
    name: { vi: 'Gạt mặt nạ chuyển cảnh', en: 'Mask Wipe' },
    category: 'transition',
    paramSchema: {
      progress: { type: 'number', default: 0.5, min: 0.0, max: 1.0, label: { vi: 'Tiến độ', en: 'Progress' } },
      feather: { type: 'number', default: 0.1, min: 0.0, max: 0.5, label: { vi: 'Độ mềm', en: 'Feather' } },
    },
    fragmentBody: `
      float edge = smoothstep(uParams.x - uParams.y, uParams.x + uParams.y, vUv.x);
      vec4 colA = texture(uTexA, vUv);
      vec4 colB = texture(uTexB, vUv);
      fragColor = mix(colB, colA, edge);
    `,
  },

  // 9. Flash Exposure
  'core.primitive.flash_exposure': {
    id: 'core.primitive.flash_exposure',
    name: { vi: 'Chớp sáng phơi sáng', en: 'Flash Exposure' },
    category: 'filter',
    paramSchema: {
      intensity: { type: 'number', default: 1.5, min: 0.0, max: 3.0, label: { vi: 'Độ sáng', en: 'Intensity' } },
    },
    fragmentBody: `
      vec4 col = texture(uTexA, vUv);
      fragColor = vec4(col.rgb * (1.0 + uParams.x), col.a);
    `,
  },

  // 10. Vignette
  'core.primitive.vignette': {
    id: 'core.primitive.vignette',
    name: { vi: 'Tối góc viền', en: 'Vignette' },
    category: 'filter',
    paramSchema: {
      radius: { type: 'number', default: 0.8, min: 0.1, max: 1.5, label: { vi: 'Bán kính', en: 'Radius' } },
      smoothness: { type: 'number', default: 0.5, min: 0.1, max: 1.0, label: { vi: 'Độ mượt', en: 'Smoothness' } },
    },
    fragmentBody: `
      vec4 col = texture(uTexA, vUv);
      float dist = distance(vUv, vec2(0.5));
      float vig = smoothstep(uParams.x, uParams.x - uParams.y, dist);
      fragColor = vec4(col.rgb * vig, col.a);
    `,
  },

  // 11. Film Grain
  'core.primitive.grain': {
    id: 'core.primitive.grain',
    name: { vi: 'Hạt phim', en: 'Film Grain' },
    category: 'filter',
    paramSchema: {
      intensity: { type: 'number', default: 0.15, min: 0.0, max: 0.5, label: { vi: 'Mật độ hạt', en: 'Intensity' } },
    },
    fragmentBody: `
      vec4 col = texture(uTexA, vUv);
      float noise = hash21(vUv * 500.0 + fract(uTime * 10.0)) - 0.5;
      fragColor = vec4(col.rgb + noise * uParams.x, col.a);
    `,
  },

  // 12. Pixelate Mosaic
  'core.primitive.pixelate': {
    id: 'core.primitive.pixelate',
    name: { vi: 'Làm vỡ hạt Pixelate', en: 'Pixelate Mosaic' },
    category: 'distortion',
    paramSchema: {
      size: { type: 'number', default: 16.0, min: 2.0, max: 64.0, label: { vi: 'Cỡ hạt', en: 'Pixel Size' } },
    },
    fragmentBody: `
      vec2 d = vec2(uParams.x / uResolution.x, uParams.x / uResolution.y);
      vec2 coord = floor(vUv / d) * d;
      fragColor = texture(uTexA, coord);
    `,
  },

  // 13. Mirror Reflection
  'core.primitive.mirror': {
    id: 'core.primitive.mirror',
    name: { vi: 'Gương đối xứng', en: 'Mirror' },
    category: 'distortion',
    paramSchema: {
      axis: { type: 'number', default: 0.0, min: 0.0, max: 1.0, label: { vi: 'Trục (0: H, 1: V)', en: 'Axis' } },
    },
    fragmentBody: `
      vec2 uv = vUv;
      if (uParams.x < 0.5) {
        uv.x = abs(uv.x - 0.5) + 0.5;
      } else {
        uv.y = abs(uv.y - 0.5) + 0.5;
      }
      fragColor = texture(uTexA, uv);
    `,
  },

  // 14. Color Matrix
  'core.primitive.color_matrix': {
    id: 'core.primitive.color_matrix',
    name: { vi: 'Ma trận màu sắc', en: 'Color Matrix' },
    category: 'color',
    paramSchema: {
      saturation: { type: 'number', default: 1.2, min: 0.0, max: 2.5, label: { vi: 'Bão hòa', en: 'Saturation' } },
      contrast: { type: 'number', default: 1.1, min: 0.5, max: 2.0, label: { vi: 'Tương phản', en: 'Contrast' } },
    },
    fragmentBody: `
      vec4 col = texture(uTexA, vUv);
      float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      vec3 sat = mix(vec3(gray), col.rgb, uParams.x);
      vec3 con = (sat - 0.5) * uParams.y + 0.5;
      fragColor = vec4(clamp(con, 0.0, 1.0), col.a);
    `,
  },

  // 15. LUT Color Grading
  'core.primitive.lut': {
    id: 'core.primitive.lut',
    name: { vi: 'Bảng tra màu LUT', en: 'Color LUT' },
    category: 'color',
    paramSchema: {
      intensity: { type: 'number', default: 1.0, min: 0.0, max: 1.0, label: { vi: 'Cường độ', en: 'Intensity' } },
    },
    fragmentBody: `
      vec4 col = texture(uTexA, vUv);
      // Normalized tone map approximation
      vec3 warm = vec3(col.r * 1.15, col.g * 0.95, col.b * 0.85);
      fragColor = vec4(mix(col.rgb, warm, uParams.x), col.a);
    `,
  },

  // 16. Easing Interpolator
  'core.primitive.easing': {
    id: 'core.primitive.easing',
    name: { vi: 'Đường cong gia tốc', en: 'Easing Interpolator' },
    category: 'timing',
    paramSchema: {
      curveType: { type: 'number', default: 1.0, min: 0.0, max: 5.0, label: { vi: 'Loại đường cong', en: 'Curve Type' } },
    },
    fragmentBody: `
      // Pure timing modulation node
      fragColor = texture(uTexA, vUv);
    `,
  },

  // 17. Keyframe Interpolator
  'core.primitive.keyframe': {
    id: 'core.primitive.keyframe',
    name: { vi: 'Chuyển động Keyframe', en: 'Keyframe Driver' },
    category: 'timing',
    paramSchema: {
      timeFactor: { type: 'number', default: 1.0, min: 0.1, max: 5.0, label: { vi: 'Tốc độ', en: 'Speed' } },
    },
    fragmentBody: `
      // Pure timing driver
      fragColor = texture(uTexA, vUv);
    `,
  },
};

// ============================================================================
// 2. GHÉP TỪ TRUY VẤN VĂN BẢN (Deterministic Rule-Based Text Graph Synthesis)
// ============================================================================

export interface TextGraphRule {
  keywords: string[];
  kind: EffectItemKind;
  nameVi: string;
  nameEn: string;
  nodes: Array<{ id: string; ref: string; params: Record<string, string | number> }>;
  edges: Array<{ from: string; to: string }>;
  paramSchema: ParamSchema;
  tags: string[];
}

export const TEXT_SYNTHESIS_RULES: TextGraphRule[] = [
  // 1. Glitch / Giật nhiễu
  {
    keywords: ['glitch', 'giat', 'nhieu', 'loan', 'hong', 'jitter'],
    kind: 'effect',
    nameVi: 'Ghép: Giật Nhiễu Glitch',
    nameEn: 'Composite Glitch Jitter',
    nodes: [
      { id: 'node_displace', ref: 'core.primitive.displace_noise', params: { amount: 14, frequency: 22 } },
      { id: 'node_rgb', ref: 'core.primitive.channel_shift', params: { shift: 8 } },
      { id: 'node_flash', ref: 'core.primitive.flash_exposure', params: { intensity: 0.4 } },
    ],
    edges: [
      { from: 'node_displace', to: 'node_rgb' },
      { from: 'node_rgb', to: 'node_flash' },
    ],
    paramSchema: {
      intensity: { type: 'number', default: 1.0, min: 0.2, max: 2.5, label: { vi: 'Mức độ', en: 'Intensity' } },
    },
    tags: ['composite', 'glitch', 'shake', 'noise'],
  },

  // 2. Whip Pan / Chuyển cảnh quét lia
  {
    keywords: ['whip', 'quet', 'lia', 'chuyen canh lia', 'pan'],
    kind: 'transition',
    nameVi: 'Ghép: Quét Lia Nhanh',
    nameEn: 'Composite Whip Pan',
    nodes: [
      { id: 'node_trans', ref: 'core.primitive.translate', params: { offsetX: 0.5, offsetY: 0 } },
      { id: 'node_blur', ref: 'core.primitive.blur.directional', params: { angle: 0, length: 24 } },
    ],
    edges: [{ from: 'node_trans', to: 'node_blur' }],
    paramSchema: {
      speed: { type: 'number', default: 1.2, min: 0.5, max: 3.0, label: { vi: 'Tốc độ', en: 'Speed' } },
    },
    tags: ['composite', 'transition', 'whip', 'blur'],
  },

  // 3. Camera Shake / Rung lắc beat
  {
    keywords: ['shake', 'rung', 'lac', 'rung lac beat', 'camera shake'],
    kind: 'effect',
    nameVi: 'Ghép: Rung Lắc Beat',
    nameEn: 'Composite Beat Shake',
    nodes: [
      { id: 'node_zoom', ref: 'core.primitive.zoom_scale_rotate', params: { scale: 1.08, rotation: 1.5 } },
      { id: 'node_trans', ref: 'core.primitive.translate', params: { offsetX: 0.05, offsetY: 0.02 } },
      { id: 'node_radial', ref: 'core.primitive.blur.radial', params: { strength: 0.12 } },
    ],
    edges: [
      { from: 'node_zoom', to: 'node_trans' },
      { from: 'node_trans', to: 'node_radial' },
    ],
    paramSchema: {
      amplitude: { type: 'number', default: 1.0, min: 0.1, max: 2.0, label: { vi: 'Biên độ', en: 'Amplitude' } },
    },
    tags: ['composite', 'shake', 'beat', 'zoom'],
  },

  // 4. Zoom / Thu phóng
  {
    keywords: ['zoom', 'phong to', 'thu phong', 'cross zoom'],
    kind: 'transition',
    nameVi: 'Ghép: Thu Phóng Phóng Tâm',
    nameEn: 'Composite Zoom Transition',
    nodes: [
      { id: 'node_zoom', ref: 'core.primitive.zoom_scale_rotate', params: { scale: 1.4, rotation: 0 } },
      { id: 'node_radial', ref: 'core.primitive.blur.radial', params: { strength: 0.35 } },
      { id: 'node_flash', ref: 'core.primitive.flash_exposure', params: { intensity: 0.6 } },
    ],
    edges: [
      { from: 'node_zoom', to: 'node_radial' },
      { from: 'node_radial', to: 'node_flash' },
    ],
    paramSchema: {
      zoomAmount: { type: 'number', default: 1.4, min: 1.0, max: 3.0, label: { vi: 'Độ phóng', en: 'Zoom' } },
    },
    tags: ['composite', 'transition', 'zoom', 'flash'],
  },

  // 5. Vintage Film / Cổ điển
  {
    keywords: ['vintage', 'co dien', 'retro', 'phim cu', 'film'],
    kind: 'filter',
    nameVi: 'Ghép: Phim Cổ Điển Vintage',
    nameEn: 'Composite Vintage Film',
    nodes: [
      { id: 'node_color', ref: 'core.primitive.color_matrix', params: { saturation: 0.85, contrast: 1.15 } },
      { id: 'node_grain', ref: 'core.primitive.grain', params: { intensity: 0.22 } },
      { id: 'node_vig', ref: 'core.primitive.vignette', params: { radius: 0.75, smoothness: 0.5 } },
    ],
    edges: [
      { from: 'node_color', to: 'node_grain' },
      { from: 'node_grain', to: 'node_vig' },
    ],
    paramSchema: {
      vintageWarmth: { type: 'number', default: 0.8, min: 0.0, max: 1.5, label: { vi: 'Độ ấm', en: 'Warmth' } },
    },
    tags: ['composite', 'vintage', 'grain', 'vignette'],
  },

  // 6. Cyberpunk Neon
  {
    keywords: ['cyber', 'neon', 'tuong lai', 'scifi'],
    kind: 'filter',
    nameVi: 'Ghép: Ánh Sáng Neon Cyber',
    nameEn: 'Composite Cyber Neon',
    nodes: [
      { id: 'node_rgb', ref: 'core.primitive.channel_shift', params: { shift: 8 } },
      { id: 'node_color', ref: 'core.primitive.color_matrix', params: { saturation: 1.6, contrast: 1.25 } },
      { id: 'node_flash', ref: 'core.primitive.flash_exposure', params: { intensity: 0.3 } },
    ],
    edges: [
      { from: 'node_rgb', to: 'node_color' },
      { from: 'node_color', to: 'node_flash' },
    ],
    paramSchema: {
      glow: { type: 'number', default: 1.2, min: 0.5, max: 2.5, label: { vi: 'Độ phát sáng', en: 'Glow' } },
    },
    tags: ['composite', 'cyber', 'neon', 'rgb'],
  },

  // 7. Noir Black & White
  {
    keywords: ['noir', 'den trang', 'bw', 'black white', 'cinema'],
    kind: 'filter',
    nameVi: 'Ghép: Điện Ảnh Đen Trắng Noir',
    nameEn: 'Composite Noir BW',
    nodes: [
      { id: 'node_color', ref: 'core.primitive.color_matrix', params: { saturation: 0.0, contrast: 1.35 } },
      { id: 'node_grain', ref: 'core.primitive.grain', params: { intensity: 0.18 } },
      { id: 'node_vig', ref: 'core.primitive.vignette', params: { radius: 0.8, smoothness: 0.4 } },
    ],
    edges: [
      { from: 'node_color', to: 'node_grain' },
      { from: 'node_grain', to: 'node_vig' },
    ],
    paramSchema: {
      contrast: { type: 'number', default: 1.35, min: 0.8, max: 2.0, label: { vi: 'Tương phản', en: 'Contrast' } },
    },
    tags: ['composite', 'noir', 'bw', 'grain'],
  },
];

/**
 * Normalizes text: lowercase + strips Vietnamese diacritics
 */
function normalizeQueryText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Synthesizes an EffectGraph deterministically from user query or tags (No LLM, 100% Offline)
 */
export function synthesizeGraphFromQuery(
  query: string,
  kind?: EffectItemKind
): EffectSpecItem | null {
  const normQuery = normalizeQueryText(query);
  if (!normQuery) return null;

  // Find matching rule
  const matchedRule = TEXT_SYNTHESIS_RULES.find((rule) => {
    if (kind && rule.kind !== kind) return false;
    return rule.keywords.some((kw) => normQuery.includes(kw));
  });

  if (!matchedRule) return null;

  const slug = normQuery.split(/\s+/).slice(0, 3).join('-');
  const id = `local.composite.${slug || 'effect'}`;

  return {
    id,
    kind: matchedRule.kind,
    paramSchema: matchedRule.paramSchema,
    graph: {
      nodes: matchedRule.nodes,
      edges: matchedRule.edges,
    },
    tags: matchedRule.tags,
    aliases: {
      vi: [matchedRule.nameVi],
      en: [matchedRule.nameEn],
    },
    preview: {
      thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
    },
    cost: { samplesPerPixel: 2, passes: 1 },
    since: '1.0.0',
  };
}

// ============================================================================
// 3. GHÉP TỪ KHUNG HÌNH THAM CHIẾU (Analysis-by-Synthesis with Reference Frames)
// ============================================================================

export interface AnalysisBySynthesisOptions {
  referenceFrames: Uint8ClampedArray[] | Uint8Array[] | number[][]; // RGBA buffers
  maxTimeMs?: number; // Fixed time budget (<= 20,000ms, cancellable)
  signal?: AbortSignal;
  acceptanceThreshold?: number; // default: 0.70
  frameWidth?: number;
  frameHeight?: number;
  targetKind?: EffectItemKind;
}

export interface AnalysisBySynthesisResult {
  success: boolean;
  score: number; // 0.0 - 1.0
  spec?: EffectSpecItem;
  graph?: EffectGraph;
  fidelity: 'exact' | 'approximate' | 'unmatched';
  trustLevel: 'local_fallback';
  reason: string;
  timeSpentMs: number;
}

/**
 * Downsamples RGBA buffer to 90p luma (160x90 = 14,400 bytes) for fast microsecond evaluations
 */
export function extractLuma90p(
  rgba: Uint8ClampedArray | Uint8Array | number[],
  srcW: number = 1920,
  srcH: number = 1080
): Uint8Array {
  const targetW = 160;
  const targetH = 90;
  const outLuma = new Uint8Array(targetW * targetH);

  const stepX = srcW / targetW;
  const stepY = srcH / targetH;

  for (let y = 0; y < targetH; y++) {
    const srcY = Math.min(srcH - 1, Math.floor(y * stepY));
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(x * stepX));
      const idx = (srcY * srcW + srcX) * 4;
      const r = rgba[idx] || 0;
      const g = rgba[idx + 1] || 0;
      const b = rgba[idx + 2] || 0;
      // ITU-R BT.601 luma calculation
      outLuma[y * targetW + x] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }

  return outLuma;
}

/**
 * Simulates primitive graph execution on a 90p luma buffer for synthesis fitness evaluation
 */
function simulateCandidateLuma(
  srcLuma: Uint8Array,
  candidateType: 'glitch' | 'vintage' | 'noir' | 'shake' | 'neon',
  intensity: number
): Uint8Array {
  const out = new Uint8Array(srcLuma.length);
  const w = 160;
  const h = 90;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let val = srcLuma[idx];

      if (candidateType === 'glitch') {
        // Displace block modulation
        const shiftX = Math.round((Math.sin(y * 0.4) > 0.6 ? 1 : 0) * intensity * 8);
        const sampleX = Math.max(0, Math.min(w - 1, x + shiftX));
        val = srcLuma[y * w + sampleX];
      } else if (candidateType === 'vintage') {
        // Warm contrast + vignette attenuation
        const dist = Math.hypot(x / w - 0.5, y / h - 0.5);
        const vig = Math.max(0, 1.0 - dist * 0.8 * intensity);
        val = Math.min(255, Math.round(val * 1.1 * vig));
      } else if (candidateType === 'noir') {
        // High contrast curve
        val = Math.min(255, Math.max(0, Math.round((val - 128) * (1.0 + intensity * 0.5) + 128)));
      } else if (candidateType === 'shake') {
        // Slight scale and jitter
        const offsetX = Math.round(Math.cos(y) * intensity * 4);
        const sampleX = Math.max(0, Math.min(w - 1, x + offsetX));
        val = srcLuma[y * w + sampleX];
      } else if (candidateType === 'neon') {
        // Saturated glow threshold
        val = val > 160 ? Math.min(255, Math.round(val * 1.3)) : Math.round(val * 0.9);
      }

      out[idx] = val;
    }
  }

  return out;
}

/**
 * Analysis-by-Synthesis with Reference Frames:
 * - Fixed time budget (<= 20s, cancellable)
 * - Evaluates candidates against real frame using SSIM on 90p luma + Histogram Manhattan distance
 * - Score: 0.6 * SSIM + 0.4 * (1 - HistDistance)
 * - Strict Rule: If score < acceptanceThreshold (0.70), returns "không đủ giống", NEVER forces synthesis!
 */
export async function synthesizeFromReferenceFrames(
  options: AnalysisBySynthesisOptions
): Promise<AnalysisBySynthesisResult> {
  const startTime = Date.now();
  const maxTimeMs = Math.min(20000, options.maxTimeMs || 20000);
  const acceptanceThreshold = options.acceptanceThreshold ?? 0.70;
  const frames = options.referenceFrames || [];

  if (frames.length === 0) {
    return {
      success: false,
      score: 0.0,
      fidelity: 'unmatched',
      trustLevel: 'local_fallback',
      reason: 'Không có khung hình tham chiếu nào từ analyzer',
      timeSpentMs: Date.now() - startTime,
    };
  }

  const targetFrame = frames[0] as Uint8ClampedArray;
  const srcW = options.frameWidth || 1920;
  const srcH = options.frameHeight || 1080;

  // 1. Precompute reference 90p luma & RGB histogram
  const targetLuma = extractLuma90p(targetFrame, srcW, srcH);
  const targetHist = computeRgbHistogram(targetFrame, 16);

  // 2. Candidate archetypes pool
  const candidateArchetypes: Array<'glitch' | 'vintage' | 'noir' | 'shake' | 'neon'> = [
    'glitch',
    'vintage',
    'noir',
    'shake',
    'neon',
  ];

  let bestScore = 0.0;
  let bestArchetype: 'glitch' | 'vintage' | 'noir' | 'shake' | 'neon' = 'glitch';
  let bestIntensity = 1.0;

  // 3. Search parameter space within fixed time budget
  for (const archetype of candidateArchetypes) {
    if (options.signal?.aborted || Date.now() - startTime >= maxTimeMs) {
      break;
    }

    // Try discrete intensity steps [0.4, 0.8, 1.2, 1.6]
    for (const intensity of [0.4, 0.8, 1.2, 1.6]) {
      if (options.signal?.aborted || Date.now() - startTime >= maxTimeMs) break;

      const simLuma = simulateCandidateLuma(targetLuma, archetype, intensity);
      // SSIM on luma 90p
      const ssim = Math.max(0, computeSSIM(simLuma, targetLuma));

      // Quick histogram distance check
      const simPixels = new Uint8ClampedArray(simLuma.length * 4);
      for (let i = 0; i < simLuma.length; i++) {
        simPixels[i * 4] = simLuma[i];
        simPixels[i * 4 + 1] = simLuma[i];
        simPixels[i * 4 + 2] = simLuma[i];
        simPixels[i * 4 + 3] = 255;
      }
      const simHist = computeRgbHistogram(simPixels, 16);
      const histDist = compareHistograms(simHist, targetHist);

      // Combined fitness score
      const score = 0.6 * ssim + 0.4 * (1.0 - histDist);

      if (score > bestScore) {
        bestScore = score;
        bestArchetype = archetype;
        bestIntensity = intensity;
      }
    }
  }

  const timeSpentMs = Date.now() - startTime;

  // 4. Threshold gate: If score < threshold, reject with "không đủ giống", do NOT force create!
  if (bestScore < acceptanceThreshold) {
    return {
      success: false,
      score: bestScore,
      fidelity: 'unmatched',
      trustLevel: 'local_fallback',
      reason: `không đủ giống (điểm tương đồng ${(bestScore * 100).toFixed(1)}% < ngưỡng ${(acceptanceThreshold * 100).toFixed(0)}%)`,
      timeSpentMs,
    };
  }

  // 5. Build winning composite EffectSpecItem
  const rule = TEXT_SYNTHESIS_RULES.find((r) => r.keywords.includes(bestArchetype)) || TEXT_SYNTHESIS_RULES[0];
  const spec: EffectSpecItem = {
    id: `local.composite.${bestArchetype}-${Date.now().toString(36)}`,
    kind: rule.kind,
    paramSchema: rule.paramSchema,
    graph: {
      nodes: rule.nodes.map((n) => ({
        ...n,
        params: { ...n.params, intensity: bestIntensity },
      })),
      edges: rule.edges,
    },
    tags: ['composite', 'analysis_by_synthesis', bestArchetype],
    aliases: {
      vi: [`Ghép: ${rule.nameVi}`],
      en: [`Composite: ${rule.nameEn}`],
    },
    preview: {
      thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=',
    },
    cost: { samplesPerPixel: 2, passes: 1 },
    since: '1.0.0',
  };

  return {
    success: true,
    score: bestScore,
    spec,
    graph: spec.graph,
    fidelity: 'approximate',
    trustLevel: 'local_fallback',
    reason: `Khớp thành công bằng Analysis-by-Synthesis (đạt ${(bestScore * 100).toFixed(1)}% SSIM/Histogram)`,
    timeSpentMs,
  };
}

// ============================================================================
// 4. LƯU VÀO "HIỆU ỨNG CỦA TÔI" & XUẤT TỆP .CAPFX
// ============================================================================

/**
 * Saves a synthesized composite effect into "Hiệu ứng của tôi" in Dexie
 */
export async function saveCompositeToMyEffects(
  item: EffectSpecItem,
  customName?: string
): Promise<{ success: boolean; id: string; error?: string }> {
  try {
    const now = Date.now();
    const id = item.id.startsWith('my.composite.') ? item.id : `my.composite.${item.id.replace(/^local\.composite\./, '')}-${now.toString(36)}`;
    const displayName = customName || item.aliases?.vi?.[0] || 'Hiệu ứng ghép cục bộ';

    const convertedSpec: EffectSpec = {
      id,
      version: '1.0.0',
      name: displayName,
      kind: (item.kind === 'captionStyle' || item.kind === 'textPreset' ? 'text' : item.kind) as any,
      description: `Hiệu ứng được ghép cục bộ từ các khối cơ bản (${item.graph?.nodes.map((n) => n.ref).join(', ') || 'primitives'})`,
      author: 'Ghép Cục Bộ (In-House)',
      license: 'In-House',
      trustLevel: 'local_fallback',
      tags: item.tags || ['composite', 'my_effect'],
      paramSchema: item.paramSchema,
      redistributable: true,
      shader: {
        glslVersion: '300 es',
        fragmentShader: '// Composite Graph Node Pipeline',
      },
    };

    const entity: InstalledAssetEntity = {
      id,
      version: '1.0.0',
      name: displayName,
      kind: item.kind,
      trustLevel: 'local_fallback',
      license: 'In-House',
      spec: convertedSpec,
      installedAt: now,
      updatedAt: now,
      lastUsedAt: now,
      sizeBytes: 2048,
      hash: 'composite_' + now,
      sha256: await computeSha256(JSON.stringify(convertedSpec)),
      isVerified: false,
    };

    if (typeof indexedDB !== 'undefined' && typeof db?.installedAssets?.put === 'function') {
      await db.installedAssets.put(entity);
    }
    return { success: true, id };
  } catch (err: any) {
    return { success: false, id: item.id, error: err.message };
  }
}

/**
 * Exports a composite graph item into a standard .capfx (ZIP) binary package for sharing
 */
export async function exportCompositeToCapfx(
  item: EffectSpecItem
): Promise<Uint8Array> {
  const pack = {
    formatVersion: '1.0.0',
    id: `pack.${item.id.replace(/[^a-z0-9_.-]/gi, '_')}`,
    version: '1.0.0',
    name: {
      vi: item.aliases?.vi?.[0] || 'Gói ghép cục bộ',
      en: item.aliases?.en?.[0] || 'Local Composite Pack',
    },
    author: 'ClipForge In-House',
    license: 'In-House',
    redistributable: true,
    createdAt: new Date().toISOString(),
    items: [item],
    assets: [],
  };

  return await packCapfx(pack);
}
