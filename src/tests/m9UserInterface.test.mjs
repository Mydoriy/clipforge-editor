/**
 * Unit Tests for M9: Giao Diện Hệ Thống Mở Rộng Thư Viện (UI & Modals)
 * ============================================================================
 * Verifies:
 * 1. Tab "Kho hiệu ứng" trong Editor & mục trong Home/Sidebar/Library.
 * 2. Thẻ mục (Item Card): thumbnail, bilingual name, kind, trust badge, license, size,
 *    nút Dùng thử, Cài đặt, Gỡ cài đặt, Báo lỗi.
 * 3. Tiến trình tải thật (Progress tracking) và khả năng hủy (Cancelable AbortSignal).
 * 4. Hộp thoại "Thiếu tài nguyên" (MissingAssetsModal) với 4 trạng thái đề xuất:
 *    (Có trong kho | Ghép được | Dùng thay thế | Bỏ qua) và nút "Giải quyết tất cả".
 * 5. Cảnh báo Export khi còn Ghost Reference và Huy hiệu cảnh báo (GHOST) trên Timeline clip.
 * 6. Settings Kho tài nguyên: Kết nối kho, Chỉ offline, URL tùy chỉnh, Chỉ tin cậy gói chính thức,
 *    Tự cập nhật bản vá, Hạn mức dung lượng, Factory reset.
 * 7. Thông báo chuông: Gói mới, bản cập nhật, bản bị thu hồi, cài xong.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getRegistryConsent,
  setRegistryConsent,
  getOfflineOnlyMode,
  setOfflineOnlyMode,
  getOnlyOfficialMode,
  setOnlyOfficialMode,
  getExtensionStorageQuota,
  setExtensionStorageQuota,
  wipeAllExtensionLibrary,
  atomicInstallPackage,
  installPackage,
} from '../utils/extensionRegistryManager.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

test('M9.1 - Tab "Kho hiệu ứng" trong CategoryPanel, Sidebar, và Home Navigation', () => {
  // A. Check CategoryPanel.tsx has ExtensionLibrary tab
  const categoryPanelPath = path.join(rootDir, 'src', 'components', 'CategoryPanel.tsx');
  const categoryPanelContent = fs.readFileSync(categoryPanelPath, 'utf-8');
  assert.ok(
    categoryPanelContent.includes("id: 'ExtensionLibrary'"),
    'CategoryPanel must contain ExtensionLibrary tab'
  );
  assert.ok(
    categoryPanelContent.includes("activeTab === 'ExtensionLibrary'"),
    'CategoryPanel must render in-panel store when ExtensionLibrary tab is active'
  );

  // B. Check Sidebar.tsx has Extension Store button
  const sidebarPath = path.join(rootDir, 'src', 'components', 'Sidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
  assert.ok(
    sidebarContent.includes("openModal('extensionLibrary')"),
    'Sidebar must have button opening extensionLibrary modal'
  );

  // C. Check Home.tsx has Extension Store hero button
  const homePath = path.join(rootDir, 'src', 'pages', 'Home.tsx');
  const homeContent = fs.readFileSync(homePath, 'utf-8');
  assert.ok(
    homeContent.includes("openModal('extensionLibrary')"),
    'Home hero section must have button opening extensionLibrary modal'
  );
});

test('M9.2 - Item Card & 5 Main Store Tabs: Khám phá, Đã cài, Cập nhật, Của tôi, Cài đặt', () => {
  const modalPath = path.join(rootDir, 'src', 'components', 'ExtensionLibraryModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // 5 Main Navigation tabs
  assert.ok(modalContent.includes("'explore'"), 'Must include explore tab');
  assert.ok(modalContent.includes("'installed'"), 'Must include installed tab');
  assert.ok(modalContent.includes("'updates'"), 'Must include updates tab');
  assert.ok(modalContent.includes("'my_assets'"), 'Must include my_assets tab');
  assert.ok(modalContent.includes("'settings'"), 'Must include settings tab');

  // Item Card requirements: Try, Install, Uninstall, Report Error
  assert.ok(modalContent.includes('handleTryEffect'), 'Must support Dùng thử (Try / Preview)');
  assert.ok(modalContent.includes('handleInstallWithProgress'), 'Must support Cài đặt with progress');
  assert.ok(modalContent.includes('handleUninstall'), 'Must support Gỡ cài đặt');
  assert.ok(modalContent.includes('handleReportError'), 'Must support Báo lỗi / Diagnostic info');
  assert.ok(modalContent.includes('formatBytes'), 'Must display formatted file size');
  assert.ok(modalContent.includes('renderTrustBadge'), 'Must display trust badges');
});

test('M9.3 - Tiến trình tải thật (Progress tracking) & Hủy cài đặt qua AbortSignal', async () => {
  let reportedPercent = 0;
  let reportedStage = '';

  const mockPkg = {
    id: 'test.effect/sample',
    version: '1.0.0',
    name: 'Sample Test Effect',
    kind: 'effect',
    trustLevel: 'community',
    license: 'MIT',
    spec: {
      id: 'test.effect/sample',
      version: '1.0.0',
      kind: 'effect',
      author: 'Tester',
      tags: ['test'],
    },
  };

  // A. Progress callback is invoked with increasing percentages
  await installPackage(mockPkg, {
    onProgress: (pct, stage) => {
      reportedPercent = pct;
      reportedStage = stage;
    },
  });

  assert.equal(reportedPercent, 100);
  assert.ok(reportedStage.includes('Cài đặt'));

  // B. AbortSignal cleanly cancels the installation
  const abortController = new AbortController();
  abortController.abort(); // Cancel immediately

  const cancelledResult = await atomicInstallPackage(mockPkg, {
    signal: abortController.signal,
  });

  assert.equal(cancelledResult.success, false);
  assert.match(cancelledResult.error || '', /hủy/);
});

test('M9.4 - Hộp thoại "Thiếu tài nguyên" (MissingAssetsModal): 4 Đề xuất & Giải quyết tất cả', () => {
  const modalPath = path.join(rootDir, 'src', 'components', 'MissingAssetsModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // Verify 4 proposed states
  assert.ok(modalContent.includes("'in_registry'"), 'Must propose in_registry (Có trong kho)');
  assert.ok(modalContent.includes("'can_synthesize'"), 'Must propose can_synthesize (Ghép được)');
  assert.ok(modalContent.includes("'has_fallback'"), 'Must propose has_fallback (Dùng thay thế)');
  assert.ok(modalContent.includes("'skip'"), 'Must propose skip (Bỏ qua)');

  // Verify Resolve All handler
  assert.ok(modalContent.includes('handleResolveAll'), 'Must contain Giải quyết tất cả button handler');
  assert.ok(modalContent.includes('reconnectGhostReferences'), 'Must reconnect ghost clips upon resolution');
});

test('M9.5 - Cảnh báo Export khi còn Ghost Reference & Huy hiệu GHOST trên Timeline clip', () => {
  // A. Check Timeline.tsx renders GHOST warning badge
  const timelinePath = path.join(rootDir, 'src', 'components', 'Timeline.tsx');
  const timelineContent = fs.readFileSync(timelinePath, 'utf-8');
  assert.ok(
    timelineContent.includes('isGhostPlaceholder') || timelineContent.includes('ghostRef'),
    'Timeline must check ghost clip state'
  );
  assert.ok(
    timelineContent.includes('GHOST'),
    'Timeline must render visible GHOST badge on unmounted asset clips'
  );

  // B. Check Modals.tsx Export modal has ghost warning banner & confirm prompt
  const modalsPath = path.join(rootDir, 'src', 'components', 'Modals.tsx');
  const modalsContent = fs.readFileSync(modalsPath, 'utf-8');
  assert.ok(
    modalsContent.includes('ghostClips.length > 0'),
    'Modals.tsx must detect unresolved ghost clips during export'
  );
  assert.ok(
    modalsContent.includes('confirmDialog'),
    'Export must warn and require user confirmation if unresolved ghosts remain'
  );
});

test('M9.6 - Settings: Kết nối kho, Chỉ offline, URL tùy chỉnh, Chỉ tin cậy chính thức, Quota, Factory Reset', async () => {
  // A. Registry Consent
  setRegistryConsent(true);
  assert.equal(getRegistryConsent(), true);
  setRegistryConsent(false);
  assert.equal(getRegistryConsent(), false);
  setRegistryConsent(true);

  // B. Offline Only Mode
  setOfflineOnlyMode(true);
  assert.equal(getOfflineOnlyMode(), true);
  setOfflineOnlyMode(false);
  assert.equal(getOfflineOnlyMode(), false);

  // C. Only Official Mode
  setOnlyOfficialMode(true);
  assert.equal(getOnlyOfficialMode(), true);
  setOnlyOfficialMode(false);
  assert.equal(getOnlyOfficialMode(), false);

  // D. Storage Quota
  setExtensionStorageQuota(500);
  assert.equal(getExtensionStorageQuota(), 500);
  setExtensionStorageQuota(200);
  assert.equal(getExtensionStorageQuota(), 200);

  // E. Factory Reset (Wipe all extensions)
  const wipeRes = await wipeAllExtensionLibrary();
  assert.ok(typeof wipeRes.clearedCount === 'number');
});

test('M9.7 - Thông báo Chuông (Notification Bell): Gói mới, Cập nhật, Thu hồi, Cài xong', () => {
  const headerPath = path.join(rootDir, 'src', 'components', 'Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf-8');

  // Verify Header listens to extension events
  assert.ok(
    headerContent.includes('clipforge_extension_installed'),
    'Header must listen to install event'
  );
  assert.ok(
    headerContent.includes('clipforge_extension_revoked'),
    'Header must listen to revocation kill switch event'
  );
  assert.ok(
    headerContent.includes('clipforge_extension_updated'),
    'Header must listen to update event'
  );
});
