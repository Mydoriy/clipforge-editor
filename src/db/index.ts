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
  pinnedAssets?: Record<string, any>; // M4 Project Pinning: { packId, itemId, version, sha256 }
  embeddedSpecs?: Record<string, any>; // M4 Embedded Specs for offline portable packaging
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
  lastUsedAt?: number; // LRU eviction timestamp
  sizeBytes: number;
  hash: string;
  sha256?: string;
  signature?: string;
  isVerified?: boolean;
  isRevoked?: boolean;
  revokeReason?: string;
  replacementId?: string;
}

export interface ExportPresetEntity {
  id: string; // e.g. 'preset-tiktok-916'
  name: string; // 'TikTok / Reels / Shorts (9:16)'
  mode: 'tiktok_shorts' | 'youtube_landscape' | 'instagram_feed' | 'cinematic' | 'audio_mp3' | 'custom';
  aspect: '9:16' | '16:9' | '1:1' | '4:3' | '21:9';
  resolution: '720p' | '1080p' | '2k' | '4k';
  width: number;
  height: number;
  fps: 24 | 25 | 30 | 50 | 60;
  videoCodec: 'h264' | 'hevc' | 'av1';
  h264Profile: 'baseline' | 'main' | 'high';
  h264Level: string; // '4.0', '4.2', '5.1'
  videoBitrate: number; // in bps (e.g. 12_000_000)
  container: 'mp4' | 'webm' | 'mp3';
  audioCodec: 'mp3' | 'aac' | 'wav';
  audioBitrate: number; // in bps (e.g. 192_000, 320_000)
  audioSampleRate: number; // 44100 or 48000 Hz
  audioChannels: 2;
  isDefault?: boolean;
  description: string;
}

export const STANDARD_EXPORT_PRESETS: ExportPresetEntity[] = [
  {
    id: 'preset-tiktok-916',
    name: 'TikTok / Reels / Shorts (9:16)',
    mode: 'tiktok_shorts',
    aspect: '9:16',
    resolution: '1080p',
    width: 1080,
    height: 1920,
    fps: 30,
    videoCodec: 'h264',
    h264Profile: 'high',
    h264Level: '4.2',
    videoBitrate: 12000000,
    container: 'mp4',
    audioCodec: 'mp3',
    audioBitrate: 192000,
    audioSampleRate: 48000,
    audioChannels: 2,
    isDefault: true,
    description: 'Chuẩn tối ưu thuật toán TikTok/Reels: H.264 High Profile, 1080x1920 30fps, MP3/AAC 192kbps'
  },
  {
    id: 'preset-youtube-1080p',
    name: 'YouTube Standard (16:9 FHD)',
    mode: 'youtube_landscape',
    aspect: '16:9',
    resolution: '1080p',
    width: 1920,
    height: 1080,
    fps: 60,
    videoCodec: 'h264',
    h264Profile: 'high',
    h264Level: '4.2',
    videoBitrate: 12000000,
    container: 'mp4',
    audioCodec: 'mp3',
    audioBitrate: 320000,
    audioSampleRate: 48000,
    audioChannels: 2,
    isDefault: true,
    description: 'Chuẩn YouTube khuyến nghị: H.264 High Profile 1080p 60fps, âm thanh MP3/AAC 320kbps'
  },
  {
    id: 'preset-youtube-4k',
    name: 'YouTube Ultra HD (16:9 4K)',
    mode: 'youtube_landscape',
    aspect: '16:9',
    resolution: '4k',
    width: 3840,
    height: 2160,
    fps: 60,
    videoCodec: 'h264',
    h264Profile: 'high',
    h264Level: '5.1',
    videoBitrate: 40000000,
    container: 'mp4',
    audioCodec: 'mp3',
    audioBitrate: 320000,
    audioSampleRate: 48000,
    audioChannels: 2,
    isDefault: true,
    description: 'Chất lượng cao nhất: H.264 High Profile Level 5.1 4K 60fps, 40 Mbps, MP3/AAC 320kbps'
  },
  {
    id: 'preset-instagram-11',
    name: 'Instagram Feed Square (1:1)',
    mode: 'instagram_feed',
    aspect: '1:1',
    resolution: '1080p',
    width: 1080,
    height: 1080,
    fps: 30,
    videoCodec: 'h264',
    h264Profile: 'main',
    h264Level: '4.0',
    videoBitrate: 8000000,
    container: 'mp4',
    audioCodec: 'mp3',
    audioBitrate: 192000,
    audioSampleRate: 44100,
    audioChannels: 2,
    isDefault: true,
    description: 'Chuẩn bài đăng vuông Instagram Feed: H.264 Main Profile 1080x1080, MP3 192kbps'
  },
  {
    id: 'preset-cinematic-219',
    name: 'Cinematic Widescreen (21:9)',
    mode: 'cinematic',
    aspect: '21:9',
    resolution: '2k',
    width: 2560,
    height: 1080,
    fps: 24,
    videoCodec: 'h264',
    h264Profile: 'high',
    h264Level: '4.2',
    videoBitrate: 16000000,
    container: 'mp4',
    audioCodec: 'mp3',
    audioBitrate: 320000,
    audioSampleRate: 48000,
    audioChannels: 2,
    isDefault: true,
    description: 'Tỉ lệ điện ảnh Ultrawide 21:9 24fps: H.264 High Profile, âm thanh vòm Stereo 320kbps'
  },
  {
    id: 'preset-audio-mp3-studio',
    name: 'File MP3 Âm Thanh Studio (320 kbps)',
    mode: 'audio_mp3',
    aspect: '16:9',
    resolution: '1080p',
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: 'h264',
    h264Profile: 'main',
    h264Level: '4.0',
    videoBitrate: 0,
    container: 'mp3',
    audioCodec: 'mp3',
    audioBitrate: 320000,
    audioSampleRate: 48000,
    audioChannels: 2,
    isDefault: true,
    description: 'Xuất chỉ file âm thanh MP3 chất lượng phòng thu Studio Master (320 kbps CBR, 48kHz Stereo)'
  },
  {
    id: 'preset-audio-mp3-standard',
    name: 'File MP3 Âm Thanh Chuẩn (192 kbps)',
    mode: 'audio_mp3',
    aspect: '16:9',
    resolution: '1080p',
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: 'h264',
    h264Profile: 'main',
    h264Level: '4.0',
    videoBitrate: 0,
    container: 'mp3',
    audioCodec: 'mp3',
    audioBitrate: 192000,
    audioSampleRate: 44100,
    audioChannels: 2,
    isDefault: true,
    description: 'Xuất chỉ file âm thanh MP3 tiêu chuẩn Podcast / Voice (192 kbps CBR, 44.1kHz Stereo)'
  }
];

class ClipForgeDatabase extends Dexie {
  projects!: EntityTable<ProjectEntity, 'id'>;
  media!: EntityTable<MediaEntity, 'id'>;
  trash!: EntityTable<TrashEntity, 'id'>;
  snapshots!: EntityTable<SnapshotEntity, 'id'>;
  operationsLog!: EntityTable<OperationLogEntity, 'id'>;
  installedAssets!: EntityTable<InstalledAssetEntity, 'id'>;
  exportPresets!: EntityTable<ExportPresetEntity, 'id'>;

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

    this.version(4)
      .stores({
        projects: 'id, title, isDeleted, updatedAt, createdAt',
        media: 'id, projectId, type, createdAt',
        trash: 'id, projectId, deletedAt',
        snapshots: 'id, projectId, timestamp',
        operationsLog: 'id, projectId, timestamp',
        installedAssets: 'id, kind, trustLevel, name, version, updatedAt, lastUsedAt'
      });

    this.version(5)
      .stores({
        projects: 'id, title, isDeleted, updatedAt, createdAt',
        media: 'id, projectId, type, createdAt',
        trash: 'id, projectId, deletedAt',
        snapshots: 'id, projectId, timestamp',
        operationsLog: 'id, projectId, timestamp',
        installedAssets: 'id, kind, trustLevel, name, version, updatedAt, lastUsedAt',
        exportPresets: 'id, mode, aspect, resolution, container, videoCodec, isDefault'
      })
      .upgrade(async (tx) => {
        try {
          const presetsTable = tx.table('exportPresets');
          for (const p of STANDARD_EXPORT_PRESETS) {
            await presetsTable.put(p);
          }
        } catch (e) {
          console.warn('Dexie v5 presets upgrade warning:', e);
        }
      });
  }
}

export const db = new ClipForgeDatabase();

// Ensure standard H.264 Video and MP3 Audio presets exist in IndexedDB
export async function ensureStandardExportPresets(): Promise<ExportPresetEntity[]> {
  try {
    const count = await db.exportPresets.count();
    if (count === 0) {
      await db.exportPresets.bulkPut(STANDARD_EXPORT_PRESETS);
    }
    return await db.exportPresets.toArray();
  } catch (err) {
    console.warn('ensureStandardExportPresets fallback to static:', err);
    return STANDARD_EXPORT_PRESETS;
  }
}

// Get export preset by mode or id
export async function getExportPresetByMode(mode: string): Promise<ExportPresetEntity | undefined> {
  try {
    const preset = await db.exportPresets.where('mode').equals(mode).first();
    if (preset) return preset;
  } catch (e) {
    console.warn('getExportPresetByMode error:', e);
  }
  return STANDARD_EXPORT_PRESETS.find((p) => p.mode === mode || p.id === mode);
}

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
