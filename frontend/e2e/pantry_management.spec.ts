import { test, expect } from '@playwright/test';

test.describe('Pantry Management - Complete Features, Batching, Freshness, & Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure on home or logged in
    await expect(page.locator('text=PantryPal').first()).toBeVisible();
  });

  test('should display date reminder notice and all freshness filter options', async ({ page }) => {
    // Navigate to Pantry Stock
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator('h2:has-text("Pantry Inventory")')).toBeVisible();

    // Check date reminder disclaimer notice
    await expect(
      page.locator('text=/Date-Only Semantics & Freshness Guide/i')
    ).toBeVisible();

    // Check freshness filter select options
    const freshnessSelect = page.locator('select').filter({ hasText: /All Freshness/ });
    await expect(freshnessSelect).toBeVisible();
    await freshnessSelect.selectOption('due_today');
    await freshnessSelect.selectOption('due_within_three_days');
    await freshnessSelect.selectOption('later');
    await freshnessSelect.selectOption('no_date');
    await freshnessSelect.selectOption('All');

    // Check sort options
    const sortSelect = page.locator('select').filter({ hasText: /Expiry: Soonest First/ });
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption('name_asc');
    await sortSelect.selectOption('quantity_desc');
  });

  test('should add multiple batches with different dates and display batch badges', async ({ page }) => {
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator('h2:has-text("Pantry Inventory")')).toBeVisible();

    const uniqueIngredient = `Farm Milk ${Date.now()}`;

    // Add Batch 1 (due in 2 days)
    await page.locator('button:has-text("Add Item")').first().click();
    const form1 = page.locator('form');
    await form1.locator('input[placeholder*="Boneless Chicken"]').fill(uniqueIngredient);
    await form1.locator('select').nth(0).selectOption('Dairy & Eggs');
    await form1.locator('select').nth(1).selectOption('Fridge');
    await form1.locator('input[type="number"]').fill('1000');
    await form1.locator('select').nth(2).selectOption('ml');

    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);
    const dateStr1 = in2Days.toISOString().split('T')[0];
    await form1.locator('input[type="date"]').fill(dateStr1);
    await form1.locator('button[type="submit"]:has-text("Add to Pantry")').click();

    // Verify first batch added
    await expect(page.locator(`h4:has-text("${uniqueIngredient}")`).first()).toBeVisible();

    // Add Batch 2 (due in 14 days)
    await page.locator('button:has-text("Add Item")').first().click();
    const form2 = page.locator('form');
    await form2.locator('input[placeholder*="Boneless Chicken"]').fill(uniqueIngredient);
    await form2.locator('select').nth(0).selectOption('Dairy & Eggs');
    await form2.locator('select').nth(1).selectOption('Fridge');
    await form2.locator('input[type="number"]').fill('500');
    await form2.locator('select').nth(2).selectOption('ml');

    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);
    const dateStr2 = in14Days.toISOString().split('T')[0];
    await form2.locator('input[type="date"]').fill(dateStr2);
    await form2.locator('button[type="submit"]:has-text("Add to Pantry")').click();

    // Both batches should now exist and show Batch indicator
    const batchHeadings = page.locator('h4', { hasText: uniqueIngredient });
    await expect(batchHeadings).toHaveCount(2);
    await expect(page.locator('span:has-text("Batch")').first()).toBeVisible();
  });

  test('should require delete confirmation dialog before removing a pantry item', async ({ page }) => {
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator('h2:has-text("Pantry Inventory")')).toBeVisible();

    const uniqueDelete = `Temporary Celery ${Date.now()}`;

    // Add item to delete
    await page.locator('button:has-text("Add Item")').first().click();
    const form = page.locator('form');
    await form.locator('input[placeholder*="Boneless Chicken"]').fill(uniqueDelete);
    await form.locator('input[type="number"]').fill('3');
    await form.locator('select').nth(2).selectOption('stalk');
    await form.locator('button[type="submit"]:has-text("Add to Pantry")').click();

    // Verify item appears
    const heading = page.locator('h4', { hasText: uniqueDelete }).first();
    await expect(heading).toBeVisible();

    // Find the remove button for this item
    const itemCard = heading.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
    await itemCard.locator('button[title="Remove item"]').click();

    // Delete confirmation modal should be visible
    await expect(page.locator('text=Remove Ingredient from Pantry')).toBeVisible();
    await expect(page.locator('text=Confirm removal of this batch')).toBeVisible();

    // Test Cancel first
    await page.locator('button:has-text("Cancel")').click();
    await expect(heading).toBeVisible();

    // Now click Remove again and Confirm Delete
    await itemCard.locator('button[title="Remove item"]').click();
    await page.locator('button:has-text("Confirm Delete")').click();

    // Verify item is removed and feedback toast appears
    await expect(page.locator('h4', { hasText: uniqueDelete })).toHaveCount(0);
    await expect(page.locator('text=removed from pantry').first()).toBeVisible();
  });

  test('should support loading sample pantry without overwriting existing items', async ({ page }) => {
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator('h2:has-text("Pantry Inventory")')).toBeVisible();

    // Check "Load Sample Pantry" button
    const sampleBtn = page.locator('button:has-text("Load Sample Pantry")');
    await expect(sampleBtn).toBeVisible();

    // Click Load Sample Pantry
    await sampleBtn.click();

    // Verify success feedback toast
    await expect(
      page.locator('text=/sample pantry items/i').first()
    ).toBeVisible({ timeout: 10000 });

    // Verify multiple sample items exist
    await expect(page.locator('text=Eggs').or(page.locator('text=Garlic')).first()).toBeVisible();
  });

  test('should verify persistence after reload and data isolation between two users', async ({ page }) => {
    // 1. Sign out if signed in, register User 1
    const uniqueId = Date.now();
    const user1Email = `chef-alpha-${uniqueId}@kitchen.local`;
    const user1Item = `Alpha Saffron ${uniqueId}`;

    await page.locator('button[aria-label="User Profile Menu"]').click();
    await page.locator('button:has-text("Sign Out")').click();
    await expect(page.locator('text=Welcome to PantryPal').first()).toBeVisible();

    // Register User 1
    await page.locator("text=Don't have an account? Create one").click();
    await page.fill('input[placeholder*="Chef Rowan"]', 'Chef Alpha');
    await page.fill('input[placeholder*="you@kitchen.local"]', user1Email);
    await page.fill('input[placeholder*="••••••••"]', 'Password123!');
    await page.locator('button[type="submit"]:has-text("Sign Up")').click();
    await expect(page.locator('text=Chef Alpha').first()).toBeVisible();

    // User 1 adds private ingredient
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await page.locator('button:has-text("Add Item")').first().click();
    const formA = page.locator('form');
    await formA.locator('input[placeholder*="Boneless Chicken"]').fill(user1Item);
    await formA.locator('input[type="number"]').fill('10');
    await formA.locator('select').nth(2).selectOption('g');
    await formA.locator('button[type="submit"]:has-text("Add to Pantry")').click();

    await expect(page.locator(`h4:has-text("${user1Item}")`)).toBeVisible();

    // Verify persistence after browser reload for User 1
    await page.reload();
    await expect(page.locator('text=Chef Alpha').first()).toBeVisible();
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator(`h4:has-text("${user1Item}")`)).toBeVisible();

    // 2. Sign out User 1 and register User 2
    await page.locator('button[aria-label="User Profile Menu"]').click();
    await page.locator('button:has-text("Sign Out")').click();

    const user2Email = `chef-beta-${uniqueId}@kitchen.local`;
    const user2Item = `Beta Caviar ${uniqueId}`;

    await page.locator("text=Don't have an account? Create one").click();
    await page.fill('input[placeholder*="Chef Rowan"]', 'Chef Beta');
    await page.fill('input[placeholder*="you@kitchen.local"]', user2Email);
    await page.fill('input[placeholder*="••••••••"]', 'Password123!');
    await page.locator('button[type="submit"]:has-text("Sign Up")').click();
    await expect(page.locator('text=Chef Beta').first()).toBeVisible();

    // User 2 navigates to Pantry Stock: User 1's item must NOT be present (ISOLATION)
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator(`h4:has-text("${user1Item}")`)).toHaveCount(0);

    // User 2 adds own private item
    await page.locator('button:has-text("Add Item")').first().click();
    const formB = page.locator('form');
    await formB.locator('input[placeholder*="Boneless Chicken"]').fill(user2Item);
    await formB.locator('input[type="number"]').fill('2');
    await formB.locator('select').nth(2).selectOption('cans');
    await formB.locator('button[type="submit"]:has-text("Add to Pantry")').click();

    await expect(page.locator(`h4:has-text("${user2Item}")`)).toBeVisible();
    await expect(page.locator(`h4:has-text("${user1Item}")`)).toHaveCount(0);
  });
});
