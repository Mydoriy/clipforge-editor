/**
 * T6. RIÊNG TƯ, CHI PHÍ, AN TOÀN (Types & Schemas)
 * ============================================================================
 * Privacy, Cost Budgeting & Security Enforcement:
 * 1. AI Dispatch Consent: Frame previews, count, token/cost estimation, provider/model.
 * 2. Safe Defaults: blurFaces=true, maskWatermarks=true, sendAudio=false, sendFullVideo=false.
 * 3. Budget Limits: max 48 frames, token ceiling, daily cost limit.
 * 4. Prompt Injection Defense: Delimited system prompt, Zod validation, catalog verification.
 * 5. Telemetry & Log Safety: Strict zero-leakage of media/links/keys.
 * 6. Copyright Notice: Bilingual compliance notice.
 * ============================================================================
 */

import { z } from 'zod';
import type { VisionProviderType } from './visionPlanner.ts';

export interface PrivacyCostSafetySettings {
  blurFaces: boolean;            // Default: true (MediaPipe face blur)
  maskWatermarks: boolean;       // Default: true (4-corner watermark/username mask)
  sendAudio: boolean;            // Default: false (BPM & rhythm computed locally)
  sendFullVideo: boolean;        // Default: false (Requires explicit confirmation warning)
  maxFramesPerAnalysis: number;  // Default: 48 frames ceiling
  dailyCostLimitUsd: number;     // Default: 0.50 USD
  dailyTokenLimit: number;       // Default: 50,000 tokens
}

export const DEFAULT_PRIVACY_SAFETY_SETTINGS: PrivacyCostSafetySettings = {
  blurFaces: true,
  maskWatermarks: true,
  sendAudio: false,
  sendFullVideo: false,
  maxFramesPerAnalysis: 48,
  dailyCostLimitUsd: 0.50,
  dailyTokenLimit: 50000,
};

export interface DailyUsageRecord {
  date: string;               // YYYY-MM-DD
  tokensUsed: number;
  costUsd: number;
  requestsCount: number;
}

export interface ConsentFramePreview {
  index: number;
  timestampSec: number;
  dataUrl: string;
  masked: boolean;
  faceBlurred?: boolean;
}

export interface AiConsentPayload {
  frames: ConsentFramePreview[];
  frameCount: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
  provider: VisionProviderType;
  model: string;
  sendFullVideo: boolean;
  dailyBudgetRemainingUsd: number;
  dailyTokensRemaining: number;
}

export interface AiConsentResult {
  granted: boolean;
  rememberForSession: boolean;
}

export const AI_PRIVACY_COPYRIGHT_NOTICE = {
  vi: 'Chỉ phân tích video bạn có quyền sử dụng. Ứng dụng chỉ trích xuất kỹ thuật chỉnh sửa, không lưu nội dung.',
  en: 'Only analyze videos you have the rights to use. The app only extracts editing techniques and never retains content.',
} as const;

export const KNOWN_VALID_PRIMITIVES = [
  'core.primitive.blur.directional',
  'core.primitive.blur.gaussian',
  'core.primitive.channel_shift',
  'core.primitive.shake',
  'core.primitive.color_grade',
  'core.primitive.lut3d',
  'core.primitive.speed_ramp',
  'core.primitive.flash',
  'core.primitive.zoom',
  'core.primitive.glow',
  'core.primitive.halide_grain',
  'core.primitive.text_kinetic',
] as const;

