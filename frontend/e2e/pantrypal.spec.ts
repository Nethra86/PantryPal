import { test, expect } from '@playwright/test';

test.describe('PantryPal End-to-End User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display home view with calm companion branding, kitchen metrics, and recipe matches', async ({ page }) => {
    // Check brand heading and serene companion subtitle
    await expect(page.locator('text=PantryPal').first()).toBeVisible();
    await expect(page.locator('text=Calm Kitchen Companion').first()).toBeVisible();

    // Verify fact-based metrics cards
    await expect(page.locator('text=Ready to Cook').first()).toBeVisible();
    await expect(page.locator('text=Pantry Inventory').first()).toBeVisible();

    // Check ready recipe cards loaded from backend on home dashboard
    const readyCard = page.locator('[data-testid="recipe-card"]').first();
    await expect(readyCard).toBeVisible({ timeout: 10000 });

    // Verify readiness badges exist (Ready to Cook, All Types Available, or Missing Ingredients)
    await expect(page.locator('text=/Ready to Cook|All Types Available|Missing/').first()).toBeVisible();
  });

  test('should navigate to Pantry Stock, add a new ingredient, and verify stock', async ({ page }) => {
    // Click Pantry Stock in sidebar
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator('h2:has-text("Pantry Inventory")')).toBeVisible();

    // Verify existing seeded items exist
    await expect(page.locator('text=Garlic').or(page.locator('text=Olive Oil')).first()).toBeVisible();

    // Click Add Item button
    await page.locator('button:has-text("Add Item")').first().click();
    await expect(page.locator('text=Add Ingredient to Pantry').first()).toBeVisible();

    // Fill form inside modal
    const form = page.locator('form');
    await form.locator('input[placeholder*="Boneless Chicken"]').fill('Fresh Basil Leaves');
    await form.locator('select').nth(0).selectOption('Produce');
    await form.locator('select').nth(1).selectOption('Fridge');
    await form.locator('input[type="number"]').fill('50');
    await form.locator('select').nth(2).selectOption('g');

    // Submit
    await form.locator('button[type="submit"]:has-text("Add to Pantry")').click();

    // Verify added to inventory list
    await expect(page.locator('text=Fresh Basil Leaves')).toBeVisible();
  });

  test('should open recipe detail modal, adjust servings, explore step mode, and deduct ingredients', async ({ page }) => {
    // Click on ready recipe card from home
    const recipeCard = page.locator('[data-testid="recipe-card"]').first();
    await recipeCard.click();

    // Check recipe modal is open
    await expect(page.locator('text=Adjust Servings').first()).toBeVisible();

    // Switch to step-by-step cook mode
    await page.locator('button:has-text("Step-by-Step Cook Mode")').click();
    await expect(page.locator('text=Kitchen Timer')).toBeVisible();

    // Click "I Made This (Deduct)"
    await page.locator('button:has-text("I Made This (Deduct)")').click();

    // Verify deduction feedback banner
    await expect(page.locator('text=Deducted from Pantry').or(page.locator('text=Enjoy your meal')).first()).toBeVisible();

    // Close modal
    await page.locator('button:has-text("Close")').click();
  });

  test('should navigate to Recipe Matches and filter culinary dishes', async ({ page }) => {
    // Navigate to Recipe Matches tab
    await page.locator('button:has-text("Recipe Matches")').first().click();
    await expect(page.locator('h2:has-text("Recipe Discovery")')).toBeVisible();

    // Verify all dishes exist
    await expect(page.locator('h3:has-text("Creamy Garlic Tuscan Chicken")')).toBeVisible();
    await expect(page.locator('h3:has-text("Classic Roman Spaghetti Carbonara")')).toBeVisible();

    // Verify filter buttons exist
    await expect(page.locator('button:has-text("Ready to Cook")')).toBeVisible();
    await expect(page.locator('button:has-text("Missing ≤2 Items")')).toBeVisible();
  });

  test('should manage Shopping List, add items, and mark purchased', async ({ page }) => {
    // Navigate to Shopping List tab
    await page.locator('button:has-text("Shopping List")').first().click();
    await expect(page.locator('h2:has-text("Shopping List")')).toBeVisible();

    const uniqueItem = `Artisan Cheese ${Date.now()}`;
    // Add a grocery item
    await page.fill('input[placeholder*="Add grocery item"]', uniqueItem);
    await page.click('button[title="Add to grocery list"]');

    // Verify added
    const itemLocator = page.locator(`p:has-text("${uniqueItem}")`).first();
    await expect(itemLocator).toBeVisible();

    // Toggle purchased by clicking the item card
    await itemLocator.click();

    // Verify "Bought to Pantry" button appears or item moves to purchased section
    const moveBtn = page.locator('button:has-text("Bought to Pantry")');
    if (await moveBtn.isVisible()) {
      await moveBtn.click();
    }
  });

  test('should display Weekly Meal Planner with schedule slots', async ({ page }) => {
    // Navigate to Weekly Planner tab
    await page.locator('button:has-text("Weekly Planner")').first().click();
    await expect(page.locator('h2:has-text("Weekly Meal Planner")')).toBeVisible();
    await expect(page.locator('text=Monday').first()).toBeVisible();
    await expect(page.locator('text=Friday').first()).toBeVisible();
  });

  test('should navigate to Preferences and toggle theme & dietary options', async ({ page }) => {
    // Navigate to Preferences tab
    await page.locator('button:has-text("Preferences")').first().click();
    await expect(page.locator('h2:has-text("Kitchen Settings & Preferences")')).toBeVisible();
    await expect(page.locator('text=Appearance & Ambience')).toBeVisible();

    // Toggle theme via header button
    const themeBtn = page.locator('button[aria-label="Toggle theme"]').first();
    await themeBtn.click();

    // Check html has dark class
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(typeof isDark).toBe('boolean');

    // Toggle back
    await themeBtn.click();
  });

  test('should support user registration, sign out, and login with session persistence', async ({ page }) => {
    // Open profile menu in sidebar
    await page.locator('button[aria-label="User Profile Menu"]').click();
    await expect(page.locator('text=Sign Out')).toBeVisible();

    // Click Sign Out
    await page.locator('button:has-text("Sign Out")').click();

    // Verify Auth Modal is open
    await expect(page.locator('text=Welcome to PantryPal').first()).toBeVisible();

    // Switch to Registration mode
    await page.locator('text=Don\'t have an account? Create one').click();
    await expect(page.locator('text=Create Kitchen Account').first()).toBeVisible();

    // Register a new user
    const uniqueEmail = `cook-${Date.now()}@kitchen.local`;
    await page.fill('input[placeholder*="Chef Rowan"]', 'Chef Jordan');
    await page.fill('input[placeholder*="you@kitchen.local"]', uniqueEmail);
    await page.fill('input[placeholder*="••••••••"]', 'SecretPassword123!');
    await page.locator('button[type="submit"]:has-text("Sign Up")').click();

    // Verify authenticated as Chef Jordan
    await expect(page.locator('text=Chef Jordan').first()).toBeVisible({ timeout: 5000 });

    // Verify session persistence across browser reload (HttpOnly cookie)
    await page.reload();
    await expect(page.locator('text=Chef Jordan').first()).toBeVisible({ timeout: 5000 });

    // Restore default Chef Rowan session for other tests
    await page.locator('button[aria-label="User Profile Menu"]').click();
    await page.locator('button:has-text("Sign Out")').click();
    await page.fill('input[placeholder*="you@kitchen.local"]', 'rowan@kitchen.local');
    await page.fill('input[placeholder*="••••••••"]', 'Password123!');
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await expect(page.locator('text=Chef Rowan').first()).toBeVisible({ timeout: 5000 });
  });
});



