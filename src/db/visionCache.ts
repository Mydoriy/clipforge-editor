/**
 * IndexedDB Vision Analysis Response Cache
 * ============================================================================
 * Key: hash(evidencePack, promptVersion, modelId) via SHA-256
 * Guarantee: Cùng bằng chứng không bao giờ gửi lại lần hai, tiết kiệm chi phí & thời gian.
 * ============================================================================
 */

import { computeSha256, canonicalStringify } from '../utils/ed25519Verifier.ts';
import type { VisionAnalysisResponse, VisionEvidencePack } from '../types/visionPlanner.ts';
import { db } from './index.ts';

// In-Memory fallback for headless test runners / Node environments
const memoryCache = new Map<string, { modelId: string; response: VisionAnalysisResponse; cachedAt: number }>();

/**
 * Computes deterministic SHA-256 hash key for caching
 */
export async function computeVisionCacheKey(
  evidencePack: VisionEvidencePack,
  promptVersion: string,
  modelId: string
): Promise<string> {
  // Normalize frames to extract lightweight signatures
  const normalizedPack = {
    frames: (evidencePack.referenceFrames || []).map((f) => ({
      dataHash: f.dataUrl ? f.dataUrl.slice(0, 100) + '_' + f.dataUrl.length : '',
      timestampSec: f.timestampSec,
      index: f.index,
    })),
    duration: evidencePack.videoDurationSec,
    prompt: evidencePack.userPrompt,
  };

  const canonical = canonicalStringify({
    pack: normalizedPack,
    promptVersion,
    modelId,
  });

  return await computeSha256(canonical);
}

/**
 * Retrieves cached response if exists
 */
export async function getVisionCache(cacheKey: string): Promise<VisionAnalysisResponse | null> {
  // 1. Check memory fallback first
  if (memoryCache.has(cacheKey)) {
    const item = memoryCache.get(cacheKey)!;
    return {
      ...item.response,
      cached: true,
    };
  }

  // 2. Check IndexedDB if available
  try {
    if (typeof indexedDB !== 'undefined' || typeof window !== 'undefined') {
      const record = await (db as any).visionCache?.get(cacheKey);
      if (record && record.response) {
        return {
          ...record.response,
          cached: true,
        };
      }
    }
  } catch {
    // Graceful fallback to null
  }

  return null;
}

/**
 * Stores response in cache
 */
export async function setVisionCache(
  cacheKey: string,
  modelId: string,
  response: VisionAnalysisResponse
): Promise<void> {
  const toCache: VisionAnalysisResponse = {
    ...response,
    cached: true,
  };

  // Always store in memory fallback
  memoryCache.set(cacheKey, {
    modelId,
    response: toCache,
    cachedAt: Date.now(),
  });

  // Store in IndexedDB if available
  try {
    if (typeof indexedDB !== 'undefined' || typeof window !== 'undefined') {
      await (db as any).visionCache?.put({
        cacheKey,
        modelId,
        createdAt: Date.now(),
        response: toCache,
      });
    }
  } catch {
    // Non-fatal, memory cache active
  }
}

/**
 * Clears entire vision cache
 */
export async function clearVisionCache(): Promise<number> {
  const count = memoryCache.size;
  memoryCache.clear();

  try {
    if (typeof indexedDB !== 'undefined' || typeof window !== 'undefined') {
      await (db as any).visionCache?.clear();
    }
  } catch {
    // Ignore
  }

  return count;
}

