import { db } from '../db/index.ts';
import { isSupabaseConfigured, supabase } from './supabase.ts';

export interface WipeLocalDataResult {
  success: boolean;
  dexieCleared: boolean;
  opfsCleared: boolean;
  storageCleared: boolean;
  cachesCleared: boolean;
  error?: string;
}

export interface DeleteCloudDataResult {
  success: boolean;
  projectsDeleted: number;
  signedOut: boolean;
  error?: string;
}

/**
 * 1-Click Complete Local Data Wipe (Factory Reset)
 * Clears Dexie tables, OPFS directories, localStorage, sessionStorage, and SW caches.
 */
export async function wipeAllLocalData(): Promise<WipeLocalDataResult> {
  let dexieCleared = false;
  let opfsCleared = false;
  let storageCleared = false;
  let cachesCleared = false;

  // 1. Clear IndexedDB (Dexie)
  try {
    if (db) {
      await Promise.all([
        db.projects.clear(),
        db.media.clear(),
        db.trash.clear(),
        db.snapshots.clear(),
        db.operationsLog.clear()
      ]);
      dexieCleared = true;
    }
  } catch (err) {
    console.warn('Failed to clear Dexie tables:', err);
  }

  // 2. Clear OPFS (Origin Private File System) if available
  try {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && (navigator.storage as any).getDirectory) {
      const root = await (navigator.storage as any).getDirectory();
      if (root && typeof root.entries === 'function') {
        // @ts-ignore
        for await (const [name] of root.entries()) {
          await root.removeEntry(name, { recursive: true });
        }
      }
      opfsCleared = true;
    } else {
      opfsCleared = true; // Not supported on current browser
    }
  } catch (err) {
    console.warn('Failed to clear OPFS:', err);
  }

  // 3. Clear localStorage and sessionStorage
  try {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    storageCleared = true;
  } catch (err) {
    console.warn('Failed to clear Web Storage:', err);
  }

  // 4. Clear CacheStorage (Service Worker caches)
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      cachesCleared = true;
    } else {
      cachesCleared = true;
    }
  } catch (err) {
    console.warn('Failed to clear CacheStorage:', err);
  }

  return {
    success: dexieCleared || storageCleared,
    dexieCleared,
    opfsCleared,
    storageCleared,
    cachesCleared
  };
}

/**
 * Real Cloud Data Wipe for Supabase
 * Deletes user's cloud projects, cloud media assets, and signs out.
 */
export async function deleteCloudAccountAndData(userId?: string): Promise<DeleteCloudDataResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      projectsDeleted: 0,
      signedOut: false,
      error: 'Supabase chưa được cấu hình hoặc đang chạy chế độ Local-First.'
    };
  }

  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data } = await supabase.auth.getUser();
      targetUserId = data?.user?.id;
    }

    let projectsDeleted = 0;
    if (targetUserId) {
      // 1. Delete user projects from Supabase DB
      const { data: delProjects, error: dbErr } = await supabase
        .from('projects')
        .delete()
        .eq('user_id', targetUserId)
        .select();

      if (!dbErr && delProjects) {
        projectsDeleted = delProjects.length;
      }

      // 2. Delete user files from Supabase Storage
      try {
        const { data: files } = await supabase.storage.from('media').list(targetUserId);
        if (files && files.length > 0) {
          const filePaths = files.map((f: any) => `${targetUserId}/${f.name}`);
          await supabase.storage.from('media').remove(filePaths);
        }
      } catch (storageErr) {
        console.warn('Storage files cleanup warning:', storageErr);
      }
    }

    // 3. Sign out
    await supabase.auth.signOut();

    return {
      success: true,
      projectsDeleted,
      signedOut: true
    };
  } catch (err: any) {
    console.error('Delete cloud data failed:', err);
    return {
      success: false,
      projectsDeleted: 0,
      signedOut: false,
      error: err.message || 'Lỗi khi xóa dữ liệu trên Supabase.'
    };
  }
}
