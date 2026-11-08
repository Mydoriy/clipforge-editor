/**
 * M0. ĐỊNH DẠNG GÓI (EffectPack, đuôi .capfx = zip)
 * ============================================================================
 * Declarative format specification for EffectPack and EffectSpec items.
 * Strictly declarative: JSON + GLSL ES 3.00 + binary assets.
 * NO JavaScript / WASM execution permitted from packages.
 * ============================================================================
 */

export type EffectItemKind =
  | 'transition'
  | 'effect'
  | 'filter'
  | 'animation'
  | 'textPreset'
  | 'sticker'
  | 'sfx'
  | 'captionStyle'
  | 'template';

export interface ParamSchemaItem {
  type: 'number' | 'boolean' | 'color' | 'select' | 'vec2' | 'vec4';
  label?: { vi: string; en: string };
  default: any;
  min?: number;
  max?: number;
  step?: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  options?: Array<{ label: { vi: string; en: string }; value: any }>;
}

export type ParamSchema = Record<string, ParamSchemaItem>;

export interface ShaderUniformDef {
  type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D';
  default?: any;
  label?: { vi: string; en: string };
}

export interface ShaderSpec {
  language: 'glsl300es';
  fragmentBody: string; // ONLY the function body; host wraps with standard fixed wrapper
  uniforms?: Record<string, ShaderUniformDef>;
  passes?: number; // passes <= 3
}

export interface GraphNode {
  id: string;
  ref: string; // specId namespace e.g. "official.glitch-pack/rgb-shake@1.0.0"
  params?: Record<string, string | number>; // safe arithmetic/expression params
}

export interface GraphEdge {
  from: string; // source node id
  to: string; // target node id
  port?: string;
}

export interface EffectGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ItemAssets {
  lut?: string; // .cube or png-strip relative path
  lottie?: string; // lottie json relative path
  svg?: string; // svg relative path or inline sanitized svg
  font?: string; // font OFL relative path
  audio?: string; // WAV/OGG CC0 relative path
  [key: string]: string | undefined;
}

export interface EffectSpecItem {
  id: string; // item slug, e.g. "rgb-shake"
  // Fully namespaced ID: "<packId>/<itemId>@<version>"
  kind: EffectItemKind;
  paramSchema: ParamSchema;
  shader?: ShaderSpec;
  graph?: EffectGraph; // composite effect graph
  assets?: ItemAssets;
  tags: string[];
  aliases: {
    vi: string[]; // e.g. ["glitch", "giật", "nhiễu", "rung màn hình"]
    en: string[]; // e.g. ["glitch", "jitter", "shake", "distortion"]
  };
  preview: {
    thumb: string; // webp base64 or relative path, <= 8KB
    loopFrames?: number;
  };
  requires?: {
    webgl2: boolean;
    floatTextures?: boolean;
    webgpu?: boolean;
  };
  cost: {
    samplesPerPixel: number;
    passes: number;
  };
  fallbackId?: string; // fallback specId if hardware requirements not met
  deprecatedBy?: string;
  since: string; // version introduced
}

export interface PackAssetMetadata {
  path: string;
  sha256: string;
  size: number;
}

export interface EffectPack {
  formatVersion: string | number; // e.g. "1.0.0"
  id: string; // slug, e.g. "official.glitch-pack"
  version: string; // semver, e.g. "1.0.0"
  name: {
    vi: string;
    en: string;
  };
  author: string;
  license: string; // SPDX, e.g. "MIT", "CC0-1.0", "OFL-1.1"
  redistributable: boolean;
  sourceUrl?: string;
  createdAt: string; // ISO 8601
  items: EffectSpecItem[];
  assets: PackAssetMetadata[];
  signature?: string;
}

/**
 * Generates the fully namespaced Item ID in "<packId>/<itemId>@<version>" format
 */
export function getNamespacedItemId(packId: string, itemId: string, version: string): string {
  return `${packId}/${itemId}@${version}`;
}

/**
 * Parses a namespaced Item ID back into its constituent parts
 */
export function parseNamespacedItemId(namespacedId: string): {
  packId: string;
  itemId: string;
  version: string;
} | null {
  const match = namespacedId.match(/^([^/]+)\/([^@]+)@(.+)$/);
  if (!match) return null;
  return {
    packId: match[1],
    itemId: match[2],
    version: match[3],
  };
}

