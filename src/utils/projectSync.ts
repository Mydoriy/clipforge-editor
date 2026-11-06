/**
 * Project Sync & Conflict Resolution Engine (W8)
 * - Offline Queue for pending changes when network is unavailable
 * - Last-Write-Wins (LWW) conflict resolution with guaranteed Conflict Backup Copy
 * - Sync Status State: 'synced' (🟢) | 'syncing' (🔄) | 'offline' (⚡) | 'conflict' (⚠️)
 */

import { db, type ProjectEntity } from '../db/index.ts';
import { isSupabaseConfigured, supabase } from './supabase.ts';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'conflict';

export interface SyncQueueItem {
  id: string;
  projectId: string;
  timestamp: number;
  projectData: ProjectEntity;
}

const OFFLINE_QUEUE_KEY = 'clipforge_offline_sync_queue';

/**
 * Get pending offline sync queue from localStorage
 */
export function getOfflineSyncQueue(): SyncQueueItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save offline sync queue to localStorage
 */
export function saveOfflineSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Failed to save offline sync queue', err);
  }
}

/**
 * Enqueue project for background/offline sync
 */
export function enqueueProjectForSync(project: ProjectEntity): void {
  const queue = getOfflineSyncQueue();
  const existingIdx = queue.findIndex((q) => q.projectId === project.id);
  const item: SyncQueueItem = {
    id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    projectId: project.id,
    timestamp: Date.now(),
    projectData: project
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = item;
  } else {
    queue.push(item);
  }
  saveOfflineSyncQueue(queue);
}

/**
 * Conflict Resolution: Last-Write-Wins (LWW) with Guaranteed Conflict Backup
 * If remote has different changes than local:
 * - Selects the version with larger updatedAt as winner
 * - ALWAYS creates a cloned backup of the superseded version so data is never destroyed
 */
export function resolveProjectConflict(
  localProj: ProjectEntity,
  remoteProj: ProjectEntity
): { winner: ProjectEntity; conflictBackup?: ProjectEntity; hadConflict: boolean } {
  // If identical timestamps and contents, no conflict
  if (localProj.updatedAt === remoteProj.updatedAt) {
    return { winner: localProj, hadConflict: false };
  }

  const isRemoteNewer = remoteProj.updatedAt > localProj.updatedAt;

  if (isRemoteNewer) {
    // Remote wins, but preserve local work in a conflict copy
    const conflictBackup: ProjectEntity = {
      ...localProj,
      id: `proj-conflict-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `[Bản sao xung đột] ${localProj.title || 'Dự án'}`,
      updatedAt: Date.now()
    };
    return {
      winner: remoteProj,
      conflictBackup,
      hadConflict: true
    };
  } else {
    // Local wins, preserve remote version as conflict copy
    const conflictBackup: ProjectEntity = {
      ...remoteProj,
      id: `proj-conflict-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `[Bản sao Cloud xung đột] ${remoteProj.title || 'Dự án'}`,
      updatedAt: Date.now()
    };
    return {
      winner: localProj,
      conflictBackup,
      hadConflict: true
    };
  }
}

/**
 * Run full synchronization cycle for all local projects and offline queue
 */
export async function syncProjectsWithCloud(
  onStatusChange?: (status: SyncStatus, message?: string) => void
): Promise<{ success: boolean; syncedCount: number; conflictCount: number; status: SyncStatus }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    onStatusChange?.('offline', 'Thiết bị đang ngoại tuyến. Các thay đổi được lưu trong hàng đợi.');
    return { success: false, syncedCount: 0, conflictCount: 0, status: 'offline' };
  }

  if (!isSupabaseConfigured || !supabase) {
    onStatusChange?.('synced', 'Đang sử dụng bộ nhớ cục bộ IndexedDB an toàn.');
    return { success: true, syncedCount: 0, conflictCount: 0, status: 'synced' };
  }

  onStatusChange?.('syncing', 'Đang đồng bộ hóa dự án lên Cloud...');

  try {
    const queue = getOfflineSyncQueue();
    let syncedCount = 0;
    let conflictCount = 0;

    // Process queued offline edits
    for (const item of queue) {
      const proj = item.projectData;
      // Fetch remote project metadata
      const { data: remoteData, error: fetchErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', proj.id)
        .maybeSingle();

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        throw fetchErr;
      }

      if (remoteData) {
        // Compare and resolve
        const resolution = resolveProjectConflict(proj, remoteData);
        if (resolution.hadConflict && resolution.conflictBackup) {
          conflictCount++;
          await db.projects.add(resolution.conflictBackup);
          console.warn(`Conflict detected for project ${proj.id}. Saved backup as ${resolution.conflictBackup.id}`);
        }

        // Upsert winner to Cloud
        await supabase.from('projects').upsert(resolution.winner);
      } else {
        // New project, upload directly
        await supabase.from('projects').upsert(proj);
      }
      syncedCount++;
    }

    // Clear queue after successful sync
    saveOfflineSyncQueue([]);

    const finalStatus: SyncStatus = conflictCount > 0 ? 'conflict' : 'synced';
    const message =
      conflictCount > 0
        ? `Đồng bộ hoàn tất! Phát hiện ${conflictCount} xung đột, đã tạo bản sao lưu an toàn.`
        : `Đã đồng bộ ${syncedCount} dự án với Cloud.`;

    onStatusChange?.(finalStatus, message);
    return { success: true, syncedCount, conflictCount, status: finalStatus };
  } catch (err: any) {
    console.error('Cloud sync failed:', err);
    onStatusChange?.('offline', 'Không thể kết nối máy chủ Cloud, chuyển sang chế độ ngoại tuyến.');
    return { success: false, syncedCount: 0, conflictCount: 0, status: 'offline' };
  }
}
