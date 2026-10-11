import { expect, test } from "@playwright/test";

test("runs a deterministic parcel shift with real authority evidence", async ({ page }) => {
  await page.goto("/?view=operations");

  await expect(page.getByRole("heading", { name: /Parcel operations/i })).toBeVisible();
  await expect(page.getByText("Inbound A", { exact: true })).toBeVisible();
  await expect(page.getByText("Inbound B", { exact: true })).toBeVisible();
  await expect(page.getByText("Main sort", { exact: true })).toBeVisible();
  await expect(page.getByText("Priority dispatch", { exact: true })).toBeVisible();
  await expect(page.getByText("Manual inspection", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3 waiting" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Authority Trace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hosted Records" })).toBeVisible();

  await page.getByRole("button", { name: "Start shift" }).click();

  await expect(page.getByText("Admitted", { exact: true })).toBeVisible();
  await expect(page.getByText("2/2 sources", { exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "Authority Trace" }).click();
  await expect(page.getByText(/identityRoot -> domainSeed -> actionEnvelope -> actionSeed/)).toBeVisible();
  await expect(page.getByText(/derived for this route and zeroed after signing/)).toBeVisible();
  await expect(page.getByText("AgentEnvelope proves the command authority and admission. Delivery remains a simulator outcome.")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "admitted" }).first()).toBeVisible();
  await expect(page.getByLabel(/Authority proof for trolley-003/)).toContainText("parcel-routing-v1");
  await expect(page.getByLabel(/Authority proof for trolley-003/)).toContainText("WarehouseFeed + DockSafetyController");

  await page.getByRole("button", { name: "Inject express" }).click();
  await expect(page.locator(".parcel-metric").filter({ hasText: "Arrivals" }).locator("strong")).toHaveText("4");
});

test("parcel operations remains usable on a phone-sized viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=operations");

  await expect(page.getByRole("heading", { name: /Parcel operations/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start shift" })).toBeVisible();
  await expect(page.getByLabel("Live parcel sorting floor")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
