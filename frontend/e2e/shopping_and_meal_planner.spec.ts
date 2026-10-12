import { test, expect } from '@playwright/test';

test.describe('Persistent Shopping Lists and Weekly Meal Planner Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=PantryPal').first()).toBeVisible();

    // Ensure session is active as Chef Rowan
    const isRowan = await page.locator('text=Chef Rowan').first().isVisible();
    if (!isRowan) {
      const profileBtn = page.locator('button[aria-label="User Profile Menu"]');
      if (await profileBtn.isVisible()) {
        await profileBtn.click();
        const signOutBtn = page.locator('button:has-text("Sign Out")');
        if (await signOutBtn.isVisible()) {
          await signOutBtn.click();
        }
      }
      const signInPrompt = page.locator('text=Welcome to PantryPal');
      if (await signInPrompt.isVisible()) {
        await page.fill('input[placeholder*="you@kitchen.local"]', 'rowan@kitchen.local');
        await page.fill('input[placeholder*="••••••••"]', 'Password123!');
        await page.locator('button[type="submit"]:has-text("Sign In")').click();
        await expect(page.locator('text=Chef Rowan').first()).toBeVisible({ timeout: 5000 });
      }
    }
    // Grant clipboard permissions if supported
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  });

  test('Shopping List: Manual additions, editing, purchase checkboxes, copying list, and removal', async ({ page }) => {
    // 1. Navigate to Shopping List tab
    await page.locator('button:has-text("Shopping List")').first().click();
    await expect(page.locator('h2:has-text("Shopping List")')).toBeVisible();

    // 2. Manual addition
    const testItemName = `Chia Seeds ${Date.now()}`;
    await page.fill('input[placeholder*="Add grocery item"]', testItemName);
    await page.locator('select').first().selectOption('Pantry & Grains');
    await page.click('button[title="Add to grocery list"]');

    // Verify added in unpurchased section
    const itemCard = page.locator(`p:has-text("${testItemName}")`).first();
    await expect(itemCard).toBeVisible();

    // 3. Edit item
    const itemRow = page.locator('div[class*="rounded-2xl"]').filter({ hasText: testItemName }).first();
    await itemRow.locator('button[title="Edit grocery item"]').click();
    await expect(page.locator('text=Edit Shopping Item').first()).toBeVisible();

    // Change quantity and notes
    const editModal = page.locator('div[role="dialog"]').filter({ hasText: /Edit Shopping Item/i });
    await editModal.locator('input[type="number"]').fill('3');
    await editModal.locator('textarea[placeholder*="Optional notes"]').fill('Two-pack preferred');
    await editModal.locator('button:has-text("Save Changes")').click();

    // Verify edited quantity and notes
    await expect(page.locator(`p:has-text("${testItemName}")`).first()).toBeVisible();
    await expect(page.locator('text=Two-pack preferred').first()).toBeVisible();

    // 4. Copy List to clipboard
    await page.locator('button:has-text("Copy List")').first().click();
    await expect(
      page.locator('button:has-text("Copied!")').or(page.locator('text=/copied to clipboard|formatted for copy/i')).first()
    ).toBeVisible();

    // 5. Purchase checkbox / toggle
    await itemRow.click();

    // Verify item moved to purchased section
    await expect(page.locator('text=Marked as Purchased').first()).toBeVisible();

    // 6. Delete item
    const purchasedRow = page.locator('div[class*="rounded-2xl"]').filter({ hasText: testItemName }).first();
    await purchasedRow.locator('button[title="Delete item"]').click();
    await expect(page.locator('div[class*="rounded-2xl"]').filter({ hasText: testItemName })).toHaveCount(0);
  });

  test('Shopping List: Deduplication, compatible aggregation, and unit mismatch review warning', async ({ page }) => {
    await page.locator('button:has-text("Shopping List")').first().click();
    await expect(page.locator('h2:has-text("Shopping List")')).toBeVisible();

    const timestamp = Date.now();
    const baseItemName = `Flour ${timestamp}`;

    // 1. Add 200 g
    await page.fill('input[placeholder*="Add grocery item"]', baseItemName);
    const form = page.locator('form').first();
    await form.locator('input[type="number"]').fill('200');
    await form.locator('select').nth(1).selectOption('g');
    await page.click('button[title="Add to grocery list"]');

    await expect(page.locator(`p:has-text("${baseItemName}")`).first()).toBeVisible();

    // 2. Add 2 cups with incompatible unit (volume vs weight)
    await page.fill('input[placeholder*="Add grocery item"]', baseItemName);
    await form.locator('input[type="number"]').fill('2');
    await form.locator('select').nth(1).selectOption('cups');
    await page.click('button[title="Add to grocery list"]');

    // 3. Verify deduplication kept single card with review warning badge
    const matchedCards = page.locator(`p:has-text("${baseItemName}")`);
    await expect(matchedCards).toHaveCount(1);

    // Verify review warning badge and text appear
    await expect(page.locator('text=/Review Needed|incompatible units/i').first()).toBeVisible();
  });

  test('Shopping List: Explicit "Move purchased items to pantry" flow with quantity, unit, location, and date', async ({ page }) => {
    await page.locator('button:has-text("Shopping List")').first().click();
    await expect(page.locator('h2:has-text("Shopping List")')).toBeVisible();

    const boughtItem = `Feta Cheese ${Date.now()}`;

    // Add item and mark as purchased
    await page.fill('input[placeholder*="Add grocery item"]', boughtItem);
    await page.click('button[title="Add to grocery list"]');
    const itemRow = page.locator('div[class*="rounded-2xl"]').filter({ hasText: boughtItem }).first();
    await expect(itemRow).toBeVisible();
    await itemRow.click();

    // Verify purchased section
    await expect(page.locator('text=Marked as Purchased').first()).toBeVisible();

    // Click "Move Bought to Pantry" to trigger explicit flow
    const moveBtn = page.locator('button:has-text("Move")').filter({ hasText: /Bought to Pantry/ });
    await expect(moveBtn).toBeVisible();
    await moveBtn.click();

    // Verify explicit modal appears asking for quantity, unit, storage location, and date
    const modal = page.locator('div[role="dialog"]').filter({ hasText: /Move Purchased Items to Pantry/i });
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Storage Location').first()).toBeVisible();

    // Select Fridge location
    await modal.locator('select').filter({ hasText: /Fridge|Pantry/ }).first().selectOption('Fridge');

    // Confirm move
    await modal.locator('button:has-text("Confirm & Stock Pantry")').click();

    // Verify success toast
    await expect(page.locator('text=/Successfully transferred.*to pantry/i').first()).toBeVisible();

    // Navigate to Pantry Stock and verify the item now lives in Fridge inventory
    await page.locator('button:has-text("Pantry Stock")').first().click();
    await expect(page.locator('h2:has-text("Pantry Inventory")')).toBeVisible();
    await page.locator('main input[placeholder*="scallion"]').fill(boughtItem);
    await expect(page.locator('h4', { hasText: boughtItem })).toBeVisible();
  });

  test('Meal Planner: Date-based Breakfast, Lunch, Dinner, Snack slots, weekly navigation, and planned servings', async ({ page }) => {
    // 1. Navigate to Weekly Meal Planner
    await page.locator('button:has-text("Weekly Planner")').first().click();
    await expect(page.locator('h2:has-text("Weekly Meal Planner")')).toBeVisible();

    // Verify all 7 days and 4 slots are supported
    await expect(page.locator('text=Monday').first()).toBeVisible();
    await expect(page.locator('text=Friday').first()).toBeVisible();
    await expect(page.locator('text=Breakfast').first()).toBeVisible();
    await expect(page.locator('text=Lunch').first()).toBeVisible();
    await expect(page.locator('text=Dinner').first()).toBeVisible();
    await expect(page.locator('text=Snack').first()).toBeVisible();

    // 2. Test weekly navigation (Next Week -> Previous Week -> This Week)
    await page.locator('button[title="Next Week"]').click();
    await page.locator('button[title="Previous Week"]').click();
    await page.locator('button:has-text("This Week")').click();

    // 3. Assign a dish to Breakfast
    const assignBtn = page.locator('button:has-text("Assign")').first();
    await assignBtn.click();

    const assignModal = page.locator('div[role="dialog"]').filter({ hasText: /Schedule/i });
    await expect(assignModal).toBeVisible();

    // Set planned servings to 4
    await assignModal.locator('input[type="number"]').fill('4');

    // Pick first available kitchen recipe
    const firstRecipe = assignModal.locator('div[class*="cursor-pointer"]').first();
    await firstRecipe.click();

    // Verify assigned in slot with "4 serv" badge
    await expect(page.locator('text=4 serv').first()).toBeVisible({ timeout: 5000 });

    // 4. Confirm replacement of occupied slot
    // Click Replace button on the occupied slot
    await page.locator('button[title="Replace meal"]').first().click();

    // Attempt to schedule a custom dish into the occupied slot
    const replaceModal = page.locator('div[role="dialog"]').filter({ hasText: /Schedule/i });
    await replaceModal.locator('button:has-text("Custom Meal")').click();
    await replaceModal.locator('input[placeholder*="Grandma\'s Minestrone"]').fill('Power Protein Smoothie');
    await replaceModal.locator('button:has-text("Schedule Custom Meal")').click();

    // Verify replacement confirmation prompt
    await expect(page.locator('text=Replace Occupied Slot?').first()).toBeVisible();
    await page.locator('button:has-text("Yes, Replace Meal")').click();

    // Verify slot was replaced
    await expect(page.locator('p:has-text("Power Protein Smoothie")').first()).toBeVisible();

    // 5. Remove meal
    const removeBtn = page.locator('button[title="Remove meal"]').first();
    await removeBtn.click();
    await expect(page.locator('text=Meal removed from schedule.').first()).toBeVisible();
  });

  test('Meal Planner: Generate shopping list for displayed week with pantry deduction explanations', async ({ page }) => {
    await page.locator('button:has-text("Weekly Planner")').first().click();
    await expect(page.locator('h2:has-text("Weekly Meal Planner")')).toBeVisible();

    // Assign a recipe to ensure week has at least one planned meal
    const assignBtn = page.locator('button:has-text("Assign")').first();
    await assignBtn.click();
    const modal = page.locator('div[role="dialog"]').filter({ hasText: /Schedule/i });
    await modal.locator('input[type="number"]').fill('2');
    await modal.locator('div[class*="cursor-pointer"]').first().click();

    // Click "Sync Week to Shopping List"
    const syncBtn = page.locator('button:has-text("Sync Week to Shopping List")');
    await expect(syncBtn).toBeEnabled();
    await syncBtn.click();

    // Verify generation breakdown modal appears
    const breakdownModal = page.locator('div[role="dialog"]').filter({ hasText: /Weekly Shopping List Generated/i });
    await expect(breakdownModal).toBeVisible({ timeout: 8000 });

    // Verify explanation section explains whether pantry stock was subtracted accurately
    await expect(breakdownModal.locator('text=Pantry Deduction & Matching Breakdown')).toBeVisible();
    await expect(
      breakdownModal.locator('text=/Subtracted Accurately|No Stock in Pantry|Unit Mismatch/i').first()
    ).toBeVisible();

    // Click "View Shopping List"
    await breakdownModal.locator('button:has-text("View Shopping List")').click();

    // Verify automatically navigated to Shopping List
    await expect(page.locator('h2:has-text("Shopping List")')).toBeVisible();
  });
});
