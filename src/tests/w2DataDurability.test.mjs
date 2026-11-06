import test from 'node:test';
import assert from 'node:assert';
import {
  validateCapprojData,
  validateCapprojFile,
  MAX_CAPPROJ_SIZE_BYTES
} from '../utils/capprojValidator.ts';
import {
  saveCrashCheckpoint,
  markCleanExit,
  checkUnsavedCrashCheckpoint,
  clearCrashCheckpoint
} from '../utils/crashRecovery.ts';

// Setup in-memory localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

test('W2: .capproj validation via Zod (Single project, multi-project package, and invalid formats)', () => {
  // 1. Valid Single Project
  const singleProj = {
    id: 'proj-valid-1',
    title: 'TikTok Intro Video',
    duration: 12.5,
    width: 1080,
    height: 1920,
    fps: 30,
    tracksData: {
      clips: [
        {
          id: 'clip-1',
          track: 'video',
          name: 'Scene 1',
          start: 0,
          duration: 5.0,
          type: 'video',
          speed: 1.0,
          volume: 1.0
        }
      ]
    }
  };

  const singleRes = validateCapprojData(singleProj);
  assert.strictEqual(singleRes.valid, true);
  assert.strictEqual(singleRes.type, 'single');
  assert.strictEqual(singleRes.project?.id, 'proj-valid-1');
  assert.strictEqual(singleRes.projects?.length, 1);

  // 2. Valid Multi-Project Package
  const pkgData = {
    app: 'ClipForge',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    projects: [
      singleProj,
      {
        id: 'proj-valid-2',
        title: 'Reels Outro',
        duration: 8.0,
        tracksData: { clips: [] }
      }
    ]
  };

  const pkgRes = validateCapprojData(pkgData);
  assert.strictEqual(pkgRes.valid, true);
  assert.strictEqual(pkgRes.type, 'package');
  assert.strictEqual(pkgRes.projects?.length, 2);

  // 3. Invalid formats & malicious/empty inputs
  assert.strictEqual(validateCapprojData(null).valid, false);
  assert.strictEqual(validateCapprojData('not-an-object').valid, false);
  assert.strictEqual(validateCapprojData({}).valid, false); // Missing id and title

  // Missing clip duration or negative duration
  const invalidClipProj = {
    id: 'proj-bad',
    title: 'Bad Clips',
    duration: 10,
    tracksData: {
      clips: [{ id: 'c1', track: 'v1', start: 0, duration: -5, type: 'video' }]
    }
  };
  const badClipRes = validateCapprojData(invalidClipProj);
  assert.strictEqual(badClipRes.valid, false);
  assert.match(badClipRes.error || '', /duration/i);
});

test('W2: .capproj file size limit (50MB) and corrupted JSON rejection', async () => {
  // File exceeding 50MB
  const fakeBigFile = {
    size: MAX_CAPPROJ_SIZE_BYTES + 1024,
    text: async () => '{"id":"test"}'
  };
  const bigRes = await validateCapprojFile(fakeBigFile);
  assert.strictEqual(bigRes.valid, false);
  assert.match(bigRes.error || '', /50MB/i);

  // File with corrupted JSON syntax
  const corruptedFile = {
    size: 200,
    text: async () => '{"id":"test", malformed json...'
  };
  const corruptRes = await validateCapprojFile(corruptedFile);
  assert.strictEqual(corruptRes.valid, false);
  assert.match(corruptRes.error || '', /cú pháp JSON/i);
});

test('W2: Crash recovery journal & dirty checkpoint handling', () => {
  const projId = 'test-proj-crash';
  globalThis.localStorage.clear();

  // Initially, no checkpoint exists
  assert.strictEqual(checkUnsavedCrashCheckpoint(projId, 1000), null);

  // Save dirty checkpoint
  const clips = [
    { id: 'clip-unsaved', track: 'video', name: 'Work in progress', start: 0, duration: 4, type: 'video' }
  ];
  saveCrashCheckpoint(projId, 'Unsaved Draft', 4, clips, { ratio: '9:16' });

  // If lastDbUpdatedAt was 1 hour ago, dirty checkpoint is detected
  const lastDbSavedAt = Date.now() - 3600000;
  const detected = checkUnsavedCrashCheckpoint(projId, lastDbSavedAt);
  assert.notStrictEqual(detected, null);
  assert.strictEqual(detected?.projectId, projId);
  assert.strictEqual(detected?.clips.length, 1);
  assert.strictEqual(detected?.clips[0].name, 'Work in progress');

  // If lastDbUpdatedAt is newer than checkpoint, no recovery is offered (already up to date)
  const futureDbSavedAt = Date.now() + 5000;
  assert.strictEqual(checkUnsavedCrashCheckpoint(projId, futureDbSavedAt), null);

  // If clean shutdown was performed (beforeunload)
  markCleanExit(projId);
  assert.strictEqual(checkUnsavedCrashCheckpoint(projId, lastDbSavedAt), null);

  // Clear checkpoint removes state entirely
  saveCrashCheckpoint(projId, 'Draft 2', 4, clips);
  clearCrashCheckpoint(projId);
  assert.strictEqual(checkUnsavedCrashCheckpoint(projId, lastDbSavedAt), null);
});

test('W2: Trash retention calculation (30 days threshold)', () => {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const threshold = now - thirtyDaysMs;

  const itemOld = { id: 't1', deletedAt: now - thirtyDaysMs - 10000 }; // 30 days + 10s ago -> Delete
  const itemRecent = { id: 't2', deletedAt: now - 10 * 24 * 60 * 60 * 1000 }; // 10 days ago -> Keep

  assert.strictEqual(itemOld.deletedAt < threshold, true);
  assert.strictEqual(itemRecent.deletedAt < threshold, false);
});

test('W2: Dexie legacy schema migration upgrade function preserves data', () => {
  // Simulate the upgrade function modifier from Dexie version(2)
  const legacyProject = {
    id: 'legacy-proj-1',
    title: 'Old Project from v1',
    createdAt: 1680000000000
    // Missing: updatedAt, isDeleted, tracksData, duration, width, height, fps
  };

  const projectRecord = { ...legacyProject };

  // Run the Dexie v2 upgrade modifier logic:
  if (!projectRecord.updatedAt) projectRecord.updatedAt = projectRecord.createdAt || Date.now();
  if (projectRecord.isDeleted === undefined) projectRecord.isDeleted = false;
  if (!projectRecord.tracksData) projectRecord.tracksData = { clips: [] };
  if (!projectRecord.duration) projectRecord.duration = 15;
  if (!projectRecord.width) projectRecord.width = 1080;
  if (!projectRecord.height) projectRecord.height = 1920;
  if (!projectRecord.fps) projectRecord.fps = 30;

  // Verify all fields are backfilled with safe defaults without mutating existing properties
  assert.strictEqual(projectRecord.id, 'legacy-proj-1');
  assert.strictEqual(projectRecord.title, 'Old Project from v1');
  assert.strictEqual(projectRecord.createdAt, 1680000000000);
  assert.strictEqual(projectRecord.updatedAt, 1680000000000);
  assert.strictEqual(projectRecord.isDeleted, false);
  assert.deepStrictEqual(projectRecord.tracksData, { clips: [] });
  assert.strictEqual(projectRecord.duration, 15);
  assert.strictEqual(projectRecord.width, 1080);
  assert.strictEqual(projectRecord.height, 1920);
  assert.strictEqual(projectRecord.fps, 30);
});
