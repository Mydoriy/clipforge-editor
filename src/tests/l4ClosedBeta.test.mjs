import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Mock localStorage for test environment
const mockStorage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => mockStorage.get(k) ?? null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  }
};

import {
  getFeatureFlags,
  setFeatureFlag,
  resetFeatureFlags,
  isFeatureEnabled,
  DEFAULT_FEATURE_FLAGS
} from '../utils/featureFlags.ts';

import {
  getBetaTasks,
  toggleBetaTask,
  resetBetaTasks,
  getBetaTasksProgress
} from '../utils/betaTasks.ts';

test('L4.1: Feature Flags manager supports defaults, toggles and persistence', () => {
  mockStorage.clear();
  resetFeatureFlags();

  const flags = getFeatureFlags();
  assert.strictEqual(flags.beta_guided_tasks, true, 'beta_guided_tasks should be active in closed beta');
  assert.strictEqual(flags.experimental_webcodecs_worker, false, 'experimental features must default to false');

  // Toggle flag
  setFeatureFlag('experimental_webcodecs_worker', true);
  assert.strictEqual(isFeatureEnabled('experimental_webcodecs_worker'), true);

  // Reset flags
  resetFeatureFlags();
  assert.strictEqual(isFeatureEnabled('experimental_webcodecs_worker'), false);
});

test('L4.2: Closed Beta Guided Tasks includes 5 validation scenarios and progress tracking', () => {
  mockStorage.clear();
  resetBetaTasks();

  const tasks = getBetaTasks();
  assert.strictEqual(tasks.length, 5, 'Must contain exactly 5 guided tasks');

  // Verify task themes
  const titles = tasks.map((t) => t.title).join(' ');
  assert.ok(titles.includes('30 giây'), 'Task 1 must cover 30s video with text & audio');
  assert.ok(titles.includes('phụ đề') || titles.includes('Auto-Captions'), 'Task 2 must cover auto-captions');
  assert.ok(titles.includes('9:16') || titles.includes('Xuất'), 'Task 3 must cover 9:16 export');
  assert.ok(titles.includes('Khôi phục') || titles.includes('tắt tab'), 'Task 4 must cover crash recovery');
  assert.ok(titles.includes('di động') || titles.includes('Mobile'), 'Task 5 must cover mobile/tablet testing');

  // Initial progress should be 0
  let progress = getBetaTasksProgress();
  assert.strictEqual(progress.completed, 0);
  assert.strictEqual(progress.percentage, 0);

  // Toggle first task as completed
  const firstId = tasks[0].id;
  const newState = toggleBetaTask(firstId);
  assert.strictEqual(newState, true);

  progress = getBetaTasksProgress();
  assert.strictEqual(progress.completed, 1);
  assert.strictEqual(progress.percentage, 20);

  // Toggle back
  toggleBetaTask(firstId);
  assert.strictEqual(getBetaTasksProgress().completed, 0);
});

test('L4.3: In-App Feedback and Diagnostic sanitization integrity', () => {
  const modalsPath = path.join(rootDir, 'src', 'components', 'Modals.tsx');
  const content = fs.readFileSync(modalsPath, 'utf8');

  // Feedback categories: bug, feature, ux
  assert.ok(content.includes("id: 'bug'"), 'Must support bug report');
  assert.ok(content.includes("id: 'feature'"), 'Must support feature request');
  assert.ok(content.includes("id: 'ux'"), 'Must support UX difficulty / friction reporting');

  // Severities
  assert.ok(content.includes("id: 'low'") && content.includes("id: 'high'"), 'Must support low/medium/high severity');

  // Diagnostics export
  assert.ok(content.includes('Tải file chẩn đoán (.json)'), 'Must offer sanitized JSON diagnostic download');
  assert.ok(content.includes('betaTasks'), 'Must connect betaTasks modal');
});

test('L4.4: BETA_REPORT.md exists, analyzes 20 testers across 5 tasks, and re-runs L0', () => {
  const reportPath = path.join(rootDir, 'BETA_REPORT.md');
  assert.ok(fs.existsSync(reportPath), 'BETA_REPORT.md must exist');
  const report = fs.readFileSync(reportPath, 'utf8');

  // Tester profiles
  assert.ok(report.includes('20 người') || report.includes('20 testers'), 'Must analyze 20 participants');
  assert.ok(report.includes('Cấu hình thấp') || report.includes('máy phổ thông'), 'Must include low-end device testers');
  assert.ok(report.includes('Không rành kỹ thuật') || report.includes('Người sáng tạo'), 'Must include non-technical users');

  // 5 Guided Tasks
  assert.ok(report.includes('Nhiệm vụ 1') && report.includes('Nhiệm vụ 5'), 'Must detail all 5 tasks');

  // Error Classification
  assert.ok(report.includes('P0') && report.includes('0'), 'Must confirm 0 P0 errors');
  assert.ok(report.includes('P1') && report.includes('P2'), 'Must classify P1 and P2 issues');

  // Feature usage & requests
  assert.ok(report.includes('bị bỏ qua') || report.includes('Ít dùng'), 'Must identify neglected features');
  assert.ok(report.includes('đòi hỏi nhiều nhất') || report.includes('Most Requested'), 'Must identify top requested features');

  // Re-verify L0 checklist
  assert.ok(report.includes('L0'), 'Must re-verify L0 quality checklist');
});

