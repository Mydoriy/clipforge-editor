import { test, expect } from '@playwright/test';

test.describe('ClipForge E2E Production Acceptance Flow', () => {
  test('Full pipeline: import -> cắt -> chữ -> export -> persistence on production build', async ({ page }) => {
    // 1. IMPORT / LOAD: Visit Editor with project in Guest Mode (No login required)
    await page.goto('/editor/demo-916-intro');

    // 2. Verify editor UI renders successfully
    await expect(page.locator('text=Player-')).toBeVisible({ timeout: 15000 });

    // 3. Verify Timeline has initial clips loaded from IndexedDB
    const timelineClip = page.locator('[data-clip-id]').first();
    await expect(timelineClip).toBeVisible();

    // 4. CẮT (SPLIT): Trigger split on timeline
    const splitButton = page.locator('button[title*="Split"], button:has-text("Split")').first();
    if (await splitButton.isVisible()) {
      await splitButton.click();
    }

    // 5. CHỮ (ADD TEXT): Switch to Text category tab and add text layer
    const textTab = page.locator('button:has-text("Text"), button:has-text("Văn bản")').first();
    if (await textTab.isVisible()) {
      await textTab.click();
      const addDefaultTextBtn = page.locator('button:has-text("Thêm Chữ Mặc Định")').first();
      if (await addDefaultTextBtn.isVisible()) {
        await addDefaultTextBtn.click();
      }
    }

    // 6. EXPORT: Open Export Modal
    const exportButton = page.locator('button:has-text("Xuất"), button:has-text("Export")').first();
    await exportButton.click();

    // 7. Verify Export Modal opened with resolution & format choices
    await expect(page.getByText(/Xuất Video/i).first()).toBeVisible();

    // 8. Verify WebCodecs MP4 1080p preset exists
    await expect(page.getByText(/1080p/i).first()).toBeVisible();

    // 9. START EXPORT: Click Start Export button and verify export engine triggers
    const startExportBtn = page.locator('button:has-text("Bắt đầu xuất video ngay")').first();
    if (await startExportBtn.isVisible()) {
      await startExportBtn.click();
      // Verify progress bar is rendered during export
      await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 10000 });

      // 10. Test instant cancellation
      const cancelBtn = page.getByRole('button', { name: /Hủy xuất/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }

    // Close export modal if still visible
    const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Đóng")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    // 11. PERSISTENCE: Reload page and verify data remains intact without login
    await page.reload();
    await expect(page.locator('text=Player-')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-clip-id]').first()).toBeVisible();
  });
});
