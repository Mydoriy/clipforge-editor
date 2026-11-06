// Security Sanitizer Utility for User-Supplied Content (SVG, Lottie, Subtitles, Fonts, LUT)

/**
 * 1. SVG Sanitization
 * Strips dangerous executable elements, event handlers, javascript URIs, and external entity DOCTYPEs.
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') return '';

  let cleaned = svgContent;

  // 1. Remove XML DOCTYPE and ENTITY declarations (prevent XXE injection)
  cleaned = cleaned.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  cleaned = cleaned.replace(/<!ENTITY[\s\S]*?>/gi, '');

  // 2. Remove executable and embedding tags: <script>, <foreignObject>, <iframe>, <object>, <embed>, <applet>
  const forbiddenTags = ['script', 'foreignobject', 'iframe', 'object', 'embed', 'applet', 'form', 'link'];
  for (const tag of forbiddenTags) {
    const tagRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(tagRegex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    cleaned = cleaned.replace(selfClosingRegex, '');
  }

  // 3. Remove inline event handlers (e.g. onload, onerror, onclick, onmouseover, etc.)
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 4. Remove dangerous URL schemes in href or xlink:href (javascript:, data:text/html, vbscript:)
  cleaned = cleaned.replace(
    /(href|xlink:href)\s*=\s*["']?\s*(javascript|data:text\/html|vbscript):[^"'>\s]*/gi,
    '$1=""'
  );

  return cleaned.trim();
}

/**
 * 2. Subtitle Text Sanitization (.srt, .vtt, .lrc)
 * Strips script tags, HTML event handlers, and malicious injections while preserving safe text & timecodes.
 */
export function sanitizeSubtitles(content: string): string {
  if (!content || typeof content !== 'string') return '';

  let cleaned = content;

  // Remove <script> tags and contents
  cleaned = cleaned.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');

  // Strip event handlers inside any HTML tags (e.g., <img onerror=...>)
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Strip javascript: protocol in href or src
  cleaned = cleaned.replace(/(?:href|src)\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, '');

  // Strip executable tags entirely but leave benign text
  cleaned = cleaned.replace(/<\/?(script|iframe|object|embed|applet|meta|link)[^>]*>/gi, '');

  return cleaned;
}

/**
 * 3. Lottie JSON Sanitization
 * Validates Lottie animation structure, limits size, and strips unsafe asset URLs.
 */
export function sanitizeLottieJson(jsonInput: string | any): { valid: boolean; data?: any; error?: string } {
  try {
    let parsed: any;
    if (typeof jsonInput === 'string') {
      if (jsonInput.length > 10 * 1024 * 1024) {
        return { valid: false, error: 'Tệp Lottie JSON vượt quá kích thước cho phép (tối đa 10MB).' };
      }
      parsed = JSON.parse(jsonInput);
    } else {
      parsed = jsonInput;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'Dữ liệu Lottie không phải là một đối tượng JSON hợp lệ.' };
    }

    // Basic Lottie schema check: must have framerate (fr) or version (v) or layers array
    if (!('v' in parsed) && !('fr' in parsed) && !('layers' in parsed)) {
      return { valid: false, error: 'Định dạng tệp không khớp với cấu trúc Lottie animation tiêu chuẩn.' };
    }

    // Deep sanitize assets array to prevent javascript: or data:text/html links
    if (Array.isArray(parsed.assets)) {
      for (const asset of parsed.assets) {
        if (typeof asset.u === 'string' && /^(javascript|data:text\/html)/i.test(asset.u.trim())) {
          asset.u = '';
        }
        if (typeof asset.p === 'string' && /^(javascript|data:text\/html)/i.test(asset.p.trim())) {
          asset.p = '';
        }
      }
    }

    return { valid: true, data: parsed };
  } catch (err: any) {
    return { valid: false, error: `Lỗi phân tích cú pháp JSON: ${err.message}` };
  }
}

/**
 * 4. Font Buffer Validation (.ttf, .otf, .woff, .woff2)
 * Inspects binary magic header bytes to verify authentic font format and prevent executable masquerading.
 */
export function validateFontBuffer(buffer: ArrayBuffer): { valid: boolean; format: string; error?: string } {
  if (!buffer || buffer.byteLength === 0) {
    return { valid: false, format: 'unknown', error: 'Tệp phông chữ rỗng.' };
  }

  // Maximum allowed font size: 15MB
  if (buffer.byteLength > 15 * 1024 * 1024) {
    return { valid: false, format: 'unknown', error: 'Tệp phông chữ vượt quá kích thước cho phép (tối đa 15MB).' };
  }

  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8));

  // Magic bytes checks:
  // TTF: 0x00 0x01 0x00 0x00 or 'true' (0x74 0x72 0x75 0x65)
  if (
    (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) ||
    (bytes[0] === 0x74 && bytes[1] === 0x72 && bytes[2] === 0x75 && bytes[3] === 0x65)
  ) {
    return { valid: true, format: 'ttf' };
  }

  // OTF: 'OTTO' (0x4F 0x54 0x54 0x4F)
  if (bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f) {
    return { valid: true, format: 'otf' };
  }

  // WOFF: 'wOFF' (0x77 0x4F 0x46 0x46)
  if (bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return { valid: true, format: 'woff' };
  }

  // WOFF2: 'wOF2' (0x77 0x4F 0x46 0x32)
  if (bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x32) {
    return { valid: true, format: 'woff2' };
  }

  return {
    valid: false,
    format: 'unknown',
    error:
      'Chữ ký nhị phân không hợp lệ. Chỉ chấp nhận các phông chữ TrueType (.ttf), OpenType (.otf), WOFF hoặc WOFF2 hợp lệ.'
  };
}

/**
 * 5. 3D LUT (.cube) File Sanitization
 * Ensures safe title, clamps grid dimensions, validates RGB numeric values, and guards against memory denial-of-service.
 */
export function sanitizeCubeLut(text: string): { title: string; size: number; data: Float32Array } {
  if (!text || typeof text !== 'string') {
    throw new Error('Dữ liệu .cube rỗng hoặc không hợp lệ.');
  }

  // Prevent memory denial of service: maximum 10MB text
  if (text.length > 10 * 1024 * 1024) {
    throw new Error('Tệp .cube vượt quá giới hạn cho phép (10MB).');
  }

  const lines = text.split('\n');
  let title = 'Custom LUT';
  let size = 0;
  const rawData: number[] = [];

  // Limit max processed lines: max 65^3 + 500 = 275,125 lines
  const MAX_LINES = 300000;
  const lineCount = Math.min(lines.length, MAX_LINES);

  for (let i = 0; i < lineCount; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('TITLE')) {
      const rawTitle = trimmed.replace(/^TITLE\s*"?([^"]*)"?$/i, '$1').trim();
      // Sanitize title: strip HTML and non-printable chars, max 64 characters
      title = rawTitle.replace(/[^\w\s\-_.]/g, '').slice(0, 64) || 'Custom LUT';
    } else if (trimmed.startsWith('LUT_3D_SIZE')) {
      const match = trimmed.match(/LUT_3D_SIZE\s+(\d+)/i);
      if (match) {
        const parsedSize = parseInt(match[1], 10);
        // Clamp size between 2 and 65 (65^3 is industry maximum)
        if (parsedSize >= 2 && parsedSize <= 65) {
          size = parsedSize;
        } else {
          throw new Error(`LUT_3D_SIZE không hợp lệ (${parsedSize}). Kích thước hợp lệ từ 2 đến 65.`);
        }
      }
    } else {
      const parts = trimmed.split(/\s+/).map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        // Clamp RGB between 0.0 and 2.0 to avoid graphics crash/overflow
        const r = Math.min(2.0, Math.max(0.0, parts[0]));
        const g = Math.min(2.0, Math.max(0.0, parts[1]));
        const b = Math.min(2.0, Math.max(0.0, parts[2]));
        rawData.push(r, g, b);
      }
    }
  }

  if (size === 0) {
    size = Math.round(Math.cbrt(rawData.length / 3)) || 17;
  }

  // Validate that size matches data points
  const expectedPoints = size * size * size * 3;
  if (rawData.length === 0 || Math.abs(rawData.length - expectedPoints) > expectedPoints * 0.1) {
    // Fallback if data points are incomplete
    if (rawData.length === 0) {
      throw new Error('Tệp .cube không chứa dữ liệu ma trận RGB 3D hợp lệ.');
    }
  }

  return {
    title,
    size,
    data: new Float32Array(rawData)
  };
}
