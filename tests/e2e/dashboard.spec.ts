import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("homepage loads with title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("RepoBench");
  });

  test("navigate to repositories page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/repos"]');
    await expect(page.locator("h1")).toHaveText("Repositories");
  });

  test("navigate to runs page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/runs"]');
    await expect(page.locator("h1")).toHaveText("Benchmark Runs");
  });

  test("compare page loads", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/compare"]');
    await expect(page.locator("h1")).toHaveText("Compare Agents");
  });
});
