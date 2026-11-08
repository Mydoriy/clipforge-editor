import test from 'node:test';
import assert from 'node:assert/strict';

// Helper functions mirroring PlayerCanvas and Timeline logic

function computeCanvasZoom(currentZoom, deltaY) {
  const current = typeof currentZoom === 'number' ? currentZoom : 1.0;
  const zoomFactor = deltaY < 0 ? 1.12 : 0.89;
  const next = Math.max(0.15, Math.min(6.0, current * zoomFactor));
  return parseFloat(next.toFixed(2));
}

function computeScaleDelta(corner, deltaX, deltaY) {
  let distChange = 0;
  if (corner === 'tl') distChange = (-deltaX - deltaY) / 150;
  else if (corner === 'tr') distChange = (deltaX - deltaY) / 150;
  else if (corner === 'bl') distChange = (-deltaX + deltaY) / 150;
  else if (corner === 'br') distChange = (deltaX + deltaY) / 150;
  else if (corner === 't') distChange = -deltaY / 120;
  else if (corner === 'b') distChange = deltaY / 120;
  else if (corner === 'l') distChange = -deltaX / 120;
  else if (corner === 'r') distChange = deltaX / 120;
  return distChange;
}

function formatSmpteTimecode(seconds, fps = 30) {
  const totalFrames = Math.floor(seconds * fps);
  const ff = (totalFrames % fps).toString().padStart(2, '0');
  const ss = (Math.floor(seconds) % 60).toString().padStart(2, '0');
  const mm = (Math.floor(seconds / 60) % 60).toString().padStart(2, '0');
  const hh = Math.floor(seconds / 3600).toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}:${ff}`;
}

function computeAlignmentPosition(alignType) {
  switch (alignType) {
    case 'left':
      return { x: -200 };
    case 'center':
      return { x: 0 };
    case 'right':
      return { x: 200 };
    case 'top':
      return { y: -350 };
    case 'middle':
      return { y: 0 };
    case 'bottom':
      return { y: 350 };
    default:
      return {};
  }
}

test('CapCut Canvas 1: Smooth wheel zoom calculation & boundary clamping', () => {
  // Zooming in from 'fit'
  const zoomIn = computeCanvasZoom('fit', -100);
  assert.equal(zoomIn, 1.12);

  // Zooming in further
  const zoomIn2 = computeCanvasZoom(1.12, -100);
  assert.equal(zoomIn2, 1.25);

  // Zooming out
  const zoomOut = computeCanvasZoom(1.0, 100);
  assert.equal(zoomOut, 0.89);

  // Clamping minimum to 0.15
  let minZoom = 0.2;
  for (let i = 0; i < 10; i++) minZoom = computeCanvasZoom(minZoom, 100);
  assert.equal(minZoom, 0.15);

  // Clamping maximum to 6.0
  let maxZoom = 4.0;
  for (let i = 0; i < 10; i++) maxZoom = computeCanvasZoom(maxZoom, -100);
  assert.equal(maxZoom, 6.0);
});

test('CapCut Canvas 2: 8-point bounding box handles scale vectors', () => {
  // Corner br dragging outward (+deltaX, +deltaY) increases scale
  assert.ok(computeScaleDelta('br', 30, 30) > 0);

  // Corner tl dragging inward (+deltaX, +deltaY) decreases scale
  assert.ok(computeScaleDelta('tl', 30, 30) < 0);

  // Edge t dragging upward (-deltaY) increases scale
  assert.ok(computeScaleDelta('t', 0, -30) > 0);

  // Edge b dragging downward (+deltaY) increases scale
  assert.ok(computeScaleDelta('b', 0, 30) > 0);

  // Edge r dragging rightward (+deltaX) increases scale
  assert.ok(computeScaleDelta('r', 30, 0) > 0);

  // Edge l dragging leftward (-deltaX) increases scale
  assert.ok(computeScaleDelta('l', -30, 0) > 0);
});

test('CapCut Inspector: 6 Alignment positions', () => {
  assert.deepEqual(computeAlignmentPosition('left'), { x: -200 });
  assert.deepEqual(computeAlignmentPosition('center'), { x: 0 });
  assert.deepEqual(computeAlignmentPosition('right'), { x: 200 });
  assert.deepEqual(computeAlignmentPosition('top'), { y: -350 });
  assert.deepEqual(computeAlignmentPosition('middle'), { y: 0 });
  assert.deepEqual(computeAlignmentPosition('bottom'), { y: 350 });
});

test('CapCut Timeline: SMPTE timecode matches CapCut standard format (00:00:05:00)', () => {
  assert.equal(formatSmpteTimecode(5.0, 30), '00:00:05:00');
  assert.equal(formatSmpteTimecode(1.5, 30), '00:00:01:15');
  assert.equal(formatSmpteTimecode(0, 30), '00:00:00:00');
  assert.equal(formatSmpteTimecode(65.2, 30), '00:01:05:06');
});
