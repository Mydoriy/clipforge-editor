/**
 * Standard Shader Host Wrapper (GLSL ES 3.00)
 * ============================================================================
 * Quy tắc shader: Host cung cấp wrapper cố định.
 * - Precision: highp float.
 * - Uniforms chuẩn: uTexA, uTexB, uProgress, uTime, uResolution, uSeed, uParams.
 * - PRNG ngẫu nhiên: float hash(vec2 p, float s) và vec2 hash2(vec2 p, float s).
 * - CẤM Math.random() và mọi nguồn không xác định để Preview = Export đồng nhất 100%.
 * ============================================================================
 */

import type { ShaderUniformDef } from '../types/effectPack.ts';

export const STANDARD_VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = (aPosition + 1.0) * 0.5;
  vUv.y = 1.0 - vUv.y; // Standard canvas coordinate orientation
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * Builds the complete GLSL ES 3.00 fragment shader by wrapping the author's fragmentBody
 * inside the fixed host environment with standard uniforms and deterministic PRNG.
 */
export function wrapFragmentShader(
  fragmentBody: string,
  customUniforms?: Record<string, ShaderUniformDef>
): string {
  // Generate optional author-defined uniform declarations
  let customUniformDecls = '';
  if (customUniforms) {
    for (const [name, def] of Object.entries(customUniforms)) {
      customUniformDecls += `uniform ${def.type} ${name};\n`;
    }
  }

  // Format fragmentBody: if author already provided "return ...", or assigns color
  const trimmed = fragmentBody.trim();
  const hasReturn = /\breturn\b/.test(trimmed);

  const innerCode = hasReturn
    ? trimmed
    : `${trimmed}\n  return texture(uTexA, uv);`;

  return `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

// 1. Standard Host Uniforms
uniform sampler2D uTexA;      // Primary source frame
uniform sampler2D uTexB;      // Secondary source frame (for transitions)
uniform float uProgress;     // Transition progress: 0.0 to 1.0
uniform float uTime;         // Timestamp in seconds
uniform vec2 uResolution;    // Target canvas resolution (width, height)
uniform float uSeed;         // Deterministic seed for PRNG
uniform vec4 uParams;        // Pack of standard user params (intensity, speed, custom1, custom2)

// 2. Custom Author Uniforms (if declared in spec)
${customUniformDecls}
// 3. Built-in Deterministic PRNG Hash Functions
// Preview = Export Guarantee: All noise MUST derive from hash(uv, uSeed)
float hash(vec2 p, float s) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031 + s);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p, float s) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973) + s);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// 4. Author's Declarative Fragment Function
vec4 effectMain(vec2 uv) {
  ${innerCode}
}

void main() {
  fragColor = effectMain(vUv);
}
`;
}

/**
 * Standard uniform buffer or state object passed into the WebGL2 rendering pipeline
 */
export interface StandardShaderUniforms {
  uTexA: number; // Texture unit (e.g. 0)
  uTexB?: number; // Texture unit (e.g. 1)
  uProgress: number; // 0.0 to 1.0
  uTime: number; // in seconds
  uResolution: [number, number];
  uSeed: number; // Deterministic seed
  uParams: [number, number, number, number]; // [intensity, speed, custom1, custom2]
  custom?: Record<string, number | number[]>;
}

/**
 * Verifies that the fragmentBody does not contain non-deterministic calls or forbidden symbols
 */
export function validateFragmentBody(fragmentBody: string): { valid: boolean; error?: string } {
  if (!fragmentBody || typeof fragmentBody !== 'string') {
    return { valid: false, error: 'Fragment body phải là chuỗi GLSL hợp lệ.' };
  }

  // Check for forbidden non-deterministic symbols
  if (/Math\.random/i.test(fragmentBody)) {
    return { valid: false, error: 'CẤM sử dụng Math.random! Phải dùng hàm chuẩn hash(uv, uSeed).' };
  }

  // Check for legacy GLSL 1.00 keywords replaced in GLSL 3.00 es
  if (/\btexture2D\b/.test(fragmentBody)) {
    return { valid: false, error: 'GLSL ES 3.00 sử dụng texture(...) thay cho texture2D(...).' };
  }

  if (/\bgl_FragColor\b/.test(fragmentBody)) {
    return { valid: false, error: 'Host wrapper quản lý đầu ra out vec4 fragColor tự động qua effectMain().' };
  }

  return { valid: true };
}

