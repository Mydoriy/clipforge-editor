import { db, type ProjectEntity, type MediaEntity, type TrashEntity, seedDemoProjects } from '../db';

export { db, seedDemoProjects };
export type { ProjectEntity, MediaEntity, TrashEntity };

export interface StorageEstimateResult {
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
  isNearQuota: boolean;
}

// Check client IndexedDB storage quota safely
export async function checkStorageQuota(): Promise<StorageEstimateResult> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 1024 * 1024 * 1024; // fallback 1GB
      const usageMB = Math.round(usage / (1024 * 1024));
      const quotaMB = Math.round(quota / (1024 * 1024));
      const percentUsed = Math.min(100, Math.round((usage / quota) * 100));

      return {
        usageMB,
        quotaMB,
        percentUsed,
        isNearQuota: percentUsed >= 90
      };
    } catch (e) {
      console.warn('Storage estimate error', e);
    }
  }

  return {
    usageMB: 0,
    quotaMB: 1024,
    percentUsed: 0,
    isNearQuota: false
  };
}

// Safe media addition with QuotaExceededError protection
export async function safeAddMedia(media: MediaEntity): Promise<{ success: boolean; error?: string }> {
  try {
    const quota = await checkStorageQuota();
    if (quota.isNearQuota) {
      return {
        success: false,
        error: 'QUOTA_EXCEEDED'
      };
    }

    await db.media.add(media);
    return { success: true };
  } catch (err: any) {
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      return {
        success: false,
        error: 'QUOTA_EXCEEDED'
      };
    }
    return {
      success: false,
      error: err.message || 'DATABASE_ERROR'
    };
  }
}

