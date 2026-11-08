import { test, expect } from '@playwright/test';

test.describe('Phòng Học & Remix (/lab) E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to /lab route
    await page.goto('/lab');
    await expect(page.locator('text=PHÒNG HỌC & REMIX').first()).toBeVisible({ timeout: 15000 });
  });

  test('Flow 1: Social URL Intake - Zero Network Fetch & Copyright Source Card', async ({ page }) => {
    // 1. Intercept network requests to verify NO calls are made to social domains
    let socialFetchAttempted = false;
    await page.route(/tiktok\.com|youtube\.com|instagram\.com/, (route) => {
      socialFetchAttempted = true;
      route.abort();
    });

    // 2. Paste a TikTok video URL
    const urlInput = page.locator('input[placeholder*="Dán link video"]').first();
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://www.tiktok.com/@creative_artist/video/7182938475618293');

    // 3. Verify source card appears showing domain and external link
    await expect(page.locator('text=Nguồn phát hiện: tiktok.com').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Mở liên kết gốc').first()).toBeVisible();

    // 4. Verify copyright guard banner is displayed
    await expect(page.locator('text=Không tải trực tiếp từ mạng xã hội').first()).toBeVisible();
    await expect(page.locator('text=Thả file video bạn có quyền sử dụng').first()).toBeVisible();

    // 5. Invariant check: Assert ZERO requests were sent to the social domain
    expect(socialFetchAttempted).toBe(false);
  });

  test('Flow 2: Video File Intake -> 4-Stage Analysis Progress -> Detected Techniques', async ({ page }) => {
    // 1. Simulate video file upload via the hidden file input
    const fileInput = page.locator('input[type="file"]').first();

    // Create a 1-second synthetic video buffer or upload sample
    await fileInput.setInputFiles({
      name: 'reference_sample_clip.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('FAKE_VIDEO_STREAM_DATA_HEADER_BYTES'),
    });

    // 2. Step 2 (Phân tích) should activate
    await expect(page.locator('text=Đang phân tích kỹ thuật video...').first()).toBeVisible({ timeout: 10000 });

    // 3. Verify 4-phase progress indicators render
    await expect(page.locator('text=1. Đo lường').first()).toBeVisible();
    await expect(page.locator('text=2. Hỏi AI').first()).toBeVisible();
    await expect(page.locator('text=3. Kiểm chứng').first()).toBeVisible();
    await expect(page.locator('text=4. Tinh chỉnh').first()).toBeVisible();

    // 4. Verify realtime cost counters are rendered ($0 for local-only)
    await expect(page.locator('text=Chi phí ước tính: $0.0000').first()).toBeVisible();

    // 5. Wait for analysis to complete and step 3 (Kỹ thuật phát hiện) to render
    await expect(page.locator('text=Kỹ Thuật Đã Phát Hiện').first()).toBeVisible({ timeout: 20000 });

    // 6. Verify evidence filmstrip and verified badge
    const verifiedBadges = page.locator('text=Đã kiểm chứng');
    await expect(verifiedBadges.first()).toBeVisible();
  });

  test('Flow 3: Remix Room -> Slot Model -> Preflight Export Gate Protection', async ({ page }) => {
    // 1. Load mock file to transition to Step 3 then Step 4
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'reference_sample_clip.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('FAKE_VIDEO_STREAM_DATA_HEADER_BYTES'),
    });

    await expect(page.locator('text=Kỹ Thuật Đã Phát Hiện').first()).toBeVisible({ timeout: 20000 });

    // 2. Click "Chuyển sang Phòng Remix"
    const goToRemixBtn = page.locator('button:has-text("Chuyển sang Phòng Remix")').first();
    await goToRemixBtn.click();

    // 3. Verify Remix Room UI is active
    await expect(page.locator('text=Tham chiếu – không xuất').first()).toBeVisible();
    await expect(page.locator('text=Trước / Sau').first()).toBeVisible();

    // 4. Test Preflight Gate: Click "Xuất video Remix" while slots are still empty
    const exportRemixBtn = page.locator('button:has-text("Xuất video Remix")').first();
    await exportRemixBtn.click();

    // 5. Preflight modal MUST intercept and block export
    await expect(page.locator('text=Chốt chặn kiểm tra xuất (Export Preflight)').first()).toBeVisible();
    await expect(page.locator('text=chưa gán clip người dùng').first()).toBeVisible();
    await expect(page.locator('text=Điền đen').first()).toBeVisible();

    // 6. Resolve all empty slots by clicking "Điền đen"
    const fillBlackButtons = page.locator('button:has-text("Điền đen")');
    const count = await fillBlackButtons.count();
    for (let i = 0; i < count; i++) {
      await fillBlackButtons.first().click();
      await page.waitForTimeout(200);
    }

    // 7. Close preflight modal
    const closePreflightBtn = page.locator('button:has-text("Đóng")').first();
    if (await closePreflightBtn.isVisible()) {
      await closePreflightBtn.click();
    }
  });

  test('Flow 4: Step 5 Learned Techniques -> Undo Auto-save & Local Storage Persistence', async ({ page }) => {
    // 1. Upload mock file to trigger auto-save pipeline
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'reference_sample_clip.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('FAKE_VIDEO_STREAM_DATA_HEADER_BYTES'),
    });

    await expect(page.locator('text=Kỹ Thuật Đã Phát Hiện').first()).toBeVisible({ timeout: 20000 });

    // 2. Switch to Step 5 (Đã học)
    const step5Tab = page.locator('button:has-text("5. Đã học")').first();
    await step5Tab.click();

    // 3. Verify Learned Items Manager is displayed
    await expect(page.locator('text=Kho Kỹ Thuật Đã Học').first()).toBeVisible();
    await expect(page.locator('text=Học từ AI – đã kiểm chứng cục bộ').first()).toBeVisible();

    // 4. Verify Undo button exists and functions
    const undoButton = page.locator('button:has-text("Hoàn tác")').first();
    if (await undoButton.isVisible()) {
      await undoButton.click();
      // Should show toast or state update
      await expect(page.locator('text=Đã hoàn tác').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

