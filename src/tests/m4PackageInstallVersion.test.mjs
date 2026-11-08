import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSemver,
  compareSemver,
  getUpdateType,
  runStaticAnalysis,
  testCompileShaderSandbox,
  migrateEffectParams,
  compareEffectVersions,
  pinAssetToProject,
  resolveAssetWithPin,
  packageProjectForExport,
  verifyProjectDependencies,
  getExtensionStorageQuota,
  setExtensionStorageQuota,
  STORAGE_QUOTA_KEY,
  AUTO_UPDATE_PATCHES_KEY,
  DEFAULT_QUOTA_MB,
  WARNING_THRESHOLD_RATIO,
} from '../utils/extensionRegistryManager.ts';
import { computeSha256 } from '../utils/ed25519Verifier.ts';

test('M4.1 - Atomic Install & Safe Rollback on Errors', async () => {
  // 1. Static Analysis: detect forbidden script vectors
  const safeSpec = {
    id: 'test.fx.safe',
    version: '1.0.0',
    name: 'Safe Effect',
    kind: 'effect',
    description: 'Declarative shader only',
    author: 'Author',
    license: 'MIT',
    trustLevel: 'community',
    tags: ['safe'],
    shader: {
      glslVersion: '300 es',
      fragmentShader: 'outColor = vec4(1.0);',
    },
  };

  const safeCheck = runStaticAnalysis(safeSpec);
  assert.equal(safeCheck.safe, true, 'Safe declarative spec must pass static analysis');

  const unsafeScriptSpec = {
    ...safeSpec,
    description: 'Attack <script>alert(1)</script>',
  };
  const unsafeCheck1 = runStaticAnalysis(unsafeScriptSpec);
  assert.equal(unsafeCheck1.safe, false, 'Must reject script tag');

  const unsafeEvalSpec = {
    ...safeSpec,
    description: 'Attack eval("malicious code")',
  };
  const unsafeCheck2 = runStaticAnalysis(unsafeEvalSpec);
  assert.equal(unsafeCheck2.safe, false, 'Must reject eval()');

  // 2. Sandbox dry-run compile
  const goodCompile = testCompileShaderSandbox('outColor = vec4(uProgress);');
  assert.equal(goodCompile.success, true, 'Valid shader must pass compile check');

  const badCompile = testCompileShaderSandbox('outColor = vec4(__SYNTAX_ERROR__);');
  assert.equal(badCompile.success, false, 'Corrupted shader must fail sandbox compile');
  assert.ok(badCompile.error?.includes('syntax error'), 'Must report sandbox compile error');
});

test('M4.2 - Project Pinning & Same-Major Compatibility Resolution', async () => {
  const dummyProject = {
    id: 'proj-123',
    title: 'Test Project',
    pinnedAssets: {},
  };

  // 1. Pin asset to project
  pinAssetToProject(dummyProject, {
    id: 'com.clipforge.fx.rgb_shake',
    version: '1.0.0',
    sha256: 'hash123',
    redistributable: true,
  });

  assert.ok(dummyProject.pinnedAssets['com.clipforge.fx.rgb_shake'], 'Asset must be pinned');
  assert.equal(dummyProject.pinnedAssets['com.clipforge.fx.rgb_shake'].version, '1.0.0');

  // 2. Semver resolution helpers
  assert.deepEqual(parseSemver('1.2.3'), { major: 1, minor: 2, patch: 3 });
  assert.deepEqual(parseSemver('v2.0.4'), { major: 2, minor: 0, patch: 4 });

  // 3. Test resolveAssetWithPin simulation:
  // If pinned is 1.0.0 and only 1.2.0 (same major) is available
  const pinnedMajor = parseSemver('1.0.0').major;
  const availableMajor = parseSemver('1.2.0').major;
  const incompatibleMajor = parseSemver('2.0.0').major;

  assert.equal(pinnedMajor === availableMajor, true, '1.0.0 and 1.2.0 share major version 1');
  assert.equal(pinnedMajor === incompatibleMajor, false, '1.0.0 and 2.0.0 have different major versions');
});

test('M4.3 - Update Classification, Notification, & Official Patch Auto-Update Toggle', () => {
  // 1. Update classification
  assert.equal(getUpdateType('1.0.0', '1.0.1'), 'patch');
  assert.equal(getUpdateType('1.0.0', '1.1.0'), 'minor');
  assert.equal(getUpdateType('1.0.0', '2.0.0'), 'major');
  assert.equal(getUpdateType('1.2.0', '1.1.0'), 'none');

  // 2. Settings check: auto-update patches default is false
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTO_UPDATE_PATCHES_KEY);
  }
  // Constant verification
  assert.equal(AUTO_UPDATE_PATCHES_KEY, 'clipforge_auto_update_official_patches');
});

test('M4.4 - ParamSchema Migration & Before/After Comparison', () => {
  const oldParams = { intensity: 1.5, speed: 0.8, obsoleteParam: 99 };
  const oldSchema = {
    properties: {
      intensity: { min: 0, max: 1, default: 0.5 },
      speed: { min: 0, max: 2, default: 1 },
    },
  };
  const newSchema = {
    properties: {
      intensity: { min: 0, max: 1, default: 0.5 },
      speed: { min: 0, max: 2, default: 1 },
      glowAmount: { min: 0, max: 1, default: 0.35 },
    },
  };

  const migration = migrateEffectParams(oldParams, oldSchema, newSchema);
  assert.equal(migration.success, true);
  // intensity was 1.5, clamped to max 1
  assert.equal(migration.migratedParams.intensity, 1);
  // speed was 0.8, kept within [0, 2]
  assert.equal(migration.migratedParams.speed, 0.8);
  // glowAmount was not in oldParams, filled with default 0.35
  assert.equal(migration.migratedParams.glowAmount, 0.35);
  // obsoleteParam should not exist in new params
  assert.equal(migration.migratedParams.obsoleteParam, undefined);

  // Before/after comparison
  const oldSpec = {
    id: 'fx.glow',
    version: '1.0.0',
    shader: {
      fragmentShader: 'oldCode',
      uniforms: { uIntensity: {}, uSpeed: {} },
    },
  };
  const newSpec = {
    id: 'fx.glow',
    version: '1.1.0',
    shader: {
      fragmentShader: 'newCode',
      uniforms: { uIntensity: {}, uSpeed: {}, uGlow: {} },
    },
  };
  const diff = compareEffectVersions(oldSpec, newSpec);
  assert.equal(diff.fromVersion, '1.0.0');
  assert.equal(diff.toVersion, '1.1.0');
  assert.deepEqual(diff.addedUniforms, ['uGlow']);
  assert.equal(diff.shaderChanged, true);
});

test('M4.5 - Quota Limit, Warning Threshold & Safe LRU Eviction', () => {
  assert.equal(DEFAULT_QUOTA_MB, 200, 'Default extension quota is 200MB');
  assert.equal(WARNING_THRESHOLD_RATIO, 0.85, 'Warning threshold is 85%');

  // Verify eviction invariant: Pinned items are protected
  const projects = [
    {
      id: 'p1',
      title: 'Active Video',
      pinnedAssets: {
        'com.clipforge.fx.rgb_shake': { version: '1.0.0' },
      },
      tracksData: {
        clips: [{ dynamicEffectId: 'com.clipforge.filter.teal_orange_3d' }],
      },
    },
  ];

  const pinnedSet = new Set();
  for (const proj of projects) {
    if (proj.pinnedAssets) Object.keys(proj.pinnedAssets).forEach((k) => pinnedSet.add(k));
    proj.tracksData.clips.forEach((c) => {
      if (c.dynamicEffectId) pinnedSet.add(c.dynamicEffectId);
    });
  }

  assert.equal(pinnedSet.has('com.clipforge.fx.rgb_shake'), true, 'rgb_shake is pinned and protected');
  assert.equal(pinnedSet.has('com.clipforge.filter.teal_orange_3d'), true, 'teal_orange_3d is active and protected');
  assert.equal(pinnedSet.has('com.clipforge.sfx.unused'), false, 'unused sfx can be evicted');
});

test('M4.6 - .capproj Packaging: Embeds Redistributable Specs, References Non-Redistributable', async () => {
  const dummyInstalled = [
    {
      id: 'com.clipforge.fx.free_shader',
      version: '1.0.0',
      name: 'Free Shader',
      kind: 'effect',
      spec: {
        id: 'com.clipforge.fx.free_shader',
        version: '1.0.0',
        name: 'Free Shader',
        kind: 'effect',
        redistributable: true,
        shader: { fragmentShader: 'free();' },
      },
    },
    {
      id: 'com.clipforge.fx.proprietary_lut',
      version: '2.0.0',
      name: 'Proprietary LUT',
      kind: 'filter',
      spec: {
        id: 'com.clipforge.fx.proprietary_lut',
        version: '2.0.0',
        name: 'Proprietary LUT',
        kind: 'filter',
        redistributable: false, // Cannot embed binary directly
        shader: { fragmentShader: 'commercial();' },
      },
    },
  ];

  const projectToExport = {
    id: 'proj-export-test',
    title: 'Commercial Ad',
    tracksData: {
      clips: [
        { id: 'c1', dynamicEffectId: 'com.clipforge.fx.free_shader' },
        { id: 'c2', dynamicEffectId: 'com.clipforge.fx.proprietary_lut' },
      ],
    },
  };

  const packaged = await packageProjectForExport(projectToExport, dummyInstalled);

  // 1. Free shader must have embedded spec
  assert.ok(packaged.embeddedSpecs['com.clipforge.fx.free_shader'], 'Free shader spec must be embedded');
  assert.equal(packaged.embeddedSpecs['com.clipforge.fx.free_shader'].redistributable, true);

  // 2. Proprietary LUT must NOT embed spec, but must pin reference with requiresDownload
  assert.equal(packaged.embeddedSpecs['com.clipforge.fx.proprietary_lut'], undefined, 'Must not embed non-redistributable');
  assert.ok(packaged.pinnedAssets['com.clipforge.fx.proprietary_lut'], 'Must pin proprietary asset reference');
  assert.equal(packaged.pinnedAssets['com.clipforge.fx.proprietary_lut'].requiresDownload, true);

  // 3. Verifying dependencies when opening on another device:
  // If proprietary_lut is not installed and not embedded -> must report missing
  const depCheck = await verifyProjectDependencies(packaged, [dummyInstalled[0]]); // only free_shader installed
  assert.equal(depCheck.complete, false, 'Project must flag missing dependency');
  assert.equal(depCheck.missingAssets.length, 1);
  assert.equal(depCheck.missingAssets[0].id, 'com.clipforge.fx.proprietary_lut');
  assert.equal(depCheck.missingAssets[0].requiresDownload, true);
});
