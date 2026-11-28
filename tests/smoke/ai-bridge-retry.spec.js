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

test("first operator connection drops after health succeeds and one prompt starts one run", async ({ page }) => {
  const prompts = [];
  await page.route("**/ai/operator", async route => {
    prompts.push(route.request().postDataJSON());
    if (prompts.length === 1) return route.abort("connectionreset");
    return route.continue();
  });
  await page.goto("/?view=ai-run");
  await expect(page.locator(".ai-operator-state .trace-state")).toHaveText("ready");
  await page.getByRole("button", { name: "Start run" }).click();

  await expect(page.getByText(/Authority record .* scoped RobotBot command for bay5/)).toBeVisible();
  expect(prompts).toHaveLength(2);
  expect(prompts[1]).toEqual(prompts[0]);
  await expect(page.locator(".ai-chat-message.prompt")).toHaveCount(1);
  await expect(page.locator(".ai-chat-message.error")).toHaveCount(0);
});

for (const [status, reason, expectedCalls] of [
  [504, "Bedrock did not respond within 60 seconds.", 2],
  [403, "Connection denied by provider policy.", 1],
]) {
  test(`operator HTTP ${status} preserves the cause after ${expectedCalls} call(s)`, async ({ page }) => {
    let calls = 0;
    await page.route("**/ai/operator", async route => {
      calls += 1;
      return route.fulfill({ status, json: { error: reason } });
    });
    await page.goto("/?view=ai-run");
    await page.getByRole("button", { name: "Start run" }).click();
    await expect(page.locator(".ai-chat-message.error")).toContainText(reason);
    expect(calls).toBe(expectedCalls);
    await expect(page.getByText(/Authority record .* scoped RobotBot command for bay5/)).toHaveCount(0);
  });
}
