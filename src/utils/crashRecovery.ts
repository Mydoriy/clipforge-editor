// Operation journal & crash recovery manager
export interface CrashCheckpoint {
  projectId: string;
  projectTitle: string;
  timestamp: number;
  duration: number;
  clipsCount: number;
  clips: any[];
  settings?: any;
}

const CHECKPOINT_PREFIX = 'clipforge_crash_cp_';
const DIRTY_PREFIX = 'clipforge_crash_dirty_';

// Save current working state to recovery journal
export function saveCrashCheckpoint(
  projectId: string,
  projectTitle: string,
  duration: number,
  clips: any[],
  settings?: any
): void {
  try {
    const cp: CrashCheckpoint = {
      projectId,
      projectTitle,
      timestamp: Date.now(),
      duration,
      clipsCount: clips.length,
      clips,
      settings
    };
    localStorage.setItem(CHECKPOINT_PREFIX + projectId, JSON.stringify(cp));
    localStorage.setItem(DIRTY_PREFIX + projectId, 'true');
  } catch (e) {
    console.warn('saveCrashCheckpoint failed:', e);
  }
}

// Mark clean shutdown (e.g. normal tab close after clean save)
export function markCleanExit(projectId: string): void {
  try {
    localStorage.setItem(DIRTY_PREFIX + projectId, 'false');
  } catch (e) {
    // Ignore
  }
}

// Check if an unsaved session exists from an unexpected crash or force-quit
export function checkUnsavedCrashCheckpoint(
  projectId: string,
  lastDbUpdatedAt: number = 0
): CrashCheckpoint | null {
  try {
    const dirty = localStorage.getItem(DIRTY_PREFIX + projectId);
    const raw = localStorage.getItem(CHECKPOINT_PREFIX + projectId);
    if (!raw) return null;

    const cp: CrashCheckpoint = JSON.parse(raw);
    // If marked dirty AND checkpoint is at least 1.5 seconds newer than the saved database state
    if (dirty === 'true' && cp.timestamp > lastDbUpdatedAt + 1500 && cp.clips && cp.clips.length > 0) {
      return cp;
    }
  } catch (e) {
    console.warn('checkUnsavedCrashCheckpoint error:', e);
  }
  return null;
}

// Discard checkpoint after user rejects or restores
export function clearCrashCheckpoint(projectId: string): void {
  try {
    localStorage.removeItem(CHECKPOINT_PREFIX + projectId);
    localStorage.setItem(DIRTY_PREFIX + projectId, 'false');
  } catch (e) {
    // Ignore
  }
}

