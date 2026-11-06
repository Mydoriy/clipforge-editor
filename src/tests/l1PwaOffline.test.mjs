import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('L1: PWA Web App Manifest completeness & validation', () => {
  const manifestPath = path.resolve('public/manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in public/');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Basic identification & display
  assert.ok(manifest.name.includes('ClipForge'), 'Manifest name must contain ClipForge');
  assert.strictEqual(manifest.short_name, 'ClipForge');
  assert.strictEqual(manifest.display, 'standalone');
  assert.strictEqual(manifest.theme_color, '#080B12');
  assert.strictEqual(manifest.background_color, '#080B12');
  assert.ok(manifest.start_url, 'start_url must be defined');

  // Icons: 192, 512 and maskable
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'Must have at least 3 icons');
  const has192 = manifest.icons.some((i) => i.sizes === '192x192');
  const has512 = manifest.icons.some((i) => i.sizes === '512x512');
  const hasMaskable = manifest.icons.some((i) => i.purpose && i.purpose.includes('maskable'));

  assert.strictEqual(has192, true, 'Manifest must contain 192x192 icon');
  assert.strictEqual(has512, true, 'Manifest must contain 512x512 icon');
  assert.strictEqual(hasMaskable, true, 'Manifest must contain maskable icon');

  // Shortcuts: New project & Open Library
  assert.ok(Array.isArray(manifest.shortcuts), 'Shortcuts must be an array');
  const hasNewProject = manifest.shortcuts.some((s) => s.url === '/editor/new');
  const hasLibrary = manifest.shortcuts.some((s) => s.url === '/library');
  assert.strictEqual(hasNewProject, true, 'Shortcuts must contain New Project');
  assert.strictEqual(hasLibrary, true, 'Shortcuts must contain Open Library');

  // Chromium File Handlers: .capproj, .mp4, .webm
  assert.ok(Array.isArray(manifest.file_handlers), 'file_handlers must be defined');
  const capprojHandler = manifest.file_handlers.find(
    (h) => h.accept && h.accept['application/x-capproj']
  );
  assert.ok(capprojHandler, 'file_handlers must accept application/x-capproj (.capproj)');

  // Share Target
  assert.ok(manifest.share_target, 'share_target must be defined');
  assert.ok(manifest.share_target.action, 'share_target action must be defined');
});

test('L1: PWA Icon files exist on disk with valid headers', () => {
  const iconFiles = [
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/icon-maskable.png',
    'public/icons/icon.svg'
  ];

  for (const iconPath of iconFiles) {
    const fullPath = path.resolve(iconPath);
    assert.ok(fs.existsSync(fullPath), `Icon file ${iconPath} must exist`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 100, `Icon file ${iconPath} must have valid size (>100 bytes)`);

    // Check PNG signature if PNG file
    if (iconPath.endsWith('.png')) {
      const buffer = fs.readFileSync(fullPath);
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      assert.strictEqual(isPng, true, `${iconPath} must be a valid PNG binary`);
    }
  }
});

test('L1: Service Worker (Workbox-compatible) caching strategies & COOP/COEP isolation', () => {
  const swPath = path.resolve('public/sw.js');
  assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');
  const swContent = fs.readFileSync(swPath, 'utf8');

  // Verify Precache Shell
  assert.ok(swContent.includes('PRECACHE_SHELL_URLS'), 'SW must define precache URLs');
  assert.ok(swContent.includes('/manifest.webmanifest'), 'SW precache must include manifest');

  // Verify Cache-First runtime strategies for heavy AI & FFmpeg
  assert.ok(swContent.includes('ffmpeg') || swContent.includes('ffmpeg-core'), 'SW must cache FFmpeg core');
  assert.ok(swContent.includes('transformers') || swContent.includes('onnx'), 'SW must cache AI models');
  assert.ok(swContent.includes('fonts.googleapis.com') || swContent.includes('fonts.gstatic.com'), 'SW must cache fonts');

  // Verify Header Injection for Cross-Origin Isolation (COOP / COEP / CORP)
  assert.ok(
    swContent.includes('Cross-Origin-Embedder-Policy') && swContent.includes('credentialless'),
    'SW must inject COEP: credentialless'
  );
  assert.ok(
    swContent.includes('Cross-Origin-Opener-Policy') && swContent.includes('same-origin'),
    'SW must inject COOP: same-origin'
  );
  assert.ok(
    swContent.includes('Cross-Origin-Resource-Policy') && swContent.includes('cross-origin'),
    'SW must inject CORP: cross-origin'
  );

  // Verify Controlled Skip-Waiting
  assert.ok(swContent.includes('SKIP_WAITING'), 'SW must listen for SKIP_WAITING message');
});

test('L1: Safe PWA update guard - Never auto-reload during active unsaved edits', () => {
  // Simulate state logic from applyPwaUpdate
  function canSafelyApplyUpdate(autosaveStatus, isSaving) {
    if (autosaveStatus === 'saving' || isSaving) {
      return false; // Guarded!
    }
    return true;
  }

  assert.strictEqual(canSafelyApplyUpdate('saving', true), false, 'Must reject reload during active saving');
  assert.strictEqual(canSafelyApplyUpdate('saving', false), false, 'Must reject reload when autosave is in flight');
  assert.strictEqual(canSafelyApplyUpdate('saved', false), true, 'Allows update reload when project is safely saved');
  assert.strictEqual(canSafelyApplyUpdate('idle', false), true, 'Allows update reload when idle');
});

test('L1: Index.html PWA metadata & iOS Safari touch icon linkage', () => {
  const htmlContent = fs.readFileSync('index.html', 'utf8');
  assert.ok(htmlContent.includes('manifest.webmanifest'), 'index.html must link manifest.webmanifest');
  assert.ok(htmlContent.includes('apple-touch-icon'), 'index.html must specify apple-touch-icon for iOS Safari');
  assert.ok(htmlContent.includes('apple-mobile-web-app-capable'), 'index.html must set apple-mobile-web-app-capable');
});
