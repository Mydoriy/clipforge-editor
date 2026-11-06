import {
  db,
  type ProjectEntity,
  type MediaEntity,
  type TrashEntity,
  type SnapshotEntity,
  type OperationLogEntity,
  seedDemoProjects,
  autoCleanTrash,
  requestPersistentStorage,
  createProjectSnapshot
} from '../db';
import { trackEvent } from '../utils/telemetry';

export {
  db,
  seedDemoProjects,
  autoCleanTrash,
  requestPersistentStorage,
  createProjectSnapshot
};
export type { ProjectEntity, MediaEntity, TrashEntity, SnapshotEntity, OperationLogEntity };

export interface StorageEstimateResult {
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
  isNearQuota: boolean;
}

// Check client IndexedDB storage quota safely (warn if > 80%)
export async function checkStorageQuota(): Promise<StorageEstimateResult> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
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
        isNearQuota: percentUsed >= 80
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
    trackEvent('media_imported', {
      media_type: media.type,
      mime_type: media.blob?.type || media.type,
      size_bytes_approx: media.size || 0
    });
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

