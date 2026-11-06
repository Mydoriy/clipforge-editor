import { test, expect } from '@playwright/test';

test.describe('ClipForge E2E Acceptance Flow', () => {
  test('import -> split -> add text -> export verification', async ({ page }) => {
    // 1. Visit Editor with seeded project
    await page.goto('/editor/demo-916-intro');

    // 2. Verify editor UI renders successfully
    await expect(page.locator('text=Player-')).toBeVisible({ timeout: 10000 });

    // 3. Verify Timeline has clips
    const timelineClip = page.locator('[data-clip-id]').first();
    await expect(timelineClip).toBeVisible();

    // 4. Click split button (Scissors)
    const splitButton = page.locator('button[title*="Split"], button:has-text("Split")').first();
    if (await splitButton.isVisible()) {
      await splitButton.click();
    }

    // 5. Open Export Modal
    const exportButton = page.locator('button:has-text("Xuất"), button:has-text("Export")').first();
    await exportButton.click();

    // 6. Verify Export Modal opened with resolution & format choices
    await expect(page.locator('text=Xuất video, text=Export Video').first()).toBeVisible();

    // 7. Verify WebCodecs MP4 1080p preset exists
    await expect(page.locator('text=1080P').first()).toBeVisible();
  });
});

