/**
 * T4. TỰ ĐỘNG LƯU KỸ THUẬT ĐÃ HỌC - Kiểu Dữ Liệu (Learned Technique Types)
 * ============================================================================
 * Model definitions for:
 * 1. LearnedItem & Provenance (SHA-256 refHash, plannerId, modelId, promptVersion)
 * 2. Namespace user.learned/<id>@<semver> & TrustLevel "ai_learned_verified"
 * 3. Two Thresholds: HIGH (Auto-save) vs LOW (Needs review inbox)
 * 4. Perceptual Fingerprint & SemVer Deduplication
 * 5. Auto-generated Template (Slots + Recipe, zero reference media)
 * ============================================================================
 */

import { z } from 'zod';
import type { EffectSpecItem } from './effectPack.ts';
import type { RemixSlot } from './remix.ts';

export type LearnedStatus = 'auto' | 'inbox' | 'archived';
export type LearnedKind = 'effect' | 'transition' | 'filter' | 'look';

export interface LearnedProvenance {
  refHash: string; // SHA-256 của video tham chiếu, chỉ lưu cục bộ
  analyzedAt: number;
  plannerId: string;
  modelId: string;
  promptVersion: string;
}

export interface LearnedItem {
  id: string; // e.g. "user.learned/whip-blur-rgb"
  version: string; // e.g. "1.0.0"
  fullId: string; // e.g. "user.learned/whip-blur-rgb@1.0.0"
  name: {
    vi: string;
    en: string;
  };
  kind: LearnedKind;
  spec: Partial<EffectSpecItem> & {
    graph?: any;
    fragmentShader?: string;
    params?: Record<string, any>;
  };
  verifiedScore: number;
  provenance: LearnedProvenance;
  thumb: string; // SVG or neutral dataUrl rendered on synthetic test pattern
  tags: string[];
  aliases: {
    vi: string[];
    en: string[];
  };
  fingerprint: string; // 64-bit perceptual hash across 5 progress checkpoints
  status: LearnedStatus;
  trustLevel: 'ai_learned_verified';
  usage: {
    count: number;
    lastUsedAt?: number;
    projectIds?: string[];
  };
  variantCount?: number;
  variantNotes?: string[];
  redistributable: false; // Mandatory default: never redistributed publicly
  sizeBytes?: number;
}

export interface LearnedAutoSaveSettings {
  mode: 'auto' | 'always_ask' | 'off';
  highThreshold: number; // default: 0.82
  lowThreshold: number; // default: 0.75
}

export const DEFAULT_AUTOSAVE_SETTINGS: LearnedAutoSaveSettings = {
  mode: 'auto',
  highThreshold: 0.82,
  lowThreshold: 0.75,
};

export interface LearnedTemplateSlotSummary {
  index: number;
  role: string;
  durationSec: number;
  label: { vi: string; en: string };
  techniques: {
    transition?: string;
    effect?: string;
    look?: string;
    text?: string;
  };
}

export interface LearnedTemplate {
  id: string; // e.g. "tpl_learned_1731050000"
  name: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  durationSec: number;
  slots: LearnedTemplateSlotSummary[];
  createdAt: number;
  updatedAt: number;
  thumbnailUrl: string; // Neutral placeholder, ZERO reference media
  category: 'Của tôi';
  tags: string[];
  refHash?: string;
}

export interface AutoSaveEvaluationResult {
  action: 'saved_auto' | 'routed_to_inbox' | 'variant_incremented' | 'version_bumped' | 'rejected_low_score' | 'disabled';
  item?: LearnedItem;
  toastMessage?: { vi: string; en: string };
  reason: string;
}

export const LearnedItemZod = z.object({
  id: z.string().startsWith('user.learned/'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  fullId: z.string(),
  name: z.object({
    vi: z.string().min(1),
    en: z.string().min(1),
  }),
  kind: z.enum(['effect', 'transition', 'filter', 'look']),
  verifiedScore: z.number().min(0).max(1),
  provenance: z.object({
    refHash: z.string(),
    analyzedAt: z.number(),
    plannerId: z.string(),
    modelId: z.string(),
    promptVersion: z.string(),
  }),
  thumb: z.string(),
  tags: z.array(z.string()),
  aliases: z.object({
    vi: z.array(z.string()),
    en: z.array(z.string()),
  }),
  fingerprint: z.string(),
  status: z.enum(['auto', 'inbox', 'archived']),
  trustLevel: z.literal('ai_learned_verified'),
  usage: z.object({
    count: z.number(),
    lastUsedAt: z.number().optional(),
    projectIds: z.array(z.string()).optional(),
  }),
  variantCount: z.number().optional(),
  variantNotes: z.array(z.string()).optional(),
  redistributable: z.literal(false),
  sizeBytes: z.number().optional(),
});
