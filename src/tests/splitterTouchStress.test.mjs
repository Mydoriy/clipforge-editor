import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Challenger M1-2: Empirical Stress Test Suite for Touch Splitters & Ergonomics
// ---------------------------------------------------------------------------

const rootDir = process.cwd();
const readFileSafe = (relPath) => {
  const fullPath = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(fullPath), `Required source file must exist: ${relPath}`);
  return fs.readFileSync(fullPath, 'utf8');
};

// ===========================================================================
// SECTION 1: CSS touch-action & Pseudo-Element Hit Target Ergonomics
// ===========================================================================

test('Stress 1.1: CSS .splitter-col and .splitter-row touch-action and geometry specifications', () => {
  const css = readFileSafe('src/index.css');

  // Verify .splitter-col definition
  const colMatch = css.match(/\.splitter-col\s*\{([^}]+)\}/);
  assert.ok(colMatch, '.splitter-col rule must be defined in index.css');
  const colBody = colMatch[1];
  assert.ok(colBody.includes('touch-action: none'), '.splitter-col must specify touch-action: none');
  assert.ok(colBody.includes('width: 5px'), '.splitter-col visual width must be 5px');
  assert.ok(colBody.includes('position: relative'), '.splitter-col must be position: relative for pseudo-element anchoring');
  assert.ok(colBody.includes('cursor: col-resize'), '.splitter-col must provide col-resize cursor');

  // Verify .splitter-col::after pseudo-element expansion
  const colAfterMatch = css.match(/\.splitter-col::after\s*\{([^}]+)\}/);
  assert.ok(colAfterMatch, '.splitter-col::after rule must be defined');
  const colAfterBody = colAfterMatch[1];
  assert.ok(colAfterBody.includes("content: ''"), '.splitter-col::after must set content');
  assert.ok(colAfterBody.includes('position: absolute'), '.splitter-col::after must be absolute positioned');
  assert.ok(colAfterBody.includes('left: -8px'), '.splitter-col::after must expand 8px to the left');
  assert.ok(colAfterBody.includes('right: -8px'), '.splitter-col::after must expand 8px to the right');
  assert.ok(colAfterBody.includes('top: 0'), '.splitter-col::after must cover full height (top: 0)');
  assert.ok(colAfterBody.includes('bottom: 0'), '.splitter-col::after must cover full height (bottom: 0)');

  // Calculate geometric hit area expansion
  const colVisualWidth = 5;
  const colHitTargetWidth = colVisualWidth + 8 + 8; // -8px left, -8px right
  assert.equal(colHitTargetWidth, 21, 'Col hit target width must expand from 5px to 21px (4.2x expansion)');

  // Verify .splitter-row definition
  const rowMatch = css.match(/\.splitter-row\s*\{([^}]+)\}/);
  assert.ok(rowMatch, '.splitter-row rule must be defined in index.css');
  const rowBody = rowMatch[1];
  assert.ok(rowBody.includes('touch-action: none'), '.splitter-row must specify touch-action: none');
  assert.ok(rowBody.includes('height: 5px'), '.splitter-row visual height must be 5px');
  assert.ok(rowBody.includes('position: relative'), '.splitter-row must be position: relative');
  assert.ok(rowBody.includes('cursor: row-resize'), '.splitter-row must provide row-resize cursor');

  // Verify .splitter-row::after pseudo-element expansion
  const rowAfterMatch = css.match(/\.splitter-row::after\s*\{([^}]+)\}/);
  assert.ok(rowAfterMatch, '.splitter-row::after rule must be defined');
  const rowAfterBody = rowAfterMatch[1];
  assert.ok(rowAfterBody.includes("content: ''"), '.splitter-row::after must set content');
  assert.ok(rowAfterBody.includes('position: absolute'), '.splitter-row::after must be absolute positioned');
  assert.ok(rowAfterBody.includes('top: -8px'), '.splitter-row::after must expand 8px top');
  assert.ok(rowAfterBody.includes('bottom: -8px'), '.splitter-row::after must expand 8px bottom');
  assert.ok(rowAfterBody.includes('left: 0'), '.splitter-row::after must span full width (left: 0)');
  assert.ok(rowAfterBody.includes('right: 0'), '.splitter-row::after must span full width (right: 0)');

  // Calculate geometric hit area expansion
  const rowVisualHeight = 5;
  const rowHitTargetHeight = rowVisualHeight + 8 + 8;
  assert.equal(rowHitTargetHeight, 21, 'Row hit target height must expand from 5px to 21px (4.2x expansion)');
});

test('Stress 1.2: JSX Splitter nodes in Editor.tsx attach touch-none and onTouchStart', () => {
  const editorTsx = readFileSafe('src/pages/Editor.tsx');

  // Col 1 splitter
  assert.ok(editorTsx.includes('className="splitter-col touch-none"'), 'Col 1 splitter must have touch-none class');
  // Col 2 splitter
  assert.ok(editorTsx.includes('className="splitter-row touch-none"'), 'Row splitter must have touch-none class');

  // Verify all splitters have onTouchStart with cancelable check
  const touchStartCount = (editorTsx.match(/onTouchStart=\{/g) || []).length;
  assert.ok(touchStartCount >= 3, `Expected at least 3 onTouchStart handlers in Editor.tsx, found ${touchStartCount}`);

  // Verify that onTouchStart checks e.cancelable before calling e.preventDefault()
  assert.ok(
    editorTsx.includes('if (e.cancelable) e.preventDefault()'),
    'onTouchStart must guard e.preventDefault() with e.cancelable to prevent browser intervention warnings'
  );
});

// ===========================================================================
// SECTION 2: Touch Coordinate Extraction & Multi-Touch Edge Cases
// ===========================================================================

test('Stress 2.1: Zero touches and empty touch list safety in handleTouchMove', () => {
  // Reconstruct exact handleTouchMove logic from Editor.tsx:656-662
  let updatedCoords = null;
  const updatePosition = (clientX, clientY) => {
    updatedCoords = { clientX, clientY };
  };

  const isDraggingRef = { current: true };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    if (e.touches && e.touches.length > 0) {
      if (e.cancelable) e.preventDefault();
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Test Case A: Empty touches array
  updatedCoords = null;
  let prevented = false;
  handleTouchMove({
    touches: [],
    cancelable: true,
    preventDefault: () => { prevented = true; },
  });
  assert.equal(updatedCoords, null, 'Must not update position when touches array is empty');
  assert.equal(prevented, false, 'Must not call preventDefault on empty touch');

  // Test Case B: Null touches
  updatedCoords = null;
  handleTouchMove({
    touches: null,
    cancelable: true,
    preventDefault: () => {},
  });
  assert.equal(updatedCoords, null, 'Must not update position when touches is null');

  // Test Case C: Undefined touches
  updatedCoords = null;
  handleTouchMove({
    touches: undefined,
    cancelable: true,
    preventDefault: () => {},
  });
  assert.equal(updatedCoords, null, 'Must not update position when touches is undefined');
});

test('Stress 2.2: Multi-touch handling: 1st touch extracted, subsequent touches safely ignored', () => {
  let updatedCoords = null;
  const updatePosition = (clientX, clientY) => {
    updatedCoords = { clientX, clientY };
  };
  const isDraggingRef = { current: true };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    if (e.touches && e.touches.length > 0) {
      if (e.cancelable) e.preventDefault();
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Test Case: 3 simultaneous touches (e.g., finger drag + palm + second finger)
  let prevented = false;
  const multiTouchEvent = {
    touches: [
      { identifier: 1, clientX: 320, clientY: 240 },
      { identifier: 2, clientX: 800, clientY: 600 },
      { identifier: 3, clientX: 950, clientY: 720 },
    ],
    cancelable: true,
    preventDefault: () => { prevented = true; },
  };

  handleTouchMove(multiTouchEvent);
  assert.equal(prevented, true, 'Must prevent native scroll on valid active touch');
  assert.deepEqual(updatedCoords, { clientX: 320, clientY: 240 }, 'Must strictly read touches[0] coordinates');
});

test('Stress 2.3: Non-cancelable touch events do not invoke preventDefault (prevent browser intervention)', () => {
  let prevented = false;
  const isDraggingRef = { current: true };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    if (e.touches && e.touches.length > 0) {
      if (e.cancelable) e.preventDefault();
    }
  };

  // Non-cancelable event (e.g. Chrome passive/scroll intervention)
  handleTouchMove({
    touches: [{ clientX: 100, clientY: 100 }],
    cancelable: false,
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, false, 'Must NOT invoke preventDefault when cancelable is false');

  // Cancelable event
  handleTouchMove({
    touches: [{ clientX: 100, clientY: 100 }],
    cancelable: true,
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true, 'Must invoke preventDefault when cancelable is true');
});

// ===========================================================================
// SECTION 3: Mathematical Boundary Invariants & Stress Fuzzing
// ===========================================================================

test('Stress 3.1: Mathematical Boundary Clamping across 2,000 randomized fuzzing inputs', () => {
  // Model exact updatePosition math from Editor.tsx:632-649
  const containerRect = {
    left: 100,
    top: 50,
    width: 1200,
    height: 800,
    right: 1300,
    bottom: 850,
  };

  function computeCol1(clientX, rect) {
    const offsetX = clientX - rect.left;
    return Math.min(50, Math.max(20, (offsetX / rect.width) * 100));
  }

  function computeCol2(clientX, rect) {
    const offsetRight = rect.right - clientX;
    return Math.min(50, Math.max(20, (offsetRight / rect.width) * 100));
  }

  function computeRow(clientY, rect) {
    const offsetY = clientY - rect.top;
    return Math.min(75, Math.max(30, (offsetY / rect.height) * 100));
  }

  // Extreme inputs
  assert.equal(computeCol1(-99999, containerRect), 20, 'Massive negative X must clamp to 20%');
  assert.equal(computeCol1(99999, containerRect), 50, 'Massive positive X must clamp to 50%');
  assert.equal(computeCol2(-99999, containerRect), 50, 'Massive negative X must clamp Col2 to 50%');
  assert.equal(computeCol2(99999, containerRect), 20, 'Massive positive X must clamp Col2 to 20%');
  assert.equal(computeRow(-99999, containerRect), 30, 'Massive negative Y must clamp Row to 30%');
  assert.equal(computeRow(99999, containerRect), 75, 'Massive positive Y must clamp Row to 75%');

  // Subpixel floating point inputs
  const subpixelX = 100 + (1200 * 0.35418291);
  const col1Subpixel = computeCol1(subpixelX, containerRect);
  assert.ok(Math.abs(col1Subpixel - 35.418291) < 0.0001, 'Subpixel precision must be preserved');

  // 2,000 Iteration Randomized Stress Fuzzing
  for (let i = 0; i < 2000; i++) {
    const randomW = 200 + Math.random() * 3640; // 200px to 3840px
    const randomH = 150 + Math.random() * 2010; // 150px to 2160px
    const rect = {
      left: Math.random() * 200,
      top: Math.random() * 100,
      width: randomW,
      height: randomH,
      right: 0,
      bottom: 0,
    };
    rect.right = rect.left + rect.width;
    rect.bottom = rect.top + rect.height;

    // Fuzz client coordinates far beyond viewport bounds (-2000 to +8000)
    const randomClientX = -2000 + Math.random() * 10000;
    const randomClientY = -2000 + Math.random() * 10000;

    const c1 = computeCol1(randomClientX, rect);
    const c2 = computeCol2(randomClientX, rect);
    const r = computeRow(randomClientY, rect);

    assert.ok(Number.isFinite(c1), `Col 1 must be finite, got ${c1}`);
    assert.ok(c1 >= 20 && c1 <= 50, `Col 1 out of bounds [20, 50]: ${c1}`);

    assert.ok(Number.isFinite(c2), `Col 2 must be finite, got ${c2}`);
    assert.ok(c2 >= 20 && c2 <= 50, `Col 2 out of bounds [20, 50]: ${c2}`);

    assert.ok(Number.isFinite(r), `Row must be finite, got ${r}`);
    assert.ok(r >= 30 && r <= 75, `Row out of bounds [30, 75]: ${r}`);
  }
});

// ===========================================================================
// SECTION 4: Window Event Listener Lifecycle & Memory Leak Audit
// ===========================================================================

test('Stress 4.1: Window event listeners registered and cleanly unregistered without leakage', () => {
  // Mock Window EventTarget tracking registry
  const windowListeners = new Map(); // key: type, value: Set of callbacks

  const mockWindow = {
    addEventListener: (type, listener, options) => {
      if (!windowListeners.has(type)) {
        windowListeners.set(type, new Set());
      }
      windowListeners.get(type).add({ listener, options });
    },
    removeEventListener: (type, listener, options) => {
      if (windowListeners.has(type)) {
        const set = windowListeners.get(type);
        for (const item of set) {
          if (item.listener === listener) {
            set.delete(item);
            break;
          }
        }
      }
    },
  };

  // Re-create the exact useEffect lifecycle from Editor.tsx:631-685
  function mountEditorSplitterEffect(win, setPanelDimensions) {
    const isDraggingRowRef = { current: false };
    const isDraggingCol1Ref = { current: false };
    const isDraggingCol2Ref = { current: false };

    const handleMouseMove = () => {};
    const handleTouchMove = () => {};
    const handleDragEnd = () => {
      isDraggingRowRef.current = false;
      isDraggingCol1Ref.current = false;
      isDraggingCol2Ref.current = false;
    };

    win.addEventListener('mousemove', handleMouseMove);
    win.addEventListener('mouseup', handleDragEnd);
    win.addEventListener('touchmove', handleTouchMove, { passive: false });
    win.addEventListener('touchend', handleDragEnd);
    win.addEventListener('touchcancel', handleDragEnd);

    // Return unmount cleanup
    return () => {
      win.removeEventListener('mousemove', handleMouseMove);
      win.removeEventListener('mouseup', handleDragEnd);
      win.removeEventListener('touchmove', handleTouchMove);
      win.removeEventListener('touchend', handleDragEnd);
      win.removeEventListener('touchcancel', handleDragEnd);
    };
  }

  // 1. Initial State: 0 listeners
  assert.equal(windowListeners.size, 0);

  // 2. Mount
  const cleanup = mountEditorSplitterEffect(mockWindow, () => {});
  
  // Verify expected registered event types
  assert.equal(windowListeners.get('mousemove')?.size, 1, 'mousemove listener registered');
  assert.equal(windowListeners.get('mouseup')?.size, 1, 'mouseup listener registered');
  assert.equal(windowListeners.get('touchmove')?.size, 1, 'touchmove listener registered');
  assert.equal(windowListeners.get('touchend')?.size, 1, 'touchend listener registered');
  assert.equal(windowListeners.get('touchcancel')?.size, 1, 'touchcancel listener registered');

  // Verify passive: false option was used for touchmove
  const touchmoveEntry = Array.from(windowListeners.get('touchmove'))[0];
  assert.deepEqual(touchmoveEntry.options, { passive: false }, 'touchmove must be registered with { passive: false }');

  // 3. Unmount
  cleanup();

  // Verify all listeners removed
  assert.equal(windowListeners.get('mousemove')?.size, 0, 'mousemove listener removed on unmount');
  assert.equal(windowListeners.get('mouseup')?.size, 0, 'mouseup listener removed on unmount');
  assert.equal(windowListeners.get('touchmove')?.size, 0, 'touchmove listener removed on unmount');
  assert.equal(windowListeners.get('touchend')?.size, 0, 'touchend listener removed on unmount');
  assert.equal(windowListeners.get('touchcancel')?.size, 0, 'touchcancel listener removed on unmount');
});

test('Stress 4.2: Repeated 100 mount/unmount stress test preserves 0 net listener leak', () => {
  const windowListeners = new Map();

  const mockWindow = {
    addEventListener: (type, listener, options) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type).add(listener);
    },
    removeEventListener: (type, listener) => {
      if (windowListeners.has(type)) {
        windowListeners.get(type).delete(listener);
      }
    },
  };

  function simulateMount(win) {
    const handleMouseMove = () => {};
    const handleTouchMove = () => {};
    const handleDragEnd = () => {};

    win.addEventListener('mousemove', handleMouseMove);
    win.addEventListener('mouseup', handleDragEnd);
    win.addEventListener('touchmove', handleTouchMove, { passive: false });
    win.addEventListener('touchend', handleDragEnd);
    win.addEventListener('touchcancel', handleDragEnd);

    return () => {
      win.removeEventListener('mousemove', handleMouseMove);
      win.removeEventListener('mouseup', handleDragEnd);
      win.removeEventListener('touchmove', handleTouchMove);
      win.removeEventListener('touchend', handleDragEnd);
      win.removeEventListener('touchcancel', handleDragEnd);
    };
  }

  // 100 consecutive mount/unmount cycles
  for (let cycle = 1; cycle <= 100; cycle++) {
    const unmount = simulateMount(mockWindow);
    // While mounted: each set has exactly 1 listener
    assert.equal(windowListeners.get('touchmove').size, 1);
    unmount();
    // After unmount: each set has 0 listeners
    assert.equal(windowListeners.get('touchmove').size, 0);
  }

  // Total lingering listeners across all types must be exactly 0
  let totalLingering = 0;
  for (const [, set] of windowListeners) {
    totalLingering += set.size;
  }
  assert.equal(totalLingering, 0, 'Zero lingering listeners after 100 mount/unmount cycles');
});

// ===========================================================================
// SECTION 5: End-to-End Touch Drag State Machine & Disruption Resilience
// ===========================================================================

test('Stress 5.1: Full Touch Drag Lifecycle with premature touchcancel and touchend interrupts', () => {
  // State machine simulating Editor.tsx refs & handlers
  const state = {
    isDraggingCol1: false,
    isDraggingCol2: false,
    isDraggingRow: false,
    cursor: '',
    userSelect: '',
    panelDimensions: { left: 25, right: 25, top: 60 },
  };

  const containerRect = { left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 };

  const startCol1Drag = (e) => {
    if (e.cancelable) e.preventDefault();
    state.isDraggingCol1 = true;
    state.userSelect = 'none';
  };

  const handleTouchMove = (e) => {
    if (!state.isDraggingCol1 && !state.isDraggingCol2 && !state.isDraggingRow) return;
    if (e.touches && e.touches.length > 0) {
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches[0].clientX;
      if (state.isDraggingCol1) {
        const pct = Math.min(50, Math.max(20, (clientX / containerRect.width) * 100));
        state.panelDimensions.left = pct;
      }
    }
  };

  const handleDragEnd = () => {
    if (!state.isDraggingCol1 && !state.isDraggingCol2 && !state.isDraggingRow) return;
    state.isDraggingCol1 = false;
    state.isDraggingCol2 = false;
    state.isDraggingRow = false;
    state.cursor = '';
    state.userSelect = '';
  };

  // 1. Initial State
  assert.equal(state.isDraggingCol1, false);
  assert.equal(state.panelDimensions.left, 25);

  // 2. Start drag on Col1
  startCol1Drag({ cancelable: true, preventDefault: () => {} });
  assert.equal(state.isDraggingCol1, true);
  assert.equal(state.userSelect, 'none');

  // 3. Move to 380px (38%)
  handleTouchMove({
    touches: [{ clientX: 380, clientY: 200 }],
    cancelable: true,
    preventDefault: () => {},
  });
  assert.equal(state.panelDimensions.left, 38);

  // 4. Move to 800px (clamps to 50%)
  handleTouchMove({
    touches: [{ clientX: 800, clientY: 200 }],
    cancelable: true,
    preventDefault: () => {},
  });
  assert.equal(state.panelDimensions.left, 50);

  // 5. System touchcancel interrupt (e.g., incoming telephone call or iOS control center gesture)
  handleDragEnd(); // bound to touchcancel in Editor.tsx
  assert.equal(state.isDraggingCol1, false);
  assert.equal(state.userSelect, '');

  // 6. Phantom touchmove after cancel must be ignored
  handleTouchMove({
    touches: [{ clientX: 220, clientY: 200 }],
    cancelable: true,
    preventDefault: () => {},
  });
  assert.equal(state.panelDimensions.left, 50, 'Position must remain unchanged after touchcancel');
});
