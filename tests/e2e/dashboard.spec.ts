import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("homepage loads with title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText(
      "Benchmark coding agents on your own repository history.",
    );
    await expect(page.getByText("RepoBench")).toBeVisible();
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

  test("setup page loads onboarding forms", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/setup"]');
    await expect(page.locator("h1")).toHaveText(
      "Create agents, repos, suites, and runs without leaving the dashboard.",
    );
    await expect(page.getByLabel("Agent name")).toBeVisible();
    await expect(page.getByLabel("Repository owner")).toBeVisible();
    await expect(page.getByLabel("Test command")).toBeVisible();
    await expect(page.getByLabel("Agent profile")).toBeVisible();
  });

  test("compare page loads", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/compare"]');
    await expect(page.locator("h1")).toHaveText("Compare Runs");
  });
});
