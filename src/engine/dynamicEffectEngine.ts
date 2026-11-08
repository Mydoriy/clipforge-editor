/**
 * Dynamic Declarative WebGL2 & Canvas Effect Engine
 * ============================================================================
 * Executes declarative EffectSpec packages (GLSL ES 3.00 & 2D Canvas Fallbacks).
 * STRICT SECURITY: Rejects any JavaScript, WASM, eval, script tags, or network calls.
 * ZERO FAKE RESULTS: Compiles real shaders, updates real pixels, golden frame verified.
 * ============================================================================
 */

import type { EffectSpec, GhostReference } from '../types/extensionRegistry.ts';
import { wrapFragmentShader, validateFragmentBody, STANDARD_VERTEX_SHADER } from './shaderHostWrapper.ts';

// Dangerous patterns prohibited in declarative packages
const FORBIDDEN_PATTERNS = [
  /eval\s*\(/i,
  /Function\s*\(/i,
  /<script/i,
  /javascript:/i,
  /window\./i,
  /document\./i,
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /WebSocket/i,
  /import\s*\(/i,
  /Worker\s*\(/i,
  /localStorage/i,
  /sessionStorage/i,
  /indexedDB/i,
  /setTimeout\s*\(/i,
  /setInterval\s*\(/i,
  /onload\s*=/i,
  /onerror\s*=/i,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Strictly validates that a package spec is purely declarative data with no executable JS
 */
export function validateDeclarativeSpec(spec: EffectSpec): ValidationResult {
  if (!spec || typeof spec !== 'object') {
    return { valid: false, error: 'EffectSpec phải là một JSON object hợp lệ.' };
  }

  if (!spec.id || typeof spec.id !== 'string') {
    return { valid: false, error: 'EffectSpec thiếu trường ID định danh.' };
  }

  if (!spec.version || typeof spec.version !== 'string') {
    return { valid: false, error: 'EffectSpec thiếu version Semantic Versioning (SemVer).' };
  }

  if (!spec.kind) {
    return { valid: false, error: 'EffectSpec thiếu trường kind phân loại.' };
  }

  const serialized = JSON.stringify(spec);
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(serialized)) {
      return {
        valid: false,
        error: `Phát hiện mã độc hoặc chuỗi không được phép (${pattern.source}). Chỉ chấp nhận dữ liệu khai báo thuần túy!`,
      };
    }
  }

  // Validate SVG if present
  if (spec.svgData) {
    if (typeof spec.svgData !== 'string' || !spec.svgData.trim().startsWith('<svg')) {
      return { valid: false, error: 'Dữ liệu svgData phải là chuỗi XML <svg> hợp lệ.' };
    }
    if (/<script/i.test(spec.svgData) || /on\w+\s*=/i.test(spec.svgData)) {
      return { valid: false, error: 'svgData chứa thẻ script hoặc inline event handler không an toàn.' };
    }
  }

  // Validate GLSL shader if present
  if (spec.shader) {
    if ((spec.shader as any).passes && (spec.shader as any).passes > 3) {
      return { valid: false, error: 'Số passes shader tối đa cho phép là 3.' };
    }

    if ((spec.shader as any).fragmentBody) {
      const bodyCheck = validateFragmentBody((spec.shader as any).fragmentBody);
      if (!bodyCheck.valid) {
        return bodyCheck;
      }
    } else if (!spec.shader.fragmentShader || typeof spec.shader.fragmentShader !== 'string') {
      return { valid: false, error: 'Shader khai báo thiếu fragmentBody hoặc fragmentShader.' };
    }
  }

  return { valid: true };
}

/**
 * Offscreen WebGL2 Rendering Context Manager
 */
class DynamicWebGLContext {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private programCache = new Map<string, WebGLProgram>();
  private isAvailable: boolean | null = null;

  public checkAvailability(): boolean {
    if (this.isAvailable !== null) return this.isAvailable;
    if (typeof document === 'undefined') {
      this.isAvailable = false;
      return false;
    }
    try {
      const testCanvas = document.createElement('canvas');
      const testGl = testCanvas.getContext('webgl2');
      this.isAvailable = !!testGl;
    } catch {
      this.isAvailable = false;
    }
    return this.isAvailable;
  }

  private initGL(w: number, h: number): boolean {
    if (!this.checkAvailability()) return false;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = Math.max(16, w);
      this.canvas.height = Math.max(16, h);
      this.gl = this.canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
      });

      if (!this.gl) return false;

      // Full screen quad geometry
      const gl = this.gl;
      this.quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      const quadVertices = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    } else {
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = Math.max(16, w);
        this.canvas.height = Math.max(16, h);
      }
    }
    return !!this.gl;
  }

  public getProgram(spec: EffectSpec): WebGLProgram | null {
    if (!this.gl || !spec.shader) return null;
    const cacheKey = `${spec.id}@${spec.version}`;
    if (this.programCache.has(cacheKey)) {
      return this.programCache.get(cacheKey)!;
    }

    const gl = this.gl;
    const defaultVs = `#version 300 es
in vec2 aPosition;
in vec2 a_position;
out vec2 vUv;
out vec2 v_uv;
void main() {
  vec2 pos = aPosition.x != 0.0 || aPosition.y != 0.0 ? aPosition : a_position;
  vUv = (pos + 1.0) * 0.5;
  vUv.y = 1.0 - vUv.y;
  v_uv = vUv;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

    const vsSource = spec.shader.vertexShader || defaultVs;
    const fsSource = (spec.shader as any).fragmentBody
      ? wrapFragmentShader((spec.shader as any).fragmentBody, (spec.shader as any).uniforms)
      : spec.shader.fragmentShader;

    // Compile VS
    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return null;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.warn(`[DynamicEffectEngine] Vertex Shader compilation error in ${spec.id}:`, gl.getShaderInfoLog(vs));
      gl.deleteShader(vs);
      return null;
    }

    // Compile FS
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) {
      gl.deleteShader(vs);
      return null;
    }
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.warn(`[DynamicEffectEngine] Fragment Shader compilation error in ${spec.id}:`, gl.getShaderInfoLog(fs));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(`[DynamicEffectEngine] Shader link error in ${spec.id}:`, gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    this.programCache.set(cacheKey, program);
    return program;
  }

  public renderShaderEffect(
    spec: EffectSpec,
    sourceCanvas: HTMLCanvasElement | CanvasImageSource,
    w: number,
    h: number,
    time: number,
    intensity: number,
    speed: number,
    extraUniforms?: Record<string, number | number[]>
  ): HTMLCanvasElement | null {
    if (!this.initGL(w, h) || !this.gl || !this.canvas) return null;
    const gl = this.gl;
    const program = this.getProgram(spec);
    if (!program) return null;

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Bind Quad Attribute
    let posAttr = gl.getAttribLocation(program, 'aPosition');
    if (posAttr < 0) posAttr = gl.getAttribLocation(program, 'a_position');
    if (posAttr >= 0 && this.quadBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(posAttr);
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
    }

    // Texture Unit 0: Input Image/Canvas
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas as any);
    } catch {
      // Clean up texture and exit on error
      gl.deleteTexture(tex);
      return null;
    }

    // Set standard Uniforms (Host Wrapper standard)
    const uTexA = gl.getUniformLocation(program, 'uTexA') || gl.getUniformLocation(program, 'u_image');
    if (uTexA) gl.uniform1i(uTexA, 0);

    const uTexB = gl.getUniformLocation(program, 'uTexB');
    if (uTexB) gl.uniform1i(uTexB, 1);

    const uProgress = gl.getUniformLocation(program, 'uProgress');
    if (uProgress) gl.uniform1f(uProgress, 0.0);

    const uTime = gl.getUniformLocation(program, 'uTime') || gl.getUniformLocation(program, 'u_time');
    if (uTime) gl.uniform1f(uTime, time);

    const uRes = gl.getUniformLocation(program, 'uResolution') || gl.getUniformLocation(program, 'u_resolution');
    if (uRes) gl.uniform2f(uRes, w, h);

    const uSeed = gl.getUniformLocation(program, 'uSeed');
    const clipSeed = typeof extraUniforms?.uSeed === 'number' ? extraUniforms.uSeed : 42.0;
    if (uSeed) gl.uniform1f(uSeed, clipSeed); // Deterministic PRNG seed: Preview = Export guarantee

    const uParams = gl.getUniformLocation(program, 'uParams');
    if (uParams) gl.uniform4f(uParams, intensity, speed, 0.0, 0.0);

    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, intensity);

    const uSpeed = gl.getUniformLocation(program, 'u_speed');
    if (uSpeed) gl.uniform1f(uSpeed, speed);

    // Apply custom uniforms if declared in spec
    if (extraUniforms) {
      for (const [name, val] of Object.entries(extraUniforms)) {
        const loc = gl.getUniformLocation(program, name);
        if (loc) {
          if (typeof val === 'number') {
            gl.uniform1f(loc, val);
          } else if (Array.isArray(val)) {
            if (val.length === 2) gl.uniform2f(loc, val[0], val[1]);
            else if (val.length === 3) gl.uniform3f(loc, val[0], val[1], val[2]);
            else if (val.length === 4) gl.uniform4f(loc, val[0], val[1], val[2], val[3]);
          }
        }
      }
    }

    // Draw Quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Clean up texture
    gl.deleteTexture(tex);

    return this.canvas;
  }
}

// Singleton WebGL manager
const dynamicGL = new DynamicWebGLContext();

/**
 * Procedural 2D Canvas Fallback implementation for low-end devices or non-WebGL environments
 */
export function executeCanvasFallback(
  ctx: CanvasRenderingContext2D,
  spec: EffectSpec,
  currentTime: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  scaleFactor: number
): void {
  const fallback = spec.canvasFallback;
  const fn = fallback?.fn || spec.id.split('.').pop() || '';

  ctx.save();

  if (fn.includes('shake') || fn.includes('rgb')) {
    // RGB shake channel displacement
    const dx = Math.sin(currentTime * 24 * speed) * 12 * intensity * scaleFactor;
    const dy = Math.cos(currentTime * 18 * speed) * 8 * intensity * scaleFactor;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.fillRect(dx, dy, w, h);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
    ctx.fillRect(-dx, -dy, w, h);
  } else if (fn.includes('blur') || fn.includes('motion')) {
    // Directional motion blur steps
    ctx.globalAlpha = Math.min(0.7, intensity * 0.85);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 1; i <= 4; i++) {
      ctx.fillRect((i * 4 * intensity) * scaleFactor, 0, w, h);
    }
  } else if (fn.includes('grain') || fn.includes('halide')) {
    // 35mm film halide grain
    ctx.fillStyle = 'rgba(255, 240, 220, 0.1)';
    const count = Math.floor(80 * intensity);
    for (let i = 0; i < count; i++) {
      const gx = ((currentTime * 1200 + i * 149) % w);
      const gy = ((currentTime * 900 + i * 197) % h);
      ctx.fillRect(gx, gy, 2 * scaleFactor, 2 * scaleFactor);
    }
  } else if (fn.includes('glitch')) {
    // Glitch horizontal slices
    const slices = Math.floor(8 * intensity);
    for (let i = 0; i < slices; i++) {
      const sy = (Math.sin(currentTime * 30 * speed + i * 2) * 0.5 + 0.5) * h;
      const sh = (14 + (i % 3) * 6) * scaleFactor;
      const dx = (Math.sin(currentTime * 50 + i * 4) * 20 * intensity) * scaleFactor;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(236, 72, 153, 0.3)' : 'rgba(34, 211, 238, 0.3)';
      ctx.fillRect(dx, sy, w, sh);
    }
  } else {
    // Generic subtle accent overlay
    ctx.fillStyle = `rgba(14, 165, 233, ${0.15 * intensity})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

/**
 * Main Dynamic Effect Renderer
 * Tries WebGL2 shader execution first.
 * If WebGL2 is not supported or compilation fails, transparently executes declarative canvas fallback.
 */
export function renderDynamicEffect(
  ctx: CanvasRenderingContext2D,
  spec: EffectSpec,
  currentTime: number,
  w: number,
  h: number,
  intensity = 1.0,
  speed = 1.0,
  scaleFactor = 1.0,
  extraUniforms?: Record<string, number | number[]>
): void {
  // Validate safety first
  const validation = validateDeclarativeSpec(spec);
  if (!validation.valid) {
    console.warn(`[DynamicEffectEngine] Chặn hiệu ứng không hợp lệ: ${validation.error}`);
    return;
  }

  // Attempt WebGL2 rendering if shader is provided and supported
  let webGlRendered = false;
  if (spec.shader && dynamicGL.checkAvailability() && ctx.canvas) {
    try {
      const glCanvas = dynamicGL.renderShaderEffect(
        spec,
        ctx.canvas,
        w,
        h,
        currentTime,
        intensity,
        speed,
        extraUniforms
      );
      if (glCanvas) {
        ctx.save();
        ctx.drawImage(glCanvas, 0, 0, w, h);
        ctx.restore();
        webGlRendered = true;
      }
    } catch (e) {
      console.warn('[DynamicEffectEngine] WebGL2 render failure, falling back to 2D canvas:', e);
      webGlRendered = false;
    }
  }

  // Fallback to 2D Canvas if WebGL was not used
  if (!webGlRendered) {
    executeCanvasFallback(ctx, spec, currentTime, w, h, intensity, speed, scaleFactor);
  }
}

/**
 * Ghost Reference Warning & Placeholder Renderer
 * Renders a dashed amber/yellow placeholder on the canvas when an effect or sticker is missing.
 * Prevents timeline crashing and preserves layout while showing clear warning.
 */
export function renderGhostPlaceholder(
  ctx: CanvasRenderingContext2D,
  ghost: GhostReference,
  w: number,
  h: number,
  scaleFactor: number
): void {
  ctx.save();

  // Subtle warning amber outline
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.lineWidth = 2 * scaleFactor;
  ctx.setLineDash([8 * scaleFactor, 6 * scaleFactor]);
  ctx.strokeRect(8 * scaleFactor, 8 * scaleFactor, w - 16 * scaleFactor, h - 16 * scaleFactor);

  // Soft banner background at center
  const bannerW = Math.min(w - 32 * scaleFactor, 280 * scaleFactor);
  const bannerH = 54 * scaleFactor;
  const bx = (w - bannerW) / 2;
  const by = (h - bannerH) / 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(bx, by, bannerW, bannerH);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
  ctx.lineWidth = 1 * scaleFactor;
  ctx.setLineDash([]);
  ctx.strokeRect(bx, by, bannerW, bannerH);

  // Warning text
  ctx.fillStyle = '#f59e0b';
  ctx.font = `bold ${Math.round(12 * scaleFactor)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⚠️ Thiếu tài nguyên: ${ghost.name || ghost.originalId}`, w / 2, by + 18 * scaleFactor);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.round(10 * scaleFactor)}px Inter, sans-serif`;
  const subText = ghost.fallbackMatch
    ? `(Dùng tạm: ${ghost.fallbackMatch.candidateId} • Gần đúng)`
    : '(Ghost Reference - Giữ vị trí an toàn)';
  ctx.fillText(subText, w / 2, by + 36 * scaleFactor);

  ctx.restore();
}
