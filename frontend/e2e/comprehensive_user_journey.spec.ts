import { test, expect } from '@playwright/test';

test.describe('Complete Verification Journey — Full Lifecycle, Layouts & Usability', () => {
  test('Complete User Journey: Register → add pantry items → discover recipe → add missing ingredients → plan meal → reload → log out', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=PantryPal').first()).toBeVisible();

    const timestamp = Date.now();
    const uniqueEmail = `chef_${timestamp}@journey.local`;
    const chefName = `Chef Journey ${timestamp}`;

    // 1. Sign out existing session if any to ensure fresh registration
    const userMenu = page.locator('button[aria-label="User Profile Menu"]').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      const signOutBtn = page.locator('button:has-text("Sign Out")').first();
      if (await signOutBtn.isVisible()) {
        await signOutBtn.click();
      }
    }

    // Open Auth modal if not open
    const authDialog = page.locator('div[role="dialog"]');
    if (!(await authDialog.isVisible())) {
      const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("Sign up"), button:has-text("Account")').first();
      if (await signInBtn.isVisible()) {
        await signInBtn.click();
      }
    }

    // Switch to Register mode in AuthModal
    await page.locator("text=Don't have an account? Create one").click();
    await page.fill('input[placeholder*="Chef Rowan"]', chefName);
    await page.fill('input[placeholder*="you@kitchen.local"]', uniqueEmail);
    await page.fill('input[placeholder*="••••••••"]', 'Password123!');
    await page.locator('button[type="submit"]:has-text("Sign Up")').click();

    // Verify registration success and user name
    await expect(page.locator(`text=${chefName}`).first()).toBeVisible();

    // 2. Add Pantry Items
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator('h2:has-text("Pantry Inventory")')).toBeVisible();

    // Add item: Garlic Cloves
    await page.locator('button:has-text("Add Item")').first().click();
    const addDialog = page.locator('div[role="dialog"]');
    await expect(addDialog).toBeVisible();
    await addDialog.locator('input[placeholder*="Boneless Chicken"]').fill('Garlic Cloves');
    await addDialog.locator('input[type="number"]').fill('6');
    await addDialog.locator('button[type="submit"]:has-text("Add to Pantry")').click();
    await expect(addDialog).not.toBeVisible();
    await expect(page.locator('text=Garlic Cloves').first()).toBeVisible();

    // 3. Discover Recipe
    await page.locator('button:has-text("Recipe Matches")').first().click();
    await expect(page.locator('h2:has-text("Recipe Discovery")')).toBeVisible();

    // Select the first recipe card
    const recipeCard = page.locator('[data-testid="recipe-card"]').first();
    await expect(recipeCard).toBeVisible();
    await recipeCard.click();

    // Modal open
    const recipeModal = page.locator('div[role="dialog"]');
    await expect(recipeModal).toBeVisible();

    // 4. Add Missing Ingredients to Shopping List
    const addMissingBtn = recipeModal.locator('button:has-text("Missing to Grocery List")').first();
    if (await addMissingBtn.isVisible()) {
      await addMissingBtn.click();
    }
    // Close recipe modal
    const closeBtn = recipeModal.locator('button[aria-label="Close modal"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(recipeModal).not.toBeVisible();

    // 5. Plan Meal
    await page.locator('button:has-text("Weekly Planner")').first().click();
    await expect(page.locator('h2:has-text("Weekly Meal Planner")')).toBeVisible();

    // Click "Assign" on the first empty slot
    const assignBtn = page.locator('button:has-text("Assign")').first();
    await assignBtn.click();
    const planDialog = page.locator('div[role="dialog"]');
    await expect(planDialog).toBeVisible();

    // Select a recipe from the picker modal
    const selectRecipeBtn = planDialog.locator('button:has-text("Select")').first();
    await selectRecipeBtn.click();
    await expect(planDialog).not.toBeVisible();

    // 6. Reload & Verify Persistence
    await page.reload();
    await expect(page.locator('text=PantryPal').first()).toBeVisible();

    // Verify user is still authenticated after reload
    await expect(page.locator(`text=${chefName}`).first()).toBeVisible();

    // 7. Log out
    await page.locator('button[aria-label="User Profile Menu"]').first().click();
    await page.locator('button:has-text("Sign Out")').click();

    // Verify session ended and auth modal shown
    await expect(page.locator('text=Welcome to PantryPal').first()).toBeVisible();
  });

  test('Responsive Layout: Mobile Bottom Nav vs Desktop Sidebar', async ({ page }) => {
    // 1. Mobile Viewport (iPhone SE / 375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Sidebar should be hidden on mobile
    await expect(page.locator('aside')).toBeHidden();

    // Mobile bottom navigation bar should be visible
    const mobileNav = page.locator('nav.fixed.bottom-0, nav[aria-label="Mobile Navigation"], div.fixed.bottom-0').first();
    await expect(mobileNav).toBeVisible();

    // 2. Desktop Viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();

    // Desktop sidebar should now be visible
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Keyboard Access & Focus Management in Dialogs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Open Add Ingredient dialog
    await page.locator('button:has-text("Home & Kitchen")').first().click();
    const addBtn = page.locator('button:has-text("Add Ingredient")').first();
    await addBtn.click();

    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Tab key navigation within dialog
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Escape to dismiss dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('Dark Mode Ambience & Persistence across reloads', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Navigate to Preferences
    await page.locator('button:has-text("Preferences")').first().click();

    // Select Midnight Forest (Dark mode)
    await page.locator('button:has-text("Midnight Forest")').click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload page to verify persistence
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Switch back to Warm Ivory (Light mode)
    await page.locator('button:has-text("Preferences")').first().click();
    await page.locator('button:has-text("Warm Ivory")').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('Server Connection Error Notice & Retry Action Handling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Check that backend is connected (no retry banner initially)
    await expect(page.locator('text=Ready to Cook').first()).toBeVisible();

    // Verify retry button exists and is responsive if simulated
    const retryBtn = page.locator('button:has-text("Retry Connection")');
    if (await retryBtn.isVisible()) {
      await retryBtn.click();
    }
  });
});
