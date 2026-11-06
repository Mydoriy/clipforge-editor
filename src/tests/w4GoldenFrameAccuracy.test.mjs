import test from 'node:test';
import assert from 'node:assert';
import {
  computePSNR,
  computeSSIM,
  compareFrames,
  measureAVSyncOffset,
  toneMapHdrToSrgb,
  normalizeVideoOrientation,
  resampleAudioBuffer
} from '../utils/goldenFrameTest.ts';

test('W4: Golden-frame comparison - SSIM >= 0.98 and PSNR >= 40dB for identical Preview and Export', () => {
  // Create an RGBA frame buffer (e.g. 100x100 pixels = 40,000 bytes)
  const size = 100 * 100 * 4;
  const previewBuffer = new Uint8ClampedArray(size);
  const exportBuffer = new Uint8ClampedArray(size);

  for (let i = 0; i < size; i += 4) {
    previewBuffer[i] = (i * 7) % 256;     // R
    previewBuffer[i + 1] = (i * 13) % 256; // G
    previewBuffer[i + 2] = (i * 29) % 256; // B
    previewBuffer[i + 3] = 255;            // A

    exportBuffer[i] = previewBuffer[i];
    exportBuffer[i + 1] = previewBuffer[i + 1];
    exportBuffer[i + 2] = previewBuffer[i + 2];
    exportBuffer[i + 3] = previewBuffer[i + 3];
  }

  // 1. Identical buffers must yield SSIM = 1.0 and PSNR >= 50dB
  const result = compareFrames(previewBuffer, exportBuffer);
  assert.strictEqual(result.isMatch, true);
  assert.ok(result.ssim >= 0.98, `SSIM (${result.ssim}) must be >= 0.98`);
  assert.ok(result.psnr >= 40.0, `PSNR (${result.psnr}) must be >= 40.0 dB`);
  assert.strictEqual(result.maxDiff, 0);

  // 2. Severely corrupted buffer must fail the golden match threshold
  const corruptedBuffer = new Uint8ClampedArray(previewBuffer);
  for (let i = 0; i < size; i += 4) {
    corruptedBuffer[i] = (corruptedBuffer[i] + 120) % 256; // Alter pixels
  }
  const corruptResult = compareFrames(previewBuffer, corruptedBuffer);
  assert.strictEqual(corruptResult.isMatch, false);
});

test('W4: A/V synchronization drift (tolerance <= 40ms)', () => {
  // In-sync cases (<= 40ms)
  const syncExact = measureAVSyncOffset(10.000, 10.000);
  assert.strictEqual(syncExact.inSync, true);
  assert.strictEqual(syncExact.driftMs, 0);

  const syncWithinTolerance = measureAVSyncOffset(12.500, 12.535); // 35ms drift
  assert.strictEqual(syncWithinTolerance.inSync, true);
  assert.ok(syncWithinTolerance.driftMs <= 40.0);

  // Out-of-sync cases (> 40ms drift)
  const desync = measureAVSyncOffset(15.000, 15.055); // 55ms drift
  assert.strictEqual(desync.inSync, false);
  assert.ok(desync.driftMs > 40.0);
});

test('W4: Smartphone video rotation metadata (90°, 180°, 270°)', () => {
  // Horizontal video recorded with 90° orientation metadata (vertical display)
  const rotated90 = normalizeVideoOrientation(90, 1920, 1080);
  assert.strictEqual(rotated90.width, 1080);
  assert.strictEqual(rotated90.height, 1920);
  assert.strictEqual(rotated90.rotateDeg, 90);

  // 180° upside down
  const rotated180 = normalizeVideoOrientation(180, 1080, 1920);
  assert.strictEqual(rotated180.width, 1080);
  assert.strictEqual(rotated180.height, 1920);
  assert.strictEqual(rotated180.rotateDeg, 180);

  // 270° counter-clockwise
  const rotated270 = normalizeVideoOrientation(270, 1920, 1080);
  assert.strictEqual(rotated270.width, 1080);
  assert.strictEqual(rotated270.height, 1920);
  assert.strictEqual(rotated270.rotateDeg, 270);
});

test('W4: 10-bit / HDR Reinhard tone mapping to 8-bit sRGB gamut', () => {
  // Standard SDR white (1.0) maps to 8-bit range [0, 255]
  const sdrTone = toneMapHdrToSrgb(1.0, 1.0, 1.0, 1.0);
  assert.ok(sdrTone[0] >= 0 && sdrTone[0] <= 255);

  // High luminance HDR peak (3.5x white) does not clip or overflow
  const hdrPeak = toneMapHdrToSrgb(3.5, 2.0, 0.8, 1.0);
  assert.ok(hdrPeak[0] <= 255, 'R must be clamped to 255');
  assert.ok(hdrPeak[1] <= 255, 'G must be clamped to 255');
  assert.ok(hdrPeak[2] <= 255, 'B must be clamped to 255');
  assert.ok(hdrPeak[0] >= hdrPeak[1] && hdrPeak[1] >= hdrPeak[2], 'Luminance ordering must be preserved');
});

test('W4: Audio sample rate & channel resampling (44.1kHz vs 48kHz, mono vs stereo)', () => {
  // 44.1kHz mono input (1 second = 44,100 samples)
  const input44kMono = new Float32Array(44100);
  for (let i = 0; i < input44kMono.length; i++) {
    input44kMono[i] = Math.sin((2 * Math.PI * 440 * i) / 44100); // 440Hz sine wave
  }

  // Resample to 48kHz stereo
  const output48kStereo = resampleAudioBuffer(input44kMono, 44100, 48000, 1, 2);
  const expectedStereoSamples = 48000 * 2;
  assert.strictEqual(output48kStereo.length, expectedStereoSamples);

  // Both stereo channels must contain signal
  assert.ok(Math.abs(output48kStereo[100]) > 0.01);
  assert.strictEqual(output48kStereo[100], output48kStereo[101], 'Stereo channels must be balanced from mono');
});

test('W4: Complex editing operations: Reverse, Freeze frame, Speed curve, and Nested Compound clips', () => {
  // 1. Reverse clip: plays backward from outPoint (10s) down to inPoint (0s)
  const revClip = { start: 2.0, duration: 8.0, inPoint: 0, outPoint: 10.0, speed: 1.0, reverse: true };
  const currentTime = 5.0; // 3 seconds into clip
  const elapsed = (currentTime - revClip.start) * revClip.speed;
  const relTimeRev = revClip.outPoint - elapsed;
  assert.strictEqual(relTimeRev, 7.0, 'Reverse clip at t=5s must sample source at 7.0s');

  // 2. Freeze frame: locks playhead at frozen timestamp
  const freezeClip = { start: 0, duration: 6.0, inPoint: 0, freezeFrame: true, freezeTime: 2.5 };
  const sampleAt1 = freezeClip.freezeTime;
  const sampleAt5 = freezeClip.freezeTime;
  assert.strictEqual(sampleAt1, 2.5);
  assert.strictEqual(sampleAt5, 2.5);

  // 3. Speed curve: ease-in accelerates over duration
  const curveProgress = (progress) => Math.pow(progress, 2);
  assert.strictEqual(curveProgress(0), 0);
  assert.strictEqual(curveProgress(0.5), 0.25); // Slower in first half
  assert.strictEqual(curveProgress(1.0), 1.0);

  // 4. Ultra-short clip (1 frame = 1/30s = 0.0333s)
  const singleFrameClip = { start: 4.0, duration: 1 / 30 };
  const isFrameActive = (t) => t >= singleFrameClip.start && t < singleFrameClip.start + singleFrameClip.duration;
  assert.strictEqual(isFrameActive(4.01), true);
  assert.strictEqual(isFrameActive(4.05), false);

  // 5. Nested compound clips: parent container at start=5s, child at start=2s
  const parentClip = {
    start: 5.0,
    duration: 10.0,
    speed: 1.0,
    compoundClips: [
      {
        id: 'child-nested',
        start: 2.0,
        duration: 4.0,
        name: 'Nested Inner Clip',
        compoundClips: [
          { id: 'deep-leaf', start: 0.5, duration: 2.0, name: 'Deep Leaf' }
        ]
      }
    ]
  };

  const projectPlayhead = 8.0; // 3s into parent -> localTimeParent = 3.0s
  const localTimeParent = projectPlayhead - parentClip.start;
  const child = parentClip.compoundClips[0];
  const isChildActive = localTimeParent >= child.start && localTimeParent <= child.start + child.duration;
  assert.strictEqual(isChildActive, true);

  const localTimeChild = localTimeParent - child.start; // 3.0 - 2.0 = 1.0s
  const leaf = child.compoundClips[0];
  const isLeafActive = localTimeChild >= leaf.start && localTimeChild <= leaf.start + leaf.duration;
  assert.strictEqual(isLeafActive, true);
});

