/**
 * Style Analyzer ("Sao chép phong cách") Engine
 * ============================================================================
 * Extracts stylistic evidence (color grade, glitch, shake, grain, transitions)
 * from reference video frames, evaluates local support, and provides trigger
 * points into the Resolver ladder (Tìm trong kho, Ghép, AI viết, Dùng gần nhất).
 * ============================================================================
 */

import type { EffectItemKind } from '../types/effectPack.ts';
import { resolve, type ResolveRequest, type ResolveResult } from './effectResolver.ts';

export type SupportStatus = 'supported' | 'low_confidence' | 'unsupported';

export interface StyleElementAnalysis {
  id: string;
  name: string;
  kind: EffectItemKind;
  detectedDescription: string;
  confidenceScore: number; // 0.0 - 1.0
  status: SupportStatus; // 'supported' | 'low_confidence' | 'unsupported'
  evidence: {
    histogramDiff?: number;
    dominantRgb?: [number, number, number];
    detectedFrequency?: number;
    sampleFrameIndex?: number;
  };
  matchedCandidateId?: string;
  resolutionOptions: {
    canSearchRegistry: boolean;
    canSynthesizeComposite: boolean;
    canAiGenerate: boolean;
    canUseNearest: boolean;
  };
}

export interface StyleAnalysisReport {
  id: string;
  timestamp: number;
  overallSimilarity: number;
  elements: StyleElementAnalysis[];
  referenceFrames?: any[];
}

/**
 * Simulates analysis of reference frames, extracting style components and evaluating support
 */
export function analyzeReferenceStyle(
  referenceFrames: any[] = [],
  installedAssetIds: string[] = []
): StyleAnalysisReport {
  const elements: StyleElementAnalysis[] = [
    {
      id: 'style_color_lut',
      name: 'Bảng màu Điện ảnh Xanh Cam (Teal & Orange)',
      kind: 'filter',
      detectedDescription: 'Màu da cam ấm tương phản vùng tối xanh lam',
      confidenceScore: 0.88,
      status: installedAssetIds.some((id) => id.includes('teal') || id.includes('orange'))
        ? 'supported'
        : 'low_confidence',
      evidence: {
        dominantRgb: [240, 140, 60],
        histogramDiff: 0.15,
      },
      resolutionOptions: {
        canSearchRegistry: true,
        canSynthesizeComposite: true,
        canAiGenerate: true,
        canUseNearest: true,
      },
    },
    {
      id: 'style_glitch_shake',
      name: 'Rung quang sai RGB (RGB Aberration Shake)',
      kind: 'effect',
      detectedDescription: 'Tách kênh màu đỏ-lam kèm rung lắc nhẹ theo nhịp',
      confidenceScore: 0.35,
      status: installedAssetIds.some((id) => id.includes('rgb') || id.includes('shake'))
        ? 'supported'
        : 'unsupported',
      evidence: {
        detectedFrequency: 18.5,
        sampleFrameIndex: 1,
      },
      resolutionOptions: {
        canSearchRegistry: true,
        canSynthesizeComposite: true,
        canAiGenerate: true,
        canUseNearest: true,
      },
    },
    {
      id: 'style_film_grain',
      name: 'Hạt phim 35mm (Film Halide Grain)',
      kind: 'effect',
      detectedDescription: 'Nhiễu hạt muối bạc analog độ nhuyễn cao',
      confidenceScore: 0.52,
      status: installedAssetIds.some((id) => id.includes('grain') || id.includes('halide'))
        ? 'supported'
        : 'low_confidence',
      evidence: {
        histogramDiff: 0.28,
        sampleFrameIndex: 2,
      },
      resolutionOptions: {
        canSearchRegistry: true,
        canSynthesizeComposite: true,
        canAiGenerate: true,
        canUseNearest: true,
      },
    },
  ];

  return {
    id: `analysis_${Date.now()}`,
    timestamp: Date.now(),
    overallSimilarity: 0.62,
    elements,
    referenceFrames,
  };
}

/**
 * Triggers the Resolver for an analyzed style element with reference frames for analysis-by-synthesis scoring
 */
export async function resolveAnalyzedStyleElement(
  element: StyleElementAnalysis,
  preferredAction: 'search_registry' | 'synthesize_composite' | 'ai_generate' | 'use_nearest',
  referenceFrames: any[] = [],
  resolverEnv?: any
): Promise<ResolveResult> {
  const req: ResolveRequest = {
    specId: element.id,
    query: element.name,
    referenceFrames,
    context: {
      kind: element.kind,
    },
  };

  return await resolve(req, resolverEnv);
}
