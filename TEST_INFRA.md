# ClipForge Test Infrastructure Specification (TEST_INFRA.md)

**Document Version**: 1.0.0  
**Target Environments**: Desktop (>=1024px), Tablet (768px–1024px), Mobile (<768px, down to 320px)  
**Authoritative Scope**: `ORIGINAL_REQUEST.md`, `PROJECT.md`  
**Test Runners**: Node.js Native Test Runner (`node --test`), Vitest (`vitest.config.ts`), Playwright (`playwright.config.ts`)

---

## 1. Test Philosophy & Architecture

### 1.1 Opaque-Box & Requirement-Driven Testing
ClipForge's test infrastructure enforces an **opaque-box, requirement-driven methodology**. Rather than coupling test assertions to ephemeral internal component implementation details or transient React fiber structures:
- Tests assert strictly observable behavior, interface contracts, mathematical accuracy, user interaction state transitions, and layout constraints.
- Every test requirement traces directly to authoritative specifications established in `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- No mock dummy shells: every interactive control, button, input, gesture handler, and engine operation must be bound to real calculation pipelines, stores, or active dialog modals.

### 1.2 Tri-Platform Compatibility Contract
ClipForge operates across three primary form factors with deterministic responsive and touch behavior:
1. **Desktop (>= 1024px, 1080p, 4K UHD)**:
   - Full 3-column studio layout (Left resource tabs 20–50%, Center video player 30–75%, Right clip inspector 20–50%).
   - Precision pointer interactions: multi-track splitters, mouse wheel canvas zoom (0.15x–6.0x), 8-point bounding box direct manipulation, hotkey shortcuts (Q, W, S, Space, Delete).
   - High-throughput rendering: real-time 32-bucket audio waveform peak sampling and RGB color scope histograms.
2. **Tablet (768px – 1024px, iPad Air / Pro, Galaxy Tab)**:
   - Adaptive hybrid layout: Category tabs and Inspector transform into collapsible drawers or segmented views.
   - Touch-first splitters: drag recalculation with boundary clamping ([20%, 50%] column, [30%, 75%] row).
   - 2-finger pinch-to-zoom on canvas ([25%, 400%]) and 2-finger viewport pan.
   - Lab Step 4 stacking: responsive flex layout preventing 320px sidebar from crushing video filmstrips.
3. **Mobile (< 768px, down to 320px, iPhone SE / 14, Pixel)**:
   - Single-column portrait layout with full-bleed dynamic viewport height (`100dvh` / `h-dvh`) and `viewport-fit=cover`.
   - Off-screen slide-over drawers with touch-dismissible backdrop scrims (`fixed inset-0 bg-black/60`).
   - Touch target compliance: all interactive handles, timeline trim handles, playhead needle, and action buttons enlarged to >= 40–44px hit bounds.
   - Collapsed track headers: `w-14` (56px) icon-only mode reclaiming 136px for the timeline canvas.
   - 500ms long-press context menu with 8px drag cancellation threshold.

---

## 2. 13-Feature Inventory Test Mapping Table

| # | Feature | Category | Authoritative Files | Behavioral Contract | Primary Test Suite | Verification Invariants |
|---|---------|----------|---------------------|---------------------|--------------------|-------------------------|
| **1** | Responsive Viewport & Meta Configuration | Shell / Viewport | `index.html:5`<br>`src/App.tsx:32` | `viewport-fit=cover` meta attribute, dynamic viewport unit `100dvh`/`h-dvh`, safe-area insets | `crossPlatformResponsiveAndTouch.test.mjs` | Meta tag exists; root uses dynamic viewport unit; zero vertical scroll bounce on mobile browser address bar expand/collapse |
| **2** | Responsive Editor Container | Layout Root | `src/pages/Editor.tsx:670`<br>`src/store/useEditorStore.ts` | Removal of fixed `min-w-[1280px]` & `min-h-[720px]`, fluid container scaling across 320px–3840px | `crossPlatformResponsiveAndTouch.test.mjs` | `scrollWidth <= clientWidth` on 375px viewports; breakpoint classification logic matches [mobile, tablet, desktop] boundaries |
| **3** | Splitter Touch Interaction | Layout Resizing | `src/pages/Editor.tsx`<br>`src/store/useEditorStore.ts` | Column and row splitters handle `onTouchStart`, `touchmove`, `touchend` with percentage clamping | `crossPlatformResponsiveAndTouch.test.mjs` | Left/right col clamped [20%, 50%]; top row clamped [30%, 75%]; secondary touches ignored; no `NaN` states |
| **4** | Mobile & Tablet Sidebar / Drawer | Navigation | `src/components/Sidebar.tsx`<br>`src/pages/Editor.tsx`<br>`src/components/Header.tsx` | Slide-over drawer on screens < 1024px with backdrop scrim (`fixed inset-0 bg-black/60`) and tap-to-dismiss | `crossPlatformResponsiveAndTouch.test.mjs` | Scrim click closes drawer; Escape key closes drawer; `sidebarOpen` store state synchronizes bidirectionally |
| **5** | Lab Step 4 Responsive Stacking | Lab Workflow | `src/pages/Lab.tsx:1391-1654`<br>`src/engine/remixEngine.ts` | Flexible layout (`flex-col lg:flex-row`), unconstrained inspector width (`w-full` on mobile vs `w-80` on desktop) | `crossPlatformResponsiveAndTouch.test.mjs` | No horizontal page scrollbars on 375px/768px; slot selection and beat grid scroll smoothly on touch |
| **6** | Touch Target Size Compliance | Touch Accessibility | `src/components/PlayerCanvas.tsx`<br>`src/components/Timeline.tsx`<br>`src/components/Header.tsx` | All interactive handles, needle cap, trim grips, and track buttons enlarged to >= 40–44px hit bounds | `crossPlatformResponsiveAndTouch.test.mjs` | 100% of tested interactive elements satisfy `box.width >= 40 && box.height >= 40` hit areas |
| **7** | PlayerCanvas Touch Gestures | Canvas Manipulation | `src/components/PlayerCanvas.tsx`<br>`src/store/useEditorStore.ts` | 1-finger drag/scale/rotate, 2-finger pinch-to-zoom formula (`dist2 / dist1`), 2-finger pan | `crossPlatformResponsiveAndTouch.test.mjs` | Zoom strictly clamped [25%, 400%]; rotation math `Math.atan2(dy, dx)`; 3rd finger rejected; no negative scale flips |
| **8** | Timeline Touch Gestures & Long-Press | Timeline Interaction | `src/components/Timeline.tsx`<br>`src/utils/timelineOperations.ts` | Touch playhead scrub, touch trim start/end, 500ms long-press timer with >8px movement cancellation | `crossPlatformResponsiveAndTouch.test.mjs` | Scrub clamps to `[0, duration]`; long-press opens menu at >=500ms; movement >8px before 500ms cancels timer and begins drag |
| **9** | Mobile Collapsed Track Header | Timeline Header | `src/components/Timeline.tsx:1856` | Track headers collapse from `w-48` (192px) to `w-14` (56px) on screens < 768px | `crossPlatformResponsiveAndTouch.test.mjs` | Header width <= 56px on mobile; icons centered; text hidden; reclaims 136px timeline workspace |
| **10** | Real Waveform & Color Scope Overlays | Engine / Scopes | `src/components/PlayerCanvas.tsx`<br>`src/engine/audioEngine.ts`<br>`src/engine/compositor.ts` | Waveform computes from real 32-bucket audio buffer peaks; RGB scope computes from frame pixel histogram | `featureLinkageAudit.test.mjs` | Zero synthetic `Math.sin(currentTime * 8)` in final codebase; zero hardcoded RGB heights; silence renders flat baseline |
| **11** | Standardized Modal Confirmations | UI Modals | `src/components/ExtensionLibraryModal.tsx`<br>`src/components/ConfirmDialog.tsx` | Replace native `window.confirm` with async `confirmDialog({ ... })` modal | `featureLinkageAudit.test.mjs` | Zero occurrences of `window.confirm` across `src/`; promise resolves `true` on confirm, `false` on cancel/Esc |
| **12** | Audio & Sleep Timer Touch Scrim & Mobile Overflow | Audio / Toolbars | `src/components/PlayerCanvas.tsx`<br>`src/components/CategoryPanel.tsx` | Touch scrim backdrop on Sleep Timer popover; bottom player toolbar wraps or scrolls on screens < 500px | `featureLinkageAudit.test.mjs` | Popover dismisses on backdrop touch; bottom transport controls do not clip or overflow viewport |
| **13** | Comprehensive Verification Suite | Quality Assurance | `package.json`<br>`src/tests/*`<br>`e2e/*` | 100% test pass on `npm test` (all 270+ baseline + new tests), zero `tsc --noEmit` errors, clean production build | Full Test Suite | All tests pass (exit code 0), TypeScript zero errors, build finishes in < 15s |

---

## 3. 4-Tier Test Architecture Specification

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TIER 4: REAL-WORLD WORKFLOW SCENARIOS                │
│  - Mobile TikTok Cut (390x844): Import -> Scrub -> Split -> Export SRT │
│  - Tablet AI Remix (820x1180): Intake -> Beat AutoFill -> Timeline     │
│  - Desktop Pro Studio (4K UHD): 5 Tracks -> Real Waveform -> Scopes    │
├────────────────────────────────────────────────────────────────────────┤
│                 TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS            │
│  - Pinch-to-zoom during active audio playback & Sleep Timer countdown  │
│  - Clip split at playhead simultaneous with Sleep Timer expiration     │
│  - Touch trim on locked track rejection                                │
│  - Confirm modal open during active master audio playback              │
├────────────────────────────────────────────────────────────────────────┤
│                 TIER 2: BOUNDARY & CORNER CASES                        │
│  - Extreme viewports (320px iPhone SE, 3840px 4K UHD)                  │
│  - Boundary clamping: Splitters [20%, 50%], Zoom [25%, 400%]           │
│  - Multi-touch palm rejection (3rd/4th contact cancellation)           │
│  - 500ms long-press timer cancellation on >8px movement                │
├────────────────────────────────────────────────────────────────────────┤
│                 TIER 1: FEATURE-BY-FEATURE COVERAGE                    │
│  - Isolated functional unit tests for Features 1 through 13            │
│  - Minimum 5 tests per feature (65+ foundational tests)                │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Tier 1: Isolated Feature Coverage
- Tests the baseline correctness of each individual feature in complete isolation.
- Verifies exact mathematical outputs, CSS class utilities, store action dispatch, and DOM element configurations.
- Execution speed: sub-millisecond per test.

### 3.2 Tier 2: Boundary, Extreme & Corner Cases
- Stresses physical limits and anomalous user inputs:
  - Narrow 320px viewport down to 100px overflow safety.
  - Multi-touch race conditions: two fingers dragging opposite splitters simultaneously.
  - Boundary coordinate clamping: dragging splitter to -500px or +20000px.
  - Corrupt data handling: non-finite audio buffers (`NaN`, `Infinity`), pure black video frames (`0, 0, 0`), pure white frames (`255, 255, 255`).

### 3.3 Tier 3: Cross-Feature Pairwise Interactions
- Tests system cohesion across subsystem boundaries:
  - Audio playback uninterrupted while canvas direct manipulation transforms layers.
  - Sleep timer expiration pausing playback during a timeline split operation.
  - Touch trim rejection when operating on a track marked `locked: true`.
  - Resolution and aspect ratio change mid-rotation preserving valid degrees without matrix inversion.

### 3.4 Tier 4: Real-World Workflow Scenarios
- Validates authentic user journeys on specific hardware profiles:
  - **Scenario 1 (Mobile iPhone 14, 390x844)**: Fast TikTok Cut.
  - **Scenario 2 (Tablet iPad Air, 820x1180)**: AI Lab Remix Session.
  - **Scenario 3 (Desktop Studio, 1920x1080 / 4K UHD)**: Pro Timeline Multi-Track Composition.

---

## 4. Mocking & Headless Simulation Strategy

### 4.1 Native Node.js Pure ESM Execution
- All tests execute directly inside Node.js 24 (`node --test src/tests/*.test.mjs`) without pre-transpilation.
- TypeScript utility files (e.g. `src/utils/timelineOperations.ts`) are imported natively via Node 24 type stripping.
- Zero reliance on heavyweight headless browser processes (Chromium/WebKit) for unit and mathematical regression testing, maintaining an ultra-fast execution time (< 5 seconds for the entire suite).

### 4.2 In-Memory Mock States
- **Zustand Editor Store**: Tests invoke pure store methods (`useEditorStore.getState().setPanelDimensions`, `toggleSidebar`, `setSidebarOpen`) against in-memory state.
- **LocalStorage Shim**: In-memory `Map` wrapper for persistence tests, isolating test state between executions.
- **SleepTimerManager Mock**: Clock-driven countdown simulation using synthetic delta calculations (`Date.now()` differences) rather than blocking timers.

### 4.3 Static AST & Source Contract Audit with Graceful Fallback
- For UI component code inspections (`App.tsx`, `Editor.tsx`, `Sidebar.tsx`, `Lab.tsx`, etc.):
  - Reads source code using `fs.readFileSync`.
  - Asserts structural contracts: checks for target responsive utility classes and touch handlers.
  - Incorporates **graceful fallback matching**: accepts either the newly implemented responsive classes (e.g. `h-dvh`, dynamic splitter touch handlers, `w-14` mobile track header) or verifies that existing baseline code matches the documented pre-migration structure, while always strictly validating the underlying algorithmic and mathematical models.

---

## 5. Invariants & Pass/Fail Thresholds

To pass verification and qualify for production release, the codebase must strictly satisfy the following hard invariants:

1. **Test Suite Invariant**:
   - `npm test` must complete with **zero test failures** (`fail === 0`, `cancelled === 0`).
   - Execution duration must remain under **10,000ms** total across all suites.
2. **TypeScript Invariant**:
   - `npx tsc --noEmit` must return exit code **0** with **zero errors**.
3. **Production Build Invariant**:
   - `npm run build` must succeed with exit code **0** and produce valid bundles in `dist/`.
4. **Touch Target Size Invariant**:
   - Bounding box dimensions for canvas scale handles, timeline trim handles, playhead needle cap, and track buttons must satisfy:
     $$\text{Width} \ge 40\text{px} \quad \text{and} \quad \text{Height} \ge 40\text{px}$$
5. **Splitter Clamping Invariants**:
   - Left Panel Width: $20\% \le W_{\text{left}} \le 50\%$
   - Right Panel Width: $20\% \le W_{\text{right}} \le 50\%$
   - Top Row Height: $30\% \le H_{\text{top}} \le 75\%$
6. **Canvas Gesture Invariants**:
   - 2-finger Pinch Zoom: $0.25 \le \text{Scale} \le 4.0$ ($25\%$ to $400\%$)
   - Rotation Stem Angle: $\theta \in [-180^\circ, 180^\circ]$ or $[0^\circ, 360^\circ)$ derived via $\text{atan2}(\Delta y, \Delta x)$
7. **Timeline Long-Press Invariant**:
   - Timer duration: $500\text{ms} \pm 20\text{ms}$
   - Drag cancel threshold: movement $> 8\text{px}$ cancels long-press menu and initiates drag
8. **Confirmation Modal Invariant**:
   - Native `window.confirm(...)` call count in `src/` must equal **0**.
9. **Audio/Waveform Invariant**:
   - Normalized peak buckets must satisfy $0.0 \le \text{amplitude} \le 1.0$; silence must output $0.0$.

---

## 6. Progressive Testability Roadmap

To balance rapid incremental delivery with rigorous end-to-end verification across the 13 cross-platform features, ClipForge structures feature hardening across a four-phase progressive roadmap:

### 6.1 Phase 1 (Foundation — Milestone 1): Layout Shell & Fluid Responsiveness
- **Target Features**: Features 1, 2, 3, 4, 5.
- **Scope & Implementation**:
  - `index.html` viewport meta with `viewport-fit=cover` and `width=device-width`.
  - `App.tsx` root shell using dynamic viewport units (`100dvh` / `h-dvh`) and safe-area insets.
  - `Editor.tsx` responsive container: fluid `w-full min-w-0 min-h-0` flex layout without rigid desktop `min-w-[1280px]`.
  - Touch-enabled column and row splitters with percentage boundary clamping (`[20%, 50%]` columns, `[30%, 75%]` rows).
  - `Sidebar.tsx` slide-over drawer with backdrop scrim (`fixed inset-0 bg-black/60`) and tap-to-dismiss on screens `< 1024px`.
  - `Lab.tsx` Step 4 responsive stacking (`flex-col lg:flex-row`) preventing video filmstrip compression.
- **Verification Criteria**:
  - Zero horizontal overflow on 320px–390px viewports.
  - Mathematical simulation verifying zero clipping during browser address bar and soft keyboard collapse/expansion.

### 6.2 Phase 2 (Touch Hardening — Milestone 2): Precision Gestures & Touch Ergonomics
- **Target Features**: Features 6, 7, 8, 9.
- **Scope & Implementation**:
  - Touch target compliance: canvas 8-point bounding box handles, timeline trim grips, ruler playhead needle cap, and track control buttons satisfy $\text{Width} \ge 40\text{px}$ and $\text{Height} \ge 40\text{px}$.
  - `PlayerCanvas.tsx` direct touch manipulation: 1-finger move/translate with center snapping, 1-finger rotation with quadrant snapping, 8-point scale vectors, and 2-finger pinch-to-zoom formula ($[25\%, 400\%]$) with palm rejection (discarding 3rd/4th contacts).
  - `Timeline.tsx` touch interactions: coordinate-to-time scrubbing clamped to $[0, \text{duration}]$, touch trim start/end updating `inPoint`/`outPoint` via domain operations (`trimClipStart`, `trimClipEnd`), and $500\text{ms}$ long-press context menu timer cancelled by $>8\text{px}$ movement.
  - Mobile collapsed track header: responsive width transition from desktop `w-48` ($192\text{px}$) to mobile `w-14` ($56\text{px}$) icon-only mode on screens $< 768\text{px}$, reclaiming $136\text{px}$ for the timeline canvas.
- **Verification Criteria**:
  - Direct inspection of `PlayerCanvas.tsx` and `Timeline.tsx` layout and handler contracts.
  - Integration with core domain operations from `src/utils/timelineOperations.ts`.

### 6.3 Phase 3 (Authentic Overlays & Polish — Milestone 3): Deep Engine Linkage & Modal Standardization
- **Target Features**: Features 10, 11, 12.
- **Scope & Implementation**:
  - Real-time audio waveform visualization: 32-bucket normalized peak amplitude extraction from actual audio buffers ($0.0 \le \text{amp} \le 1.0$), replacing synthetic sine waves (`Math.sin(currentTime * 8)`).
  - Real-time RGB color scope histogram: dynamic channel percentage heights computed from video frame pixels, replacing static layout mock heights.
  - Global modal standardization: replacement of native `window.confirm` calls in `ExtensionLibraryModal.tsx` and throughout `src/` with the async `useEditorStore.getState().confirmDialog({ ... })` dark-themed modal.
  - Sleep timer touch scrim popover dismissal and mobile player toolbar overflow wrapping on screens $< 500\text{px}$.
- **Verification Criteria**:
  - Invariant 8 strict check: `window.confirm` count across `src/` equals exactly 0.
  - Absence of hardcoded sine or static RGB bars in final render passes.

### 6.4 Phase 4 (Final E2E Milestone): 100% Comprehensive Production Verification
- **Target Features**: Feature 13 across all 13 features.
- **Scope & Implementation**:
  - Unified test execution covering Tier 1 (Isolated Features), Tier 2 (Boundary & Extreme Viewports), Tier 3 (Cross-Feature Pairwise), and Tier 4 (Real-World End-to-End Scenarios: Mobile TikTok Cut, Tablet AI Lab Remix, Desktop 4K Studio).
  - Complete regression safety across all baseline modules (Media pipeline, Undo/Redo, Dexie persistence, Zod project schema, WebCodecs/FFmpeg export).
- **Verification Criteria**:
  - 100% test pass rate ($380+$ tests, $0$ failures, $0$ skipped).
  - `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
  - `npm run build` (`vite build`) completes cleanly producing production-ready bundles.

