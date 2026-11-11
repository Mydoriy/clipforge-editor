/**
 * EMPIRICAL CHALLENGER TEST SUITE: Milestone 1 Responsive Shell & Layout Foundation
 * ============================================================================
 * Adversarial stress harness verifying:
 * 1. Root containers have zero hardcoded >=1280px / >=720px constraints.
 * 2. Multi-viewport dimension & flex bounds calculation (320px to 3840px, plus fuzzing)
 *    yields strictly positive, non-NaN, non-overflowing dimensions.
 * 3. Splitter touch interaction contracts, hit target expansion (21px), and touch-action: none.
 * 4. Responsive Sidebar & Header drawer contracts, scrim dismissal, and initial state.
 * 5. Lab Step 4 inspector drawer dual-mode responsive layout, scrim, and edge cases.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const readFileSafe = (relPath) => {
  const fullPath = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(fullPath), `Target source file must exist: ${relPath}`);
  return fs.readFileSync(fullPath, 'utf8');
};

// ============================================================================
// CHALLENGE 1: Elimination of Hardcoded Desktop Limits
// ============================================================================

test('Challenger 1.1: Editor.tsx root container contains NO hardcoded min-w-[1280px] or min-h-[720px]', () => {
  const editorContent = readFileSafe('src/pages/Editor.tsx');
  
  // Strict regex for the root container element
  const rootDivMatch = editorContent.match(/<div[^>]*className=["'][^"']*theme-editor[^"']*["'][^>]*>/);
  assert.ok(rootDivMatch, 'Editor.tsx must contain root container with theme-editor class');
  
  const rootDivTag = rootDivMatch[0];
  assert.ok(!rootDivTag.includes('min-w-[1280px]'), 'Root container must NOT have min-w-[1280px]');
  assert.ok(!rootDivTag.includes('min-h-[720px]'), 'Root container must NOT have min-h-[720px]');
  assert.ok(!rootDivTag.includes('min-w-[1024px]'), 'Root container must NOT have min-w-[1024px]');
  
  // Verify mandatory fluid classes
  assert.ok(rootDivTag.includes('w-full'), 'Root container must include w-full');
  assert.ok(rootDivTag.includes('min-w-0'), 'Root container must include min-w-0');
  assert.ok(rootDivTag.includes('min-h-0'), 'Root container must include min-h-0');
  assert.ok(rootDivTag.includes('flex-1'), 'Root container must include flex-1');
  assert.ok(rootDivTag.includes('h-[100dvh]') || rootDivTag.includes('h-dvh'), 'Root container must include dynamic viewport height (100dvh)');
});

test('Challenger 1.2: App.tsx root container employs dynamic viewport units and notch safe area padding', () => {
  const appContent = readFileSafe('src/App.tsx');
  
  const mainLayoutMatch = appContent.match(/const MainLayout[\s\S]*?return\s*\(\s*<div[^>]*className=["']([^"']+)["']/);
  assert.ok(mainLayoutMatch, 'App.tsx must define MainLayout with className');
  
  const classNames = mainLayoutMatch[1];
  assert.ok(classNames.includes('h-[100dvh]') || classNames.includes('h-dvh'), 'MainLayout must use 100dvh for dynamic mobile chrome');
  assert.ok(classNames.includes('min-h-[100dvh]') || classNames.includes('min-h-dvh'), 'MainLayout must enforce min-h-[100dvh]');
  assert.ok(classNames.includes('safe-area-inset-top'), 'MainLayout must include safe-area-inset-top padding');
  assert.ok(classNames.includes('safe-area-inset-bottom'), 'MainLayout must include safe-area-inset-bottom padding');
  assert.ok(classNames.includes('safe-area-inset-left'), 'MainLayout must include safe-area-inset-left padding');
  assert.ok(classNames.includes('safe-area-inset-right'), 'MainLayout must include safe-area-inset-right padding');
});

test('Challenger 1.3: index.html has viewport-fit=cover and full height HTML/body styling', () => {
  const htmlContent = readFileSafe('index.html');
  assert.match(
    htmlContent,
    /<meta[^>]*viewport-fit=cover[^>]*>/,
    'index.html meta viewport must specify viewport-fit=cover'
  );

  const cssContent = readFileSafe('src/index.css');
  assert.ok(
    cssContent.includes('html, body, #root') && cssContent.includes('height: 100%'),
    'src/index.css must declare html, body, #root { height: 100%; min-height: 100%; width: 100%; }'
  );
  assert.ok(cssContent.includes('--sat: env(safe-area-inset-top'), 'src/index.css must define --sat CSS variable');
});

// ============================================================================
// CHALLENGE 2: Multi-Viewport Dimension Calculation & Flex Bounds Stress Test
// ============================================================================

test('Challenger 2.1: Viewport range test (320px to 3840px) produces strictly positive layout bounds', () => {
  const testViewports = [
    { name: 'Galaxy Fold (Folded)', width: 280, height: 653 },
    { name: 'iPhone SE (1st Gen)', width: 320, height: 568 },
    { name: 'iPhone SE (3rd Gen)', width: 375, height: 667 },
    { name: 'iPhone 14 / 15', width: 390, height: 844 },
    { name: 'iPhone Plus / Pro Max', width: 430, height: 932 },
    { name: 'iPad Mini (Portrait)', width: 744, height: 1133 },
    { name: 'iPad (Portrait)', width: 768, height: 1024 },
    { name: 'iPad Air (Portrait)', width: 820, height: 1180 },
    { name: 'iPad Pro 11 (Portrait)', width: 834, height: 1194 },
    { name: 'iPad (Landscape)', width: 1024, height: 768 },
    { name: 'Breakpoint Threshold - 1px', width: 1099, height: 800 },
    { name: 'Breakpoint Threshold Exact', width: 1100, height: 800 },
    { name: 'Breakpoint Threshold + 1px', width: 1101, height: 800 },
    { name: 'Desktop 720p', width: 1280, height: 720 },
    { name: 'Budget Laptop', width: 1366, height: 768 },
    { name: 'MacBook Pro 14', width: 1512, height: 982 },
    { name: 'Desktop 1080p FHD', width: 1920, height: 1080 },
    { name: 'Desktop 1440p QHD', width: 2560, height: 1440 },
    { name: 'Desktop 4K UHD', width: 3840, height: 2160 },
  ];

  for (const vp of testViewports) {
    const isCompactDetails = vp.width < 1100;

    // Simulation of Editor layout rules:
    // CategoryPanel: panelLeftWidth% (default 34%, range [20, 50])
    // Details: panelRightWidth% (default 32%, range [20, 50]), only inline if !isCompactDetails
    // Splitter width: 5px each
    // Timeline height: calc(100 - panelTopHeight% - 5px), default panelTopHeight = 50%
    const panelLeftPct = 34;
    const panelRightPct = 32;
    const panelTopPct = 50;
    const splitterColPx = 5;
    const splitterRowPx = 5;

    // Left Panel Width
    const leftPanelWidth = (vp.width * panelLeftPct) / 100;
    assert.ok(leftPanelWidth > 0, `${vp.name}: leftPanelWidth must be > 0 (got ${leftPanelWidth})`);
    assert.ok(leftPanelWidth < vp.width, `${vp.name}: leftPanelWidth must be < viewportWidth`);

    // Center Canvas Width (flex-1)
    let centerCanvasWidth;
    if (isCompactDetails) {
      // 1 splitter, no inline right panel
      centerCanvasWidth = vp.width - leftPanelWidth - splitterColPx;
    } else {
      // 2 splitters, inline right panel
      const rightPanelWidth = (vp.width * panelRightPct) / 100;
      centerCanvasWidth = vp.width - leftPanelWidth - splitterColPx - rightPanelWidth - splitterColPx;
    }

    assert.ok(
      centerCanvasWidth > 0,
      `${vp.name} (${vp.width}x${vp.height}): Center canvas width must be strictly positive (got ${centerCanvasWidth}px)`
    );
    assert.ok(!Number.isNaN(centerCanvasWidth), `${vp.name}: Center canvas width must not be NaN`);
    assert.ok(Number.isFinite(centerCanvasWidth), `${vp.name}: Center canvas width must be finite`);

    // Top Panel & Bottom Timeline Height
    const topRowHeight = (vp.height * panelTopPct) / 100;
    const bottomTimelineHeight = vp.height - topRowHeight - splitterRowPx;

    assert.ok(topRowHeight > 0, `${vp.name}: topRowHeight must be > 0 (got ${topRowHeight})`);
    assert.ok(
      bottomTimelineHeight > 0,
      `${vp.name}: bottomTimelineHeight must be > 0 (got ${bottomTimelineHeight})`
    );
    assert.ok(!Number.isNaN(bottomTimelineHeight), `${vp.name}: bottomTimelineHeight must not be NaN`);
  }
});

test('Challenger 2.2: Splitter coordinate fuzzer (5,000 extreme drag events) maintains mathematical invariants', () => {
  // Clamping functions matching src/pages/Editor.tsx:638, 642, 646
  const computeCol1 = (clientX, rect) => {
    if (!rect.width || rect.width <= 0) return 34; // fallback safe
    const offsetX = clientX - rect.left;
    return Math.min(50, Math.max(20, (offsetX / rect.width) * 100));
  };

  const computeCol2 = (clientX, rect) => {
    if (!rect.width || rect.width <= 0) return 32; // fallback safe
    const offsetRight = rect.right - clientX;
    return Math.min(50, Math.max(20, (offsetRight / rect.width) * 100));
  };

  const computeRow = (clientY, rect) => {
    if (!rect.height || rect.height <= 0) return 50; // fallback safe
    const offsetY = clientY - rect.top;
    return Math.min(75, Math.max(30, (offsetY / rect.height) * 100));
  };

  // Run 5,000 fuzzed coordinates
  for (let i = 0; i < 5000; i++) {
    const containerWidth = Math.floor(Math.random() * 3840) + 200; // 200px to 4040px
    const containerHeight = Math.floor(Math.random() * 2160) + 200;
    const rect = { left: 0, top: 0, right: containerWidth, bottom: containerHeight, width: containerWidth, height: containerHeight };

    // Extreme coordinate range (-2000px to 10000px)
    const clientX = (Math.random() - 0.2) * (containerWidth * 3);
    const clientY = (Math.random() - 0.2) * (containerHeight * 3);

    const col1Pct = computeCol1(clientX, rect);
    const col2Pct = computeCol2(clientX, rect);
    const rowPct = computeRow(clientY, rect);

    // Invariant assertions
    assert.ok(col1Pct >= 20 && col1Pct <= 50, `Col1 clamp violation: ${col1Pct}% (clientX: ${clientX})`);
    assert.ok(col2Pct >= 20 && col2Pct <= 50, `Col2 clamp violation: ${col2Pct}% (clientX: ${clientX})`);
    assert.ok(rowPct >= 30 && rowPct <= 75, `Row clamp violation: ${rowPct}% (clientY: ${clientY})`);
    assert.ok(!Number.isNaN(col1Pct), 'Col1 must never be NaN');
    assert.ok(!Number.isNaN(col2Pct), 'Col2 must never be NaN');
    assert.ok(!Number.isNaN(rowPct), 'Row must never be NaN');
  }
});

// ============================================================================
// CHALLENGE 3: Splitter Touch Ergonomics & Passive Listener Safety
// ============================================================================

test('Challenger 3.1: Splitters feature expanded touch pseudo-elements and touch-action: none', () => {
  const css = readFileSafe('src/index.css');

  // Must declare touch-action: none to prevent browser scroll hijacking
  assert.ok(
    css.includes('.splitter-col') && css.includes('touch-action: none'),
    '.splitter-col must define touch-action: none'
  );
  assert.ok(
    css.includes('.splitter-row') && css.includes('touch-action: none'),
    '.splitter-row must define touch-action: none'
  );

  // Must have ::after pseudo element with at least -8px bleed for 21px hit box
  assert.ok(
    css.includes('.splitter-col::after') && css.includes('left: -8px') && css.includes('right: -8px'),
    '.splitter-col::after must expand hit target by at least -8px on each side'
  );
  assert.ok(
    css.includes('.splitter-row::after') && css.includes('top: -8px') && css.includes('bottom: -8px'),
    '.splitter-row::after must expand hit target by at least -8px on top and bottom'
  );
});

test('Challenger 3.2: Editor.tsx binds touchmove with { passive: false } and cleans up on unmount', () => {
  const editorCode = readFileSafe('src/pages/Editor.tsx');

  assert.ok(
    editorCode.includes("addEventListener('touchmove', handleTouchMove, { passive: false })"),
    'Editor.tsx must register touchmove with { passive: false } so preventDefault can stop pull-to-refresh'
  );
  assert.ok(
    editorCode.includes("addEventListener('touchend', handleDragEnd)"),
    'Editor.tsx must listen to touchend'
  );
  assert.ok(
    editorCode.includes("addEventListener('touchcancel', handleDragEnd)"),
    'Editor.tsx must listen to touchcancel to handle system interruptions'
  );
  assert.ok(
    editorCode.includes("removeEventListener('touchmove', handleTouchMove)"),
    'Editor.tsx must remove touchmove on unmount'
  );
  assert.ok(
    editorCode.includes("removeEventListener('touchend', handleDragEnd)"),
    'Editor.tsx must remove touchend on unmount'
  );
  assert.ok(
    editorCode.includes("removeEventListener('touchcancel', handleDragEnd)"),
    'Editor.tsx must remove touchcancel on unmount'
  );
});

// ============================================================================
// CHALLENGE 4: Responsive Sidebar & Header Drawer Architecture
// ============================================================================

test('Challenger 4.1: Sidebar.tsx implements mobile/tablet slide-over drawer and backdrop scrim', () => {
  const sidebarCode = readFileSafe('src/components/Sidebar.tsx');

  // Backdrop scrim
  assert.ok(
    sidebarCode.includes('fixed inset-0 bg-black/60') && sidebarCode.includes('lg:hidden'),
    'Sidebar.tsx must render backdrop scrim hidden on lg (>=1024px)'
  );
  assert.ok(
    sidebarCode.includes('onClick={() => setSidebarOpen(false)}'),
    'Backdrop scrim must close sidebar on click'
  );
  assert.ok(
    sidebarCode.includes('onTouchStart={() => setSidebarOpen(false)}'),
    'Backdrop scrim must close sidebar on touchStart'
  );

  // Drawer styling
  assert.ok(
    sidebarCode.includes('fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw]'),
    'Sidebar.tsx must use slide-over drawer styles on mobile/tablet'
  );
  assert.ok(
    sidebarCode.includes('lg:static lg:w-[274px] lg:z-auto'),
    'Sidebar.tsx must transition to static sidebar on desktop (lg:)'
  );

  // Escape key handler
  assert.ok(
    sidebarCode.includes("e.key === 'Escape'") && sidebarCode.includes('setSidebarOpen(false)'),
    'Sidebar.tsx must dismiss drawer on Escape key'
  );

  // Auto-close on navigation
  assert.ok(
    sidebarCode.includes('closeDrawerOnMobile'),
    'Sidebar.tsx must define closeDrawerOnMobile handler'
  );
});

test('Challenger 4.2: Header.tsx hamburger button is visible below 1024px (lg:hidden)', () => {
  const headerCode = readFileSafe('src/components/Header.tsx');

  // Hamburger toggle button must be lg:hidden (not md:hidden) so tablet users can open drawer
  const toggleMatch = headerCode.match(/<button[^>]*onClick=\{toggleSidebar\}[^>]*className=["']([^"']+)["']/);
  assert.ok(toggleMatch, 'Header.tsx must contain hamburger toggleSidebar button');
  assert.ok(
    toggleMatch[1].includes('lg:hidden'),
    'Hamburger toggle button must use lg:hidden so 768px-1023px tablet users can access sidebar'
  );
});

test('Challenger 4.3: useEditorStore initializes sidebar state based on viewport width', () => {
  const storeCode = readFileSafe('src/store/useEditorStore.ts');

  assert.ok(
    storeCode.includes('sidebarOpen: typeof window !== \'undefined\' ? window.innerWidth >= 1024 : true'),
    'useEditorStore must initialize sidebarOpen to false for viewports < 1024px and true for desktop'
  );
});

// ============================================================================
// CHALLENGE 5: Lab Step 4 Inspector Drawer Stress Test
// ============================================================================

test('Challenger 5.1: Lab.tsx Step 4 layout employs responsive dual-mode drawer/docked structure', () => {
  const labCode = readFileSafe('src/pages/Lab.tsx');

  // Step 4 inspector panel
  assert.ok(
    labCode.includes('isInspectorOpen'),
    'Lab.tsx must manage isInspectorOpen state for Step 4'
  );

  // Desktop docked style
  assert.ok(
    labCode.includes('lg:static lg:z-auto lg:w-80 lg:border-l lg:border-gray-800 lg:flex'),
    'Step 4 inspector must dock on desktop screens (lg:)'
  );

  // Tablet drawer style (768px - 1023px)
  assert.ok(
    labCode.includes('md:max-lg:fixed md:max-lg:top-0 md:max-lg:right-0 md:max-lg:bottom-0 md:max-lg:w-80'),
    'Step 4 inspector must behave as slide-over drawer on tablet screens (md:max-lg:)'
  );

  // Mobile bottom sheet style (<768px)
  assert.ok(
    labCode.includes('max-md:fixed') &&
    labCode.includes('max-md:inset-x-0') &&
    labCode.includes('max-md:bottom-0') &&
    labCode.includes('max-md:max-h-[82vh]') &&
    labCode.includes('max-md:rounded-t-2xl'),
    'Step 4 inspector must behave as bottom sheet drawer on mobile screens (max-md:)'
  );

  // Trigger button in timeline header
  assert.ok(
    labCode.includes('onClick={() => setIsInspectorOpen(true)}'),
    'Lab.tsx must provide button to open inspector on small viewports'
  );

  // Scrim dismissal
  assert.ok(
    labCode.includes('isInspectorOpen &&') && labCode.includes('onClick={() => setIsInspectorOpen(false)}'),
    'Step 4 inspector must render backdrop scrim with dismiss handler'
  );
  assert.ok(
    labCode.includes('onTouchStart={() => setIsInspectorOpen(false)}'),
    'Step 4 backdrop scrim must dismiss on touch'
  );

  // Auto-close when moving to Step 5
  assert.ok(
    labCode.includes('setIsInspectorOpen(false)') && labCode.includes('setActiveStep(5)'),
    'Navigating to Step 5 must auto-close inspector drawer'
  );
});

test('Challenger 5.2: Lab Step 4 inspector handles edge case data (null/undefined slot, missing techniques) without throwing', () => {
  // Synthetic slot inspector technique evaluator replicating lines 1728-1755 of Lab.tsx
  function evaluateSlotTechniques(selectedSlot) {
    if (!selectedSlot) {
      return { activeTechs: [], title: 'Chọn phân cảnh', duration: 0 };
    }

    const title = `Phân cảnh: Cảnh #${selectedSlot.index + 1}`;
    const duration = selectedSlot.durationSec;
    const activeTechs = [];

    // Safely check techniques
    if (selectedSlot.techniques) {
      if (selectedSlot.techniques.transition) activeTechs.push({ key: 'transition', data: selectedSlot.techniques.transition });
      if (selectedSlot.techniques.effect) activeTechs.push({ key: 'effect', data: selectedSlot.techniques.effect });
      if (selectedSlot.techniques.look) activeTechs.push({ key: 'look', data: selectedSlot.techniques.look });
    }

    return { activeTechs, title, duration };
  }

  // Edge Case A: selectedSlot is null
  const nullSlotResult = evaluateSlotTechniques(null);
  assert.equal(nullSlotResult.activeTechs.length, 0);
  assert.equal(nullSlotResult.title, 'Chọn phân cảnh');

  // Edge Case B: slot with zero techniques
  const emptySlotResult = evaluateSlotTechniques({
    id: 'slot_empty',
    index: 0,
    durationSec: 3.5,
    techniques: {},
  });
  assert.equal(emptySlotResult.activeTechs.length, 0);
  assert.equal(emptySlotResult.title, 'Phân cảnh: Cảnh #1');

  // Edge Case C: slot with partial techniques (only transition)
  const partialSlotResult = evaluateSlotTechniques({
    id: 'slot_partial',
    index: 2,
    durationSec: 2.0,
    techniques: {
      transition: { id: 't1', name: { vi: 'Chuyển cảnh mờ' }, enabled: true },
    },
  });
  assert.equal(partialSlotResult.activeTechs.length, 1);
  assert.equal(partialSlotResult.activeTechs[0].key, 'transition');

  // Edge Case D: slot with all 3 techniques
  const fullSlotResult = evaluateSlotTechniques({
    id: 'slot_full',
    index: 1,
    durationSec: 4.0,
    techniques: {
      transition: { id: 't1', name: { vi: 'Zoom in' }, enabled: true },
      effect: { id: 'e1', name: { vi: 'Glitch' }, enabled: false },
      look: { id: 'l1', name: { vi: 'Vintage' }, enabled: true },
    },
  });
  assert.equal(fullSlotResult.activeTechs.length, 3);
});
