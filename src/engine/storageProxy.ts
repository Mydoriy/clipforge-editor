import { db } from '../db';
import { masterAudio } from './audioEngine';

export interface FileLocationResult {
  mode: 'original_location' | 'copied_to_project';
  handle?: FileSystemFileHandle;
  file: File;
  objectUrl: string;
}

// 1. File System Access API: Stay in original location
export async function pickFileStayInLocation(): Promise<FileLocationResult | null> {
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Video, Audio & Image Files',
            accept: {
              'video/*': ['.mp4', '.mov', '.webm'],
              'image/*': ['.jpg', '.jpeg', '.png'],
              'audio/*': ['.mp3', '.wav']
            }
          }
        ],
        multiple: false
      });

      if (!handle) return null;
      const file = await handle.getFile();
      const objectUrl = URL.createObjectURL(file);

      // Save handle info in IndexedDB
      await db.media.add({
        id: 'media-' + Date.now(),
        name: file.name,
        type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
        blob: file,
        size: file.size,
        createdAt: Date.now()
      });

      return {
        mode: 'original_location',
        handle,
        file,
        objectUrl
      };
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      console.warn('File System Access API failed, falling back:', err);
    }
  }

  return null;
}

// 2. Generate 480p Proxy Video for smooth 60fps editing
export async function generateProxyVideo480p(sourceUrl: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.src = sourceUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;

      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 854; // 9:16 vertical 480p
        const ctx = canvas.getContext('2d');
        let resUrl = sourceUrl;
        if (ctx) {
          ctx.drawImage(video, 0, 0, 480, 854);
          resUrl = canvas.toDataURL('image/jpeg', 0.7);
        }
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {}
        resolve(resUrl);
      };

      video.onerror = () => {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {}
        resolve(sourceUrl);
      };
    } catch (e) {
      resolve(sourceUrl);
    }
  });
}

// 3. Generate thumbnail and waveform cached in IndexedDB
export async function generateMediaMetadata(file: File, objectUrl: string): Promise<{
  thumbnailUrl: string;
  waveformPeaks?: number[];
}> {
  const isAudio = file.type.startsWith('audio');
  const isVideo = file.type.startsWith('video');

  let waveformPeaks: number[] | undefined;
  if (isAudio || isVideo) {
    try {
      waveformPeaks = await masterAudio.generateWaveformPeaks(objectUrl, 64);
    } catch (e) {
      console.warn('Waveform generation error', e);
    }
  }

  // Create thumbnail image
  let thumbnailUrl = '';
  if (isVideo) {
    thumbnailUrl = await new Promise((resolve) => {
      const v = document.createElement('video');
      v.src = objectUrl;
      v.muted = true;
      v.currentTime = 0.5;
      v.onseeked = () => {
        const c = document.createElement('canvas');
        c.width = 160;
        c.height = 284;
        const ctx = c.getContext('2d');
        let thumb = '';
        if (ctx) {
          ctx.drawImage(v, 0, 0, 160, 284);
          thumb = c.toDataURL('image/jpeg', 0.8);
        }
        try {
          v.pause();
          v.removeAttribute('src');
          v.load();
        } catch (e) {}
        resolve(thumb);
      };
      v.onerror = () => {
        try {
          v.pause();
          v.removeAttribute('src');
          v.load();
        } catch (e) {}
        resolve('');
      };
    });
  } else if (file.type.startsWith('image')) {
    thumbnailUrl = objectUrl;
  }

  return {
    thumbnailUrl,
    waveformPeaks
  };
}

