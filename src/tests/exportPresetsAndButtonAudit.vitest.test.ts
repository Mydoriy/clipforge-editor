import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { STANDARD_EXPORT_PRESETS } from '../db/index';

describe('Standard H.264 & MP3 Database & Export Presets', () => {
  it('should define all 7 platform standard export presets', () => {
    expect(STANDARD_EXPORT_PRESETS).toBeDefined();
    expect(STANDARD_EXPORT_PRESETS.length).toBe(7);

    const presetIds = STANDARD_EXPORT_PRESETS.map((p) => p.id);
    expect(presetIds).toContain('preset-tiktok-916');
    expect(presetIds).toContain('preset-youtube-1080p');
    expect(presetIds).toContain('preset-youtube-4k');
    expect(presetIds).toContain('preset-instagram-11');
    expect(presetIds).toContain('preset-cinematic-219');
    expect(presetIds).toContain('preset-audio-mp3-studio');
    expect(presetIds).toContain('preset-audio-mp3-standard');
  });

  it('should have exact H.264 and MP3 configuration per mode', () => {
    const tiktok = STANDARD_EXPORT_PRESETS.find((p) => p.id === 'preset-tiktok-916');
    expect(tiktok).toBeDefined();
    expect(tiktok.aspect).toBe('9:16');
    expect(tiktok.resolution).toBe('1080p');
    expect(tiktok.width).toBe(1080);
    expect(tiktok.height).toBe(1920);
    expect(tiktok.fps).toBe(30);
    expect(tiktok.videoCodec).toBe('h264');
    expect(tiktok.h264Profile).toBe('high');
    expect(tiktok.h264Level).toBe('4.2');
    expect(tiktok.audioCodec).toBe('mp3');
    expect(tiktok.audioBitrate).toBe(192000);

    const ytFhd = STANDARD_EXPORT_PRESETS.find((p) => p.id === 'preset-youtube-1080p');
    expect(ytFhd.aspect).toBe('16:9');
    expect(ytFhd.resolution).toBe('1080p');
    expect(ytFhd.fps).toBe(60);
    expect(ytFhd.h264Profile).toBe('high');
    expect(ytFhd.h264Level).toBe('4.2');
    expect(ytFhd.audioBitrate).toBe(320000);

    const yt4k = STANDARD_EXPORT_PRESETS.find((p) => p.id === 'preset-youtube-4k');
    expect(yt4k.resolution).toBe('4k');
    expect(yt4k.width).toBe(3840);
    expect(yt4k.height).toBe(2160);
    expect(yt4k.fps).toBe(60);
    expect(yt4k.h264Profile).toBe('high');
    expect(yt4k.h264Level).toBe('5.1');

    const insta = STANDARD_EXPORT_PRESETS.find((p) => p.id === 'preset-instagram-11');
    expect(insta.aspect).toBe('1:1');
    expect(insta.width).toBe(1080);
    expect(insta.height).toBe(1080);
    expect(insta.h264Profile).toBe('main');
    expect(insta.h264Level).toBe('4.0');

    const mp3Studio = STANDARD_EXPORT_PRESETS.find((p) => p.id === 'preset-audio-mp3-studio');
    expect(mp3Studio.mode).toBe('audio_mp3');
    expect(mp3Studio.container).toBe('mp3');
    expect(mp3Studio.audioCodec).toBe('mp3');
    expect(mp3Studio.audioBitrate).toBe(320000);
    expect(mp3Studio.audioSampleRate).toBe(48000);

    const mp3Podcast = STANDARD_EXPORT_PRESETS.find((p) => p.id === 'preset-audio-mp3-standard');
    expect(mp3Podcast.audioBitrate).toBe(192000);
  });
});

describe('UI Button Audit', () => {
  it('should ensure all buttons across src/components have valid onClick or submit handlers', () => {
    const dir = path.resolve(process.cwd(), 'src/components');
    const missing = [];

    function scan(currentDir) {
      for (const item of fs.readdirSync(currentDir, { withFileTypes: true })) {
        const full = path.join(currentDir, item.name);
        if (item.isDirectory()) {
          scan(full);
        } else if (full.endsWith('.tsx')) {
          const code = fs.readFileSync(full, 'utf8');
          const regex = /<button\b([^>]*)>/g;
          let match;
          while ((match = regex.exec(code)) !== null) {
            const attrs = match[1];
            const hasOnClick = /onClick\s*=/.test(attrs);
            const isSubmit = /type\s*=\s*['"]submit['"]/.test(attrs);
            if (!hasOnClick && !isSubmit) {
              const line = code.slice(0, match.index).split('\n').length;
              missing.push(`${path.basename(full)}:${line}`);
            }
          }
        }
      }
    }

    scan(dir);
    expect(missing).toEqual([]);
  });
});
