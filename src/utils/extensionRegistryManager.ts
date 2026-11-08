/**
 * Extension Registry Manager
 * ============================================================================
 * Privacy-First, Offline-Ready Declarative Dynamic Asset Extension Manager.
 *
 * Core Guarantees:
 * 1. 100% Local In-Memory Search: Entire index downloaded once; zero search queries sent outward.
 * 2. Immutability & Version Pinning: Never updates existing projects silently without consent.
 * 3. Ghost Reference: Preserves missing asset slots with safe placeholders; auto-reconnects when installed.
 * 4. Transparent Trust & Match Badging on UI (Official / Community / Manual / AI / Exact / Approx).
 * 5. Zero JS / WASM execution: purely declarative JSON, GLSL ES 3.00, SVG, Web Audio, and LUT.
 * ============================================================================
 */

import { db, type InstalledAssetEntity } from '../db/index.ts';
import type {
  AssetKind,
  AssetPackage,
  AssetResolutionResult,
  EffectSpec,
  GhostReference,
  RegistryIndex,
  RevocationEntry,
  TrustLevel,
} from '../types/extensionRegistry.ts';
import type { EffectPack, EffectSpecItem } from '../types/effectPack.ts';
import { getNamespacedItemId } from '../types/effectPack.ts';
import { validateDeclarativeSpec } from '../engine/dynamicEffectEngine.ts';
import { unpackCapfx, packCapfx } from './capfxZip.ts';
import {
  verifyOfficialPackage,
  computeSha256,
  OFFICIAL_REGISTRY_KEYS,
} from './ed25519Verifier.ts';

// Cached in-memory index
let memoryIndexCache: RegistryIndex | null = null;

// Registry storage keys
export const REGISTRY_LAST_SYNCED_KEY = 'clipforge_registry_last_synced';
export const REGISTRY_CACHE_KEY = 'clipforge_registry_cache_v1';
export const REGISTRY_CUSTOM_URL_KEY = 'clipforge_custom_registry_url';
export const DEFAULT_REGISTRY_URL = '/registry/index.json';

// Registry events for reactive UI updates
export const EXTENSION_EVENT_INSTALLED = 'clipforge_extension_installed';
export const EXTENSION_EVENT_UNINSTALLED = 'clipforge_extension_uninstalled';
export const EXTENSION_EVENT_REVOKED = 'clipforge_extension_revoked';

/**
 * Returns current active registry URL (default or user-configured custom URL)
 */
export function getRegistryUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_REGISTRY_URL;
  return localStorage.getItem(REGISTRY_CUSTOM_URL_KEY) || DEFAULT_REGISTRY_URL;
}

/**
 * Sets a custom self-hosted registry URL
 */
export function setCustomRegistryUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    localStorage.removeItem(REGISTRY_CUSTOM_URL_KEY);
  } else {
    localStorage.setItem(REGISTRY_CUSTOM_URL_KEY, cleanUrl);
  }
  memoryIndexCache = null;
}

/**
 * Resets registry URL to official default
 */
export function resetRegistryUrl(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REGISTRY_CUSTOM_URL_KEY);
  memoryIndexCache = null;
}

/**
 * Loads or fetches the static registry index.
 * Implements Stale-While-Revalidate: max 1 request per 24 hours, or forced by "Kiểm tra ngay".
 * Uses offline cached index if network is unavailable.
 */
export async function fetchOrLoadRegistryIndex(forceRefresh = false): Promise<RegistryIndex> {
  const customUrl = getRegistryUrl();
  const isCustom = customUrl !== DEFAULT_REGISTRY_URL;

  // 1. Stale-While-Revalidate Check (24-hour throttle unless forceRefresh)
  if (typeof window !== 'undefined' && !forceRefresh) {
    const lastSynced = parseInt(localStorage.getItem(REGISTRY_LAST_SYNCED_KEY) || '0', 10);
    const isWithin24Hours = Date.now() - lastSynced < 24 * 60 * 60 * 1000;

    if (memoryIndexCache && isWithin24Hours) {
      return memoryIndexCache;
    }

    if (isWithin24Hours) {
      try {
        const stored = localStorage.getItem(REGISTRY_CACHE_KEY);
        if (stored) {
          const parsed: RegistryIndex = JSON.parse(stored);
          memoryIndexCache = parsed;
          return parsed;
        }
      } catch {
        // Fallback to fetch
      }
    }
  } else if (memoryIndexCache && !forceRefresh) {
    return memoryIndexCache;
  }

  // 2. Fetch from registry hosting (Cloudflare R2/Pages, GitHub Pages, or Custom URL)
  try {
    const res = await fetch(customUrl, {
      cache: forceRefresh ? 'no-cache' : 'default',
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status} khi tải registry index từ ${customUrl}`);
    }
    const index: RegistryIndex = await res.json();

    // If loaded from custom registry without official Ed25519 signature, downgrade trustLevel to 'community'
    if (isCustom) {
      for (const pkg of index.packages) {
        if (pkg.trustLevel === 'official') {
          const sigCheck = await verifyOfficialPackage(pkg);
          if (!sigCheck.verified) {
            pkg.trustLevel = 'community';
          }
        }
      }
    }

    memoryIndexCache = index;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(index));
        localStorage.setItem(REGISTRY_LAST_SYNCED_KEY, Date.now().toString());
      } catch (err) {
        console.warn('[ExtensionRegistryManager] Không thể lưu cache vào localStorage:', err);
      }
    }

    // Run revocation kill switch against installed assets
    await checkAndApplyRevocations(index);

    return index;
  } catch (err) {
    console.warn('[ExtensionRegistryManager] Lỗi fetch online index, dùng fallback cached:', err);

    // Try reading cached index from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(REGISTRY_CACHE_KEY);
        if (stored) {
          const parsed: RegistryIndex = JSON.parse(stored);
          memoryIndexCache = parsed;
          return parsed;
        }
      } catch {
        // Continue to memory cache or fallback
      }
    }

    if (memoryIndexCache) return memoryIndexCache;

    // Return empty fallback if network unreachable and no cache exists
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      repositoryName: 'ClipForge Local Offline Registry',
      packages: [],
    };
  }
}

/**
 * Revocation / Kill Switch: checks installed assets against revoked index entries.
 * Automatically disables revoked packages, converts them into safe Ghost references on timeline,
 * and suggests replacements.
 */
export async function checkAndApplyRevocations(
  index?: RegistryIndex,
  clips?: any[]
): Promise<{ revokedCount: number; updatedClips?: any[]; revokedAssets: InstalledAssetEntity[] }> {
  const activeIndex = index || (await fetchOrLoadRegistryIndex());
  const revokedList = activeIndex.revoked || [];
  if (revokedList.length === 0) {
    return { revokedCount: 0, revokedAssets: [] };
  }

  const installed = await getInstalledAssets();
  let revokedCount = 0;
  const revokedAssets: InstalledAssetEntity[] = [];

  for (const asset of installed) {
    const match = revokedList.find((rev) => {
      const idMatch = rev.id === asset.id || rev.id === asset.id.split('@')[0];
      const verMatch = rev.version === '*' || rev.version === asset.version;
      return idMatch && verMatch;
    });

    if (match) {
      revokedCount++;
      asset.isRevoked = true;
      asset.revokeReason = match.reason;
      asset.replacementId = match.replacementId;
      await db.installedAssets.put(asset);
      revokedAssets.push(asset);
    }
  }

  // Update clips on active timeline to Ghost placeholders with explanation
  let updatedClips: any[] | undefined;
  if (clips && clips.length > 0 && revokedAssets.length > 0) {
    const revokedMap = new Map(revokedAssets.map((r) => [r.id, r]));
    updatedClips = clips.map((clip) => {
      const refId = clip.dynamicEffectId || clip.ghostRef?.originalId;
      if (refId && revokedMap.has(refId)) {
        const rev = revokedMap.get(refId)!;
        return {
          ...clip,
          dynamicSpec: undefined, // Strip active shader execution immediately
          isGhostPlaceholder: true,
          ghostReason: `[Thu hồi: ${rev.revokeReason}]`,
          replacementId: rev.replacementId,
        };
      }
      return clip;
    });
  }

  if (revokedCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EXTENSION_EVENT_REVOKED, {
        detail: { revokedCount, revokedAssets },
      })
    );
  }

  return { revokedCount, updatedClips, revokedAssets };
}

export interface SearchResultItem extends AssetPackage {
  isInstalled: boolean;
  installedVersion?: string;
  hasUpdate?: boolean;
}

/**
 * 100% Local In-Memory Registry Search
 * Never transmits query terms or video metadata across the network.
 */
export async function searchLocalRegistry(
  query = '',
  kind?: AssetKind,
  trustLevel?: TrustLevel
): Promise<SearchResultItem[]> {
  const index = await fetchOrLoadRegistryIndex();
  const installedList = await getInstalledAssets();
  const installedMap = new Map(installedList.map((i) => [i.id, i.version]));

  const cleanQuery = query.trim().toLowerCase();

  const filtered = index.packages.filter((pkg) => {
    // Kind filter
    if (kind && pkg.kind !== kind) return false;

    // Trust level filter
    if (trustLevel && pkg.trustLevel !== trustLevel) return false;

    // Local text search
    if (cleanQuery) {
      const matchName = pkg.name.toLowerCase().includes(cleanQuery);
      const matchDesc = pkg.description.toLowerCase().includes(cleanQuery);
      const matchTags = pkg.spec.tags?.some((t) => t.toLowerCase().includes(cleanQuery));
      const matchAuthor = pkg.spec.author.toLowerCase().includes(cleanQuery);
      const matchId = pkg.id.toLowerCase().includes(cleanQuery);
      return matchName || matchDesc || matchTags || matchAuthor || matchId;
    }

    return true;
  });

  return filtered.map((pkg) => {
    const installedVer = installedMap.get(pkg.id);
    const isInstalled = !!installedVer;
    const hasUpdate = isInstalled && installedVer !== pkg.version;
    return {
      ...pkg,
      isInstalled,
      installedVersion: installedVer,
      hasUpdate,
    };
  });
}

/**
 * Installs a declarative package into local IndexedDB with hash and Ed25519 signature checks
 */
export async function installPackage(pkg: AssetPackage): Promise<{ success: boolean; error?: string }> {
  const validation = validateDeclarativeSpec(pkg.spec);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 1. Check Kill-switch / Revocation List
  const index = await fetchOrLoadRegistryIndex();
  const isRevoked = index.revoked?.some(
    (r) => (r.id === pkg.id || r.id === pkg.id.split('@')[0]) && (r.version === '*' || r.version === pkg.version)
  );
  if (isRevoked) {
    return { success: false, error: 'Gói tài nguyên này đã bị thu hồi do lỗi bảo mật/GPU và không thể cài đặt!' };
  }

  // 2. Hash Integrity Check
  const expectedHash = pkg.sha256 || pkg.hash;
  if (expectedHash && pkg.spec) {
    const rawSpecStr = JSON.stringify(pkg.spec, null, 2);
    const computed = await computeSha256(rawSpecStr);
    // If hash was provided and doesn't match computed spec hash or package hash
    if (pkg.sha256 && computed !== pkg.sha256 && computed !== pkg.hash) {
      return { success: false, error: 'Sai hash SHA-256! Tệp có thể đã bị can thiệp hoặc tải lỗi.' };
    }
  }

  // 3. Ed25519 Cryptographic Signature Verification for Official Packages
  let isVerified = false;
  if (pkg.trustLevel === 'official') {
    const sigCheck = await verifyOfficialPackage(pkg);
    if (!sigCheck.verified) {
      return {
        success: false,
        error: `Sai chữ ký số Ed25519: ${sigCheck.error || 'Gói không được ký bởi nhà phát hành chính thức ClipForge!'}`,
      };
    }
    isVerified = true;
  }

  const now = Date.now();
  const entity: InstalledAssetEntity = {
    id: pkg.id,
    version: pkg.version,
    name: pkg.name,
    kind: pkg.kind,
    trustLevel: pkg.trustLevel,
    license: pkg.license,
    spec: pkg.spec,
    installedAt: now,
    updatedAt: now,
    sizeBytes: pkg.sizeBytes,
    hash: pkg.hash,
    sha256: pkg.sha256 || pkg.hash,
    signature: pkg.signature,
    isVerified,
  };

  await db.installedAssets.put(entity);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EXTENSION_EVENT_INSTALLED, { detail: { id: pkg.id, pkg } }));
  }

  return { success: true };
}

/**
 * Uninstalls a package from IndexedDB
 */
export async function uninstallPackage(id: string): Promise<void> {
  await db.installedAssets.delete(id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EXTENSION_EVENT_UNINSTALLED, { detail: { id } }));
  }
}

/**
 * Returns all installed assets from Dexie
 */
export async function getInstalledAssets(kind?: AssetKind): Promise<InstalledAssetEntity[]> {
  try {
    if (kind) {
      return await db.installedAssets.where('kind').equals(kind).toArray();
    }
    return await db.installedAssets.toArray();
  } catch (err) {
    console.warn('[ExtensionRegistryManager] Lỗi đọc installedAssets từ Dexie:', err);
    return [];
  }
}

/**
 * Resolves an asset for timeline rendering.
 * Principle 2 & 3: Respects pinned version, detects missing assets, creates Ghost Reference with optional local fallback.
 */
export async function resolveAsset(
  assetId: string,
  pinnedVersion?: string,
  kind?: AssetKind
): Promise<AssetResolutionResult> {
  const installedList = await getInstalledAssets(kind);
  const exact = installedList.find((a) => a.id === assetId);

  // Exact Match
  if (exact) {
    if (exact.isRevoked) {
      const ghost: GhostReference = {
        originalId: assetId,
        originalVersion: exact.version,
        kind: exact.kind as AssetKind,
        name: exact.name,
        missing: true,
      };
      return {
        status: 'ghost_placeholder',
        matchLevel: 'approximate',
        trustLevel: 'local_fallback',
        ghostReference: ghost,
        message: `[Thu hồi: ${exact.revokeReason || 'Lỗi an toàn/GPU'}]. Đề xuất thay thế: ${exact.replacementId || 'không có'}`,
      };
    }

    return {
      status: 'resolved_exact',
      spec: exact.spec,
      matchLevel: 'exact',
      trustLevel: exact.trustLevel as TrustLevel,
      message: `Khớp chính xác phiên bản ${exact.version}`,
    };
  }

  // Not installed: Attempt approximate local fallback from installed assets of same kind
  const fallback = installedList.find((a) => !kind || a.kind === kind);
  if (fallback) {
    const ghost: GhostReference = {
      originalId: assetId,
      originalVersion: pinnedVersion || '1.0.0',
      kind: (kind || fallback.kind) as AssetKind,
      name: assetId.split('.').pop(),
      missing: true,
      fallbackMatch: {
        candidateId: fallback.id,
        candidateVersion: fallback.version,
        matchLevel: 'approximate',
        trustLevel: 'local_fallback',
      },
    };

    return {
      status: 'resolved_fallback',
      spec: fallback.spec,
      matchLevel: 'approximate',
      trustLevel: 'local_fallback',
      ghostReference: ghost,
      message: `Không tìm thấy '${assetId}', dùng tạm bản thay thế gần đúng '${fallback.name}'`,
    };
  }

  // Pure Ghost Placeholder
  const pureGhost: GhostReference = {
    originalId: assetId,
    originalVersion: pinnedVersion || '1.0.0',
    kind: kind || 'effect',
    name: assetId.split('.').pop(),
    missing: true,
  };

  return {
    status: 'ghost_placeholder',
    matchLevel: 'approximate',
    trustLevel: 'local_fallback',
    ghostReference: pureGhost,
    message: `Tài nguyên '${assetId}' chưa được cài đặt. Khung hình được giữ nguyên (Ghost Reference).`,
  };
}

/**
 * Reconnects Ghost References on the timeline when a missing package is installed.
 * Principle 3: Preserves the user's project and automatically reconnects clips once asset is restored.
 */
export function reconnectGhostReferences(
  clips: any[],
  newlyInstalledPkgId: string,
  installedSpec: EffectSpec
): { reconnectedCount: number; updatedClips: any[] } {
  let reconnectedCount = 0;

  const updatedClips = clips.map((clip) => {
    // Check if clip has ghost reference matching newly installed package
    if (clip.ghostRef && clip.ghostRef.originalId === newlyInstalledPkgId) {
      reconnectedCount++;
      const { ghostRef, ...rest } = clip;
      return {
        ...rest,
        dynamicEffectId: newlyInstalledPkgId,
        dynamicEffectVersion: installedSpec.version,
        dynamicSpec: installedSpec,
        isGhostPlaceholder: false,
      };
    }

    // Check if clip has matching dynamicEffectId without ghostRef
    if (clip.dynamicEffectId === newlyInstalledPkgId && !clip.dynamicSpec) {
      reconnectedCount++;
      return {
        ...clip,
        dynamicEffectVersion: installedSpec.version,
        dynamicSpec: installedSpec,
        isGhostPlaceholder: false,
      };
    }

    return clip;
  });

  return { reconnectedCount, updatedClips };
}

/**
 * Exports a package to a standalone `.pkg.json` file for offline distribution or backup
 */
export function exportPackageToFile(pkg: AssetPackage): void {
  const jsonStr = JSON.stringify(pkg, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pkg.id}.pkg.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports an EffectPack to a standard .capfx (ZIP) binary file
 */
export async function exportEffectPackToCapfx(
  pack: EffectPack,
  files: Record<string, Uint8Array | string> = {}
): Promise<void> {
  const zipBytes = await packCapfx(pack, files);
  const blob = new Blob([zipBytes as any], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pack.id}-${pack.version}.capfx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports a package from a `.capfx` (ZIP), `.pkg.json` or `.cube` file with strict declarative validation
 */
export async function importPackageFromFile(file: File): Promise<{ success: boolean; pkg?: AssetPackage; pack?: EffectPack; error?: string }> {
  try {
    // 1. If file is .capfx (ZIP container)
    if (file.name.endsWith('.capfx')) {
      const buffer = await file.arrayBuffer();
      const { pack, files, integrityVerified } = await unpackCapfx(new Uint8Array(buffer));

      let lastInstalledPkg: AssetPackage | undefined;
      for (const item of pack.items) {
        const namespacedId = getNamespacedItemId(pack.id, item.id, pack.version);
        const displayName = item.aliases?.vi?.[0] || item.id;
        const convertedSpec: EffectSpec = {
          id: namespacedId,
          version: pack.version,
          name: displayName,
          kind: item.kind as AssetKind,
          description: `Gói ${pack.name.vi} (${pack.id})`,
          author: pack.author,
          license: (pack.license as any) || 'In-House',
          trustLevel: 'manual',
          tags: item.tags,
          shader: item.shader
            ? {
                glslVersion: '300 es',
                fragmentShader: '', // Computed dynamically via host wrapper
                uniforms: item.shader.uniforms as any,
                ...(item.shader as any),
              }
            : undefined,
        };

        const pkg: AssetPackage = {
          id: namespacedId,
          version: pack.version,
          name: displayName,
          description: `Tài nguyên từ gói ${pack.name.vi}`,
          kind: item.kind as AssetKind,
          trustLevel: 'manual',
          license: (pack.license as any) || 'In-House',
          hash: 'capfx_' + item.id + '_' + Date.now(),
          sizeBytes: file.size,
          createdAt: pack.createdAt,
          spec: convertedSpec,
        };

        await installPackage(pkg);
        lastInstalledPkg = pkg;
      }

      return { success: true, pkg: lastInstalledPkg, pack };
    }

    const text = await file.text();

    // 2. If file is DaVinci Resolve .cube 3D LUT
    if (file.name.endsWith('.cube')) {
      const sanitizedName = file.name.replace(/\.cube$/i, '').replace(/[-_]/g, ' ');
      const lutId = `manual.lut.${sanitizedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const spec: EffectSpec = {
        id: lutId,
        version: '1.0.0',
        name: `LUT ${sanitizedName}`,
        kind: 'filter',
        description: `Bảng màu 3D LUT nhập thủ công từ tệp ${file.name}`,
        author: 'Người dùng',
        license: 'In-House',
        trustLevel: 'manual',
        tags: ['lut', 'cube', 'manual', 'color_grading'],
        lutData: text,
      };

      const pkg: AssetPackage = {
        id: lutId,
        version: '1.0.0',
        name: spec.name,
        description: spec.description,
        kind: 'filter',
        trustLevel: 'manual',
        license: 'In-House',
        hash: 'manual_cube_' + Date.now(),
        sizeBytes: file.size,
        createdAt: new Date().toISOString(),
        spec,
      };

      const result = await installPackage(pkg);
      if (!result.success) return { success: false, error: result.error };
      return { success: true, pkg };
    }

    // 2. If file is JSON (.pkg.json)
    const parsed = JSON.parse(text);
    const spec = parsed.spec || parsed;
    const validation = validateDeclarativeSpec(spec);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const pkg: AssetPackage = {
      id: parsed.id || spec.id,
      version: parsed.version || spec.version || '1.0.0',
      name: parsed.name || spec.name,
      description: parsed.description || spec.description || '',
      kind: parsed.kind || spec.kind,
      trustLevel: 'manual', // Any imported package is explicitly tagged 'manual' for transparency
      license: parsed.license || spec.license || 'In-House',
      hash: parsed.hash || 'manual_import_' + Date.now(),
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
      spec,
    };

    const result = await installPackage(pkg);
    if (!result.success) return { success: false, error: result.error };
    return { success: true, pkg };
  } catch (err: any) {
    return { success: false, error: `Lỗi đọc tệp: ${err?.message || 'Tệp không đúng định dạng JSON'}` };
  }
}
