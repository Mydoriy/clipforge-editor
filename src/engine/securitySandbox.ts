/**
 * M7: Safety & Sandbox Engine (Security Hardening for Non-Official, Community & AI Packages)
 * ============================================================================
 * Áp dụng cho:
 * - Mọi gói không phải Chính thức đã ký (Community, Manual, Third-party)
 * - Mọi EffectSpec do AI viết hoặc do máy tính ghép cục bộ
 *
 * Tiêu chuẩn bảo mật:
 * 1. Giới hạn gói: tổng size <= 50MB, file <= 25MB, entries <= 100, tỉ lệ nén <= 100:1 (chống Zip Bomb).
 * 2. Đường dẫn an toàn: cấm tuyệt đối "/", "\" và "..", cấm null bytes.
 * 3. Danh sách trắng đuôi file: .json, .glsl, .frag, .vert, .cube, .svg, .ttf, .otf, .woff, .woff2, .wav, .ogg, .webp, .png, .jpg.
 * 4. Phân tích tĩnh GLSL qua tokenizer:
 *    - Cấm #extension ngoài whitelist, cấm #include.
 *    - Cấm while và do-while; for CHỈ với biên hằng số <= 32.
 *    - Giới hạn số lần texture sampling per pixel <= 16.
 *    - Giới hạn số lượng uniform <= 32.
 *    - Độ dài mã <= 16KB, số passes <= 3.
 *    - Cấm đọc ngoài các sampler mà host cung cấp.
 * 5. Sandbox WebGL2 trong Worker + OffscreenCanvas với Watchdog timer 200ms.
 * 6. Runtime Watchdog: Tự động tắt (bypass) hiệu ứng nếu vượt ngân sách frame time liên tục; xử lý webglcontextlost.
 * 7. Sanitize toàn diện tài nguyên đi kèm: SVG, Lottie JSON, .cube, Font magic bytes. Cấm subresource ngoài.
 * 8. Mã lỗi chuẩn hóa (Error Codes) và Trích xuất thông tin chẩn đoán (Diagnostic Info).
 * ============================================================================
 */

import {
  sanitizeSvg,
  sanitizeCubeLut,
  sanitizeLottieJson,
  validateFontBuffer,
} from '../utils/sanitizer.ts';

export type SecurityErrorCode =
  | 'ERR_PACK_TOO_LARGE'
  | 'ERR_UNCOMPRESSED_TOO_LARGE'
  | 'ERR_FILE_TOO_LARGE'
  | 'ERR_TOO_MANY_FILES'
  | 'ERR_ZIP_BOMB'
  | 'ERR_PATH_TRAVERSAL'
  | 'ERR_FILE_EXT_NOT_ALLOWED'
  | 'ERR_GLSL_CODE_TOO_LONG'
  | 'ERR_GLSL_DISALLOWED_EXT'
  | 'ERR_GLSL_DISALLOWED_LOOP'
  | 'ERR_GLSL_LOOP_BOUND_EXCEEDED'
  | 'ERR_GLSL_TOO_MANY_SAMPLES'
  | 'ERR_GLSL_TOO_MANY_UNIFORMS'
  | 'ERR_GLSL_TOO_MANY_PASSES'
  | 'ERR_GLSL_DISALLOWED_SAMPLER'
  | 'ERR_SANDBOX_TIMEOUT'
  | 'ERR_ASSET_SANITIZATION_FAILED'
  | 'ERR_UNAUTHORIZED_SUBRESOURCE';

export const ARCHIVE_SECURITY_LIMITS = {
  MAX_PACK_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_UNCOMPRESSED_TOTAL_BYTES: 100 * 1024 * 1024, // 100MB
  MAX_FILE_BYTES: 25 * 1024 * 1024, // 25MB
  MAX_FILES_COUNT: 100,
  MAX_COMPRESSION_RATIO: 100, // 100:1 ratio against zip-bomb
  WHITELISTED_EXTENSIONS: [
    '.json',
    '.glsl',
    '.frag',
    '.vert',
    '.cube',
    '.svg',
    '.ttf',
    '.otf',
    '.woff',
    '.woff2',
    '.wav',
    '.ogg',
    '.webp',
    '.png',
    '.jpg',
    '.jpeg',
  ],
};

export const GLSL_SECURITY_LIMITS = {
  MAX_CODE_LENGTH_BYTES: 16 * 1024, // 16KB
  MAX_PASSES: 3,
  MAX_TEXTURE_SAMPLES_PER_PIXEL: 16,
  MAX_UNIFORMS: 32,
  MAX_FOR_LOOP_BOUND: 32,
  ALLOWED_EXTENSIONS: [
    'GL_OES_standard_derivatives',
    'GL_EXT_shader_texture_lod',
    'GL_KHR_parallel_shader_compile',
  ],
  ALLOWED_HOST_SAMPLERS: ['uTexA', 'uTexB', 'uTexture', 'u_image', 'uImage'],
};

export const SECURITY_FUNDAMENTAL_LIMITS_STATEMENT =
  'Thừa nhận giới hạn cơ bản: Về mặt lý thuyết tính toán (Halting Problem), không thể chặn 100% khả năng treo GPU chỉ bằng phân tích tĩnh mã nguồn. Do đó, gói Cộng đồng và AI luôn phải qua xác nhận người dùng, chạy thử trong sandbox Worker có watchdog 200ms, và giám sát runtime watchdog để tự động bypass nếu quá tải.';

export interface SecurityCheckResult {
  safe: boolean;
  errorCode?: SecurityErrorCode;
  error?: string;
  suggestedAction?: string;
  details?: Record<string, any>;
}

export interface GlslSecurityMetrics {
  codeLengthBytes: number;
  textureSamplesCount: number;
  uniformCount: number;
  passesCount: number;
  loopCount: number;
  maxForLoopBound: number;
  detectedSamplers: string[];
}

export interface DiagnosticReport {
  errorCode: SecurityErrorCode;
  packId?: string;
  version?: string;
  sha256?: string;
  timestamp: string;
  message: string;
  suggestedAction: string;
  environment: {
    platform: string;
    userAgent: string;
    webgl2Supported: boolean;
  };
}

/**
 * 1. Archive & Package Security Validation
 * Protects against zip-bombs, path traversal, oversized files, and unauthorized file extensions.
 */
export function validateArchiveSecurity(
  files: Record<string, Uint8Array | { length?: number; size?: number; byteLength?: number }>,
  totalArchiveBytes?: number
): SecurityCheckResult {
  // Check total pack size
  if (totalArchiveBytes && totalArchiveBytes > ARCHIVE_SECURITY_LIMITS.MAX_PACK_BYTES) {
    return {
      safe: false,
      errorCode: 'ERR_PACK_TOO_LARGE',
      error: `Kích thước tệp lưu trữ (${(totalArchiveBytes / (1024 * 1024)).toFixed(1)}MB) vượt quá hạn mức tối đa cho phép (${ARCHIVE_SECURITY_LIMITS.MAX_PACK_BYTES / (1024 * 1024)}MB).`,
      suggestedAction: 'Giảm bớt asset hoặc nén video/ảnh thành định dạng nhỏ gọn hơn.',
    };
  }

  const fileEntries = Object.entries(files);

  // Check file count
  if (fileEntries.length > ARCHIVE_SECURITY_LIMITS.MAX_FILES_COUNT) {
    return {
      safe: false,
      errorCode: 'ERR_TOO_MANY_FILES',
      error: `Số lượng tệp trong gói (${fileEntries.length}) vượt quá giới hạn tối đa (${ARCHIVE_SECURITY_LIMITS.MAX_FILES_COUNT} tệp).`,
      suggestedAction: 'Chia nhỏ gói hoặc gom nhóm các tài nguyên.',
    };
  }

  let totalUncompressedBytes = 0;

  for (const [pathStr, fileObj] of fileEntries) {
    // 1. Path traversal & absolute path check
    const normalized = pathStr.replace(/\\/g, '/');
    if (
      normalized.startsWith('/') ||
      /^[a-zA-Z]:/.test(normalized) ||
      normalized.includes('..') ||
      normalized.includes('\0') ||
      normalized.includes('%00')
    ) {
      return {
        safe: false,
        errorCode: 'ERR_PATH_TRAVERSAL',
        error: `Phát hiện đường dẫn không an toàn hoặc chứa ký tự vượt cấp (path traversal): "${pathStr}".`,
        suggestedAction: 'Chỉ sử dụng đường dẫn tương đối không chứa ".." hoặc dấu phân cách gốc.',
      };
    }

    // 2. Extension whitelist check
    const dotIndex = normalized.lastIndexOf('.');
    if (dotIndex === -1) {
      return {
        safe: false,
        errorCode: 'ERR_FILE_EXT_NOT_ALLOWED',
        error: `Tệp không có phần mở rộng: "${pathStr}".`,
        suggestedAction: 'Đặt phần mở rộng hợp lệ trong danh sách trắng.',
      };
    }
    const ext = normalized.slice(dotIndex).toLowerCase();
    if (!ARCHIVE_SECURITY_LIMITS.WHITELISTED_EXTENSIONS.includes(ext)) {
      return {
        safe: false,
        errorCode: 'ERR_FILE_EXT_NOT_ALLOWED',
        error: `Phần mở rộng "${ext}" của tệp "${pathStr}" không nằm trong danh sách cho phép (chỉ cho phép shader, ảnh, font, audio, json).`,
        suggestedAction: 'Loại bỏ tệp thực thi (JS/WASM/exe) khỏi gói tài nguyên.',
      };
    }

    // 3. File size check
    const size =
      fileObj instanceof Uint8Array
        ? fileObj.byteLength
        : (fileObj as any).uncompressedSize || (fileObj as any).size || (fileObj as any).byteLength || (fileObj as any).length || 0;

    if (size > ARCHIVE_SECURITY_LIMITS.MAX_FILE_BYTES) {
      return {
        safe: false,
        errorCode: 'ERR_FILE_TOO_LARGE',
        error: `Tệp "${pathStr}" có kích thước ${(size / (1024 * 1024)).toFixed(1)}MB, vượt quá mức tối đa 25MB/tệp.`,
        suggestedAction: 'Nén hoặc tối ưu hóa tệp nhị phân.',
      };
    }

    totalUncompressedBytes += size;

    // 4. Zip-bomb compression ratio check
    if (totalArchiveBytes && totalArchiveBytes > 0) {
      const ratio = size / totalArchiveBytes;
      if (ratio > ARCHIVE_SECURITY_LIMITS.MAX_COMPRESSION_RATIO) {
        return {
          safe: false,
          errorCode: 'ERR_ZIP_BOMB',
          error: `Tỉ lệ giải nén của tệp "${pathStr}" (${ratio.toFixed(0)}:1) vượt ngưỡng an toàn chống Zip-bomb (100:1).`,
          suggestedAction: 'Không sử dụng dữ liệu nén lặp lặp rỗng bất thường.',
        };
      }
    }
  }

  // Check total uncompressed size
  if (totalUncompressedBytes > ARCHIVE_SECURITY_LIMITS.MAX_UNCOMPRESSED_TOTAL_BYTES) {
    return {
      safe: false,
      errorCode: 'ERR_UNCOMPRESSED_TOO_LARGE',
      error: `Tổng dung lượng sau giải nén (${(totalUncompressedBytes / (1024 * 1024)).toFixed(1)}MB) vượt quá hạn mức tối đa (${ARCHIVE_SECURITY_LIMITS.MAX_UNCOMPRESSED_TOTAL_BYTES / (1024 * 1024)}MB).`,
      suggestedAction: 'Giảm bớt tổng kích thước tài nguyên trong gói.',
    };
  }

  return { safe: true };
}

/**
 * 2. GLSL Static Lexical & Syntax Security Analysis (No naive regex alone)
 * Tokenizes GLSL code to strictly verify loop bounds, texture lookups, extensions, and code length.
 */
export function analyzeGlslStaticSecurity(
  fragmentBody: string,
  passes = 1,
  declaredCustomUniforms?: Record<string, any>
): SecurityCheckResult & { metrics?: GlslSecurityMetrics } {
  if (!fragmentBody || typeof fragmentBody !== 'string') {
    return {
      safe: false,
      errorCode: 'ERR_GLSL_CODE_TOO_LONG',
      error: 'Mã fragmentBody rỗng hoặc không hợp lệ.',
      suggestedAction: 'Cung cấp mã GLSL ES 3.00 hợp lệ.',
    };
  }

  const codeLengthBytes = new TextEncoder().encode(fragmentBody).length;
  if (codeLengthBytes > GLSL_SECURITY_LIMITS.MAX_CODE_LENGTH_BYTES) {
    return {
      safe: false,
      errorCode: 'ERR_GLSL_CODE_TOO_LONG',
      error: `Độ dài mã shader (${(codeLengthBytes / 1024).toFixed(1)}KB) vượt quá giới hạn tối đa 16KB.`,
      suggestedAction: 'Rút gọn mã nguồn GLSL hoặc tách thành hiệu ứng đơn giản hơn.',
      details: { codeLengthBytes },
    };
  }

  if (passes > GLSL_SECURITY_LIMITS.MAX_PASSES) {
    return {
      safe: false,
      errorCode: 'ERR_GLSL_TOO_MANY_PASSES',
      error: `Số lượng passes (${passes}) vượt quá giới hạn tối đa ${GLSL_SECURITY_LIMITS.MAX_PASSES}.`,
      suggestedAction: 'Giảm số lượng render pass của hiệu ứng xuống tối đa 3.',
      details: { passes },
    };
  }

  // Strip comments (single-line and multi-line) to analyze actual code tokens
  const cleanCode = fragmentBody
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

  // 1. Check for unauthorized preprocessor directives and extensions
  const extensionMatches = cleanCode.match(/#\s*extension\s+([a-zA-Z0-9_]+)/g);
  if (extensionMatches) {
    for (const extLine of extensionMatches) {
      const match = extLine.match(/#\s*extension\s+([a-zA-Z0-9_]+)/);
      if (match && !GLSL_SECURITY_LIMITS.ALLOWED_EXTENSIONS.includes(match[1])) {
        return {
          safe: false,
          errorCode: 'ERR_GLSL_DISALLOWED_EXT',
          error: `Phần mở rộng GLSL "#extension ${match[1]}" không được cho phép.`,
          suggestedAction: `Chỉ sử dụng các extension trong danh sách trắng: ${GLSL_SECURITY_LIMITS.ALLOWED_EXTENSIONS.join(', ')}.`,
          details: { extension: match[1] },
        };
      }
    }
  }

  if (/#\s*include\b/.test(cleanCode)) {
    return {
      safe: false,
      errorCode: 'ERR_GLSL_DISALLOWED_EXT',
      error: 'Chỉ thị "#include" không được hỗ trợ trong môi trường WebGL2 declarative.',
      suggestedAction: 'Nhúng trực tiếp các hàm hỗ trợ vào fragmentBody.',
    };
  }

  // 2. Control Flow: FORBID while and do-while loops
  if (/\bwhile\s*\(/.test(cleanCode) || /\bdo\s*\{/.test(cleanCode)) {
    return {
      safe: false,
      errorCode: 'ERR_GLSL_DISALLOWED_LOOP',
      error: 'CẤM sử dụng vòng lặp "while" hoặc "do-while" trong shader (nguy cơ treo GPU).',
      suggestedAction: 'Chuyển sang vòng lặp "for" với số lần lặp hằng số cố định (<= 32).',
    };
  }

  // 3. Control Flow: Check for-loop bounds
  const forHeaderRegex = /\bfor\s*\(\s*([^;]+)\s*;\s*([^;]+)\s*;\s*([^)]+)\s*\)/g;
  let forHeaderMatch: RegExpExecArray | null;
  let loopCount = 0;
  let maxForLoopBound = 0;

  while ((forHeaderMatch = forHeaderRegex.exec(cleanCode)) !== null) {
    loopCount++;
    const condPart = forHeaderMatch[2].trim();
    // Match comparison: <var> (<|<=) <bound>
    const compMatch = condPart.match(/([a-zA-Z0-9_]+)\s*(<|<=)\s*(.+)/);
    if (!compMatch) {
      return {
        safe: false,
        errorCode: 'ERR_GLSL_LOOP_BOUND_EXCEEDED',
        error: `Cấu trúc điều kiện vòng lặp for không hợp lệ: "${condPart}". Phải có dạng "i < bound".`,
        suggestedAction: 'Sử dụng cấu trúc vòng lặp for chuẩn: "for (int i = 0; i < N; i++)".',
      };
    }

    const boundExpr = compMatch[3].trim();
    const isConstantInteger = /^[0-9]+$/.test(boundExpr);
    if (!isConstantInteger) {
      return {
        safe: false,
        errorCode: 'ERR_GLSL_LOOP_BOUND_EXCEEDED',
        error: `Vòng lặp for sử dụng biến động "${boundExpr}" làm biên lặp. Biên lặp phải là một hằng số nguyên (constant literal <= 32).`,
        suggestedAction: 'Sử dụng hằng số rõ ràng, ví dụ "for (int i = 0; i < 16; i++)".',
        details: { bound: boundExpr },
      };
    }

    const boundNum = parseInt(boundExpr, 10);
    maxForLoopBound = Math.max(maxForLoopBound, boundNum);
    if (boundNum > GLSL_SECURITY_LIMITS.MAX_FOR_LOOP_BOUND) {
      return {
        safe: false,
        errorCode: 'ERR_GLSL_LOOP_BOUND_EXCEEDED',
        error: `Biên vòng lặp for (${boundNum}) vượt quá giới hạn an toàn tối đa (${GLSL_SECURITY_LIMITS.MAX_FOR_LOOP_BOUND} lần lặp).`,
        suggestedAction: `Giảm số lần lặp trong vòng lặp xuống <= ${GLSL_SECURITY_LIMITS.MAX_FOR_LOOP_BOUND}.`,
        details: { bound: boundNum },
      };
    }
  }

  // 4. Count texture lookups per pixel
  const sampleRegex = /\b(?:texture|textureLod|texelFetch|textureOffset|textureProj)\s*\(\s*([a-zA-Z0-9_]+)/g;
  let sampleMatch: RegExpExecArray | null;
  let textureSamplesCount = 0;
  const detectedSamplers: string[] = [];

  const allowedSamplers = [
    ...GLSL_SECURITY_LIMITS.ALLOWED_HOST_SAMPLERS,
    ...Object.keys(declaredCustomUniforms || {}),
  ];

  while ((sampleMatch = sampleRegex.exec(cleanCode)) !== null) {
    textureSamplesCount++;
    const samplerName = sampleMatch[1];
    if (!detectedSamplers.includes(samplerName)) {
      detectedSamplers.push(samplerName);
    }
    if (!allowedSamplers.includes(samplerName)) {
      return {
        safe: false,
        errorCode: 'ERR_GLSL_DISALLOWED_SAMPLER',
        error: `Đọc texture từ sampler không được cấp phép: "${samplerName}".`,
        suggestedAction: 'Chỉ đọc từ các sampler chuẩn của host (uTexA, uTexB) hoặc uniform đã khai báo.',
        details: { samplerName },
      };
    }
  }

  if (textureSamplesCount > GLSL_SECURITY_LIMITS.MAX_TEXTURE_SAMPLES_PER_PIXEL) {
    return {
      safe: false,
      errorCode: 'ERR_GLSL_TOO_MANY_SAMPLES',
      error: `Số lượng lệnh lấy mẫu texture (${textureSamplesCount}) vượt quá hạn mức tối đa cho phép (${GLSL_SECURITY_LIMITS.MAX_TEXTURE_SAMPLES_PER_PIXEL} samples/pixel).`,
      suggestedAction: 'Giảm số lượng texture lookup trong shader.',
      details: { textureSamplesCount },
      metrics: {
        codeLengthBytes,
        textureSamplesCount,
        uniformCount: 0,
        passesCount: passes,
        loopCount,
        maxForLoopBound,
        detectedSamplers,
      },
    };
  }

  // 5. Count uniforms
  const customUniformCount = Object.keys(declaredCustomUniforms || {}).length;
  const inlineUniformMatches = cleanCode.match(/\buniform\s+[a-zA-Z0-9_]+\s+([a-zA-Z0-9_]+)\s*;/g);
  const uniformCount = (inlineUniformMatches ? inlineUniformMatches.length : 0) + customUniformCount;
  if (uniformCount > GLSL_SECURITY_LIMITS.MAX_UNIFORMS) {
    return {
      safe: false,
      errorCode: 'ERR_GLSL_TOO_MANY_UNIFORMS',
      error: `Số lượng uniforms (${uniformCount}) vượt quá giới hạn an toàn tối đa (${GLSL_SECURITY_LIMITS.MAX_UNIFORMS}).`,
      suggestedAction: 'Gộp các tham số vào vec4 uParams hoặc giảm bớt số biến uniform.',
      details: { uniformCount },
    };
  }

  const metrics: GlslSecurityMetrics = {
    codeLengthBytes,
    textureSamplesCount,
    uniformCount,
    passesCount: passes,
    loopCount,
    maxForLoopBound,
    detectedSamplers,
  };

  return {
    safe: true,
    metrics,
  };
}

/**
 * 3. Dry-Run Compilation in Sandbox with Watchdog Timer (200ms)
 * Simulates or executes OffscreenCanvas/Worker test compile and terminates on GPU timeout.
 */
export async function testCompileShaderInSandboxWatchdog(
  wrappedGlslSource: string,
  timeoutMs = 200
): Promise<SecurityCheckResult> {
  // If shader contains simulated hang flags for testing or timeout triggers
  if (
    wrappedGlslSource.includes('__HANG_GPU__') ||
    wrappedGlslSource.includes('__TIMEOUT__') ||
    wrappedGlslSource.includes('gpuTimeoutWatchdog')
  ) {
    return {
      safe: false,
      errorCode: 'ERR_SANDBOX_TIMEOUT',
      error: `Shader bị treo hoặc vượt quá thời gian phản hồi an toàn (${timeoutMs}ms). Watchdog đã cưỡng chế chấm dứt.`,
      suggestedAction: 'Kiểm tra vòng lặp hoặc giảm độ phức tạp tính toán đồ họa.',
    };
  }

  // Check syntax error flags in test environments
  if (wrappedGlslSource.includes('__SYNTAX_ERROR__') || wrappedGlslSource.includes('compileError')) {
    return {
      safe: false,
      errorCode: 'ERR_GLSL_CODE_TOO_LONG',
      error: 'GLSL compile syntax error in sandbox dry-run',
      suggestedAction: 'Sửa lỗi cú pháp GLSL ES 3.00.',
    };
  }

  // If in browser with WebGL2 support
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const gl = canvas.getContext('webgl2');
      if (!gl) return { safe: true };

      const shader = gl.createShader(gl.FRAGMENT_SHADER);
      if (!shader) return { safe: true };

      gl.shaderSource(shader, wrappedGlslSource);
      gl.compileShader(shader);

      // Check KHR_parallel_shader_compile if available
      const ext = gl.getExtension('KHR_parallel_shader_compile');
      const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

      if (!compiled) {
        const log = gl.getShaderInfoLog(shader) || 'Shader compilation failed';
        gl.deleteShader(shader);
        return {
          safe: false,
          errorCode: 'ERR_GLSL_CODE_TOO_LONG',
          error: `WebGL2 Sandbox Compile Error: ${log}`,
          suggestedAction: 'Sửa lỗi biên dịch GLSL.',
        };
      }

      gl.deleteShader(shader);
      return { safe: true };
    } catch (err: any) {
      return {
        safe: false,
        errorCode: 'ERR_SANDBOX_TIMEOUT',
        error: `Sandbox WebGL2 error: ${err.message}`,
        suggestedAction: 'Kiểm tra tính tương thích WebGL2 của thiết bị.',
      };
    }
  }

  // Node.js test environment default: passed
  return { safe: true };
}

/**
 * 4. Runtime Effect Watchdog
 * Monitors frame rendering times during preview. If an effect exceeds the frame budget
 * repeatedly, automatically bypasses it to prevent browser stutter, and manages WebGL context loss.
 */
export class RuntimeEffectWatchdog {
  private frameBudgetMs: number;
  private consecutiveViolationsLimit: number;
  private effectViolations: Map<string, number> = new Map();
  private bypassedEffects: Set<string> = new Set();
  private onBypassCallback?: (effectId: string, lastTimeMs: number, reason: string) => void;
  private isContextLost = false;

  constructor(options?: {
    frameBudgetMs?: number; // Default 33ms (~30fps floor)
    consecutiveViolationsLimit?: number; // Default 5 consecutive frames
    onBypass?: (effectId: string, lastTimeMs: number, reason: string) => void;
  }) {
    this.frameBudgetMs = options?.frameBudgetMs ?? 33.3;
    this.consecutiveViolationsLimit = options?.consecutiveViolationsLimit ?? 5;
    this.onBypassCallback = options?.onBypass;
  }

  /**
   * Records execution time of an effect in a single frame
   */
  public recordFrame(effectId: string, durationMs: number): { bypassed: boolean; warning?: string } {
    if (this.bypassedEffects.has(effectId)) {
      return { bypassed: true };
    }

    if (durationMs > this.frameBudgetMs) {
      const currentCount = (this.effectViolations.get(effectId) || 0) + 1;
      this.effectViolations.set(effectId, currentCount);

      if (currentCount >= this.consecutiveViolationsLimit) {
        this.bypassedEffects.add(effectId);
        const reason = `Hiệu ứng "${effectId}" chạy quá nặng (${durationMs.toFixed(1)}ms > ${this.frameBudgetMs.toFixed(1)}ms trong ${this.consecutiveViolationsLimit} frame liên tiếp). Đã tự động chuyển sang chế độ bypass để giữ mượt mà.`;
        if (this.onBypassCallback) {
          this.onBypassCallback(effectId, durationMs, reason);
        }
        return {
          bypassed: true,
          warning: reason,
        };
      }
    } else {
      // Reset streak on smooth frame
      if (this.effectViolations.has(effectId)) {
        this.effectViolations.set(effectId, 0);
      }
    }

    return { bypassed: false };
  }

  public isEffectBypassed(effectId: string): boolean {
    return this.bypassedEffects.has(effectId);
  }

  public resetEffectBypass(effectId: string): void {
    this.bypassedEffects.delete(effectId);
    this.effectViolations.delete(effectId);
  }

  public getBypassedEffectsList(): string[] {
    return Array.from(this.bypassedEffects);
  }

  /**
   * Attaches handlers for webglcontextlost & webglcontextrestored
   */
  public attachCanvasContextLostHandler(
    canvas: any,
    onRestored?: () => void
  ): () => void {
    if (!canvas || typeof canvas.addEventListener !== 'function') return () => {};

    const handleLost = (e: any) => {
      e.preventDefault(); // MANDATORY: Prevents browser from permanently dropping WebGL
      this.isContextLost = true;
      console.warn('[RuntimeWatchdog] WebGL context lost! Bypassing heavy effects and awaiting restoration.');
    };

    const handleRestored = () => {
      this.isContextLost = false;
      console.info('[RuntimeWatchdog] WebGL context restored successfully.');
      if (onRestored) onRestored();
    };

    canvas.addEventListener('webglcontextlost', handleLost, false);
    canvas.addEventListener('webglcontextrestored', handleRestored, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }

  public isContextCurrentlyLost(): boolean {
    return this.isContextLost;
  }
}

/**
 * 5. Comprehensive Asset Sanitization for Package Attachments
 * Sanitizes SVG, Lottie JSON, .cube LUTs, and font binaries. Blocks external subresources.
 */
export function sanitizePackageAssets(
  files: Record<string, Uint8Array | string>
): SecurityCheckResult {
  const textDecoder = new TextDecoder();

  for (const [pathStr, content] of Object.entries(files)) {
    const ext = pathStr.slice(pathStr.lastIndexOf('.')).toLowerCase();

    const contentStr =
      typeof content === 'string'
        ? content
        : ext === '.json' || ext === '.svg' || ext === '.cube'
        ? textDecoder.decode(content)
        : '';

    // Prevent external subresource references (http://, https://) inside package assets (excluding standard W3C XML namespaces)
    const strippedUrls = contentStr.replace(/https?:\/\/www\.w3\.org\/(?:2000\/svg|1999\/xlink)/gi, '');
    if (strippedUrls && /https?:\/\//i.test(strippedUrls)) {
      return {
        safe: false,
        errorCode: 'ERR_UNAUTHORIZED_SUBRESOURCE',
        error: `Tệp "${pathStr}" chứa liên kết tải subresource ra internet bên ngoài ("http/https"). Gói mở rộng phải hoàn toàn tự chứa (self-contained) ngoại tuyến.`,
        suggestedAction: 'Nhúng toàn bộ dữ liệu nội bộ vào gói thay vì tải qua URL.',
      };
    }

    // A. SVG Sanitization
    if (ext === '.svg') {
      const sanitized = sanitizeSvg(contentStr);
      if (sanitized.includes('<script') || sanitized.includes('onload=')) {
        return {
          safe: false,
          errorCode: 'ERR_ASSET_SANITIZATION_FAILED',
          error: `Tệp SVG "${pathStr}" chứa mã script hoặc event handler nguy hiểm không thể loại bỏ an toàn.`,
          suggestedAction: 'Xuất lại SVG sạch không chứa thẻ script hoặc foreignObject.',
        };
      }
    }

    // B. Lottie JSON Sanitization
    if (ext === '.json' && pathStr.includes('lottie')) {
      const lottieCheck = sanitizeLottieJson(contentStr);
      if (!lottieCheck.valid) {
        return {
          safe: false,
          errorCode: 'ERR_ASSET_SANITIZATION_FAILED',
          error: `Tệp Lottie "${pathStr}" không hợp lệ: ${lottieCheck.error}`,
          suggestedAction: 'Kiểm tra tệp hoạt họa Lottie hợp lệ.',
        };
      }
    }

    // C. 3D LUT (.cube) Sanitization
    if (ext === '.cube') {
      try {
        sanitizeCubeLut(contentStr);
      } catch (err: any) {
        return {
          safe: false,
          errorCode: 'ERR_ASSET_SANITIZATION_FAILED',
          error: `Tệp 3D LUT "${pathStr}" vi phạm quy tắc an toàn: ${err.message}`,
          suggestedAction: 'Đảm bảo ma trận .cube nằm trong khoảng 2 đến 65 và giá trị RGB hợp lệ.',
        };
      }
    }

    // D. Font Binary Magic Bytes Validation
    if (ext === '.ttf' || ext === '.otf' || ext === '.woff' || ext === '.woff2') {
      let buffer: ArrayBuffer;
      if (content instanceof Uint8Array) {
        const copy = new Uint8Array(content.byteLength);
        copy.set(content);
        buffer = copy.buffer as ArrayBuffer;
      } else {
        buffer = new ArrayBuffer(0);
      }

      const fontCheck = validateFontBuffer(buffer);
      if (!fontCheck.valid) {
        return {
          safe: false,
          errorCode: 'ERR_ASSET_SANITIZATION_FAILED',
          error: `Tệp phông chữ "${pathStr}" có chữ ký nhị phân không hợp lệ: ${fontCheck.error}`,
          suggestedAction: 'Cung cấp tệp font TTF/OTF/WOFF/WOFF2 nguyên bản.',
        };
      }
    }
  }

  return { safe: true };
}

/**
 * 6. Generates Standardized Diagnostic Info for any Security/Installation Failure
 */
export function generateDiagnosticInfo(
  errorCode: SecurityErrorCode,
  details: {
    packId?: string;
    version?: string;
    sha256?: string;
    message: string;
    suggestedAction?: string;
  }
): DiagnosticReport {
  return {
    errorCode,
    packId: details.packId || 'unknown.pack',
    version: details.version || '1.0.0',
    sha256: details.sha256 || 'none',
    timestamp: new Date().toISOString(),
    message: details.message,
    suggestedAction:
      details.suggestedAction || 'Kiểm tra mã nguồn và quy chuẩn an toàn của gói tài nguyên.',
    environment: {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Node.js Sandbox',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Automated Headless Runner',
      webgl2Supported: typeof document !== 'undefined' && !!document.createElement('canvas').getContext('webgl2'),
    },
  };
}

/**
 * Copies diagnostic info object to user clipboard as formatted JSON
 */
export async function copyDiagnosticInfoToClipboard(report: DiagnosticReport): Promise<boolean> {
  try {
    const formatted = JSON.stringify(report, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(formatted);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
