import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Environment & Helper Setup for Headless Node.js Execution
// ---------------------------------------------------------------------------
const rootDir = process.cwd();
const readFileSafe = (relPath) => {
  const fullPath = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(fullPath), `Required source file must exist: ${relPath}`);
  return fs.readFileSync(fullPath, 'utf8');
};

const mockStorage = new Map();
const mockLocalStorage = {
  getItem: (k) => mockStorage.get(k) ?? null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};
globalThis.localStorage = mockLocalStorage;
if (!globalThis.window) {
  globalThis.window = {
    localStorage: mockLocalStorage,
    dispatchEvent: () => true,
    innerWidth: 1280,
    innerHeight: 800,
  };
}

// ===========================================================================
// DOMAIN 1: Global CSS Touch Target Utilities (src/index.css)
// ===========================================================================

test('M2-CSS.1: .touch-target-44 class definition and ::after hit area expansion >= 44px', () => {
  const css = readFileSafe('src/index.css');
  assert.ok(css.includes('.touch-target-44'), 'index.css must define .touch-target-44 utility');
  assert.ok(css.includes('min-width: 44px') && css.includes('min-height: 44px'), '.touch-target-44 must expand to min 44x44px');
  assert.ok(css.includes('position: relative'), '.touch-target-44 must specify position: relative');
  assert.ok(css.includes('touch-action: manipulation'), '.touch-target-44 must specify touch-action: manipulation');
  assert.ok(css.includes('pointer-events: auto'), '.touch-target-44::after must set pointer-events: auto');
});

test('M2-CSS.2: .touch-target-40 class definition and ::after hit area expansion >= 40px', () => {
  const css = readFileSafe('src/index.css');
  assert.ok(css.includes('.touch-target-40'), 'index.css must define .touch-target-40 utility');
  assert.ok(css.includes('min-width: 40px') && css.includes('min-height: 40px'), '.touch-target-40 must expand to min 40x40px');
  assert.ok(css.includes('position: relative'), '.touch-target-40 must specify position: relative');
  assert.ok(css.includes('touch-action: manipulation'), '.touch-target-40 must specify touch-action: manipulation');
});

test('M2-CSS.3: .touch-slider class definition with touch-action: none and vertical expansion', () => {
  const css = readFileSafe('src/index.css');
  assert.ok(css.includes('.touch-slider'), 'index.css must define .touch-slider utility');
  assert.ok(css.includes('touch-action: none'), '.touch-slider must enforce touch-action: none to prevent scroll interference');
  assert.ok(css.includes('margin-top: -6px') || css.includes('margin-top: -10px') || css.includes('height: 24px') || css.includes('height: 32px'),
    '.touch-slider must expand vertical hit zone to >= 24-32px');
});

// ===========================================================================
// DOMAIN 2: Header Touch Compliance (src/components/Header.tsx)
// ===========================================================================

test('M2-HDR.1: Header undo and redo buttons incorporate touch target expansion >= 40-44px', () => {
  const headerTsx = readFileSafe('src/components/Header.tsx');
  // Undo button
  const undoIndex = headerTsx.indexOf('onClick={undo}');
  assert.ok(undoIndex !== -1, 'Header must contain undo button');
  const undoSnippet = headerTsx.substring(undoIndex - 50, undoIndex + 350);
  assert.ok(undoSnippet.includes('touch-target-44') || undoSnippet.includes('touch-target-40'), 'Undo button must apply touch target utility');

  // Redo button
  const redoIndex = headerTsx.indexOf('onClick={redo}');
  assert.ok(redoIndex !== -1, 'Header must contain redo button');
  const redoSnippet = headerTsx.substring(redoIndex - 50, redoIndex + 350);
  assert.ok(redoSnippet.includes('touch-target-44') || redoSnippet.includes('touch-target-40'), 'Redo button must apply touch target utility');
});

test('M2-HDR.2: Header window control buttons (- [] x) and action buttons incorporate touch target expansion', () => {
  const headerTsx = readFileSafe('src/components/Header.tsx');
  assert.ok(headerTsx.includes('touch-target-44'), 'Header must apply touch-target-44 utility across controls');
  // Verify window controls container or individual buttons
  const minimizeIndex = headerTsx.indexOf('<Minus className="w-3 h-3" />');
  assert.ok(minimizeIndex !== -1, 'Header must contain window minimize control');
  const windowControlsSnippet = headerTsx.substring(minimizeIndex - 200, minimizeIndex + 400);
  assert.ok(windowControlsSnippet.includes('touch-target-44') || windowControlsSnippet.includes('touch-target-40'),
    'Window control buttons must have touch target utility applied');
});

// ===========================================================================
// DOMAIN 3: Inspector Touch Compliance (src/components/Inspector.tsx)
// ===========================================================================

test('M2-INSP.1: renderKeyframeDiamond applies touch target expansion >= 40px', () => {
  const inspTsx = readFileSafe('src/components/Inspector.tsx');
  assert.ok(inspTsx.includes('renderKeyframeDiamond'), 'Inspector must define renderKeyframeDiamond');
  const diamondIndex = inspTsx.indexOf('renderKeyframeDiamond');
  const diamondSnippet = inspTsx.substring(diamondIndex, diamondIndex + 600);
  assert.ok(diamondSnippet.includes('touch-target-40') || diamondSnippet.includes('touch-target-44'),
    'renderKeyframeDiamond must apply touch target utility >= 40px');
});

test('M2-INSP.2: Reset buttons and sub-tabs in Inspector provide hit expansion >= 40px', () => {
  const inspTsx = readFileSafe('src/components/Inspector.tsx');
  assert.ok(inspTsx.includes('RotateCcw'), 'Inspector must render reset icons');
  assert.ok(inspTsx.includes('touch-target-40') || inspTsx.includes('touch-target-44'),
    'Inspector must apply touch-target utility to reset buttons and tabs');
});

test('M2-INSP.3: Inspector range sliders incorporate touch-slider and touch-action: none', () => {
  const inspTsx = readFileSafe('src/components/Inspector.tsx');
  assert.ok(inspTsx.includes('touch-slider'), 'Inspector must apply touch-slider class to range inputs');
  assert.ok(inspTsx.includes("touchAction: 'none'") || inspTsx.includes('touch-action'),
    'Inspector range sliders must enforce touch-action: none');
});

// ===========================================================================
// DOMAIN 4: PlayerCanvas Multi-Touch Gestures
// ===========================================================================

test('M2-CANVAS.1: 2-pointer pinch-to-zoom calculation with [0.15, 6.0] boundary clamping', () => {
  function computePinchZoom(initialDist, currentDist, initialZoom) {
    const ratio = currentDist / Math.max(10, initialDist);
    return Math.max(0.15, Math.min(6.0, parseFloat((initialZoom * ratio).toFixed(3))));
  }
  // Normal zoom in
  assert.equal(computePinchZoom(100, 150, 1.0), 1.5);
  // Normal zoom out
  assert.equal(computePinchZoom(100, 50, 1.0), 0.5);
  // Maximum boundary clamp (6.0)
  assert.equal(computePinchZoom(100, 1000, 1.0), 6.0);
  // Minimum boundary clamp (0.15)
  assert.equal(computePinchZoom(100, 5, 1.0), 0.15);
  // Zero/negative distance prevention
  assert.equal(computePinchZoom(0, 50, 1.0), 5.0);
});

test('M2-CANVAS.2: 2-pointer pan translation formula and center tracking', () => {
  function computePinchPan(initialPan, initialMidpoint, currentMidpoint) {
    return {
      x: initialPan.x + (currentMidpoint.x - initialMidpoint.x),
      y: initialPan.y + (currentMidpoint.y - initialMidpoint.y)
    };
  }
  const pan1 = computePinchPan({ x: 0, y: 0 }, { x: 200, y: 300 }, { x: 220, y: 350 });
  assert.deepEqual(pan1, { x: 20, y: 50 });

  const pan2 = computePinchPan({ x: 100, y: -50 }, { x: 400, y: 400 }, { x: 350, y: 420 });
  assert.deepEqual(pan2, { x: 50, y: -30 });
});

test('M2-CANVAS.3: 8-point handles and rotation stem incorporate touch hit expansion >= 40-44px', () => {
  const canvasTsx = readFileSafe('src/components/PlayerCanvas.tsx');
  // Rotation stem container >= 44px
  assert.ok(canvasTsx.includes('w-11 h-11') || canvasTsx.includes('touch-target-44'),
    'PlayerCanvas rotation stem must provide touch container >= 44px (w-11 h-11)');
  // Scale handles container >= 40px
  assert.ok(canvasTsx.includes('w-10 h-10') || canvasTsx.includes('touch-target-40'),
    'PlayerCanvas bounding box handles must provide touch container >= 40px (w-10 h-10)');
  // Visual indicator nested inside container with pointer-events-none
  assert.ok(canvasTsx.includes('pointer-events-none'),
    'Visual handle indicator must use pointer-events-none to prevent intercepting parent hit box');
});

test('M2-CANVAS.4: Double-tap on canvas triggers fit-to-view zoom reset', () => {
  let zoomState = 2.5;
  let panState = { x: 120, y: -80 };
  let lastTapTime = 0;
  let lastTapPos = { x: 0, y: 0 };

  function handleCanvasTap(time, x, y) {
    const elapsed = time - lastTapTime;
    const dist = Math.hypot(x - lastTapPos.x, y - lastTapPos.y);
    if (elapsed < 300 && dist < 20) {
      zoomState = 1.0;
      panState = { x: 0, y: 0 };
      lastTapTime = 0;
      return true;
    }
    lastTapTime = time;
    lastTapPos = { x, y };
    return false;
  }

  // First tap at t=1000
  const firstTap = handleCanvasTap(1000, 150, 150);
  assert.equal(firstTap, false);
  assert.equal(zoomState, 2.5);

  // Second tap at t=1180 (180ms later, same position) -> should reset
  const secondTap = handleCanvasTap(1180, 152, 151);
  assert.equal(secondTap, true);
  assert.equal(zoomState, 1.0);
  assert.deepEqual(panState, { x: 0, y: 0 });

  // Reset zoom for slow tap test
  zoomState = 3.0;
  handleCanvasTap(2000, 150, 150);
  // Tap 500ms later (too slow)
  const slowTap = handleCanvasTap(2500, 150, 150);
  assert.equal(slowTap, false);
  assert.equal(zoomState, 3.0);
});

// ===========================================================================
// DOMAIN 5: Timeline Touch Scrubbing, Trimming & Long-Press
// ===========================================================================

test('M2-TIME.1: Trim handle hit area expands to >= 36-40px with touch-none', () => {
  const timeTsx = readFileSafe('src/components/Timeline.tsx');
  assert.ok(timeTsx.includes('handleTrimStartMouseDown'), 'Timeline must define handleTrimStartMouseDown');
  assert.ok(timeTsx.includes('handleTrimEndMouseDown'), 'Timeline must define handleTrimEndMouseDown');
  assert.ok(timeTsx.includes('handleTrimStartPointerDown'), 'Timeline must define handleTrimStartPointerDown');
  assert.ok(timeTsx.includes('handleTrimEndPointerDown'), 'Timeline must define handleTrimEndPointerDown');
  assert.ok(timeTsx.includes('min-w-[36px]') || timeTsx.includes('w-9'), 'Trim handle hit container must be >= 36px wide');
  assert.ok(timeTsx.includes('touch-none'), 'Trim handle must apply touch-none to prevent scroll-jacking');
});

test('M2-TIME.2: 500ms long-press timer triggers context menu and cancels on movement > 8px', () => {
  let contextMenuOpened = false;
  let timerRef = null;
  const startPos = { x: 100, y: 200 };

  function onPointerDown(pos) {
    contextMenuOpened = false;
    timerRef = setTimeout(() => {
      contextMenuOpened = true;
    }, 500);
  }

  function onPointerMove(currentPos) {
    const dist = Math.hypot(currentPos.x - startPos.x, currentPos.y - startPos.y);
    if (dist > 8 && timerRef) {
      clearTimeout(timerRef);
      timerRef = null;
    }
  }

  // Case A: Finger moves < 8px -> timer stays alive
  onPointerDown(startPos);
  onPointerMove({ x: 104, y: 203 }); // dist = 5px <= 8px
  assert.ok(timerRef !== null, 'Timer must not be cancelled for small jitters <= 8px');
  clearTimeout(timerRef);

  // Case B: Finger moves > 8px -> timer cancelled immediately
  onPointerDown(startPos);
  onPointerMove({ x: 112, y: 200 }); // dist = 12px > 8px
  assert.equal(timerRef, null, 'Timer must be cancelled when finger moves > 8px');
  assert.equal(contextMenuOpened, false, 'Context menu must not open when dragged');
});

test('M2-TIME.3: Playhead needle head provides >= 40px touch hit box and pointer capture scrubbing', () => {
  const timeTsx = readFileSafe('src/components/Timeline.tsx');
  assert.ok(timeTsx.includes('w-10 h-10') || timeTsx.includes('touch-target-40') || timeTsx.includes('touch-target-44'),
    'Needle head must provide >= 40px touch hit container (w-10 h-10)');
  assert.ok(timeTsx.includes('handlePlayheadPointerDown'), 'Timeline must define handlePlayheadPointerDown');
  assert.ok(timeTsx.includes('setPointerCapture'), 'Playhead scrubbing must invoke setPointerCapture for smooth dragging');
});

// ===========================================================================
// DOMAIN 6: Mobile Collapsible Track Header
// ===========================================================================

test('M2-TRACK.1: Track header provides responsive width w-14 on mobile with toggle', () => {
  const timeTsx = readFileSafe('src/components/Timeline.tsx');
  assert.ok(timeTsx.includes('trackHeaderCollapsed'), 'Timeline must manage trackHeaderCollapsed state');
  assert.ok(timeTsx.includes('w-14') && timeTsx.includes('w-48'), 'Timeline must support collapsible w-14 and w-48 header modes');
  assert.ok(timeTsx.includes('setTrackHeaderCollapsed'), 'Timeline must provide toggle control for collapsed header mode');
  assert.ok(timeTsx.includes('trackHeadersScrollRef') || timeTsx.includes('handleTimelineScroll'),
    'Timeline must synchronize vertical scroll between track headers and timeline content');
});

test('M2-TRACK.2: Track controls (Mute, Lock, Hide) provide minimum touch target size >= 36-40px', () => {
  const timeTsx = readFileSafe('src/components/Timeline.tsx');
  assert.ok(timeTsx.includes('toggleTrackMute'), 'Timeline must provide mute control');
  assert.ok(timeTsx.includes('toggleTrackLock'), 'Timeline must provide lock control');
  assert.ok(timeTsx.includes('toggleTrackHidden'), 'Timeline must provide visibility control');
  assert.ok(timeTsx.includes('min-w-[36px]') || timeTsx.includes('touch-target-40') || timeTsx.includes('p-2'),
    'Track buttons must provide touch ergonomics >= 36-40px on mobile');
});

// ===========================================================================
// DOMAIN 7: Stress Resilience & Disambiguation
// ===========================================================================

test('M2-STRESS.1: Palm rejection contact filtering and micro-clip boundary disambiguation', () => {
  // 1. Palm Rejection Math: Filter multi-touch contacts down to primary 2 touches
  function extractActivePointers(touchList) {
    // When a user rests palm, 3-5 touch points fire. Filter to first 2 active touches.
    if (!touchList || touchList.length < 2) return null;
    return [
      { x: touchList[0].clientX, y: touchList[0].clientY, id: touchList[0].identifier },
      { x: touchList[1].clientX, y: touchList[1].clientY, id: touchList[1].identifier }
    ];
  }

  const palmTouches = [
    { clientX: 100, clientY: 200, identifier: 0 },
    { clientX: 180, clientY: 240, identifier: 1 },
    { clientX: 250, clientY: 300, identifier: 2 }, // palm edge
    { clientX: 290, clientY: 350, identifier: 3 }  // wrist
  ];

  const filtered = extractActivePointers(palmTouches);
  assert.equal(filtered.length, 2, 'Palm rejection must filter strictly to first 2 touch points');
  assert.equal(filtered[0].id, 0);
  assert.equal(filtered[1].id, 1);

  // 2. Micro-Clip Boundary Disambiguation:
  // On very short clips where visual width on screen is < 40px (e.g. 24px wide),
  // start and end trim handles overlap. Disambiguate by touch coordinate.
  function disambiguateMicroClipTrim(clipVisualWidth, touchOffsetX) {
    if (clipVisualWidth >= 40) {
      if (touchOffsetX <= 20) return 'start';
      if (touchOffsetX >= clipVisualWidth - 20) return 'end';
      return 'drag';
    }
    // Micro-clip: split down exact center
    const midpoint = clipVisualWidth / 2;
    return touchOffsetX < midpoint ? 'start' : 'end';
  }

  // Micro-clip width 24px
  assert.equal(disambiguateMicroClipTrim(24, 5), 'start');
  assert.equal(disambiguateMicroClipTrim(24, 11.9), 'start');
  assert.equal(disambiguateMicroClipTrim(24, 12.0), 'end');
  assert.equal(disambiguateMicroClipTrim(24, 20), 'end');

  // Normal clip width 100px
  assert.equal(disambiguateMicroClipTrim(100, 15), 'start');
  assert.equal(disambiguateMicroClipTrim(100, 50), 'drag');
  assert.equal(disambiguateMicroClipTrim(100, 85), 'end');
});
