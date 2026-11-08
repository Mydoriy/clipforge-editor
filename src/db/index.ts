import Dexie, { type EntityTable } from 'dexie';
import type { ProjectSettings, Timeline, MediaItem } from '../types/project.ts';

export * from '../types/project.ts';

export interface ProjectEntity {
  id: string;
  name?: string;
  title: string;
  width?: number;
  height?: number;
  fps?: number;
  duration: number; // in seconds
  thumbnail?: string; // base64 or blob URL
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
  settings?: ProjectSettings;
  timelines?: Timeline[];
  activeTimelineId?: string;
  media?: MediaItem[];
  tracksData?: any; // JSON serialized tracks state
}

export interface MediaEntity {
  id: string;
  projectId?: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  blob: Blob;
  duration?: number;
  size: number;
  createdAt: number;
  favorite?: boolean;
  folderId?: string;
  width?: number;
  height?: number;
}

export interface TrashEntity {
  id: string;
  projectId: string;
  title: string;
  deletedAt: number;
  projectData: ProjectEntity;
}

export interface SnapshotEntity {
  id: string;
  projectId: string;
  timestamp: number;
  label: string;
  duration: number;
  tracksData: any;
  settings?: any;
}

export interface OperationLogEntity {
  id: string;
  projectId: string;
  timestamp: number;
  action: string;
  snapshotData?: any;
}

export interface InstalledAssetEntity {
  id: string; // package ID (e.g. "com.clipforge.fx.rgb_shake")
  version: string;
  name: string;
  kind: string;
  trustLevel: string;
  license: string;
  spec: any;
  installedAt: number;
  updatedAt: number;
  sizeBytes: number;
  hash: string;
}

class ClipForgeDatabase extends Dexie {
  projects!: EntityTable<ProjectEntity, 'id'>;
  media!: EntityTable<MediaEntity, 'id'>;
  trash!: EntityTable<TrashEntity, 'id'>;
  snapshots!: EntityTable<SnapshotEntity, 'id'>;
  operationsLog!: EntityTable<OperationLogEntity, 'id'>;
  installedAssets!: EntityTable<InstalledAssetEntity, 'id'>;

  constructor() {
    super('ClipForgeDB');
    this.version(1).stores({
      projects: 'id, title, isDeleted, updatedAt, createdAt',
      media: 'id, projectId, type, createdAt',
      trash: 'id, projectId, deletedAt'
    });

    this.version(2)
      .stores({
        projects: 'id, title, isDeleted, updatedAt, createdAt',
        media: 'id, projectId, type, createdAt',
        trash: 'id, projectId, deletedAt',
        snapshots: 'id, projectId, timestamp',
        operationsLog: 'id, projectId, timestamp'
      })
      .upgrade((tx) => {
        return tx
          .table('projects')
          .toCollection()
          .modify((proj: any) => {
            if (!proj.updatedAt) proj.updatedAt = proj.createdAt || Date.now();
            if (proj.isDeleted === undefined) proj.isDeleted = false;
            if (!proj.tracksData) proj.tracksData = { clips: [] };
            if (!proj.duration) proj.duration = 15;
            if (!proj.width) proj.width = 1080;
            if (!proj.height) proj.height = 1920;
            if (!proj.fps) proj.fps = 30;
          });
      });

    this.version(3)
      .stores({
        projects: 'id, title, isDeleted, updatedAt, createdAt',
        media: 'id, projectId, type, createdAt',
        trash: 'id, projectId, deletedAt',
        snapshots: 'id, projectId, timestamp',
        operationsLog: 'id, projectId, timestamp',
        installedAssets: 'id, kind, trustLevel, name, version, updatedAt'
      });
  }
}

export const db = new ClipForgeDatabase();

// Auto clean trash items older than 30 days
export async function autoCleanTrash(): Promise<number> {
  try {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldItems = await db.trash.where('deletedAt').below(thirtyDaysAgo).toArray();
    if (oldItems.length > 0) {
      await db.trash.where('deletedAt').below(thirtyDaysAgo).delete();
    }
    return oldItems.length;
  } catch (e) {
    console.warn('Auto clean trash error:', e);
    return 0;
  }
}

// Request persistent storage from browser
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return true;
    } catch (e) {
      console.warn('Persistent storage error:', e);
    }
  }
  return false;
}

// Create a project snapshot for Version History
export async function createProjectSnapshot(
  projectId: string,
  label: string,
  tracksData: any,
  duration: number,
  settings?: any
): Promise<string> {
  const id = 'snap-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  await db.snapshots.add({
    id,
    projectId,
    timestamp: Date.now(),
    label,
    tracksData,
    duration,
    settings
  });

  // Keep maximum 20 latest snapshots per project to conserve storage
  try {
    const projectSnapshots = await db.snapshots.where('projectId').equals(projectId).sortBy('timestamp');
    if (projectSnapshots.length > 20) {
      const toDelete = projectSnapshots.slice(0, projectSnapshots.length - 20);
      for (const snap of toDelete) {
        await db.snapshots.delete(snap.id);
      }
    }
  } catch (e) {
    console.warn('Prune snapshots error:', e);
  }

  return id;
}

// Seed initial demo project if database is empty
export async function seedDemoProjects() {
  const count = await db.projects.count();
  if (count === 0) {
    const now = Date.now();
    await db.projects.bulkAdd([
      {
        id: 'demo-916-intro',
        name: '0917 - Viral TikTok Reel',
        title: '0917 - Viral TikTok Reel',
        width: 1080,
        height: 1920,
        fps: 30,
        duration: 15,
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
        createdAt: now - 86400000 * 2,
        updatedAt: now - 3600000,
        isDeleted: false,
        tracksData: {
          clips: [
            { id: 'c1', track: 'video', name: 'Background Motion', start: 0, duration: 15, type: 'video' },
            {
              id: 'c2',
              track: 'text',
              name: 'HOOK: Đừng lướt qua!',
              start: 0,
              duration: 4,
              type: 'text',
              text: 'ĐỪNG LƯỚT QUA! 🔥'
            },
            { id: 'c3', track: 'audio', name: 'Trending Beat BGM', start: 0, duration: 15, type: 'audio' }
          ]
        }
      },
      {
        id: 'demo-hook-lab',
        name: 'Hook Lab - E-Commerce Ad',
        title: 'Hook Lab - E-Commerce Ad',
        width: 1080,
        height: 1920,
        fps: 30,
        duration: 30,
        thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80',
        createdAt: now - 86400000 * 5,
        updatedAt: now - 86400000,
        isDeleted: false,
        tracksData: {
          clips: [{ id: 'c1', track: 'video', name: 'Product Reveal', start: 0, duration: 30, type: 'video' }]
        }
      }
    ]);
  }
}
