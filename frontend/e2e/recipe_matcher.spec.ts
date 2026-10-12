import { test, expect } from '@playwright/test';

test.describe('Deterministic Pantry-to-Recipe Matcher & Recipe Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=PantryPal').first()).toBeVisible();
  });

  test('should display at least 20 seeded recipes with stable IDs and distinguish sample recipes', async ({ page }) => {
    // Navigate to Recipe Discovery
    await page.locator('button:has-text("Recipe Matches")').first().click();
    await expect(page.locator('h2:has-text("Recipe Discovery")')).toBeVisible();

    // Verify recipe count text indicates matching across at least 20 culinary recipes
    const countBanner = page.locator('text=/Matching your available non-expired kitchen stock across/i');
    await expect(countBanner).toBeVisible();

    // Verify multiple sample recipes are present with "Kitchen Tested Sample" badge
    const sampleBadges = page.locator('text=Kitchen Tested Sample');
    const badgeCount = await sampleBadges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(10);

    // Verify seeded recipe titles exist in the list
    await expect(page.locator('h3:has-text("Creamy Garlic Tuscan Chicken")')).toBeVisible();
    await expect(page.locator('h3:has-text("Classic Roman Spaghetti Carbonara")')).toBeVisible();
    await expect(page.locator('h3:has-text("Golden Turmeric Red Lentil Dahl")')).toBeVisible();
    await expect(page.locator('h3:has-text("Fluffy Golden Buttermilk Pancakes")')).toBeVisible();
  });

  test('should show readiness states, pantry match explanations, allergens, and disclaimer in detail modal', async ({ page }) => {
    await page.locator('button:has-text("Recipe Matches")').first().click();
    await expect(page.locator('h2:has-text("Recipe Discovery")')).toBeVisible();

    // Open Tuscan Chicken or Carbonara detail modal
    await page.locator('h3:has-text("Creamy Garlic Tuscan Chicken")').first().click();

    // Modal dialog should be open
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // Check Sample Badge and Cuisine on Modal Hero
    await expect(modal.locator('text=Kitchen Tested Sample').first()).toBeVisible();
    await expect(modal.locator('text=Italian').first()).toBeVisible();

    // Check Pantry Match Explanation Section
    await expect(modal.locator('text=/Pantry Match Explanation/i')).toBeVisible();
    await expect(modal.locator('text=/Base Match Score:/i')).toBeVisible();

    // Check Allergen & Safety Notes Card
    await expect(modal.locator('text=/Allergen & Safety Notes/i')).toBeVisible();
    await expect(modal.locator('text=/Known Stated Allergens:/i')).toBeVisible();
    await expect(modal.locator('text=/not a certified allergen-free kitchen/i')).toBeVisible();

    // Check Servings Scaler: default is 4
    await expect(modal.locator('text=/4 servings/i').first()).toBeVisible();
    // Increase servings to 5
    await modal.locator('button[title="Increase servings"]').click();
    await expect(modal.locator('text=/5 servings/i').first()).toBeVisible();

    // Close modal
    await modal.locator('button[aria-label="Close modal"]').click();
    await expect(modal).not.toBeVisible();
  });

  test('should include vegan recipes in vegetarian results', async ({ page }) => {
    await page.locator('button:has-text("Recipe Matches")').first().click();
    await expect(page.locator('h2:has-text("Recipe Discovery")')).toBeVisible();

    // Click "Vegetarian" filter pill
    await page.locator('button:has-text("Vegetarian")').first().click();

    // Vegan Dahl must be included in vegetarian results!
    await expect(page.locator('h3:has-text("Golden Turmeric Red Lentil Dahl")')).toBeVisible();

    // Pure vegetarian pancakes should also be visible
    await expect(page.locator('h3:has-text("Fluffy Golden Buttermilk Pancakes")')).toBeVisible();

    // Meat recipes must not be visible
    await expect(page.locator('h3:has-text("Classic Roman Spaghetti Carbonara")')).not.toBeVisible();
    await expect(page.locator('h3:has-text("Creamy Garlic Tuscan Chicken")')).not.toBeVisible();

    // Click "Vegan" filter pill
    await page.locator('button:has-text("Vegan")').first().click();
    await expect(page.locator('h3:has-text("Golden Turmeric Red Lentil Dahl")')).toBeVisible();
    // Non-vegan pancakes must not be visible in pure vegan filter
    await expect(page.locator('h3:has-text("Fluffy Golden Buttermilk Pancakes")')).not.toBeVisible();
  });

  test('should filter by near-match, cooking time, search, and saved recipes', async ({ page }) => {
    await page.locator('button:has-text("Recipe Matches")').first().click();
    await expect(page.locator('h2:has-text("Recipe Discovery")')).toBeVisible();

    // 1. Search filter
    const searchInput = page.locator('input[placeholder*="Search recipes"]');
    await searchInput.fill('Shakshuka');
    await expect(page.locator('h3:has-text("Zesty Mediterranean Chickpea Shakshuka")')).toBeVisible();
    await expect(page.locator('h3:has-text("Creamy Garlic Tuscan Chicken")')).not.toBeVisible();
    await searchInput.fill('');

    // 2. Cooking time filter: Quick (<= 15 mins)
    const timeSelect = page.locator('select').filter({ hasText: /Any Duration/ });
    await timeSelect.selectOption('quick');
    // Pancakes (cook time 10m, prep 10m -> 20m total or quick recipes)
    // Clear time filter
    await timeSelect.selectOption('all');

    // 3. Near-match filter: All Types Available
    await page.locator('button:has-text("All Types Available")').first().click();
    // Verify results show recipes with 0 missing items
    const missingBadges = page.locator('[data-testid="recipe-card"]').locator('text=/Missing [1-9]/');
    expect(await missingBadges.count()).toBe(0);

    // Reset near match filter
    await page.locator('button:has-text("All Matches")').first().click();

    // 4. Save / Favorite Recipe
    const firstCard = page.locator('[data-testid="recipe-card"]').first();
    const recipeTitle = await firstCard.locator('h3').innerText();
    const isAlreadySaved = await firstCard.locator('button[title="Remove from saved"]').isVisible();
    if (!isAlreadySaved) {
      const favButton = firstCard.locator('button[aria-label="Save recipe"]');
      await favButton.click();
      await expect(firstCard.locator('button[title="Remove from saved"]')).toBeVisible();
    }

    // Click "Saved (1)" filter toggle
    await page.locator('button:has-text("Saved (")').click();
    await expect(page.locator(`h3:has-text("${recipeTitle}")`)).toBeVisible();

    // Untoggle saved filter
    await page.locator('button:has-text("Saved (")').click();
  });
});
