import Dexie, { type EntityTable } from 'dexie';

export interface ProjectEntity {
  id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  duration: number; // in seconds
  thumbnail?: string; // base64 or blob URL
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
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
}

export interface TrashEntity {
  id: string;
  projectId: string;
  title: string;
  deletedAt: number;
  projectData: ProjectEntity;
}

class ClipForgeDatabase extends Dexie {
  projects!: EntityTable<ProjectEntity, 'id'>;
  media!: EntityTable<MediaEntity, 'id'>;
  trash!: EntityTable<TrashEntity, 'id'>;

  constructor() {
    super('ClipForgeDB');
    this.version(1).stores({
      projects: 'id, title, isDeleted, updatedAt, createdAt',
      media: 'id, projectId, type, createdAt',
      trash: 'id, projectId, deletedAt'
    });
  }
}

export const db = new ClipForgeDatabase();

// Seed initial demo project if database is empty
export async function seedDemoProjects() {
  const count = await db.projects.count();
  if (count === 0) {
    const now = Date.now();
    await db.projects.bulkAdd([
      {
        id: 'demo-916-intro',
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
            { id: 'c2', track: 'text', name: 'HOOK: Đừng lướt qua!', start: 0, duration: 4, type: 'text', text: 'ĐỪNG LƯỚT QUA! 🔥' },
            { id: 'c3', track: 'audio', name: 'Trending Beat BGM', start: 0, duration: 15, type: 'audio' }
          ]
        }
      },
      {
        id: 'demo-hook-lab',
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
          clips: [
            { id: 'c1', track: 'video', name: 'Product Reveal', start: 0, duration: 30, type: 'video' }
          ]
        }
      }
    ]);
  }
}
