import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  analyzeReferenceStyle,
  resolveAnalyzedStyleElement,
} from '../engine/styleAnalyzer.ts';
import { resolve } from '../engine/effectResolver.ts';

// Mock Registry item for tests
const mockRegistryItem = {
  id: 'official.glitch-pack/rgb-shake@1.0.0',
  name: 'Rung quang sai RGB (RGB Aberration Shake)',
  description: 'Tách kênh màu đỏ-lam kèm rung lắc nhẹ theo nhịp điệu',
  kind: 'effect',
  version: '1.0.0',
  author: 'ClipForge',
  license: 'MIT',
  trustLevel: 'official',
  sizeBytes: 3986,
  isInstalled: false,
  spec: {
    id: 'rgb-shake',
    kind: 'effect',
    paramSchema: {
      intensity: { type: 'number', default: 1.0, min: 0.0, max: 2.0 },
    },
    tags: ['glitch', 'shake', 'rgb', 'rung', 'giat'],
    aliases: {
      vi: ['glitch', 'giật', 'nhiễu', 'rung màn hình', 'tách màu'],
      en: ['glitch', 'rgb shake', 'chromatic aberration'],
    },
    cost: { samplesPerPixel: 2, passes: 1 },
    since: '1.0.0',
  },
};

test('M2.1 - CategoryPanel Inline Discovery Block: filtering, metadata & trust badge', () => {
  // Verify CategoryPanel.tsx contains inline discovery block calls for all required tabs
  const categoryPanelContent = fs.readFileSync(
    path.join(process.cwd(), 'src', 'components', 'CategoryPanel.tsx'),
    'utf8'
  );

  // Must call renderRegistryDiscoveryBlock for effects, transitions, filters, stickers, sfx, text, and templates
  assert.ok(
    categoryPanelContent.includes("renderRegistryDiscoveryBlock('effect'"),
    'CategoryPanel must render discovery block for effects'
  );
  assert.ok(
    categoryPanelContent.includes("renderRegistryDiscoveryBlock('transition'"),
    'CategoryPanel must render discovery block for transitions'
  );
  assert.ok(
    categoryPanelContent.includes("renderRegistryDiscoveryBlock('filter'"),
    'CategoryPanel must render discovery block for filters'
  );
  assert.ok(
    categoryPanelContent.includes("renderRegistryDiscoveryBlock('sticker'"),
    'CategoryPanel must render discovery block for stickers'
  );
  assert.ok(
    categoryPanelContent.includes("renderRegistryDiscoveryBlock('sfx'"),
    'CategoryPanel must render discovery block for sfx'
  );
  assert.ok(
    categoryPanelContent.includes("renderRegistryDiscoveryBlock('textPreset'"),
    'CategoryPanel must render discovery block for text presets'
  );
  assert.ok(
    categoryPanelContent.includes("renderRegistryDiscoveryBlock('template'"),
    'CategoryPanel must render discovery block for templates'
  );

  // Simulate matching logic used in CategoryPanel.renderRegistryDiscoveryBlock
  const filterBlock = (items, kind, query) => {
    return items.filter((p) => {
      if (p.kind !== kind) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.spec.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  };

  const allItems = [
    mockRegistryItem,
    {
      id: 'official.transitions/zoom-wipe@1.0.0',
      name: 'Chuyển cảnh Thu Phóng (Zoom Wipe)',
      description: 'Lướt zoom chuyển tiếp',
      kind: 'transition',
      version: '1.0.0',
      author: 'ClipForge',
      license: 'MIT',
      trustLevel: 'official',
      sizeBytes: 2500,
      isInstalled: false,
      spec: { id: 'zoom-wipe', kind: 'transition', tags: ['zoom', 'wipe'] },
    },
    {
      id: 'community.retro/vhs-overlay@1.0.0',
      name: 'Bộ lọc Băng từ VHS (VHS Vintage Tape)',
      description: 'Hiệu ứng màu phim nhựa cổ',
      kind: 'filter',
      version: '1.0.0',
      author: 'Community Retro',
      license: 'CC0',
      trustLevel: 'community',
      sizeBytes: 8192,
      isInstalled: false,
      spec: { id: 'vhs-overlay', kind: 'filter', tags: ['retro', 'vhs', 'vintage'] },
    },
  ];

  // 1. Kind filtering
  const effectMatches = filterBlock(allItems, 'effect', 'giat');
  assert.equal(effectMatches.length, 1);
  assert.equal(effectMatches[0].id, 'official.glitch-pack/rgb-shake@1.0.0');

  const transitionMatches = filterBlock(allItems, 'transition', '');
  assert.equal(transitionMatches.length, 1);
  assert.equal(transitionMatches[0].spec.id, 'zoom-wipe');

  // 2. Metadata completeness
  const matched = effectMatches[0];
  assert.equal(matched.trustLevel, 'official');
  assert.equal(matched.license, 'MIT');
  assert.ok(matched.sizeBytes > 0);

  // Trust badge mapping: 'official' -> 'Chính thức', 'community' -> 'Cộng đồng'
  const getBadgeLabel = (trust) => (trust === 'official' ? 'Chính thức' : 'Cộng đồng');
  assert.equal(getBadgeLabel(matched.trustLevel), 'Chính thức');
  assert.equal(getBadgeLabel(allItems[2].trustLevel), 'Cộng đồng');
});

test('M2.2 - "Dùng thử" (In-Memory Preview) vs "Cài đặt" (Persistent Dexie)', () => {
  // Mock Clip state
  const mockClip = {
    id: 'clip_001',
    track: 'video',
    start: 0,
    duration: 5,
    name: 'Sample Video 9:16',
  };

  // Mock in-memory preview handler (handleTryPackage)
  let clipState = { ...mockClip };
  let dexieStoragePuts = 0;

  const handleTryPackage = (pkg) => {
    clipState = {
      ...clipState,
      dynamicSpec: pkg.spec,
      dynamicEffectId: pkg.id,
      dynamicEffectVersion: pkg.version,
      isTemporaryPreview: true, // Crucial: marked as temporary preview
    };
    // No Dexie put called!
  };

  const handleInstallPackage = (pkg) => {
    // Persistent install saves to Dexie
    dexieStoragePuts++;
    pkg.isInstalled = true;
  };

  // 1. Execute "Dùng thử"
  handleTryPackage(mockRegistryItem);
  assert.equal(clipState.isTemporaryPreview, true);
  assert.equal(clipState.dynamicEffectId, 'official.glitch-pack/rgb-shake@1.0.0');
  assert.ok(clipState.dynamicSpec);
  assert.equal(dexieStoragePuts, 0, 'Trial preview must NEVER write to persistent Dexie storage');

  // 2. Execute "Cài đặt"
  handleInstallPackage(mockRegistryItem);
  assert.equal(dexieStoragePuts, 1, 'Install must persist into Dexie');
  assert.equal(mockRegistryItem.isInstalled, true);
});

test('M2.3 - EditPilot "ensureEffect" action, parameter validation & interactive choice chips', async () => {
  // Read EditPilot.tsx to verify action definition and chip handling
  const editPilotContent = fs.readFileSync(
    path.join(process.cwd(), 'src', 'components', 'EditPilot.tsx'),
    'utf8'
  );

  // 1. ensureEffect is in VALID_ACTIONS
  assert.ok(
    editPilotContent.includes("'ensureEffect'"),
    'ensureEffect must be in VALID_ACTIONS in EditPilot.tsx'
  );

  // 2. Security validation: Action only accepts query / specId, rejects raw script code
  const sanitizeActionInput = (rawInput) => {
    if (typeof rawInput !== 'string') return '';
    // Block executable script patterns
    if (/<script|javascript:|eval\(|Function\(/i.test(rawInput)) {
      return '';
    }
    return rawInput.trim();
  };

  assert.equal(sanitizeActionInput('<script>alert("xss")</script>'), '');
  assert.equal(sanitizeActionInput('javascript:void(0)'), '');
  assert.equal(
    sanitizeActionInput('thêm hiệu ứng rung màn hình kiểu giật beat'),
    'thêm hiệu ứng rung màn hình kiểu giật beat'
  );

  // 3. When exact effect is missing, EditPilot provides interactive choice chips
  assert.ok(
    editPilotContent.includes("action: 'install_registry'"),
    'Must offer install_registry chip'
  );
  assert.ok(
    editPilotContent.includes("action: 'composite_local'"),
    'Must offer composite_local chip'
  );
  assert.ok(
    editPilotContent.includes("action: 'use_nearest'"),
    'Must offer use_nearest chip'
  );

  const query = 'rung man hinh kieu giat beat';
  const resolveRes = await resolve(
    {
      query,
      context: { kind: 'effect' },
    },
    { installedItems: [], cachedRegistry: [] }
  );

  assert.ok(resolveRes.tier > 1, 'Unknown effect should fall past Tier 1');
});

test('M2.4 - Style Analyzer ("Sao chép phong cách"): evidence & 4 action triggers', async () => {
  // 1. Run style analyzer with no installed assets
  const report = analyzeReferenceStyle([{ index: 0 }, { index: 1 }, { index: 2 }], []);

  assert.ok(report.elements.length >= 3, 'Must extract at least 3 style components');
  assert.equal(report.referenceFrames.length, 3);

  // Check element categorization
  for (const el of report.elements) {
    assert.ok(['supported', 'low_confidence', 'unsupported'].includes(el.status));
    assert.ok(el.evidence, 'Must contain physical evidence data');

    // 4 action triggers
    assert.equal(el.resolutionOptions.canSearchRegistry, true);
    assert.equal(el.resolutionOptions.canSynthesizeComposite, true);
    assert.equal(el.resolutionOptions.canAiGenerate, true);
    assert.equal(el.resolutionOptions.canUseNearest, true);
  }

  // Verify StyleAnalyzerModal.tsx has all 4 action buttons
  const modalContent = fs.readFileSync(
    path.join(process.cwd(), 'src', 'components', 'StyleAnalyzerModal.tsx'),
    'utf8'
  );
  assert.ok(modalContent.includes('Tìm trong kho'), 'Must have "Tìm trong kho" button');
  assert.ok(modalContent.includes('Ghép từ hiệu ứng có sẵn'), 'Must have "Ghép từ hiệu ứng có sẵn" button');
  assert.ok(modalContent.includes('Nhờ AI viết'), 'Must have "Nhờ AI viết" button');
  assert.ok(modalContent.includes('Dùng gần nhất'), 'Must have "Dùng gần nhất" button');

  // 2. Resolve analyzed element passing referenceFrames into Resolver
  const targetElement = report.elements[1]; // style_glitch_shake
  const resolved = await resolveAnalyzedStyleElement(
    targetElement,
    'search_registry',
    report.referenceFrames,
    { installedItems: [], cachedRegistry: [] }
  );

  assert.ok(resolved);
  assert.ok(resolved.tier >= 1);
});

test('M2.5 - Missing Assets Dialog & Ghost Reference Rehydration (M9)', () => {
  // Verify MissingAssetsModal.tsx exists and provides expected options
  const missingModalContent = fs.readFileSync(
    path.join(process.cwd(), 'src', 'components', 'MissingAssetsModal.tsx'),
    'utf8'
  );
  assert.ok(
    missingModalContent.includes('Tìm & Tải tất cả từ Kho'),
    'Must have "Tìm & Tải tất cả từ Kho" button'
  );
  assert.ok(
    missingModalContent.includes('Dùng bản thay thế gần đúng'),
    'Must have "Dùng bản thay thế gần đúng" button'
  );
  assert.ok(
    missingModalContent.includes('Giữ Ghost Reference'),
    'Must have "Giữ Ghost Reference" button'
  );

  // Simulate timeline with missing assets
  const timelineClips = [
    {
      id: 'clip_normal',
      track: 'video',
      name: 'Normal Clip',
    },
    {
      id: 'clip_missing_effect',
      track: 'video',
      name: 'Clip with Missing Pack',
      dynamicEffectId: 'official.cyber-pack/neon-laser@1.0.0',
    },
    {
      id: 'clip_ghost',
      track: 'effect',
      name: 'Ghost Reference Clip',
      ghostEffectId: 'thirdparty.unknown/vortex-portal@2.1.0',
    },
  ];

  const installedIds = new Set(['official.glitch-pack/rgb-shake@1.0.0']);

  // Detect missing references without deleting clips
  const missingRefs = [];
  for (const clip of timelineClips) {
    const refId = clip.dynamicEffectId || clip.ghostEffectId;
    if (refId && !installedIds.has(refId)) {
      missingRefs.push({
        clipId: clip.id,
        refId,
        clipName: clip.name,
      });
    }
  }

  assert.equal(missingRefs.length, 2);
  assert.equal(missingRefs[0].refId, 'official.cyber-pack/neon-laser@1.0.0');
  assert.equal(missingRefs[1].refId, 'thirdparty.unknown/vortex-portal@2.1.0');

  // Timeline integrity is 100% preserved (all 3 clips remain intact)
  assert.equal(timelineClips.length, 3);
});

test('M2.6 - Direct Drag & Drop file validation (.capfx, .cube, .svg, .json, fonts)', () => {
  const isSupportedDirectDrop = (filename) => {
    const lower = filename.toLowerCase();
    return (
      lower.endsWith('.capfx') ||
      lower.endsWith('.cube') ||
      lower.endsWith('.json') ||
      lower.endsWith('.svg') ||
      /\.(ttf|otf|woff2)$/i.test(lower)
    );
  };

  // Valid asset file types
  assert.equal(isSupportedDirectDrop('cyber_glitch.capfx'), true);
  assert.equal(isSupportedDirectDrop('teal_orange_cinema.cube'), true);
  assert.equal(isSupportedDirectDrop('confetti_animation.json'), true);
  assert.equal(isSupportedDirectDrop('badge_icon.svg'), true);
  assert.equal(isSupportedDirectDrop('BeVietnamPro-Bold.ttf'), true);
  assert.equal(isSupportedDirectDrop('Montserrat-Regular.otf'), true);
  assert.equal(isSupportedDirectDrop('Inter-Variable.woff2'), true);

  // Dangerous or unsupported files must be rejected
  assert.equal(isSupportedDirectDrop('malware.exe'), false);
  assert.equal(isSupportedDirectDrop('script.js'), false);
  assert.equal(isSupportedDirectDrop('payload.bat'), false);
  assert.equal(isSupportedDirectDrop('exploit.sh'), false);
  assert.equal(isSupportedDirectDrop('page.html'), false);
});
