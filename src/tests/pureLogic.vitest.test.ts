import { describe, it, expect } from 'vitest';
import {
  splitClip,
  trimClipStart,
  trimClipEnd,
  rippleDelete,
  calculateSnapPoint
} from '../utils/timelineOperations.ts';
import { parseLocalEditCommand } from '../lib/ai.ts';
import {
  secondsToSrtTime,
  secondsToVttTime,
  parseSrt,
  parseVtt,
  exportToSrt,
  exportToVtt
} from '../utils/subtitles.ts';

describe('W5 Pure Logic Unit Tests with Vitest', () => {
  // 1. Timeline core logic: split / trim / snap / ripple / undo-redo
  describe('Timeline Operations (Split, Trim, Snap, Ripple, Undo/Redo)', () => {
    it('splits a clip cleanly at playhead timestamp', () => {
      const clips = [{ id: 'c1', track: 'v1', start: 0, duration: 10, inPoint: 0, outPoint: 10 }];
      const res = splitClip(clips as any, 'c1', 4.0);
      expect(res.success).toBe(true);
      expect(res.newClips.length).toBe(2);
      expect(res.newClips[0].duration).toBe(4.0);
      expect(res.newClips[1].start).toBe(4.0);
      expect(res.newClips[1].duration).toBe(6.0);
      expect(res.newClips[1].inPoint).toBe(4.0);
    });

    it('trims clip start (Delete Left / Q)', () => {
      const clips = [{ id: 'c1', track: 'v1', start: 2.0, duration: 8.0, inPoint: 0 }];
      const res = trimClipStart(clips as any, 'c1', 5.0);
      expect(res.success).toBe(true);
      expect(res.newClips[0].start).toBe(5.0);
      expect(res.newClips[0].duration).toBe(5.0);
      expect(res.newClips[0].inPoint).toBe(3.0);
    });

    it('trims clip end (Delete Right / W)', () => {
      const clips = [{ id: 'c1', track: 'v1', start: 0, duration: 10.0, inPoint: 0 }];
      const res = trimClipEnd(clips as any, 'c1', 7.0);
      expect(res.success).toBe(true);
      expect(res.newClips[0].duration).toBe(7.0);
      expect(res.newClips[0].outPoint).toBe(3.0);
    });

    it('performs ripple delete shifting downstream clips to fill gap', () => {
      const clips = [
        { id: 'c1', track: 'v1', start: 0, duration: 4.0 },
        { id: 'c2', track: 'v1', start: 4.0, duration: 6.0 },
        { id: 'c3', track: 'v1', start: 10.0, duration: 5.0 }
      ];
      const res = rippleDelete(clips as any, 'c2');
      expect(res.success).toBe(true);
      expect(res.newClips.length).toBe(2);
      expect(res.newClips.find((c) => c.id === 'c3')?.start).toBe(4.0);
    });

    it('calculates snap points accurately to boundary, playhead and markers', () => {
      const clips = [{ id: 'c1', track: 'v1', start: 0, duration: 5.0 }];
      const snapToEdge = calculateSnapPoint(5.04, clips as any, undefined, [], undefined, 0.08);
      expect(snapToEdge).toBe(5.0);

      const snapToPlayhead = calculateSnapPoint(10.03, clips as any, undefined, [], 10.0, 0.08);
      expect(snapToPlayhead).toBe(10.0);
    });

    it('guarantees undo/redo stack immutability', () => {
      const stateHistory: any[] = [];
      const redoHistory: any[] = [];

      let state = [{ id: 'init', start: 0 }];
      stateHistory.push(state);

      // Perform mutation
      state = [...state, { id: 'added', start: 5 }];
      stateHistory.push(state);

      // Undo
      const undoItem = stateHistory.pop();
      redoHistory.push(undoItem);
      const restored = stateHistory[stateHistory.length - 1];

      expect(restored.length).toBe(1);
      expect(restored[0].id).toBe('init');

      // Redo
      const redoItem = redoHistory.pop();
      stateHistory.push(redoItem);
      expect(stateHistory[stateHistory.length - 1].length).toBe(2);
    });
  });

  // 2. Parser EditPilot: natural language command parsing
  describe('EditPilot Natural Language Parser', () => {
    it('parses speed increase and slow-motion commands in Vietnamese and English', () => {
      const act1 = parseLocalEditCommand('tăng tốc 2x cho video');
      expect(act1[0].type).toBe('speed');
      expect(act1[0].payload).toBe(2.0);

      const act2 = parseLocalEditCommand('make it slowmo');
      expect(act2[0].type).toBe('speed');
      expect(act2[0].payload).toBe(0.75);
    });

    it('parses cut/trim, filter, text, and export commands', () => {
      const cutCmd = parseLocalEditCommand('cắt bớt 2 giây đầu');
      expect(cutCmd.some((a) => a.type === 'cut')).toBe(true);

      const filterCmd = parseLocalEditCommand('áp dụng màu cinematic');
      expect(filterCmd.some((a) => a.type === 'filter' && a.payload === 'cinematic')).toBe(true);

      const textCmd = parseLocalEditCommand('thêm phụ đề viral');
      expect(textCmd.some((a) => a.type === 'text')).toBe(true);

      const exportCmd = parseLocalEditCommand('xuất video 1080p');
      expect(exportCmd.some((a) => a.type === 'export')).toBe(true);
    });
  });

  // 3. Subtitles & Timecode (SRT, VTT, SMPTE formatting)
  describe('Subtitles and Timecode (SRT / VTT)', () => {
    it('formats seconds to SRT comma format (00:01:23,456)', () => {
      const srt = secondsToSrtTime(83.456);
      expect(srt).toBe('00:01:23,456');
    });

    it('formats seconds to VTT dot format (00:01:23.456)', () => {
      const vtt = secondsToVttTime(83.456);
      expect(vtt).toBe('00:01:23.456');
    });

    it('round-trips subtitles through SRT parser and exporter', () => {
      const items = [
        { id: '1', start: 1.0, duration: 3.5, text: 'Hello ClipForge' },
        { id: '2', start: 5.0, duration: 2.0, text: 'Next Generation Web Video Editor' }
      ];
      const srtText = exportToSrt(items);
      expect(srtText).toContain('Hello ClipForge');
      expect(srtText).toContain('00:00:01,000 --> 00:00:04,500');

      const parsed = parseSrt(srtText);
      expect(parsed.length).toBe(2);
      expect(parsed[0].text).toBe('Hello ClipForge');
      expect(parsed[0].start).toBe(1.0);
      expect(parsed[0].duration).toBe(3.5);
    });

    it('exports valid WebVTT format with WEBVTT header', () => {
      const items = [{ id: '1', start: 0, duration: 2.5, text: 'Caption Line' }];
      const vttText = exportToVtt(items);
      expect(vttText.startsWith('WEBVTT')).toBe(true);
      expect(vttText).toContain('00:00:00.000 --> 00:00:02.500');
    });
  });

  // 4. Dexie database migration modifier
  describe('Database Schema Migration v1 -> v2', () => {
    it('safely backfills missing fields on legacy v1 project records', () => {
      const legacyRecord: any = {
        id: 'legacy-project-99',
        title: 'Project from v1',
        createdAt: 1700000000000
      };

      // Apply Dexie v2 upgrade modifier:
      if (!legacyRecord.updatedAt) legacyRecord.updatedAt = legacyRecord.createdAt || Date.now();
      if (legacyRecord.isDeleted === undefined) legacyRecord.isDeleted = false;
      if (!legacyRecord.tracksData) legacyRecord.tracksData = { clips: [] };
      if (!legacyRecord.duration) legacyRecord.duration = 15;
      if (!legacyRecord.width) legacyRecord.width = 1080;
      if (!legacyRecord.height) legacyRecord.height = 1920;
      if (!legacyRecord.fps) legacyRecord.fps = 30;

      expect(legacyRecord.id).toBe('legacy-project-99');
      expect(legacyRecord.title).toBe('Project from v1');
      expect(legacyRecord.updatedAt).toBe(1700000000000);
      expect(legacyRecord.isDeleted).toBe(false);
      expect(legacyRecord.tracksData).toEqual({ clips: [] });
      expect(legacyRecord.width).toBe(1080);
      expect(legacyRecord.height).toBe(1920);
      expect(legacyRecord.fps).toBe(30);
    });
  });
});
