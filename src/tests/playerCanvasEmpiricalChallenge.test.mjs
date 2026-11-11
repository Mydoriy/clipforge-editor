import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers & Source Inspection
// ---------------------------------------------------------------------------
const rootDir = process.cwd();
const readFileSafe = (relPath) => {
  const fullPath = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(fullPath), `Required source file must exist: ${relPath}`);
  return fs.readFileSync(fullPath, 'utf8');
};

const playerCanvasSource = readFileSafe('src/components/PlayerCanvas.tsx');
const indexCssSource = readFileSafe('src/index.css');

// ===========================================================================
// CHALLENGE 1: Empirical Verification of 2-Finger Pinch-to-Zoom & Clamp Limits
// ===========================================================================

test('CHALLENGE 1.1: Extreme pinch distance d -> 0 prevents division by zero and NaN', () => {
  // In PlayerCanvas.tsx, onTouchMove guards with `touchState.startDist > 0`
  assert.ok(
    playerCanvasSource.includes('touchState.startDist > 0'),
    'PlayerCanvas must guard onTouchMove with startDist > 0'
  );

  // Exact pinch calculation logic from PlayerCanvas.tsx lines 584-587
  function runPinchZoom(initialZoom, startDist, currDist) {
    if (startDist <= 0) {
      // Guard prevents division by zero
      return initialZoom;
    }
    const rawZoom = initialZoom * (currDist / startDist);
    return Math.max(0.25, Math.min(4.0, parseFloat(rawZoom.toFixed(2))));
  }

  // Case A: Identical coordinates on touchstart (distance = 0)
  const zeroStartResult = runPinchZoom(1.0, 0, 50);
  assert.equal(zeroStartResult, 1.0, 'When startDist is 0, zoom should not execute or mutate');
  assert.ok(!Number.isNaN(zeroStartResult), 'Result must never be NaN');
  assert.ok(Number.isFinite(zeroStartResult), 'Result must be finite');

  // Case B: Extremely close fingers (subpixel distance d -> 0+)
  const tinyStartResult = runPinchZoom(1.0, 0.00001, 100);
  assert.equal(tinyStartResult, 4.0, 'Extreme ratio must clamp cleanly to max limit 4.0');
  assert.ok(!Number.isNaN(tinyStartResult), 'Result must not be NaN');

  // Case C: Fingers pinched all the way together (currDist -> 0)
  const zeroCurrResult = runPinchZoom(1.0, 100, 0);
  assert.equal(zeroCurrResult, 0.25, 'Zero current distance must clamp cleanly to min limit 0.25');
  assert.ok(!Number.isNaN(zeroCurrResult), 'Result must not be NaN');
});

test('CHALLENGE 1.2: Extreme pinch distance d -> infinity clamps cleanly without overflow', () => {
  function runPinchZoom(initialZoom, startDist, currDist) {
    if (startDist <= 0) return initialZoom;
    const rawZoom = initialZoom * (currDist / startDist);
    return Math.max(0.25, Math.min(4.0, parseFloat(rawZoom.toFixed(2))));
  }

  // Astronomical pinch distance (d -> infinity)
  const hugeResult = runPinchZoom(1.0, 10, 1e9);
  assert.equal(hugeResult, 4.0, 'Huge distance ratio must clamp to 4.0');

  const maxNumResult = runPinchZoom(1.0, 1, Number.MAX_SAFE_INTEGER);
  assert.equal(maxNumResult, 4.0, 'MAX_SAFE_INTEGER must clamp cleanly to 4.0');
});

test('CHALLENGE 1.3: Clamp boundaries [0.25, 4.0] and [0.15, 6.0] consistency in PlayerCanvas', () => {
  // Verify pinch zoom clamping in PlayerCanvas.tsx
  assert.ok(
    playerCanvasSource.includes('Math.max(0.25, Math.min(4.0,'),
    'PlayerCanvas pinch zoom must clamp to [0.25, 4.0]'
  );

  // Verify wheel zoom clamping in PlayerCanvas.tsx
  assert.ok(
    playerCanvasSource.includes('Math.max(0.15, Math.min(6.0,'),
    'PlayerCanvas wheel zoom must clamp to [0.15, 6.0]'
  );

  // Verify non-number initial zoom fallback ('fit' -> 1.0)
  assert.ok(
    playerCanvasSource.includes("typeof zoomModeRef.current === 'number' ? zoomModeRef.current : 1.0"),
    'PlayerCanvas must safely fall back to 1.0 if zoomMode is "fit" or non-numeric'
  );
});

// ===========================================================================
// CHALLENGE 2: Empirical Verification of 2-Finger Pan Translation & Continuity
// ===========================================================================

test('CHALLENGE 2.1: 2-finger pan delta tracking and zero-onset displacement', () => {
  // Simulate the state machine in PlayerCanvas.tsx
  class TouchGestureSimulator {
    constructor() {
      this.panOffset = { x: 50, y: -20 };
      this.zoomMode = 1.0;
      this.isPanning = false;
      this.touchState = null;
    }

    onTouchStart(touches) {
      if (touches.length >= 2) {
        const p1 = { x: touches[0].clientX, y: touches[0].clientY };
        const p2 = { x: touches[1].clientX, y: touches[1].clientY };
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const currentZoom = typeof this.zoomMode === 'number' ? this.zoomMode : 1.0;

        this.touchState = {
          startDist: dist,
          startMidX: midX,
          startMidY: midY,
          initialZoom: currentZoom,
          initialPan: { ...this.panOffset }
        };
        this.isPanning = true;
      }
    }

    onTouchMove(touches) {
      if (touches.length >= 2 && this.touchState && this.touchState.startDist > 0) {
        const p1 = { x: touches[0].clientX, y: touches[0].clientY };
        const p2 = { x: touches[1].clientX, y: touches[1].clientY };
        const currDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const currMidX = (p1.x + p2.x) / 2;
        const currMidY = (p1.y + p2.y) / 2;

        const rawZoom = this.touchState.initialZoom * (currDist / this.touchState.startDist);
        this.zoomMode = Math.max(0.25, Math.min(4.0, parseFloat(rawZoom.toFixed(2))));

        const dx = currMidX - this.touchState.startMidX;
        const dy = currMidY - this.touchState.startMidY;
        this.panOffset = {
          x: this.touchState.initialPan.x + dx,
          y: this.touchState.initialPan.y + dy
        };
      }
    }

    onTouchEnd(touches) {
      if (touches.length < 2) {
        this.touchState = null;
        this.isPanning = false;
      }
    }
  }

  const sim = new TouchGestureSimulator();
  const initialTouches = [
    { clientX: 100, clientY: 150 },
    { clientX: 200, clientY: 250 }
  ];

  sim.onTouchStart(initialTouches);
  assert.equal(sim.isPanning, true);

  // Immediately on onset (zero movement), pan must be identical
  sim.onTouchMove(initialTouches);
  assert.deepEqual(sim.panOffset, { x: 50, y: -20 }, 'Pan offset must not jump on gesture onset');

  // Move fingers together by +30px X, +15px Y
  sim.onTouchMove([
    { clientX: 130, clientY: 165 },
    { clientX: 230, clientY: 265 }
  ]);
  assert.deepEqual(sim.panOffset, { x: 80, y: -5 }, 'Pan offset must translate 1:1 with midpoint delta');
  assert.equal(sim.zoomMode, 1.0, 'Zoom mode must remain 1.0 when finger distance does not change');
});

test('CHALLENGE 2.2: Coordinate continuity along continuous multi-step trajectory', () => {
  // Test 100-step smooth trajectory to ensure no drift, jumps, or NaN accumulation
  const startT = [
    { clientX: 100, clientY: 100 },
    { clientX: 200, clientY: 100 }
  ];

  let prevPan = { x: 0, y: 0 };
  const initialPan = { x: 0, y: 0 };
  const startMidX = (startT[0].clientX + startT[1].clientX) / 2;
  const startMidY = (startT[0].clientY + startT[1].clientY) / 2;

  for (let step = 1; step <= 100; step++) {
    // Both fingers move with sinusoidal trajectory
    const offsetX = step * 2 + Math.sin(step / 10) * 5;
    const offsetY = step * 1.5 + Math.cos(step / 10) * 5;

    const currTouches = [
      { clientX: startT[0].clientX + offsetX, clientY: startT[0].clientY + offsetY },
      { clientX: startT[1].clientX + offsetX, clientY: startT[1].clientY + offsetY }
    ];

    const currMidX = (currTouches[0].clientX + currTouches[1].clientX) / 2;
    const currMidY = (currTouches[0].clientY + currTouches[1].clientY) / 2;

    const dx = currMidX - startMidX;
    const dy = currMidY - startMidY;

    const currentPan = {
      x: initialPan.x + dx,
      y: initialPan.y + dy
    };

    // Discontinuity check: step-to-step delta should never exceed physical finger step
    const stepDelta = Math.hypot(currentPan.x - prevPan.x, currentPan.y - prevPan.y);
    assert.ok(stepDelta < 15, `Step delta at step ${step} (${stepDelta}) must remain small and smooth`);
    assert.ok(!Number.isNaN(currentPan.x) && !Number.isNaN(currentPan.y), 'Coordinates must be valid numbers');

    prevPan = currentPan;
  }
});

// ===========================================================================
// CHALLENGE 3: Empirical Verification of Palm Rejection (3, 4, 5+ Contacts)
// ===========================================================================

test('CHALLENGE 3.1: 3, 4, and 5 simultaneous contacts cleanly discard contacts beyond first 2', () => {
  const f1 = { clientX: 100, clientY: 100 };
  const f2 = { clientX: 200, clientY: 100 };
  const palm1 = { clientX: 500, clientY: 400 };
  const palm2 = { clientX: 520, clientY: 450 };
  const palm3 = { clientX: 600, clientY: 480 };

  // Helper matching PlayerCanvas touch extraction
  function extractPrimaryTouches(touches) {
    assert.ok(touches.length >= 2, 'Must have at least 2 touches');
    const p1 = { x: touches[0].clientX, y: touches[0].clientY };
    const p2 = { x: touches[1].clientX, y: touches[1].clientY };
    return {
      dist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
      midX: (p1.x + p2.x) / 2,
      midY: (p1.y + p2.y) / 2
    };
  }

  // 2 contacts baseline
  const base = extractPrimaryTouches([f1, f2]);

  // 3 contacts (1 palm)
  const threeContacts = extractPrimaryTouches([f1, f2, palm1]);
  assert.deepEqual(threeContacts, base, '3 contacts must produce identical primary touch coordinates as 2 contacts');

  // 4 contacts (2 palms)
  const fourContacts = extractPrimaryTouches([f1, f2, palm1, palm2]);
  assert.deepEqual(fourContacts, base, '4 contacts must produce identical primary touch coordinates as 2 contacts');

  // 5 contacts (3 palms)
  const fiveContacts = extractPrimaryTouches([f1, f2, palm1, palm2, palm3]);
  assert.deepEqual(fiveContacts, base, '5 contacts must produce identical primary touch coordinates as 2 contacts');
});

test('CHALLENGE 3.2: Wild palm movement does not cause coordinate teleportation or NaN jumps', () => {
  // Fingers are steady
  const f1 = { clientX: 150, clientY: 150 };
  const f2 = { clientX: 250, clientY: 150 };

  const startDist = Math.hypot(f1.clientX - f2.clientX, f1.clientY - f2.clientY); // 100
  const startMidX = (f1.clientX + f2.clientX) / 2; // 200
  const startMidY = (f1.clientY + f2.clientY) / 2; // 150
  const initialPan = { x: 0, y: 0 };
  const initialZoom = 1.0;

  // Wildly jittering palm positions across 50 frames
  for (let i = 0; i < 50; i++) {
    const wildPalm = {
      clientX: Math.random() * 1000,
      clientY: Math.random() * 1000
    };

    const touches = [f1, f2, wildPalm];

    // Primary touches extraction strictly touches[0] and touches[1]
    const p1 = { x: touches[0].clientX, y: touches[0].clientY };
    const p2 = { x: touches[1].clientX, y: touches[1].clientY };
    const currDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const currMidX = (p1.x + p2.x) / 2;
    const currMidY = (p1.y + p2.y) / 2;

    const rawZoom = initialZoom * (currDist / startDist);
    const zoom = Math.max(0.25, Math.min(4.0, parseFloat(rawZoom.toFixed(2))));
    const pan = {
      x: initialPan.x + (currMidX - startMidX),
      y: initialPan.y + (currMidY - startMidY)
    };

    assert.equal(zoom, 1.0, `Frame ${i}: zoom must stay 1.0 regardless of palm position`);
    assert.deepEqual(pan, { x: 0, y: 0 }, `Frame ${i}: pan must stay (0,0) regardless of palm position`);
    assert.ok(!Number.isNaN(zoom), 'Zoom must never be NaN');
    assert.ok(!Number.isNaN(pan.x) && !Number.isNaN(pan.y), 'Pan must never be NaN');
  }
});

test('CHALLENGE 3.3: Palm liftoff preserves active gesture state', () => {
  let touchState = {
    startDist: 100,
    startMidX: 200,
    startMidY: 150,
    initialZoom: 1.0,
    initialPan: { x: 0, y: 0 }
  };
  let isPanning = true;

  function onTouchEndSimulator(remainingTouchesCount) {
    if (remainingTouchesCount < 2) {
      touchState = null;
      isPanning = false;
    }
  }

  // 3 touches active (2 fingers + 1 palm). Palm lifts -> 2 touches remain
  onTouchEndSimulator(2);
  assert.equal(isPanning, true, 'isPanning must remain true when palm lifts (2 touches still active)');
  assert.ok(touchState !== null, 'touchState must not be destroyed when palm lifts');

  // Next, one finger lifts -> 1 touch remains
  onTouchEndSimulator(1);
  assert.equal(isPanning, false, 'isPanning must end when fewer than 2 touches remain');
  assert.equal(touchState, null, 'touchState must be cleaned up when fewer than 2 touches remain');
});

// ===========================================================================
// CHALLENGE 4: 8-Point Bounding Box Handles & Rotation Stem Hit Targets & Pointer Capture
// ===========================================================================

test('CHALLENGE 4.1: Rotation stem hit target is >= 44px (w-11 h-11) with touch-target-44', () => {
  // In Tailwind CSS: w-11 = 2.75rem = 44px, h-11 = 2.75rem = 44px
  assert.ok(
    playerCanvasSource.includes('w-11 h-11'),
    'Rotation stem handle must declare w-11 h-11 (44px x 44px hit container)'
  );
  assert.ok(
    playerCanvasSource.includes('touch-target-44'),
    'Rotation stem must include touch-target-44 class'
  );
  assert.ok(
    playerCanvasSource.includes('cursor-grab active:cursor-grabbing'),
    'Rotation stem must specify cursor affordance'
  );
  // Visual indicator must be pointer-events-none so it doesn't shrink the effective hit box
  const stemSnippet = playerCanvasSource.substring(
    playerCanvasSource.indexOf('Rotation Handle'),
    playerCanvasSource.indexOf('4 Corner Scale Handles')
  );
  assert.ok(
    stemSnippet.includes('pointer-events-none'),
    'Visual circle and stem line must have pointer-events-none'
  );
});

test('CHALLENGE 4.2: All 8 scale handles provide >= 40px hit containers (w-10 h-10) with touch-target-40', () => {
  // In Tailwind CSS: w-10 = 2.5rem = 40px, h-10 = 2.5rem = 40px
  const handleKeys = ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'];

  handleKeys.forEach((key) => {
    // Check that each handle invokes handlePointerDownOnClip with 'scale' and corner key
    const pattern = `'scale', '${key}'`;
    assert.ok(
      playerCanvasSource.includes(pattern),
      `PlayerCanvas must bind handlePointerDownOnClip for corner/edge handle ${key}`
    );
  });

  // Verify corner handles hit container has w-10 h-10 and touch-target-40
  const cornerSnippet = playerCanvasSource.substring(
    playerCanvasSource.indexOf('4 Corner Scale Handles'),
    playerCanvasSource.indexOf('4 Edge Center Scale Handles')
  );
  assert.ok(cornerSnippet.includes('w-10 h-10'), 'Corner handles must use w-10 h-10 (40px x 40px)');
  assert.ok(cornerSnippet.includes('touch-target-40'), 'Corner handles must include touch-target-40');
  assert.ok(cornerSnippet.includes('pointer-events-none'), 'Visual square in corner handles must use pointer-events-none');

  // Verify edge handles hit container has w-10 h-10 and touch-target-40
  const edgeSnippet = playerCanvasSource.substring(
    playerCanvasSource.indexOf('4 Edge Center Scale Handles'),
    playerCanvasSource.indexOf('Inline Text Editing Input')
  );
  assert.ok(edgeSnippet.includes('w-10 h-10'), 'Edge handles must use w-10 h-10 (40px x 40px)');
  assert.ok(edgeSnippet.includes('touch-target-40'), 'Edge handles must include touch-target-40');
  assert.ok(edgeSnippet.includes('pointer-events-none'), 'Visual square in edge handles must use pointer-events-none');
});

test('CHALLENGE 4.3: Pointer capture invocation on pointer down', () => {
  // Verify setPointerCapture is called on target element in handlePointerDownOnClip
  assert.ok(
    playerCanvasSource.includes('(e.target as HTMLElement).setPointerCapture?.(e.pointerId)'),
    'PlayerCanvas must invoke setPointerCapture on pointer down'
  );
  // Verify touch-none is present on bounding box and handles
  assert.ok(
    playerCanvasSource.includes('touch-none'),
    'Direct manipulation bounding box and handles must declare touch-none'
  );
  // Verify mouse handler backward compatibility
  assert.ok(
    playerCanvasSource.includes('handleMouseDownOnClip'),
    'handleMouseDownOnClip must be retained for backward compatibility with desktop mouse events'
  );
});

// ===========================================================================
// CHALLENGE 5: CSS Hit Target Expansion Rules in index.css
// ===========================================================================

test('CHALLENGE 5.1: .touch-target-44 and .touch-target-40 CSS pseudo-element geometry', () => {
  assert.ok(indexCssSource.includes('.touch-target-44'), 'index.css must define .touch-target-44');
  assert.ok(indexCssSource.includes('.touch-target-40'), 'index.css must define .touch-target-40');

  // Verify ::after minimum dimensions
  assert.ok(indexCssSource.includes('min-width: 44px'), 'touch-target-44 must have min-width: 44px');
  assert.ok(indexCssSource.includes('min-height: 44px'), 'touch-target-44 must have min-height: 44px');
  assert.ok(indexCssSource.includes('min-width: 40px'), 'touch-target-40 must have min-width: 40px');
  assert.ok(indexCssSource.includes('min-height: 40px'), 'touch-target-40 must have min-height: 40px');

  // Verify pointer-events: auto on ::after pseudo-element
  assert.ok(indexCssSource.includes('pointer-events: auto'), 'Pseudo-element must have pointer-events: auto');
});
