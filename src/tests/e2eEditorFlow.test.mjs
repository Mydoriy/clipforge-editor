import test from 'node:test';
import assert from 'node:assert';
import { splitClip } from '../utils/timelineOperations.ts';
import { exportToSrt } from '../utils/subtitles.ts';

test('E2E Flow: Import media → Split clip → Add Text Layer → Export SRT captions & verify metadata', async () => {
  // Step 1: Simulate user importing a video file
  const importedFile = {
    name: 'sample_vertical_video.mp4',
    size: 1540200,
    type: 'video/mp4'
  };

  let clips = [
    {
      id: 'clip-imported-1',
      name: importedFile.name,
      type: 'video',
      track: 'video',
      start: 0,
      duration: 10.0,
      inPoint: 0,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      opacity: 1
    }
  ];

  assert.strictEqual(clips.length, 1);
  assert.strictEqual(clips[0].name, 'sample_vertical_video.mp4');

  // Step 2: User seeks to 00:04.00 and presses 'S' (Split)
  const splitTime = 4.0;
  const splitResult = splitClip(clips, 'clip-imported-1', splitTime);
  assert.strictEqual(splitResult.success, true);
  clips = splitResult.newClips;

  assert.strictEqual(clips.length, 2);
  assert.strictEqual(clips[0].duration, 4.0);
  assert.strictEqual(clips[1].start, 4.0);
  assert.strictEqual(clips[1].duration, 6.0);

  // Step 3: User adds a Text/Caption overlay layer at 1.5s
  const textClip = {
    id: 'text-layer-1',
    name: 'Tiêu đề Viral',
    text: 'BÍ QUYẾT TĂNG 100K FOLLOW TIKTOK',
    type: 'text',
    track: 'text',
    start: 1.5,
    duration: 3.5,
    fontSize: 48,
    textColor: '#22D3EE'
  };

  clips.push(textClip);
  assert.strictEqual(clips.length, 3);

  // Step 4: User opens Export Modal and exports Subtitles / Captions (.srt)
  const textItems = clips
    .filter((c) => c.track === 'text' && c.text)
    .map((c) => ({
      start: c.start,
      duration: c.duration,
      text: c.text
    }));

  const srtContent = exportToSrt(textItems);
  assert.ok(srtContent, 'SRT content should be generated');

  assert.ok(
    srtContent.includes('BÍ QUYẾT TĂNG 100K FOLLOW TIKTOK'),
    'SRT content must contain the text layer string'
  );
  assert.ok(
    srtContent.includes('00:00:01,500 --> 00:00:05,000'),
    'SRT timestamps must match text clip duration'
  );

  // Verify total project duration calculation
  const calculatedDuration = Math.max(...clips.map((c) => c.start + c.duration));
  assert.strictEqual(calculatedDuration, 10.0);
});
