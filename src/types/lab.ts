/**
 * Types & Schemas for ClipForge Lab ("PHÒNG HỌC & REMIX")
 * ============================================================================
 * Route: /lab
 * Principles:
 * 1. AI Đề xuất, Máy kiểm chứng (SSIM/Histogram)
 * 2. Không tải video lậu, không scrape
 * 3. Chỉ trích xuất kỹ thuật, video chỉ tạm trong phiên
 * 4. Giới hạn: <= 3 phút, <= 500MB
 * 5. Link chỉ lưu trong metadata phiên cục bộ, cấm xuất vào .capfx/.caprecipe
 * ============================================================================
 */

import { z } from 'zod';
import type { RemixAnalysisOutput } from './visionPlanner.ts';

export type UrlClassificationType = 'direct_video' | 'social_platform' | 'unsupported';

export interface SocialPlatformInfo {
  platformName: string; // e.g. "TikTok", "YouTube", "Instagram"
  domain: string;
  originalUrl: string;
}

export interface UrlClassificationResult {
  type: UrlClassificationType;
  normalizedUrl: string;
  socialInfo?: SocialPlatformInfo;
  mimeType?: string;
  canDirectFetch: boolean;
  message: {
    vi: string;
    en: string;
  };
}

export interface ReferenceVideoMetadata {
  id: string;
  name: string;
  sizeBytes: number;
  durationSec: number;
  width?: number;
  height?: number;
  sourceUrl?: string; // Stored ONLY in local session metadata
  importedAt: number;
}

export interface ReferenceValidationResult {
  valid: boolean;
  error?: {
    vi: string;
    en: string;
  };
  durationSec?: number;
  sizeBytes?: number;
}

export interface LabSessionState {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  sourceNote?: {
    url?: string;
    domain?: string;
    platform?: string;
  };
  referenceVideo?: ReferenceVideoMetadata;
  analysis?: RemixAnalysisOutput;
  verifiedScore?: number; // SSIM / Histogram match
  copyrightConfirmed: boolean;
}

export const LAB_LIMITS = {
  MAX_DURATION_SEC: 180, // 3 minutes
  MAX_SIZE_BYTES: 500 * 1024 * 1024, // 500MB
  MAX_FRAMES: 6,
} as const;

export const LAB_COPYRIGHT_NOTICE = {
  vi: 'NHẮC NHỞ BẢN QUYỀN: Vui lòng chỉ sử dụng video tham chiếu bạn có quyền sở hữu hoặc quyền sử dụng hợp pháp. Phòng Lab chỉ trích xuất thông số kỹ thuật (đường cong, bảng màu, nhịp cắt) và tuyệt đối không sao chép, lưu trữ hay phát tán nội dung của người khác.',
  en: 'COPYRIGHT NOTICE: Please only use reference videos you legally own or have explicit rights to analyze. ClipForge Lab extracts purely technical parameters (curves, color palettes, pacing) and strictly never replicates, stores, or redistributes third-party content.',
};
