import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../../docs/screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });

  // 1. Dashboard screenshot
  console.log('Capturing dashboard...');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '01_dashboard.png'), fullPage: false });

  // 2. Pantry Inventory screenshot
  console.log('Capturing pantry...');
  await page.locator('button:has-text("Pantry Stock")').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '02_pantry_inventory.png'), fullPage: false });

  // 3. Recipe Matches screenshot
  console.log('Capturing recipe discovery...');
  await page.locator('button:has-text("Recipe Matches")').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03_recipe_discovery.png'), fullPage: false });

  // 4. Recipe Detail modal screenshot
  console.log('Capturing recipe detail modal...');
  const firstRecipeCard = page.locator('[data-testid="recipe-card"]').first();
  if (await firstRecipeCard.isVisible()) {
    await firstRecipeCard.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, '04_recipe_detail_modal.png'), fullPage: false });
    // close modal
    const closeBtn = page.locator('button[aria-label="Close modal"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  }

  // 5. Shopping List screenshot
  console.log('Capturing shopping list...');
  await page.locator('button:has-text("Shopping List")').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05_shopping_list.png'), fullPage: false });

  // 6. Weekly Meal Planner screenshot
  console.log('Capturing weekly planner...');
  await page.locator('button:has-text("Weekly Planner")').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '06_weekly_planner.png'), fullPage: false });

  // 7. Dark Mode screenshot (Settings -> Midnight Forest)
  console.log('Capturing dark mode...');
  await page.locator('button:has-text("Preferences")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Midnight Forest")').click();
  await page.waitForTimeout(800);
  // Return to home in dark mode
  await page.locator('button:has-text("Home & Kitchen")').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '07_dark_mode_dashboard.png'), fullPage: false });

  // 8. Mobile responsive screenshot
  console.log('Capturing mobile layout...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '08_mobile_responsive.png'), fullPage: false });

  // Reset to light mode for standard session
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('button:has-text("Preferences")').first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Warm Ivory")').click();
  await page.waitForTimeout(500);

  await browser.close();
  console.log('All screenshots successfully saved to docs/screenshots!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
