import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ConfirmDialog: Replaces crude browser confirm alerts with modern dark-themed modal', () => {
  const rootDir = process.cwd();

  // 1. ConfirmDialog component exists
  const dialogPath = path.join(rootDir, 'src', 'components', 'ConfirmDialog.tsx');
  assert.ok(fs.existsSync(dialogPath), 'src/components/ConfirmDialog.tsx must exist');
  const dialogContent = fs.readFileSync(dialogPath, 'utf8');

  // Must match CapCut desktop design specifications:
  assert.ok(dialogContent.includes('bg-[#181E29]'), 'Card must have dark #181E29 background');
  assert.ok(dialogContent.includes('rounded-2xl'), 'Card must have rounded-2xl corners');
  assert.ok(dialogContent.includes('AlertTriangle'), 'Must render amber warning triangle');
  assert.ok(dialogContent.includes('#1FC8DB'), 'Primary confirm button must have cyan accent');
  assert.ok(dialogContent.includes('#283244'), 'Secondary cancel button must have dark slate background');
  assert.ok(dialogContent.includes('Escape'), 'Must support Escape key to cancel');
  assert.ok(dialogContent.includes('Enter'), 'Must support Enter key to confirm');

  // 2. confirmDialog and confirmDialogState in useEditorStore
  const storePath = path.join(rootDir, 'src', 'store', 'useEditorStore.ts');
  const storeContent = fs.readFileSync(storePath, 'utf8');
  assert.ok(storeContent.includes('ConfirmDialogOptions'), 'Must define ConfirmDialogOptions interface');
  assert.ok(storeContent.includes('confirmDialogState: ConfirmDialogOptions | null'), 'Must include confirmDialogState');
  assert.ok(storeContent.includes('export const confirmDialog ='), 'Must export confirmDialog helper');

  // 3. ConfirmDialog is mounted in App.tsx
  const appPath = path.join(rootDir, 'src', 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('ConfirmDialog'), 'App.tsx must import and mount ConfirmDialog');
  assert.ok(appContent.includes('<ConfirmDialog />'), 'App.tsx must render <ConfirmDialog />');

  // 4. Zero occurrences of window.confirm in active application code
  const homePath = path.join(rootDir, 'src', 'pages', 'Home.tsx');
  const homeContent = fs.readFileSync(homePath, 'utf8');
  assert.ok(!homeContent.includes('window.confirm'), 'Home.tsx must not contain window.confirm');
  assert.ok(homeContent.includes('confirmDialog'), 'Home.tsx must use confirmDialog for trash confirmation');

  const modalsPath = path.join(rootDir, 'src', 'components', 'Modals.tsx');
  const modalsContent = fs.readFileSync(modalsPath, 'utf8');
  assert.ok(!modalsContent.includes('window.confirm'), 'Modals.tsx must not contain window.confirm');
  assert.ok(modalsContent.includes('confirmDialog'), 'Modals.tsx must use confirmDialog');

  const telemetryPath = path.join(rootDir, 'src', 'pages', 'TelemetryDashboard.tsx');
  const telemetryContent = fs.readFileSync(telemetryPath, 'utf8');
  assert.ok(!telemetryContent.includes('window.confirm'), 'TelemetryDashboard.tsx must not contain window.confirm');
  assert.ok(telemetryContent.includes('confirmDialog'), 'TelemetryDashboard.tsx must use confirmDialog');

  const headerPath = path.join(rootDir, 'src', 'components', 'Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');
  assert.ok(!headerContent.includes('window.confirm'), 'Header.tsx must not contain window.confirm');
});

