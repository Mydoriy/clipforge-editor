/**
 * M1. RESOLVER – THANG GIẢI QUYẾT (Module Lõi, Thuần Khiết)
 * ============================================================================
 * Resolves an effect request through a 5-tier sequential ladder:
 *  1. Khớp chính xác id@version trong registry cục bộ (Exact Installed).
 *  2. Khớp alias/tag/đồng nghĩa trong hiệu ứng ĐÃ CÀI (Fuzzy vi/en).
 *  3. Khớp trong chỉ mục kho (Cache cục bộ) -> Đề xuất "Cài đặt" (Xem trước được).
 *  4. Ghép cục bộ từ hiệu ứng cơ bản (M5 Composite Fallback).
 *  5. (Tùy chọn, cần API key + đồng ý) AI viết (M6 AI Generator).
 * Dừng ngay tại bậc đầu tiên đạt ngưỡng tin cậy.
 * ============================================================================
 */

import type { EffectItemKind, EffectPack, EffectSpecItem, EffectGraph } from '../types/effectPack.ts';
import { getNamespacedItemId, parseNamespacedItemId } from '../types/effectPack.ts';

export type ResolveTier = 1 | 2 | 3 | 4 | 5 | 0;

export type ResolveStatus =
  | 'exact_installed'       // Tier 1
  | 'fuzzy_installed'       // Tier 2
  | 'registry_available'    // Tier 3
  | 'local_composite'       // Tier 4
  | 'ai_generation_ready'   // Tier 5
  | 'unresolved';           // Ghost fallback

export type ResolutionAction =
  | 'apply_directly'
  | 'suggest_replacement'
  | 'prompt_install'
  | 'apply_composite'
  | 'prompt_ai_generation'
  | 'ghost_placeholder';

export interface ResolveRequest {
  specId?: string; // e.g. "official.glitch-pack/rgb-shake@1.0.0" or "rgb-shake"
  query?: string; // User search or intent text, e.g. "rung màn hình", "rgb shake"
  tags?: string[];
  referenceFrames?: any[]; // Extracted frames from analyzer
  context: {
    kind: EffectItemKind;
    projectId?: string;
  };
}

export interface ResolveResult {
  tier: ResolveTier;
  status: ResolveStatus;
  action: ResolutionAction;
  matchLevel: 'exact' | 'approximate' | 'none';
  trustLevel: 'official' | 'community' | 'manual' | 'local_fallback' | 'ai_generated';
  score: number; // 0.0 - 1.0
  item?: EffectSpecItem;
  pack?: {
    id: string;
    version: string;
    name: { vi: string; en: string };
    author: string;
    license: string;
  };
  matchedAlias?: string;
  graph?: EffectGraph;
  preview?: {
    thumb: string;
    loopFrames?: number;
  };
  ghostReference?: {
    originalId: string;
    kind: EffectItemKind;
    missing: true;
  };
  reason: string;
}

export interface ResolverEnvironment {
  installedItems?: Array<{ item: EffectSpecItem; packId: string; version: string; trustLevel?: any }>;
  registryPacks?: EffectPack[];
  aiConfig?: {
    hasKey: boolean;
    userConsented: boolean;
  };
}

/**
 * Text normalization for bilingual (Vietnamese & English) fuzzy matching
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes bilingual token-overlap & substring similarity score between 0.0 and 1.0
 */
export function calculateFuzzyScore(inputQuery: string, candidate: string): number {
  if (!inputQuery || !candidate) return 0;

  const rawQ = inputQuery.toLowerCase().trim();
  const rawC = candidate.toLowerCase().trim();

  // Exact raw match
  if (rawQ === rawC) return 1.0;

  const normQ = normalizeText(rawQ);
  const normC = normalizeText(rawC);

  // Exact normalized match
  if (normQ === normC) return 0.95;

  // Direct substring
  if (normC.includes(normQ) || normQ.includes(normC)) {
    const ratio = Math.min(normQ.length, normC.length) / Math.max(normQ.length, normC.length);
    return Math.max(0.7, 0.7 + ratio * 0.25);
  }

  // Token overlap (Jaccard similarity)
  const qTokens = new Set(normQ.split(' ').filter(Boolean));
  const cTokens = new Set(normC.split(' ').filter(Boolean));

  let intersection = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) intersection++;
  }

  const union = new Set([...qTokens, ...cTokens]).size;
  if (union === 0) return 0;

  return (intersection / union) * 0.85;
}

/**
 * Tier 1: Exact Installed Match by specId (<packId>/<itemId>@<version> or slug)
 */
function matchExactInstalled(
  req: ResolveRequest,
  installed: NonNullable<ResolverEnvironment['installedItems']>
): ResolveResult | null {
  if (!req.specId) return null;

  const targetId = req.specId.trim();

  // 1. Direct namespaced match
  let matched = installed.find((entry) => {
    const nsId = getNamespacedItemId(entry.packId, entry.item.id, entry.version);
    return nsId === targetId;
  });

  // 2. Slug match with matching kind
  if (!matched) {
    matched = installed.find(
      (entry) =>
        (entry.item.id === targetId || targetId.includes(entry.item.id)) &&
        entry.item.kind === req.context.kind
    );
  }

  if (matched) {
    return {
      tier: 1,
      status: 'exact_installed',
      action: 'apply_directly',
      matchLevel: 'exact',
      trustLevel: matched.trustLevel || 'official',
      score: 1.0,
      item: matched.item,
      pack: {
        id: matched.packId,
        version: matched.version,
        name: { vi: matched.packId, en: matched.packId },
        author: 'ClipForge',
        license: 'MIT',
      },
      preview: matched.item.preview,
      reason: `Khớp chính xác hiệu ứng đã cài đặt: ${matched.item.id}`,
    };
  }

  return null;
}

/**
 * Tier 2: Fuzzy Alias/Tag Match in INSTALLED items
 */
function matchFuzzyInstalled(
  req: ResolveRequest,
  installed: NonNullable<ResolverEnvironment['installedItems']>
): ResolveResult | null {
  const query = req.query || req.specId || '';
  if (!query && (!req.tags || req.tags.length === 0)) return null;

  let bestScore = 0;
  let bestMatch: (typeof installed)[0] | null = null;
  let bestAlias = '';

  for (const entry of installed) {
    if (entry.item.kind !== req.context.kind) continue;

    // Check aliases in vi & en
    const candidateStrings: string[] = [
      entry.item.id,
      ...(entry.item.aliases?.vi || []),
      ...(entry.item.aliases?.en || []),
      ...(entry.item.tags || []),
    ];

    for (const str of candidateStrings) {
      const score = calculateFuzzyScore(query, str);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
        bestAlias = str;
      }
    }

    // Check requested tags overlap
    if (req.tags && entry.item.tags) {
      for (const reqTag of req.tags) {
        for (const itemTag of entry.item.tags) {
          const tagScore = calculateFuzzyScore(reqTag, itemTag);
          if (tagScore > bestScore) {
            bestScore = tagScore;
            bestMatch = entry;
            bestAlias = itemTag;
          }
        }
      }
    }
  }

  // Threshold: >= 0.60
  if (bestMatch && bestScore >= 0.6) {
    return {
      tier: 2,
      status: 'fuzzy_installed',
      action: 'apply_directly',
      matchLevel: 'approximate',
      trustLevel: bestMatch.trustLevel || 'official',
      score: Math.min(0.95, bestScore),
      item: bestMatch.item,
      matchedAlias: bestAlias,
      pack: {
        id: bestMatch.packId,
        version: bestMatch.version,
        name: { vi: bestMatch.packId, en: bestMatch.packId },
        author: 'ClipForge',
        license: 'MIT',
      },
      preview: bestMatch.item.preview,
      reason: `Khớp đồng nghĩa/alias "${bestAlias}" trong kho đã cài đặt (${Math.round(bestScore * 100)}%)`,
    };
  }

  return null;
}

/**
 * Tier 3: Match in Registry Index (Offline Cache) -> Suggest "Install"
 */
function matchRegistryIndex(
  req: ResolveRequest,
  packs: NonNullable<ResolverEnvironment['registryPacks']>
): ResolveResult | null {
  const query = req.query || req.specId || '';
  if (!query && (!req.tags || req.tags.length === 0)) return null;

  let bestScore = 0;
  let bestItem: EffectSpecItem | null = null;
  let bestPack: EffectPack | null = null;
  let bestAlias = '';

  for (const pack of packs) {
    for (const item of pack.items) {
      if (item.kind !== req.context.kind) continue;

      // 1. Exact specId match in registry
      if (req.specId) {
        const nsId = getNamespacedItemId(pack.id, item.id, pack.version);
        if (nsId === req.specId || item.id === req.specId) {
          return {
            tier: 3,
            status: 'registry_available',
            action: 'prompt_install',
            matchLevel: 'exact',
            trustLevel: (pack.license.includes('MIT') || pack.id.startsWith('official')) ? 'official' : 'community',
            score: 0.98,
            item,
            pack: {
              id: pack.id,
              version: pack.version,
              name: pack.name,
              author: pack.author,
              license: pack.license,
            },
            preview: item.preview,
            reason: `Tìm thấy gói "${pack.name.vi}" trong kho đăng ký. Đề xuất cài đặt.`,
          };
        }
      }

      // 2. Fuzzy match in registry
      const candidates: string[] = [
        item.id,
        ...(item.aliases?.vi || []),
        ...(item.aliases?.en || []),
        ...(item.tags || []),
      ];

      for (const str of candidates) {
        const score = calculateFuzzyScore(query, str);
        if (score > bestScore) {
          bestScore = score;
          bestItem = item;
          bestPack = pack;
          bestAlias = str;
        }
      }
    }
  }

  // Threshold: >= 0.60
  if (bestItem && bestPack && bestScore >= 0.6) {
    return {
      tier: 3,
      status: 'registry_available',
      action: 'prompt_install',
      matchLevel: 'approximate',
      trustLevel: bestPack.id.startsWith('official') ? 'official' : 'community',
      score: Math.min(0.92, bestScore),
      item: bestItem,
      pack: {
        id: bestPack.id,
        version: bestPack.version,
        name: bestPack.name,
        author: bestPack.author,
        license: bestPack.license,
      },
      matchedAlias: bestAlias,
      preview: bestItem.preview,
      reason: `Khớp tài nguyên "${bestItem.id}" trong gói "${bestPack.name.vi}". Có thể xem trước và cài đặt.`,
    };
  }

  return null;
}

/**
 * Tier 4: Local Composite synthesis from Primitive Core Effects (M5)
 */
function synthesizeLocalComposite(req: ResolveRequest): ResolveResult | null {
  const query = normalizeText(req.query || req.specId || '');

  // Example composite synthesis for Glitch/Shake/Distortion
  if (req.context.kind === 'effect' && (query.includes('glitch') || query.includes('rung') || query.includes('shake') || query.includes('rgb'))) {
    const compositeItem: EffectSpecItem = {
      id: 'local.composite.glitch-shake',
      kind: 'effect',
      paramSchema: {
        intensity: { type: 'number', default: 1.0, min: 0.1, max: 2.0 },
      },
      graph: {
        nodes: [
          { id: 'node_rgb_split', ref: 'core.primitive.rgb_split', params: { shift: '8.0 * uParams.x' } },
          { id: 'node_shake', ref: 'core.primitive.camera_shake', params: { speed: '1.5' } },
        ],
        edges: [{ from: 'node_rgb_split', to: 'node_shake' }],
      },
      tags: ['composite', 'glitch', 'shake', 'fallback'],
      aliases: { vi: ['ghép rung nhiễu'], en: ['composite glitch shake'] },
      preview: { thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=' },
      cost: { samplesPerPixel: 2, passes: 1 },
      since: '1.0.0',
    };

    return {
      tier: 4,
      status: 'local_composite',
      action: 'apply_composite',
      matchLevel: 'approximate',
      trustLevel: 'local_fallback',
      score: 0.55,
      item: compositeItem,
      graph: compositeItem.graph,
      reason: 'Không tìm thấy trong kho; tự động ghép hiệu ứng cục bộ từ các khối cơ bản (RGB Split + Shake).',
    };
  }

  // Example composite synthesis for Blur/Fade transition
  if (req.context.kind === 'transition') {
    const transitionComposite: EffectSpecItem = {
      id: 'local.composite.cross-dissolve',
      kind: 'transition',
      paramSchema: {
        progress: { type: 'number', default: 0.0, min: 0.0, max: 1.0 },
      },
      graph: {
        nodes: [{ id: 'n_dissolve', ref: 'core.primitive.dissolve', params: {} }],
        edges: [],
      },
      tags: ['composite', 'transition', 'dissolve'],
      aliases: { vi: ['chuyển cảnh hòa trộn'], en: ['cross dissolve'] },
      preview: { thumb: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAkA4JaQAA3AA/vuUAAA=' },
      cost: { samplesPerPixel: 2, passes: 1 },
      since: '1.0.0',
    };

    return {
      tier: 4,
      status: 'local_composite',
      action: 'apply_composite',
      matchLevel: 'approximate',
      trustLevel: 'local_fallback',
      score: 0.5,
      item: transitionComposite,
      graph: transitionComposite.graph,
      reason: 'Tự động tạo chuyển tiếp cục bộ từ mẫu cơ bản.',
    };
  }

  return null;
}

/**
 * Tier 5: AI Generation Option (M6 - Requires API Key and User Consent)
 */
function checkAiGeneration(
  req: ResolveRequest,
  aiConfig?: ResolverEnvironment['aiConfig']
): ResolveResult | null {
  if (!aiConfig?.hasKey || !aiConfig?.userConsented) {
    return null;
  }

  return {
    tier: 5,
    status: 'ai_generation_ready',
    action: 'prompt_ai_generation',
    matchLevel: 'approximate',
    trustLevel: 'ai_generated',
    score: 0.45,
    reason: 'Sẵn sàng khởi tạo Shader/Preset mới bằng trợ lý AI (yêu cầu người dùng xác nhận).',
  };
}

/**
 * Main Pure Resolver Function
 * Traverses the 5-tier ladder and stops at the first successful match.
 */
export async function resolve(
  req: ResolveRequest,
  env?: ResolverEnvironment
): Promise<ResolveResult> {
  const installed = env?.installedItems || [];
  const registryPacks = env?.registryPacks || [];

  // 1. Tier 1: Exact Installed Match
  const tier1 = matchExactInstalled(req, installed);
  if (tier1) return tier1;

  // 2. Tier 2: Fuzzy Alias/Tag Match in Installed items
  const tier2 = matchFuzzyInstalled(req, installed);
  if (tier2) return tier2;

  // 3. Tier 3: Match in Registry Index -> Suggest Install
  const tier3 = matchRegistryIndex(req, registryPacks);
  if (tier3) return tier3;

  // 4. Tier 4: Local Composite Synthesis (M5)
  const tier4 = synthesizeLocalComposite(req);
  if (tier4) return tier4;

  // 5. Tier 5: AI Generation Option (M6)
  const tier5 = checkAiGeneration(req, env?.aiConfig);
  if (tier5) return tier5;

  // Tier 0: Unresolved Ghost Reference (Preserves timeline structure)
  return {
    tier: 0,
    status: 'unresolved',
    action: 'ghost_placeholder',
    matchLevel: 'none',
    trustLevel: 'local_fallback',
    score: 0.0,
    ghostReference: {
      originalId: req.specId || req.query || 'unknown-effect',
      kind: req.context.kind,
      missing: true,
    },
    reason: `Không tìm thấy tài nguyên "${req.specId || req.query}". Giữ vị trí an toàn (Ghost Reference).`,
  };
}
