/**
 * T2. VÒNG HỌC (Learning Loop: Measure -> Interpret -> Hypothesize -> Verify -> Refine -> Gate)
 * ============================================================================
 * Defines types, schemas, and gate configurations for autonomous technique learning.
 * ============================================================================
 */

import { z } from 'zod';

export type TechnicalEventType = 'transition' | 'effect' | 'look' | 'text';

export interface TechnicalEventMetrics {
  lumaDelta: number;
  colorDelta: number;
  shakeFrequency?: number;
  zoomFactor?: number;
  flashIntensity?: number;
  contrastRatio?: number;
  dominantRgb?: [number, number, number];
}

export interface FilmstripFrame {
  timestampSec: number;
  dataUrl: string; // 180p-360p downscaled, watermark masked
  masked: boolean;
  rgba?: Uint8ClampedArray | Uint8Array | number[];
}

export interface TechnicalEvidencePack {
  eventId: string;
  type: TechnicalEventType;
  startSec: number;
  endSec: number;
  durationSec: number;
  metrics: TechnicalEventMetrics;
  filmstrip: FilmstripFrame[]; // 8-12 frames around event
  faceBlurApplied?: boolean;
}

export const TechniqueHypothesisZod = z.object({
  segmentId: z.string(),
  name: z.object({
    vi: z.string().min(1),
    en: z.string().min(1),
  }),
  type: z.enum(['transition', 'effect', 'look', 'text']),
  description: z.string().default(''),
  graph: z.object({
    nodes: z.array(
      z.object({
        primitiveId: z.string(),
        params: z.record(z.string(), z.any()).default({}),
      })
    ).default([]),
    edges: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        port: z.string().optional(),
      })
    ).default([]),
  }),
  curves: z.object({
    keyframes: z.array(
      z.object({
        timeSec: z.number(),
        value: z.number(),
      })
    ).default([]),
    easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).default('linear'),
  }),
  tags: z.array(z.string()).default([]),
  aliases: z.object({
    vi: z.array(z.string()).default([]),
    en: z.array(z.string()).default([]),
  }),
  unknowns: z.array(z.string()).default([]),
  needsNewPrimitive: z
    .object({
      needed: z.boolean(),
      description: z.string().optional(),
    })
    .optional(),
});

export type TechniqueHypothesis = z.infer<typeof TechniqueHypothesisZod>;

export interface GateThresholdConfig {
  transition: number; // default: 0.80
  look: number;       // default: 0.75
  text: number;       // default: 0.85
  effect: number;     // default: 0.75
}

export const DEFAULT_GATE_THRESHOLDS: GateThresholdConfig = {
  transition: 0.80,
  look: 0.75,
  text: 0.85,
  effect: 0.75,
};

export interface GateEvaluationResult {
  passed: boolean;
  score: number;
  threshold: number;
  status: 'verified' | 'unverified' | 'needs_primitive';
  staticAnalysisSafe: boolean;
  performanceBudgetSafe: boolean;
  reasons: string[];
  needsNewPrimitive?: {
    needed: boolean;
    description?: string;
  };
}

export interface LearnedTechniqueItem {
  id: string;
  hypothesis: TechniqueHypothesis;
  verifiedScore: number;
  gateResult: GateEvaluationResult;
  evidence: TechnicalEvidencePack;
  refinementRounds: number;
  learnedAt: number;
  status: 'verified' | 'unverified';
}

export interface LearningLoopSessionResult {
  sessionId: string;
  totalEventsMeasured: number;
  verifiedLearnedCount: number;
  unverifiedHypothesisCount: number;
  neededNewPrimitives: Array<{ eventId: string; description: string }>;
  techniques: LearnedTechniqueItem[];
}

