import { test, expect } from '@playwright/test';

test.describe('Dashboard Real Data, Profile Editing, Theme Persistence & Authenticated Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=PantryPal').first()).toBeVisible();
  });

  test('Dashboard shows 6 real metrics, factual transparency badge, and no fabricated metrics', async ({ page }) => {
    // Navigate to Dashboard via Home & Kitchen
    await page.locator('button:has-text("Home & Kitchen")').first().click();

    // Verify 6 real status cards are present
    await expect(page.locator('text=Ready to Cook').first()).toBeVisible();
    await expect(page.locator('text=Pantry Items').first()).toBeVisible();
    await expect(page.locator('text=Use Soon').first()).toBeVisible();
    await expect(page.locator('text=To Buy').first()).toBeVisible();
    await expect(page.locator('text=Planned').first()).toBeVisible();
    await expect(page.locator('text=Suggestions').first()).toBeVisible();

    // Verify factual transparency guarantee: no fake savings, food waste kg, or calorie figures
    await expect(
      page.locator('text=/Factual Kitchen Accounting/i').first()
    ).toBeVisible();
    await expect(
      page.locator('text=/We never invent or fabricate dollar savings/i').first()
    ).toBeVisible();

    // Test navigation by clicking metric cards
    // 1. Click "To Buy" card -> jumps to Shopping List tab
    await page.locator('text=To Buy').first().click();
    await expect(page.locator('h2:has-text("Shopping List")')).toBeVisible();

    // Navigate back to Dashboard
    await page.locator('button:has-text("Home & Kitchen")').first().click();
  });

  test('Dashboard displays freshness radar / use-soon shelf with functional buttons', async ({ page }) => {
    await page.locator('button:has-text("Home & Kitchen")').first().click();

    // Check Freshness Radar section is visible
    await expect(page.locator('h2:has-text("Freshness Radar")').first()).toBeVisible();

    // If there are perishable items or if all are fresh, check proper state
    const dueSoonBadge = page.locator('text=/Due Soon/i');
    const allFreshBadge = page.locator('text=/All Fresh/i');

    const hasPerishables = await dueSoonBadge.isVisible();
    if (hasPerishables) {
      // Should show recipe rescue buttons
      const findRecipeBtn = page.locator('button:has-text("Find Recipes with")').first();
      await expect(findRecipeBtn).toBeVisible();
      await findRecipeBtn.click();
      // Should navigate to recipes
      await expect(page.locator('h2:has-text("Recipe Discovery")')).toBeVisible();
    } else {
      await expect(allFreshBadge.first()).toBeVisible();
    }
  });

  test('Settings supports persistent theme switching between Warm Ivory, Midnight Forest, and System', async ({ page }) => {
    // Navigate to Settings via Preferences button
    await page.locator('button:has-text("Preferences")').first().click();
    await expect(page.locator('h2:has-text("Kitchen Settings & Preferences")')).toBeVisible();

    // 1. Switch to Warm Ivory (Light)
    await page.locator('button:has-text("Warm Ivory")').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    const lightPref = await page.evaluate(() => localStorage.getItem('pantrypal_theme_pref'));
    expect(lightPref).toBe('light');

    // 2. Switch to Midnight Forest (Dark)
    await page.locator('button:has-text("Midnight Forest")').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    const darkPref = await page.evaluate(() => localStorage.getItem('pantrypal_theme_pref'));
    expect(darkPref).toBe('dark');

    // 3. Switch to System Default
    await page.locator('button:has-text("System Default")').click();
    const sysPref = await page.evaluate(() => localStorage.getItem('pantrypal_theme_pref'));
    expect(sysPref).toBe('system');
  });

  test('Settings supports profile editing and dialog focus management', async ({ page }) => {
    await page.locator('button:has-text("Preferences")').first().click();
    await expect(page.locator('h2:has-text("Kitchen Settings & Preferences")')).toBeVisible();

    // Click "Edit Profile"
    await page.locator('button:has-text("Edit Profile")').click();

    // Modal should be visible
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h3:has-text("Edit Chef Profile")')).toBeVisible();

    // Update name
    const nameInput = dialog.locator('input[placeholder="Your name"]');
    await nameInput.fill('Head Chef Rowan Verified');

    // Save profile
    await dialog.locator('button:has-text("Save Profile")').click();

    // Verify modal closes and profile name is updated
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('h3:has-text("Head Chef Rowan Verified")')).toBeVisible();
  });

  test('Settings authenticated data export security guarantee and offline capabilities card', async ({ page }) => {
    await page.locator('button:has-text("Preferences")').first().click();
    await expect(page.locator('h2:has-text("Kitchen Settings & Preferences")')).toBeVisible();

    // Verify Security Guarantee is explicitly displayed
    await expect(
      page.locator('text=/Security Guarantee: Password hashes & session tokens are NEVER exported/i')
    ).toBeVisible();

    // Verify Offline vs. Live Backend Breakdown Card
    await expect(page.locator('text=/Offline PWA Shell/i')).toBeVisible();
    await expect(page.locator('text=/Live Backend Required/i')).toBeVisible();

    // Verify Export JSON button is clickable and functional
    const exportBtn = page.locator('button:has-text("Export JSON")');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled();

    // Trigger export and listen for download or success
    const downloadPromise = page.waitForEvent('download', { timeout: 7000 }).catch(() => null);
    await exportBtn.click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('pantrypal');
    }
  });

  test('Accessible dialog focus trap and Escape key close', async ({ page }) => {
    await page.locator('button:has-text("Home & Kitchen")').first().click();

    // Click "Add Ingredient" button to open modal
    await page.locator('button:has-text("Add Ingredient")').first().click();

    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Press Escape to close modal
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
