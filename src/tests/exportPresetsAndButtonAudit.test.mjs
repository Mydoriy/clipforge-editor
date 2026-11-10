import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Export Presets & H.264 / MP3 Database Standards', async () => {
  const dbIndexContent = fs.readFileSync(path.resolve(process.cwd(), 'src/db/index.ts'), 'utf8');

  // Verify STANDARD_EXPORT_PRESETS defined in database
  assert.ok(dbIndexContent.includes('STANDARD_EXPORT_PRESETS: ExportPresetEntity[]'), 'Must export STANDARD_EXPORT_PRESETS');
  assert.ok(dbIndexContent.includes("id: 'preset-tiktok-916'"), 'Must include TikTok 9:16 preset');
  assert.ok(dbIndexContent.includes("id: 'preset-youtube-1080p'"), 'Must include YouTube 1080p preset');
  assert.ok(dbIndexContent.includes("id: 'preset-youtube-4k'"), 'Must include YouTube 4K preset');
  assert.ok(dbIndexContent.includes("id: 'preset-instagram-11'"), 'Must include Instagram 1:1 preset');
  assert.ok(dbIndexContent.includes("id: 'preset-cinematic-219'"), 'Must include Cinematic 21:9 preset');
  assert.ok(dbIndexContent.includes("id: 'preset-audio-mp3-studio'"), 'Must include MP3 Studio Master 320k preset');
  assert.ok(dbIndexContent.includes("id: 'preset-audio-mp3-standard'"), 'Must include MP3 Standard 192k preset');

  // Verify H.264 AVC Profile definitions
  assert.ok(dbIndexContent.includes("h264Level: '5.1'"), 'YouTube 4K must use Level 5.1');
  assert.ok(dbIndexContent.includes("h264Level: '4.2'"), 'TikTok & FHD must use Level 4.2');
  assert.ok(dbIndexContent.includes("h264Profile: 'main'"), 'Instagram square must use Main Profile');

  // Verify MP3 CBR bitrates
  assert.ok(dbIndexContent.includes('audioBitrate: 320000'), 'Studio Master must be 320 kbps');
  assert.ok(dbIndexContent.includes('audioBitrate: 192000'), 'Standard / Voice must be 192 kbps');

  // Verify Dexie schema version 5 table definition
  assert.ok(dbIndexContent.includes('exportPresets:'), 'Dexie schema must declare exportPresets table');
  assert.ok(dbIndexContent.includes('ensureStandardExportPresets'), 'Must provide ensureStandardExportPresets helper');
});

test('UI Button Audit: 100% Active Handlers Across All Components', async () => {
  const dir = path.resolve(process.cwd(), 'src/components');
  const missing = [];

  function scan(currentDir) {
    for (const item of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const full = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        scan(full);
      } else if (full.endsWith('.tsx')) {
        const code = fs.readFileSync(full, 'utf8');
        const regex = /<button\b([^>]*)>/g;
        let match;
        while ((match = regex.exec(code)) !== null) {
          const attrs = match[1];
          const hasOnClick = /onClick\s*=/.test(attrs);
          const isSubmit = /type\s*=\s*['"]submit['"]/.test(attrs);
          if (!hasOnClick && !isSubmit) {
            const line = code.slice(0, match.index).split('\n').length;
            missing.push(`${path.basename(full)}:${line}`);
          }
        }
      }
    }
  }

  scan(dir);
  assert.deepEqual(missing, [], 'All buttons must have active onClick or submit handlers');
});

