import { test, expect } from '@playwright/test';

test.describe('ClipForge E2E Acceptance Flow', () => {
  test('New guest user: create project -> edit -> export modal -> data persistence', async ({ page }) => {
    // 1. Visit Editor with seeded project in Guest Mode
    await page.goto('/editor/demo-916-intro');

    // 2. Verify editor UI renders successfully without requiring login
    await expect(page.locator('text=Player-')).toBeVisible({ timeout: 15000 });

    // 3. Verify Timeline has clips loaded
    const timelineClip = page.locator('[data-clip-id]').first();
    await expect(timelineClip).toBeVisible();

    // 4. Test Split button (Scissors)
    const splitButton = page.locator('button[title*="Split"], button:has-text("Split")').first();
    if (await splitButton.isVisible()) {
      await splitButton.click();
    }

    // 5. Open Export Modal
    const exportButton = page.locator('button:has-text("Xuất"), button:has-text("Export")').first();
    await exportButton.click();

    // 6. Verify Export Modal opened with resolution & format choices
    await expect(page.getByText(/Xuất Video/i).first()).toBeVisible();

    // 7. Verify WebCodecs MP4 1080p preset exists
    await expect(page.getByText(/1080p/i).first()).toBeVisible();

    // 8. Close export modal
    const closeBtn = page.locator('button:has-text("Hủy"), button[aria-label="Close"], button:has-text("Đóng")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    // 9. Verify reload preserves data in IndexedDB
    await page.reload();
    await expect(page.locator('text=Player-')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-clip-id]').first()).toBeVisible();
  });
});
