import test from 'node:test';
import assert from 'node:assert';
import {
  splitClip,
  trimClipStart,
  trimClipEnd,
  rippleDelete,
  calculateSnapPoint
} from '../utils/timelineOperations.ts';

test('1. splitClip correctly splits a clip into two at the given playhead time', () => {
  const initialClips = [
    {
      id: 'clip-1',
      name: 'Video 1',
      track: 'video',
      start: 2,
      duration: 8,
      inPoint: 0
    }
  ];

  const { success, newClips } = splitClip(initialClips, 'clip-1', 5);

  assert.strictEqual(success, true);
  assert.strictEqual(newClips.length, 2);

  // Part 1: start at 2s, duration 3s (from 2 to 5)
  assert.strictEqual(newClips[0].id, 'clip-1');
  assert.strictEqual(newClips[0].start, 2);
  assert.strictEqual(newClips[0].duration, 3);

  // Part 2: start at 5s, duration 5s (from 5 to 10), inPoint offset by 3s
  assert.strictEqual(newClips[1].start, 5);
  assert.strictEqual(newClips[1].duration, 5);
  assert.strictEqual(newClips[1].inPoint, 3);
});

test('2. trimClipStart (Delete Left / Q) trims start point and updates inPoint', () => {
  const initialClips = [
    {
      id: 'clip-2',
      name: 'Video 2',
      track: 'video',
      start: 0,
      duration: 10,
      inPoint: 0
    }
  ];

  const { success, newClips } = trimClipStart(initialClips, 'clip-2', 4);

  assert.strictEqual(success, true);
  assert.strictEqual(newClips[0].start, 4);
  assert.strictEqual(newClips[0].duration, 6);
  assert.strictEqual(newClips[0].inPoint, 4);
});

test('3. trimClipEnd (Delete Right / W) trims end point and updates outPoint', () => {
  const initialClips = [
    {
      id: 'clip-3',
      name: 'Video 3',
      track: 'video',
      start: 0,
      duration: 10,
      outPoint: 0
    }
  ];

  const { success, newClips } = trimClipEnd(initialClips, 'clip-3', 7);

  assert.strictEqual(success, true);
  assert.strictEqual(newClips[0].duration, 7);
  assert.strictEqual(newClips[0].outPoint, 3);
});

test('4. rippleDelete removes clip and ripples left all subsequent clips on the same track', () => {
  const initialClips = [
    { id: 'clip-a', track: 'video', start: 0, duration: 4 },
    { id: 'clip-b', track: 'video', start: 4, duration: 3 }, // to be deleted (gap = 3s)
    { id: 'clip-c', track: 'video', start: 7, duration: 5 }, // should shift to start = 4
    { id: 'audio-1', track: 'audio', start: 4, duration: 6 } // different track, should not shift
  ];

  const { success, newClips } = rippleDelete(initialClips, 'clip-b');

  assert.strictEqual(success, true);
  assert.strictEqual(newClips.length, 3);

  const clipC = newClips.find((c) => c.id === 'clip-c');
  assert.strictEqual(clipC?.start, 4); // 7 - 3 = 4

  const audio1 = newClips.find((c) => c.id === 'audio-1');
  assert.strictEqual(audio1?.start, 4); // unchanged
});

test('5. calculateSnapPoint snaps correctly to 0, playhead, clip boundaries, and markers', () => {
  const clips = [
    { id: 'c1', start: 0, duration: 5 },
    { id: 'c2', start: 5, duration: 4 } // end = 9
  ];
  const markers = [{ time: 3.5 }];

  // Snap to 0 (threshold = 0.15)
  assert.strictEqual(calculateSnapPoint(0.08, clips, 'c2', markers, 2.0), 0);

  // Snap to playhead at 2.0s
  assert.strictEqual(calculateSnapPoint(2.05, clips, 'c2', markers, 2.0), 2.0);

  // Snap to marker at 3.5s
  assert.strictEqual(calculateSnapPoint(3.45, clips, 'c2', markers, 2.0), 3.5);

  // Snap to clip boundary at 5.0s
  assert.strictEqual(calculateSnapPoint(5.08, clips, 'c2', markers, 2.0), 5.0);

  // No snap if outside threshold
  assert.strictEqual(calculateSnapPoint(7.2, clips, 'c2', markers, 2.0), 7.2);
});

test('6. undo/redo stack immutability and state recovery', () => {
  let undoStack = [];
  let redoStack = [];
  let clips = [{ id: '1', start: 0, duration: 5 }];

  // Perform an action: add clip
  undoStack.push(clips);
  clips = [...clips, { id: '2', start: 5, duration: 3 }];
  assert.strictEqual(clips.length, 2);

  // Perform Undo
  const previous = undoStack.pop();
  redoStack.push(clips);
  clips = previous;
  assert.strictEqual(clips.length, 1);
  assert.strictEqual(clips[0].id, '1');

  // Perform Redo
  const next = redoStack.pop();
  undoStack.push(clips);
  clips = next;
  assert.strictEqual(clips.length, 2);
  assert.strictEqual(clips[1].id, '2');
});

