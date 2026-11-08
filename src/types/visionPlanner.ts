/**
 * T0. LỚP KẾT NỐI AI (Vision Planner Abstraction)
 * ============================================================================
 * Privacy-First, Multimodal Video Technique Decomposition & Remix Engine.
 *
 * Core Guarantees:
 * 1. AI Đề xuất, Máy kiểm chứng: Mọi thông số AI trả về chỉ là dữ liệu kỹ thuật,
 *    phải có verifiedScore tính từ khung hình thật; phát biểu chưa kiểm chứng
 *    nằm trong unverifiedClaims gắn nhãn "AI đoán".
 * 2. Chỉ trích xuất KỸ THUẬT: cấm lưu, xuất hay tái dùng nội dung PII/khuôn mặt/audio.
 * 3. Tên kỹ thuật mô tả trung lập, chặn thương hiệu & username.
 * 4. Structured Output ép kiểu JSON Schema + Zod validation (tối đa 2 lần tự sửa).
 * 5. Cache phản hồi IndexedDB theo hash(evidencePack, promptVersion, modelId).
 * 6. Xử lý lỗi 429/quota/offline -> exponential backoff, fallback cục bộ ('none').
 * ============================================================================
 */

import { z } from 'zod';

export type VisionProviderType = 'gemini-direct' | 'proxy' | 'none';

export interface VisionCapabilities {
  image: boolean;
  structuredOutput: boolean;
  video?: boolean;
  agentLoop?: boolean;
}

// 1. Zod Schema cho từng kỹ thuật được phân tích
export const TechniqueAnalysisItemZod = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-_]+$/i, 'ID kỹ thuật phải là slug mô tả (vd: rgb-shake-beat, film-halide-grain)'),
  name: z.object({
    vi: z.string().min(1),
    en: z.string().min(1),
  }),
  kind: z.enum(['effect', 'transition', 'filter', 'speedCurve', 'audioRhythm']),
  timestampSec: z.number().nonnegative(),
  confidence: z.number().min(0).max(1), // Độ tự tin sơ bộ do LLM báo (gắn nhãn "AI đoán")
  parameters: z.record(z.string(), z.any()).default({}),
  primitiveGraphRef: z.string().optional(),
  description: z.string().default(''),
});

export type TechniqueAnalysisItem = z.infer<typeof TechniqueAnalysisItemZod>;

// 2. Zod Schema toàn diện cho kết quả phân tích Remix Lab
export const RemixAnalysisOutputZod = z.object({
  summary: z.object({
    vi: z.string().min(1),
    en: z.string().min(1),
  }),
  detectedTechniques: z.array(TechniqueAnalysisItemZod).default([]),
  unverifiedClaims: z.array(z.string()).default([]), // Phát biểu chưa kiểm chứng gắn nhãn "AI đoán"
  pacingBpm: z.number().positive().optional(),
  cutIntervalsSec: z.array(z.number().nonnegative()).default([]),
});

export type RemixAnalysisOutput = z.infer<typeof RemixAnalysisOutputZod>;

// 3. Cấu hình Settings (không hard-code trong code)
export interface VisionSettingsConfig {
  provider: VisionProviderType;
  apiKey?: string;
  isEncrypted?: boolean;
  model: string;                      // Vd: "gemini-1.5-flash", "gemini-2.0-flash"
  endpoint: string;                   // Vd: "https://generativelanguage.googleapis.com/v1beta"
  estimatedPricePer1kTokens: number;  // Giá ước tính USD / 1k tokens (vd: 0.0001)
  tokenLimit: number;                 // Giới hạn token (vd: 8192)
  timeoutMs: number;                  // Timeout request (vd: 15000ms)
  maxRetries: number;                 // Số lần tự sửa lỗi schema (mặc định: 2)
  promptVersion: string;              // Version của system prompt dùng cho hash cache (vd: "v1.0")
}

export const DEFAULT_VISION_SETTINGS: VisionSettingsConfig = {
  provider: 'none', // Mặc định: Phân tích cục bộ (an toàn & offline)
  model: 'gemini-1.5-flash',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta',
  estimatedPricePer1kTokens: 0.0001,
  tokenLimit: 8192,
  timeoutMs: 15000,
  maxRetries: 2,
  promptVersion: 'v1.0',
};

// 4. Evidence Pack & Request
export interface VisionReferenceFrame {
  dataUrl: string; // Base64 data URL (JPEG/WebP, downscaled 90p/180p)
  timestampSec: number;
  index: number;
}

export interface VisionEvidencePack {
  referenceFrames: VisionReferenceFrame[];
  videoDurationSec?: number;
  userPrompt?: string;
  sourceUrl?: string; // Nguồn tham chiếu nếu có (chỉ để ghi chú, không tải)
}

export interface VisionAnalysisRequest {
  evidencePack: VisionEvidencePack;
  settings?: Partial<VisionSettingsConfig>;
  signal?: AbortSignal;
  mockLlmHandler?: (systemPrompt: string, userPrompt: string, attempt: number, errorContext?: string) => Promise<string>;
}

// 5. Response
export interface VisionAnalysisResponse {
  success: boolean;
  plannerId: VisionProviderType;
  modelId: string;
  cached: boolean;
  data?: RemixAnalysisOutput;
  error?: string;
  unverifiedClaims: string[];
  retriesUsed: number;
  fallbackReason?: string;
  durationMs: number;
  tokensEstimated?: number;
}

// 6. Interface VisionPlanner chuẩn hóa
export interface VisionPlanner {
  readonly id: VisionProviderType;
  readonly capabilities: VisionCapabilities;
  analyze(req: VisionAnalysisRequest): Promise<VisionAnalysisResponse>;
}

// 7. Kết quả kiểm tra kết nối (Probe)
export interface VisionProbeResult {
  connected: boolean;
  latencyMs: number;
  capabilities: VisionCapabilities;
  error?: string;
}
