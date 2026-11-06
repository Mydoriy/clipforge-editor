import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  computeRgbHistogram,
  compareHistograms,
  computeAudioRms,
  calculate916Crop,
  rankViralShorts
} from '../engine/sceneDetector.ts';

import { createPdfBlobFromJpeg } from '../utils/pdfExport.ts';
import { resolveProjectConflict } from '../utils/projectSync.ts';

test('W8: Scene Detection - 3-Channel RGB Histogram and Frame Difference', () => {
  // 1. Uniform black frame (10x10 = 100 pixels, 400 bytes RGBA)
  const blackPixels = new Uint8ClampedArray(400);
  for (let i = 0; i < 400; i += 4) {
    blackPixels[i] = 0; // R
    blackPixels[i + 1] = 0; // G
    blackPixels[i + 2] = 0; // B
    blackPixels[i + 3] = 255;
  }
  const histBlack = computeRgbHistogram(blackPixels, 16);
  assert.strictEqual(histBlack.length, 48, '16 bins * 3 channels = 48 bins');

  // 2. Uniform bright white frame
  const whitePixels = new Uint8ClampedArray(400);
  for (let i = 0; i < 400; i += 4) {
    whitePixels[i] = 255;
    whitePixels[i + 1] = 255;
    whitePixels[i + 2] = 255;
    whitePixels[i + 3] = 255;
  }
  const histWhite = computeRgbHistogram(whitePixels, 16);

  // 3. Difference between identical frames must be 0
  const diffSelf = compareHistograms(histBlack, histBlack);
  assert.strictEqual(diffSelf, 0, 'Self histogram difference must be exactly 0');

  // 4. Difference between black and white frames must be maximum (1.0)
  const diffBlackWhite = compareHistograms(histBlack, histWhite);
  assert.ok(diffBlackWhite >= 0.95, `Black to white frame diff should be ~1.0, got ${diffBlackWhite}`);
});

test('W8: Audio RMS Energy & Peak Detection', () => {
  // Silent audio
  const silence = new Float32Array(1000).fill(0);
  const rmsSilence = computeAudioRms(silence);
  assert.strictEqual(rmsSilence, 0, 'Silence RMS must be 0');

  // Energetic speech / tone signal
  const activeAudio = new Float32Array(1000);
  for (let i = 0; i < 1000; i++) {
    activeAudio[i] = Math.sin(i * 0.1) * 0.8;
  }
  const rmsActive = computeAudioRms(activeAudio);
  assert.ok(rmsActive > 0.5, `Active audio energy should be > 0.5, got ${rmsActive}`);
});

test('W8: Auto-crop 9:16 Math with Adjustable Focal Box Offset', () => {
  const landscapeWidth = 1920;
  const landscapeHeight = 1080;

  // Center crop (offset = 0%)
  const centerCrop = calculate916Crop(landscapeWidth, landscapeHeight, 0);
  assert.strictEqual(centerCrop.sHeight, 1080);
  assert.strictEqual(centerCrop.sWidth, Math.round((1080 * 9) / 16)); // ~608px
  const expectedCenterX = Math.round((1920 - centerCrop.sWidth) / 2);
  assert.strictEqual(centerCrop.sx, expectedCenterX, 'Center crop X position should be centered');

  // Left crop (offset = -50%)
  const leftCrop = calculate916Crop(landscapeWidth, landscapeHeight, -50);
  assert.ok(leftCrop.sx < centerCrop.sx, 'Negative offset shifts window left');
  assert.ok(leftCrop.sx >= 0, 'Left crop must not clip below 0');

  // Right crop (offset = +50%)
  const rightCrop = calculate916Crop(landscapeWidth, landscapeHeight, 50);
  assert.ok(rightCrop.sx > centerCrop.sx, 'Positive offset shifts window right');
  assert.ok(rightCrop.sx + rightCrop.sWidth <= landscapeWidth, 'Right crop must stay inside video bounds');
});

test('W8: Viral Shorts Candidate Generation & Ranking', () => {
  const candidates = rankViralShorts(
    180,
    30,
    [
      { timestamp: 10, diff: 0.8 },
      { timestamp: 60, diff: 0.4 },
      { timestamp: 120, diff: 0.7 }
    ],
    [
      { timestamp: 15, energy: 0.95 },
      { timestamp: 70, energy: 0.5 },
      { timestamp: 125, energy: 0.85 }
    ]
  );

  assert.ok(candidates.length > 0, 'Should generate ranked short candidates');
  assert.ok(candidates[0].viralScore >= 80, 'Top candidate should have high viral score');
  assert.ok(candidates[0].duration <= 30, 'Short duration should match preset');
  assert.ok(typeof candidates[0].tag === 'string' && candidates[0].tag.length > 0);
});

test('W8: Design Studio - Pure Standard PDF 1.4 Generation', async () => {
  // Generate dummy JPEG payload bytes
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);
  const pdfBlob = createPdfBlobFromJpeg(fakeJpeg, 540, 960);

  assert.strictEqual(pdfBlob.type, 'application/pdf');
  const buffer = await pdfBlob.arrayBuffer();
  const pdfText = new TextDecoder().decode(buffer);

  assert.ok(pdfText.startsWith('%PDF-1.4'), 'PDF must start with %PDF-1.4 header');
  assert.ok(pdfText.includes('/Type /Catalog'), 'PDF must contain Catalog object');
  assert.ok(pdfText.includes('/Type /Pages'), 'PDF must contain Pages object');
  assert.ok(pdfText.includes('/Type /Page'), 'PDF must contain Page object');
  assert.ok(pdfText.includes('/Filter /DCTDecode'), 'PDF must contain image XObject with DCTDecode filter');
  assert.ok(pdfText.includes('xref'), 'PDF must contain xref table');
  assert.ok(pdfText.includes('%%EOF'), 'PDF must end with %%EOF marker');
});

test('W8: Project Sync - Last-Write-Wins Conflict Resolution with Safety Copy', () => {
  const localProject = {
    id: 'proj-123',
    title: 'Dự án Local Đang Sửa',
    updatedAt: 1000,
    duration: 15,
    createdAt: 500,
    isDeleted: false
  };

  const remoteNewerProject = {
    id: 'proj-123',
    title: 'Dự án Cloud Mới Hơn',
    updatedAt: 2000,
    duration: 30,
    createdAt: 500,
    isDeleted: false
  };

  // 1. Conflict where remote is newer
  const result1 = resolveProjectConflict(localProject, remoteNewerProject);
  assert.strictEqual(result1.hadConflict, true);
  assert.strictEqual(result1.winner.title, 'Dự án Cloud Mới Hơn');
  assert.ok(result1.conflictBackup, 'Must produce a conflict backup copy');
  assert.ok(result1.conflictBackup.title.includes('[Bản sao xung đột]'));
  assert.strictEqual(result1.conflictBackup.duration, 15, 'Backup preserves original local state');

  // 2. Conflict where local is newer
  const localNewerProject = { ...localProject, updatedAt: 3000 };
  const result2 = resolveProjectConflict(localNewerProject, remoteNewerProject);
  assert.strictEqual(result2.hadConflict, true);
  assert.strictEqual(result2.winner.title, 'Dự án Local Đang Sửa');
  assert.ok(result2.conflictBackup?.title.includes('[Bản sao Cloud xung đột]'));

  // 3. No conflict when timestamps match
  const syncedLocal = { ...localProject, updatedAt: 5000 };
  const syncedRemote = { ...localProject, updatedAt: 5000 };
  const result3 = resolveProjectConflict(syncedLocal, syncedRemote);
  assert.strictEqual(result3.hadConflict, false);
  assert.strictEqual(result3.conflictBackup, undefined);
});

test('W8: Templates Library count must be >= 20', () => {
  const sectionPageFile = path.resolve('src/pages/SectionPage.tsx');
  const content = fs.readFileSync(sectionPageFile, 'utf-8');

  // Match all template ID definitions in baseTemplates (e.g. { id: 't1', ...)
  const matches = content.match(/id:\s*['"]t\d+['"]/g) || [];
  assert.ok(matches.length >= 20, `Templates count must be at least 20, found ${matches.length} templates`);
});
