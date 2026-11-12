# Project: ClipForge UI Polish & Aesthetics Refinement

## Architecture
ClipForge is a CapCut Desktop Web alternative & vertical video studio built on React 19, TypeScript, Vite, Tailwind CSS v4, Dexie, Canvas Compositor, and Web Audio API.

### Layout Hierarchy & Data Flow
1. **Root & Global Tokens (`src/index.css`)**:
   - Modern CapCut Pro technical dark palette:
     - Neutral dark background: `#141414`
     - Panels / Canvas toolbar / Header: `#1F1F1F`
     - Sub-panels / Dividers / Cards: `#262626`
     - Field inputs / Hover states: `#2E2E2E`
     - Crisp borders: `#333333`
     - Canonical neon cyan accent: `#1FC8DB` (hover `#4BD9E8`, active glow `rgba(31,200,219,0.3)`)
     - Danger / Record red: `#F43F5E`
     - Text hierarchy: `#FFFFFF` (headings/active), `#E6E6E6` (primary), `#8A8A8A` / `#888888` (secondary/muted)

2. **Top Bar / Header (`src/components/Header.tsx`)**:
   - Unified CapCut Pro dark header across both Editor and non-Editor routes.
   - Interactive Aspect Ratio Selector dropdown (9:16, 16:9, 1:1, 4:5, 21:9).
   - Single clean auto-save indicator status (no duplicate pings).
   - Responsive tablet & mobile toolbar collapse.

3. **Left Sidebar & Category Panel (`src/components/Sidebar.tsx`, `src/components/CategoryPanel.tsx`)**:
   - Harmonized dark theme, responsive slide-over drawer on <1024px.
   - Collapsible/compact sub-sidebar in Media tab to avoid squishing grids.
   - Uniform search inputs, sliders, and audio/text/effects cards.
   - Preserved test contracts (`renderRegistryDiscoveryBlock`, `ExtensionLibrary`, etc.).

4. **Center Canvas & Right Inspector (`src/components/PlayerCanvas.tsx`, `src/components/Inspector.tsx`, `src/pages/Editor.tsx`)**:
   - Center Canvas: 8-point handles, rotation stalk, responsive bottom control grouping on mobile (<640px), glassmorphic dropdowns (`backdrop-blur-md`).
   - Right Inspector: Standardized neon cyan `#1FC8DB`, crisp borders `#262626`/`#333333`, sleek SVG alignment icons instead of ASCII, polished mask & speed controls.
   - Responsive Shell: Backdrop scrim (`bg-black/60 backdrop-blur-xs z-40`), Escape dismissal, and fluid slide-over drawer.

5. **Bottom Timeline & TikTok Lab (`src/components/Timeline.tsx`, `src/pages/Lab.tsx`)**:
   - Multi-track timeline with scrollable mobile toolbar (`overflow-x-auto scrollbar-none`), unified cyan accents, and strict preservation of 46 exact test invariant strings.
   - TikTok Lab: Harmonized dark palette, responsive vertical preview canvas budgeting on mobile, preserved drawer classes for test assertions.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tailwind v4 Theme Tokens & Palette Harmonization | Add `@theme` directives in `src/index.css`, establish unified CapCut Pro dark tokens (#141414, #1F1F1F, #262626, #333333, #1FC8DB) | M1 | Survey (Explorer 1) |
| 2 | Top Bar / Header Aesthetic Polish | Modernize Header.tsx, unify dark theme, eliminate duplicate auto-save indicators, crisp borders #333333 | M1 | Survey (Explorer 1) |
| 3 | Interactive Aspect Ratio Selector Dropdown | Convert static 9:16 badge in Header.tsx into interactive aspect ratio selector dropdown (9:16, 16:9, 1:1, 4:5, 21:9) | M1 | Survey (Explorer 1) |
| 4 | Header Responsive Collapse for Tablet & Mobile | Responsive grouping and overflow containment for 12 toolbar buttons on tablet/mobile | M1 | Survey (Explorer 1) |
| 5 | Left Sidebar Dark Palette Harmonization | Harmonize Sidebar.tsx from legacy navy (#0E1320, #111827) to CapCut Pro dark (#141414, #1F1F1F, #262626, #333333, #1FC8DB) | M2 | Survey (Explorer 1) |
| 6 | Category Panel Grid & Sub-Sidebar Ergonomics | Prevent Media tab fixed sub-sidebar from squishing thumbnail grids; uniform search & slider aesthetics; preserve DOM contracts | M2 | Survey (Explorer 1) |
| 7 | Center Canvas Bottom Controls Mobile Responsiveness | Prevent overcrowding of bottom controls (timecode, step frame, play/pause, quality, zoom, ratio, sleep timer, fullscreen) on <640px screens | M3 | Survey (Explorer 2) |
| 8 | Center Canvas Bounding Box & Handle Polish | Ensure 8-point handles, rotation stalk, and pointer capture meet exact touch-target standards with crisp #1FC8DB styling | M3 | Survey (Explorer 2) |
| 9 | Right Inspector Palette & Border Standardization | Replace #00E5FF with #1FC8DB, standardize borders to #262626 and #333333, polish mask and keyframe controls | M3 | Survey (Explorer 2) |
| 10 | Right Inspector Visual Alignment Grid Icons | Replace raw ASCII alignment text (|←, →|←, etc.) with clean CapCut-style SVG alignment icons | M3 | Survey (Explorer 2) |
| 11 | Responsive Editor Inspector Drawer Backdrop & Scrim | Add backdrop scrim (bg-black/60 backdrop-blur-xs z-40) and Escape key dismissal on mobile/tablet inspector drawer in Editor.tsx | M3 | Survey (Explorer 2) |
| 12 | Bottom Timeline Toolbar Mobile Overflow Handling | Add overflow-x-auto scrollbar-none to 22-button timeline toolbar to prevent mobile clipping | M4 | Survey (Explorer 3) |
| 13 | Bottom Timeline Accent & Ghost Badge Harmonization | Unify cyan accents to #1FC8DB, maintain track header collapse w-48 vs w-14 and all 46 exact test strings | M4 | Survey (Explorer 3) |
| 14 | TikTok Lab Dark Theme & Mobile Viewport Budgeting | Harmonize Lab.tsx from navy to CapCut Pro dark theme, optimize Step 4 preview canvas max-h on mobile (<750px height), preserve drawer test classes | M4 | Survey (Explorer 3) |
| 15 | Test Suite & Build Verification | Guarantee 100% pass rate across 414+ tests (npm test), clean TypeScript (tsc --noEmit), and clean production build (npm run build) | M5 | Survey (Explorer 1, 2, 3) |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design Tokens, Global CSS & Top Bar Header | `src/index.css`, `src/components/Header.tsx` | none | DONE |
| M2 | Left Sidebar & Category Panel Refinement | `src/components/Sidebar.tsx`, `src/components/CategoryPanel.tsx` | M1 | DONE |
| M3 | Center Canvas, Right Inspector & Responsive Shell | `src/components/PlayerCanvas.tsx`, `src/components/Inspector.tsx`, `src/pages/Editor.tsx` | M1 | DONE |
| M4 | Bottom Timeline & TikTok Lab Refinement | `src/components/Timeline.tsx`, `TimelineRuler.tsx`, `TimelineTrack.tsx`, `src/pages/Lab.tsx` | M1 | DONE |
| M5 | Comprehensive Review, Challenge & Forensic Audit | Verification across all files, full test suite, tsc, and build | M1, M2, M3, M4 | IN_PROGRESS |

---

## Interface Contracts & Test Invariant Rules

### 1. Color Palette Tokens
- Canonical Cyan: `#1FC8DB` (DO NOT introduce `#00E5FF` or `#22D3EE`).
- Crisp Borders: `#262626` (inner dividers), `#333333` (panel outlines and inputs).
- Backgrounds: `#141414` (canvas/page background), `#1F1F1F` (panels, headers, toolbars), `#262626` (cards, badges, sub-headers), `#2E2E2E` (hover, active fields).

### 2. Header & Project State
- `Header.tsx` receives `projectName`, `setProjectName`, `aspectRatio`, `setAspectRatio`, `onUndo`, `onRedo`, `canUndo`, `canRedo`, `isEditor`, etc.
- Aspect ratio values: `'9:16'`, `'16:9'`, `'1:1'`, `'4:5'`, `'21:9'`.
- Clean auto-save indicator must retain status string: `Auto saved` or `Saving…` or `Saved`.

### 3. Protected Test Invariant Strings
Workers and reviewers MUST NOT modify or delete the following verbatim strings checked by automated tests:
- `Timeline.tsx`:
  - `'Track Headers (Left Column)'`
  - `'border-r border-[#333333] bg-[#1F1F1F] flex flex-col shrink-0'`
  - `'w-48'` (desktop header width)
  - `'w-14'` (mobile collapsed header width)
  - `'const Icon = track.icon;'`
  - `'<Icon className='`
  - `'{track.name}'`
  - `'truncate'`
  - `'MAIN TRACKS & RULER AREA'`
  - `'updatePlayheadFromClientX'`
  - `'isScrubbingPlayhead'`
  - `'handleTrimStartMouseDown'` / `'handleTrimEndMouseDown'`
  - `'handleTrimStartPointerDown'` / `'handleTrimEndPointerDown'`
  - `"trimmingHandle === 'start'"` / `"trimmingHandle === 'end'"`
  - `'handleSplit'` or `'splitClip'`
  - `'handleRippleDelete'` or `'rippleDelete'`
  - `'toggleTrackMute'`, `'toggleTrackLock'`, `'toggleTrackHidden'`, `'toggleTrackHeight'`
  - `'touch-none'`, `'min-w-[36px]'` or `'w-9'`
  - `'w-10 h-10'` or `'touch-target-40'`
  - `'handlePlayheadPointerDown'`, `'setPointerCapture'`
  - `'trackHeaderCollapsed'`, `'setTrackHeaderCollapsed'`, `'trackHeadersScrollRef'`
  - `'GHOST'`
- `PlayerCanvas.tsx`:
  - `'touch-target-44'`, `'w-11 h-11'` on rotation stalk container
  - `'touch-target-40'`, `'w-10 h-10'` on 8 scale handles
  - `'pointer-events-none'` on inner visual dots
  - `'cursor-grab active:cursor-grabbing'`
- `CategoryPanel.tsx`:
  - `renderRegistryDiscoveryBlock` across tabs
  - `ExtensionLibrary` tab
  - `sleepTimerState`
- `Lab.tsx`:
  - `'activeStep === 4'`
  - `'lg:static lg:z-auto lg:w-80 lg:border-l lg:border-gray-800 lg:flex'`
  - `'md:max-lg:fixed md:max-lg:top-0 md:max-lg:right-0 md:max-lg:bottom-0 md:max-lg:w-80'`
  - `'max-md:fixed'` and `'max-md:inset-x-0'` and `'max-md:bottom-0'` and `'max-md:max-h-[82vh]'` and `'max-md:rounded-t-2xl'`
  - `'onClick={() => setIsInspectorOpen(true)}'`
  - `'onClick={() => setIsInspectorOpen(false)}'` and `'onTouchStart={() => setIsInspectorOpen(false)}'`

---

## Code Layout & File Ownership
- **Milestone 1**: `src/index.css`, `src/components/Header.tsx` (COMPLETED)
- **Milestone 2**: `src/components/Sidebar.tsx`, `src/components/CategoryPanel.tsx` (COMPLETED)
- **Milestone 3**: `src/components/PlayerCanvas.tsx`, `src/components/Inspector.tsx`, `src/pages/Editor.tsx` (COMPLETED)
- **Milestone 4**: `src/components/Timeline.tsx`, `src/components/TimelineRuler.tsx`, `src/components/TimelineTrack.tsx`, `src/pages/Lab.tsx` (COMPLETED)
- **Milestone 5**: Read-only verification across all touched files, running tests and audit. (IN_PROGRESS)
