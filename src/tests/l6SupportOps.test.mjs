import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { wipeAllLocalData, deleteCloudAccountAndData } from '../utils/dataPrivacy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

test('L6.1: Help and Troubleshooting page contains 4 core issues, guides and FAQ', () => {
  const helpPath = path.join(rootDir, 'src', 'pages', 'Help.tsx');
  assert.ok(fs.existsSync(helpPath), 'src/pages/Help.tsx must exist');

  const content = fs.readFileSync(helpPath, 'utf8');

  // Verify the 4 mandatory troubleshooting scenarios
  assert.ok(content.includes('export-freeze') || content.includes('Export bị lỗi'), 'Must cover Export freeze / 99% stuck');
  assert.ok(content.includes('ram-stutter') || content.includes('Thiếu RAM'), 'Must cover Out of memory / stuttering');
  assert.ok(content.includes('file-permission') || content.includes('Mất quyền truy cập file'), 'Must cover File permission loss');
  assert.ok(content.includes('tab-concurrency') || content.includes('Web Locks'), 'Must cover Tab concurrency lock');

  // Verify Visual Guides & FAQ sections
  assert.ok(content.includes('Quick Visual Guides') || content.includes('Hướng dẫn Biên tập Nhanh'), 'Must include visual guides');
  assert.ok(content.includes('FAQ') || content.includes('Câu hỏi Thường gặp'), 'Must include FAQ section');
  assert.ok(content.includes('systemCheck'), 'Must link to system check modal');
  assert.ok(content.includes('feedback'), 'Must link to feedback/diagnostic modal');
});

test('L6.2: Dependabot configuration & Monthly Maintenance Runner', () => {
  // Check .github/dependabot.yml
  const dependabotPath = path.join(rootDir, '.github', 'dependabot.yml');
  assert.ok(fs.existsSync(dependabotPath), '.github/dependabot.yml must exist');
  const dependabotContent = fs.readFileSync(dependabotPath, 'utf8');
  assert.ok(dependabotContent.includes('interval: "monthly"'), 'Dependabot must have monthly interval configured');

  // Check scripts/monthly-maintenance.mjs
  const maintenanceScript = path.join(rootDir, 'scripts', 'monthly-maintenance.mjs');
  assert.ok(fs.existsSync(maintenanceScript), 'scripts/monthly-maintenance.mjs must exist');

  // Run maintenance script and ensure exit code 0
  const output = execSync(`node "${maintenanceScript}"`, { cwd: rootDir, encoding: 'utf8' });
  assert.ok(output.includes('MONTHLY MAINTENANCE AUDIT SUMMARY'), 'Maintenance runner must output summary');
  assert.ok(output.includes('ALL CRITERIA HEALTHY'), 'Maintenance runner must pass health check');
});

test('L6.3: Support Response Templates exist with diagnostic and reproduction steps', () => {
  const templatesPath = path.join(rootDir, 'SUPPORT_TEMPLATES.md');
  assert.ok(fs.existsSync(templatesPath), 'SUPPORT_TEMPLATES.md must exist');

  const content = fs.readFileSync(templatesPath, 'utf8');
  assert.ok(content.includes('SEVERITY MATRIX'), 'Must include ticket severity matrix');
  assert.ok(content.includes('Diagnostic JSON') || content.includes('chẩn đoán kỹ thuật'), 'Must request diagnostic JSON');
  assert.ok(content.includes('trình duyệt') || content.includes('browser'), 'Must request browser details');
  assert.ok(content.includes('Bước tái hiện') || content.includes('Steps to Reproduce'), 'Must request 3 reproduction steps');
  assert.ok(content.includes('Export'), 'Must include export issue template');
  assert.ok(content.includes('RAM'), 'Must include RAM/memory issue template');
  assert.ok(content.includes('quyền truy cập tệp'), 'Must include file permission template');
});

test('L6.4: Data Privacy functions wipe local data and handle cloud deletion', async () => {
  // Mock localStorage and sessionStorage for Node test environment
  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear()
  };
  globalThis.sessionStorage = {
    clear: () => {}
  };
  globalThis.caches = {
    keys: async () => ['test-cache-1'],
    delete: async () => true
  };

  localStorage.setItem('test_key', 'test_value');
  assert.equal(localStorage.getItem('test_key'), 'test_value');

  // Test local wipe
  const localWipeResult = await wipeAllLocalData();
  assert.ok(localWipeResult.success, 'Local wipe must succeed');
  assert.equal(localStorage.getItem('test_key'), null, 'localStorage must be cleared');
  assert.ok(localWipeResult.storageCleared, 'Storage must be reported cleared');

  // Test cloud deletion when Supabase is not configured
  const cloudResult = await deleteCloudAccountAndData('mock-user-123');
  assert.ok(typeof cloudResult.success === 'boolean');
  if (!cloudResult.success) {
    assert.ok(cloudResult.error, 'Must provide clear reason when cloud service is not configured');
  }
});

test('L6.5: RUNBOOK.md includes rollback drill evidence, uptime monitor & maintenance', () => {
  const runbookPath = path.join(rootDir, 'RUNBOOK.md');
  assert.ok(fs.existsSync(runbookPath), 'RUNBOOK.md must exist');

  const content = fs.readFileSync(runbookPath, 'utf8');
  assert.ok(content.includes('Rollback Drill Verification') || content.includes('Bằng chứng kiểm thử Rollback'), 'Must document tested rollback drill');
  assert.ok(content.includes('UPTIME & DEPLOY MONITORING') || content.includes('GIÁM SÁT UPTIME'), 'Must document uptime monitoring');
  assert.ok(content.includes('robots.txt'), 'Must document heartbeat endpoint');
  assert.ok(content.includes('LỊCH TRÌNH BẢO TRÌ') || content.includes('MONTHLY MAINTENANCE'), 'Must document monthly maintenance schedule');
});
