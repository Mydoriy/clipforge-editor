import type { TimelineClip } from '../store/useEditorStore';

export function splitClip(
  clips: TimelineClip[],
  clipId: string,
  splitTime: number
): { success: boolean; newClips: TimelineClip[] } {
  const targetIndex = clips.findIndex((c) => c.id === clipId);
  if (targetIndex === -1) return { success: false, newClips: clips };

  const target = clips[targetIndex];
  if (splitTime <= target.start || splitTime >= target.start + target.duration) {
    return { success: false, newClips: clips };
  }

  const firstDuration = splitTime - target.start;
  const secondDuration = target.duration - firstDuration;

  const part1: TimelineClip = {
    ...target,
    duration: firstDuration
  };

  const part2: TimelineClip = {
    ...target,
    id: 'clip-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    start: splitTime,
    duration: secondDuration,
    inPoint: (target.inPoint || 0) + firstDuration
  };

  const newClips = [...clips];
  newClips.splice(targetIndex, 1, part1, part2);
  return { success: true, newClips };
}

export function trimClipStart(
  clips: TimelineClip[],
  clipId: string,
  newStartTime: number
): { success: boolean; newClips: TimelineClip[] } {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return { success: false, newClips: clips };

  if (newStartTime <= target.start || newStartTime >= target.start + target.duration) {
    return { success: false, newClips: clips };
  }

  const cutAmount = newStartTime - target.start;
  const newDuration = target.duration - cutAmount;

  const newClips = clips.map((c) =>
    c.id === clipId
      ? {
          ...c,
          start: newStartTime,
          duration: newDuration,
          inPoint: (c.inPoint || 0) + cutAmount
        }
      : c
  );
  return { success: true, newClips };
}

export function trimClipEnd(
  clips: TimelineClip[],
  clipId: string,
  newEndTime: number
): { success: boolean; newClips: TimelineClip[] } {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return { success: false, newClips: clips };

  if (newEndTime <= target.start || newEndTime >= target.start + target.duration) {
    return { success: false, newClips: clips };
  }

  const newDuration = newEndTime - target.start;
  const cutAmount = target.duration - newDuration;

  const newClips = clips.map((c) =>
    c.id === clipId
      ? {
          ...c,
          duration: newDuration,
          outPoint: (c.outPoint || 0) + cutAmount
        }
      : c
  );
  return { success: true, newClips };
}

export function rippleDelete(
  clips: TimelineClip[],
  clipId: string
): { success: boolean; newClips: TimelineClip[] } {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return { success: false, newClips: clips };

  const targetEnd = target.start + target.duration;
  const targetTrack = target.track;
  const gap = target.duration;

  const newClips = clips
    .filter((c) => c.id !== clipId)
    .map((c) => {
      if (c.track === targetTrack && c.start >= targetEnd) {
        return { ...c, start: Math.max(0, c.start - gap) };
      }
      return c;
    });

  return { success: true, newClips };
}

export function calculateSnapPoint(
  targetTime: number,
  clips: TimelineClip[],
  activeClipId?: string,
  markers: Array<{ time: number }> = [],
  playheadTime?: number,
  threshold: number = 0.15
): number {
  if (Math.abs(targetTime) < threshold) return 0;

  if (playheadTime !== undefined && Math.abs(targetTime - playheadTime) < threshold) {
    return playheadTime;
  }

  for (const m of markers) {
    if (Math.abs(targetTime - m.time) < threshold) return m.time;
  }

  for (const c of clips) {
    if (c.id === activeClipId) continue;
    if (Math.abs(targetTime - c.start) < threshold) return c.start;
    const clipEnd = c.start + c.duration;
    if (Math.abs(targetTime - clipEnd) < threshold) return clipEnd;
  }

  return targetTime;
}

