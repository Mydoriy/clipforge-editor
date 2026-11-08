/**
 * T1. LINK INTAKE & REFERENCE VIDEO VALIDATOR
 * ============================================================================
 * Handles:
 * 1. URL Classification:
 *    - (a) Direct Video (.mp4, .webm, .mov): Attempts direct fetch; if blocked by CORS,
 *          explains clearly and asks user to download and drop file.
 *    - (b) Social Media Video (TikTok, YouTube, Insta, Facebook, X, etc.):
 *          STRICTLY NEVER fetches/scrapes; displays source badge with external link;
 *          prompts: "Thả file video bạn có quyền sử dụng để phân tích".
 *    - (c) Unsupported URL: friendly rejection notice.
 * 2. Origin Attribution Privacy:
 *    - Link is stored ONLY as a local session note (sourceNote).
 *    - STRICTLY STRIPPED when exporting to .capfx or .caprecipe.
 * 3. File & Duration Constraints:
 *    - Duration <= 3 minutes (180s)
 *    - Size <= 500MB
 *    - First-time and per-import copyright reminder.
 * ============================================================================
 */

import {
  type UrlClassificationResult,
  type ReferenceValidationResult,
  type SocialPlatformInfo,
  LAB_LIMITS,
  LAB_COPYRIGHT_NOTICE,
} from '../types/lab.ts';

// Known social and video streaming platforms
const SOCIAL_PLATFORMS: Array<{ regex: RegExp; name: string }> = [
  { regex: /(?:^|\.)tiktok\.com$/i, name: 'TikTok' },
  { regex: /(?:^|\.)douyin\.com$/i, name: 'Douyin' },
  { regex: /(?:^|\.)youtube\.com$|youtu\.be$/i, name: 'YouTube' },
  { regex: /(?:^|\.)instagram\.com$/i, name: 'Instagram' },
  { regex: /(?:^|\.)facebook\.com$|fb\.watch$/i, name: 'Facebook' },
  { regex: /(?:^|\.)twitter\.com$|(?:^|\.)x\.com$/i, name: 'X (Twitter)' },
  { regex: /(?:^|\.)reddit\.com$/i, name: 'Reddit' },
  { regex: /(?:^|\.)vimeo\.com$/i, name: 'Vimeo' },
  { regex: /(?:^|\.)capcut\.com$/i, name: 'CapCut' },
  { regex: /(?:^|\.)threads\.net$/i, name: 'Threads' },
  { regex: /(?:^|\.)bilibili\.com$/i, name: 'Bilibili' },
  { regex: /(?:^|\.)kuaishou\.com$/i, name: 'Kuaishou' },
];

const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|mkv|ogv)(?:\?.*)?$/i;

/**
 * Classifies a user-pasted link into Direct Video, Social Platform, or Unsupported
 */
export function classifyUrl(rawUrl: string): UrlClassificationResult {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      type: 'unsupported',
      normalizedUrl: '',
      canDirectFetch: false,
      message: {
        vi: 'Vui lòng dán một đường dẫn URL hợp lệ.',
        en: 'Please paste a valid URL.',
      },
    };
  }

  let parsed: URL;
  try {
    // Add protocol if user pasted bare domain
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(withProtocol);
  } catch {
    return {
      type: 'unsupported',
      normalizedUrl: trimmed,
      canDirectFetch: false,
      message: {
        vi: 'Định dạng URL không hợp lệ.',
        en: 'Invalid URL format.',
      },
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // 1. Check if social media / video platform
  for (const p of SOCIAL_PLATFORMS) {
    if (p.regex.test(hostname)) {
      const socialInfo: SocialPlatformInfo = {
        platformName: p.name,
        domain: hostname,
        originalUrl: parsed.toString(),
      };

      return {
        type: 'social_platform',
        normalizedUrl: parsed.toString(),
        socialInfo,
        canDirectFetch: false,
        message: {
          vi: `Đã nhận diện liên kết từ ${p.name}. ClipForge không tải video từ mạng xã hội. Vui lòng thả tệp video bạn có quyền sử dụng vào ô bên dưới để phân tích.`,
          en: `Detected ${p.name} link. ClipForge never scrapes or downloads social media videos. Please drop a video file you have the rights to use below to analyze.`,
        },
      };
    }
  }

  // 2. Check if direct video file link
  if (DIRECT_VIDEO_EXTENSIONS.test(pathname) || DIRECT_VIDEO_EXTENSIONS.test(parsed.href)) {
    return {
      type: 'direct_video',
      normalizedUrl: parsed.toString(),
      canDirectFetch: true,
      message: {
        vi: 'Đã nhận diện tệp video trực tiếp. Đang kiểm tra quyền truy cập tệp...',
        en: 'Direct video file link detected. Checking file access permissions...',
      },
    };
  }

  // 3. Fallback: unsupported link
  return {
    type: 'unsupported',
    normalizedUrl: parsed.toString(),
    canDirectFetch: false,
    message: {
      vi: 'Liên kết không phải là tệp video trực tiếp (.mp4/.webm) hoặc nền tảng được hỗ trợ. Vui lòng thả tệp video từ máy tính.',
      en: 'URL is neither a direct video file (.mp4/.webm) nor a recognized platform. Please drop a video file directly from your computer.',
    },
  };
}

/**
 * Attempts to fetch a direct video URL with CORS detection and size validation
 */
export async function fetchDirectVideoWithCorsHandling(
  url: string,
  options?: { signal?: AbortSignal; onProgress?: (percent: number) => void }
): Promise<{ success: boolean; blob?: Blob; file?: File; error?: string; isCorsBlocked?: boolean }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: options?.signal,
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Không thể tải tệp từ máy chủ nguồn (HTTP ${res.status}).`,
      };
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > LAB_LIMITS.MAX_SIZE_BYTES) {
      const sizeMB = (parseInt(contentLength, 10) / (1024 * 1024)).toFixed(1);
      return {
        success: false,
        error: `Dung lượng video (${sizeMB}MB) vượt quá hạn mức cho phép là 500MB.`,
      };
    }

    const blob = await res.blob();
    if (blob.size > LAB_LIMITS.MAX_SIZE_BYTES) {
      const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
      return {
        success: false,
        error: `Dung lượng video (${sizeMB}MB) vượt quá hạn mức cho phép là 500MB.`,
      };
    }

    const fileName = url.split('/').pop()?.split('?')[0] || 'reference_video.mp4';
    const file = new File([blob], fileName, { type: blob.type || 'video/mp4' });

    return {
      success: true,
      blob,
      file,
    };
  } catch (err: any) {
    if (options?.signal?.aborted) {
      return { success: false, error: 'Đã hủy tải video.' };
    }

    // Typical browser CORS failure surfaces as TypeError ("Failed to fetch")
    const isCors =
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError') ||
      err?.message?.includes('CORS');

    if (isCors) {
      return {
        success: false,
        isCorsBlocked: true,
        error:
          'Máy chủ lưu trữ video chặn chia sẻ liên kết trực tiếp (CORS). Vui lòng tải video về máy và thả tệp vào ô để phân tích.',
      };
    }

    return {
      success: false,
      error: `Lỗi kết nối tệp: ${err?.message || 'Không xác định'}`,
    };
  }
}

/**
 * Validates a reference video file against size (<= 500MB) and duration (<= 3 min) constraints
 */
export function validateReferenceVideoFile(
  file: { size: number; name?: string; type?: string },
  durationSec?: number
): ReferenceValidationResult {
  // 1. Check size limit <= 500MB
  if (file.size > LAB_LIMITS.MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      sizeBytes: file.size,
      error: {
        vi: `Dung lượng video (${sizeMB}MB) vượt quá giới hạn tối đa 500MB. Vui lòng nén hoặc chọn tệp nhỏ hơn.`,
        en: `Video size (${sizeMB}MB) exceeds the 500MB maximum limit. Please compress or select a smaller file.`,
      },
    };
  }

  // 2. Check duration limit <= 3 minutes (180s) if known
  if (durationSec !== undefined && durationSec > LAB_LIMITS.MAX_DURATION_SEC) {
    const mins = Math.floor(durationSec / 60);
    const secs = Math.round(durationSec % 60);
    return {
      valid: false,
      durationSec,
      sizeBytes: file.size,
      error: {
        vi: `Thời lượng video (${mins}m ${secs}s) vượt quá giới hạn 3 phút. Vui lòng cắt ngắn đoạn video cần học kỹ thuật.`,
        en: `Video duration (${mins}m ${secs}s) exceeds the 3-minute limit. Please trim the section you wish to analyze.`,
      },
    };
  }

  // 3. Check format / mime-type
  const name = file.name || '';
  const type = file.type || '';
  const isVideoMime = type.startsWith('video/') || type === 'application/mp4';
  const hasVideoExt = DIRECT_VIDEO_EXTENSIONS.test(name);

  if (type && !isVideoMime && !hasVideoExt) {
    return {
      valid: false,
      sizeBytes: file.size,
      error: {
        vi: 'Định dạng tệp không được nhận diện là video hợp lệ (.mp4, .webm, .mov).',
        en: 'File is not recognized as a valid video format (.mp4, .webm, .mov).',
      },
    };
  }

  return {
    valid: true,
    sizeBytes: file.size,
    durationSec,
  };
}

/**
 * Strips all external reference URLs and social notes from exported metadata
 * Guarantees compliance: "Lưu link chỉ như ghi chú nguồn gốc trong metadata cục bộ (không đưa vào .capfx/.caprecipe xuất ra)"
 */
export function sanitizeLabExportMetadata<T extends Record<string, any>>(payload: T): T {
  const sanitized: any = { ...payload };

  const forbiddenKeys = [
    'sourceUrl',
    'sourceNote',
    'originUrl',
    'referenceLink',
    'externalUrl',
    'videoUrl',
    'userUrl',
    'platformUrl',
  ];

  for (const key of forbiddenKeys) {
    delete sanitized[key];
  }

  // Recursively sanitize nested items or metadata
  if (sanitized.metadata && typeof sanitized.metadata === 'object') {
    sanitized.metadata = sanitizeLabExportMetadata(sanitized.metadata);
  }
  if (Array.isArray(sanitized.items)) {
    sanitized.items = sanitized.items.map((item: any) =>
      typeof item === 'object' && item !== null ? sanitizeLabExportMetadata(item) : item
    );
  }

  return sanitized as T;
}
