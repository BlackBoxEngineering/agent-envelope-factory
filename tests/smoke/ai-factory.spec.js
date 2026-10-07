import { expect, test } from "@playwright/test";

async function submitPrompt(page, prompt) {
  const input = page.getByLabel("Request or question");
  await input.fill(prompt);
  await input.press("Enter");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/?view=ai-run");
  await expect(page.getByRole("heading", { name: "AI Operator Chat" })).toBeVisible();
  await expect(page.getByText(/deterministic-smoke-model/)).toBeVisible();
});

test("starts, disrupts at bay2, blocks stale authority, and recovers", async ({ page }) => {
  await submitPrompt(page, "Start the run and quickly move trolley4 to bay 2 before RobotBot reaches bay 7.");

  await expect(page.getByText(/Authority record .* scoped RobotBot command for bay7/)).toBeVisible();
  await expect(page.getByText(/trolley4 moved to bay2 while RobotBot was travelling/)).toBeVisible();
  await expect(page.getByText(/Arrival blocked safely:.*trolley4 is now at bay2/)).toBeVisible();

  await page.getByRole("button", { name: "Fix blocker" }).click();

  await expect(page.getByText(/Recovery record .* fresh scoped command for bay2/)).toBeVisible();
  await expect(page.getByText(/Recovery complete.*loaded trolley4 from bay2/)).toBeVisible();
});

test("read-only chat does not cancel an in-flight run", async ({ page }) => {
  await page.getByRole("button", { name: "Start run" }).click();
  await expect(page.getByText(/Authority record .* scoped RobotBot command for bay7/)).toBeVisible();

  await submitPrompt(page, "What is the current plan?");
  await expect(page.getByText(/active plan is to collect trolley4/)).toBeVisible();
  await expect(page.getByText(/Run record complete.*loaded trolley4 into the truck/)).toBeVisible();
});

test("blocks recovery when no location mismatch exists", async ({ page }) => {
  await page.getByRole("button", { name: "Fix blocker" }).click();

  await expect(page.getByText(/Recovery blocked: the visible plan does not currently require/)).toBeVisible();
});

test("operator chat can pop out and dock without losing its input", async ({ page }) => {
  await page.getByLabel("Request or question").fill("Keep this draft");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Pop out operator chat" }).click();
  const popup = await popupPromise;

  await expect(popup.getByRole("dialog", { name: "AI Operator Chat" })).toBeVisible();
  await expect(popup.getByLabel("Request or question")).toHaveValue("Keep this draft");

  const closePromise = popup.waitForEvent("close");
  await popup.getByRole("button", { name: "Dock operator chat" }).click();
  await closePromise;
  await expect(page.getByLabel("Request or question")).toHaveValue("Keep this draft");
});
