/**
 * Extension Registry & Declarative EffectSpec System
 * ============================================================================
 * Strictly declarative data: JSON + GLSL ES 3.00 + binary assets.
 * NO JavaScript / WASM execution from packages permitted.
 * ============================================================================
 */

export type AssetKind =
  | 'effect'
  | 'transition'
  | 'filter'
  | 'animation'
  | 'textPreset'
  | 'sticker'
  | 'sfx'
  | 'font'
  | 'template';

export type TrustLevel =
  | 'official'       // In-House / Core team verified
  | 'community'      // Verified open-source community
  | 'manual'         // User manual import (.pkg.json, .cube)
  | 'local_fallback' // Locally matched approximate fallback
  | 'ai_generated';  // Procedurally generated via AI assistant

export type MatchLevel =
  | 'exact'          // Exact ID and compatible SemVer match
  | 'approximate';   // Nearest category/tag fallback replacement

export type LicenseType = 'CC0' | 'MIT' | 'OFL' | 'In-House';

export interface ShaderUniformDef {
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D' | 'int';
  default: number | number[] | string;
  min?: number;
  max?: number;
  label?: string;
}

export interface DeclarativeShader {
  glslVersion: '300 es' | '100';
  fragmentShader: string; // Pure GLSL ES 3.00 fragment shader code
  vertexShader?: string;   // Optional custom vertex shader (defaults to standard quad)
  uniforms?: Record<string, ShaderUniformDef>;
}

export interface CanvasFallbackDef {
  fn: string; // Identifier of safe local procedural routine (e.g., 'rgb_split', 'glitch')
  params?: Record<string, any>;
}

export interface EffectSpec {
  id: string; // Globally unique identifier, e.g. "com.clipforge.fx.rgb_shake"
  version: string; // Semantic version, e.g. "1.0.0"
  name: string; // Descriptive Vietnamese & English name (e.g. "Rung RGB (RGB Shake)")
  kind: AssetKind;
  description: string;
  author: string;
  license: LicenseType;
  trustLevel: TrustLevel;
  tags: string[];

  // 1. Video Effect / Transition: Pure GLSL ES 3.00 Declarative Shader
  shader?: DeclarativeShader;

  // Safe CPU / 2D Canvas Fallback for low-end devices without WebGL2
  canvasFallback?: CanvasFallbackDef;

  // 2. Filter / Color Grading: DaVinci Resolve .cube text or CSS color matrix
  lutData?: string;
  cssFilter?: string;

  // 3. Animation: Bezier curve keyframes
  animationCurve?: {
    points: Array<{ x: number; y: number }>;
    property: 'scale' | 'opacity' | 'rotation' | 'positionX' | 'positionY';
  };

  // 4. Text Preset: Typography declaration
  textPreset?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    stroke?: { color: string; width: number };
    shadow?: { color: string; blur: number; x: number; y: number };
    background?: { color: string; padding: number; radius: number };
    animIn?: string;
  };

  // 5. Sticker: Sanitized pure SVG vector data
  svgData?: string;

  // 6. Audio SFX: Procedural Web Audio synthesis parameters
  sfxSynthesis?: {
    oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle';
    startFreq: number;
    endFreq: number;
    duration: number;
    noiseAmount?: number;
    reverb?: boolean;
  };

  // 7. Template: Declarative timeline definition
  templateTracks?: any;

  metadata?: Record<string, any>;
}

export interface AssetPackage {
  id: string;
  version: string;
  name: string;
  description: string;
  kind: AssetKind;
  trustLevel: TrustLevel;
  license: LicenseType;
  hash: string; // SHA-256 integrity hash
  sizeBytes: number;
  createdAt: string;
  spec: EffectSpec;
  dependencies?: string[];
}

export interface RegistryIndex {
  version: string;
  lastUpdated: string;
  repositoryName: string;
  packages: AssetPackage[];
}

export interface GhostReference {
  originalId: string;
  originalVersion: string;
  kind: AssetKind;
  name?: string;
  missing: true;
  fallbackMatch?: {
    candidateId: string;
    candidateVersion: string;
    matchLevel: MatchLevel;
    trustLevel: TrustLevel;
  };
}

export interface AssetResolutionResult {
  status: 'resolved_exact' | 'resolved_fallback' | 'ghost_placeholder';
  spec?: EffectSpec;
  matchLevel: MatchLevel;
  trustLevel: TrustLevel;
  ghostReference?: GhostReference;
  message: string;
}

