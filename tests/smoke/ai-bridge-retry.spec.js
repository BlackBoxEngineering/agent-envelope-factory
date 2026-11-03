import { expect, test } from "@playwright/test";

test("first chat use retries bridge readiness before sending the prompt once", async ({ page }) => {
  let healthChecks = 0;
  let operatorRequests = 0;

  await page.route("http://127.0.0.1:8798/health", async (route) => {
    healthChecks += 1;
    if (healthChecks <= 2) {
      await route.abort("connectionrefused");
      return;
    }
    await route.continue();
  });
  await page.route("http://127.0.0.1:8798/ai/operator", async (route) => {
    operatorRequests += 1;
    await route.continue();
  });

  await page.goto("/?view=ai-run");
  await expect(page.locator(".ai-operator-state .trace-state")).toHaveText("offline");

  const input = page.getByLabel("Request or question");
  await input.fill("What is the current plan?");
  await input.press("Enter");

  await expect(page.getByText(/active plan is to collect trolley4/)).toBeVisible();
  expect(healthChecks).toBeGreaterThanOrEqual(3);
  expect(operatorRequests).toBe(1);
  await expect(page.locator(".ai-operator-state .trace-state")).toHaveText("ready");
});
