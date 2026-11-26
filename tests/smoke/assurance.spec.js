import { expect, test } from "@playwright/test";
import { verifyEventJournal } from "agent-envelope-assurance-sdk";
import { hexToBytes, seedAddress } from "agent-envelope-sdk";

async function openJournal(page) {
  const panel = page.locator(".assurance-journal");
  if ((await panel.getAttribute("open")) === null) {
    await panel.getByRole("heading", { name: "Assurance journal" }).click();
  }
  return panel;
}

async function verifiedEvents(page, boundary) {
  const { chainId, reporterSeed, journal } = await page.evaluate(mode =>
    JSON.parse(localStorage.getItem(`agentenvelope:factory-assurance:${mode}:v1`)), boundary);
  expect(verifyEventJournal(journal, { chainId, reporterAddress: seedAddress(hexToBytes(reporterSeed)) })).toBe(true);
  return journal.records.map(({ event }) => event);
}

test("records a rejection before authority exists and preserves its journal", async ({ page }) => {
  await page.goto("/?view=run");
  await page.getByRole("heading", { name: "Hack Robot Commands" }).click();
  await page.getByRole("button", { name: /Scope jump/ }).click();

  const panel = await openJournal(page);
  await expect(panel.getByText("3 verified")).toBeVisible();
  await expect(panel.getByText("execution.not_started", { exact: true })).toBeVisible();
  const events = await verifiedEvents(page, "manual");
  expect(events.map(event => event.kind)).toEqual(["attempt.observed", "attempt.rejected", "execution.not_started"]);
  expect(new Set(events.map(event => event.correlationId)).size).toBe(1);
  expect(events[1].reasonCode).toBe("crypto.no_command");

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.reload();
  await expect((await openJournal(page)).getByText("3 verified")).toBeVisible();
});

test("records pickup completion after admission in both factory runs", async ({ page }) => {
  await page.goto("/?view=ai-run");
  await expect(page.getByText(/deterministic-smoke-model/)).toHaveText(/deterministic-smoke-model/);
  await page.getByRole("button", { name: "Start run" }).click();
  let panel = await openJournal(page);
  await expect(panel.getByText("execution.completed", { exact: true })).toBeVisible({ timeout: 12_000 });
  const aiEvents = await verifiedEvents(page, "ai");
  const aiPickup = aiEvents.find(event => event.reasonCode === "command.issued");
  expect(aiEvents.filter(event => event.correlationId === aiPickup.correlationId).map(event => event.kind))
    .toEqual(["attempt.observed", "attempt.admitted", "execution.completed"]);
  expect(aiEvents.find(event => event.reasonCode === "operator.intent").correlationId).not.toBe(aiPickup.correlationId);

  await page.getByRole("button", { name: "Factory run", exact: true }).click();
  await page.getByRole("slider", { name: /Robot speed/ }).press("End");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  panel = await openJournal(page);
  await expect(panel.getByText("execution.completed", { exact: true })).toBeVisible();
  const events = await verifiedEvents(page, "manual");
  expect(events.map(event => event.kind)).toEqual(["attempt.observed", "attempt.admitted", "execution.completed"]);
  expect(new Set(events.map(event => event.correlationId)).size).toBe(1);
});

test("records delivery in Live Shift under the routing attempt", async ({ page }) => {
  await page.goto("/?view=operations");
  await page.getByLabel("Simulation speed").selectOption("8");
  await page.getByRole("button", { name: "Start shift" }).click();
  const panel = await openJournal(page);
  await expect(panel.getByText("execution.completed", { exact: true }).first()).toBeVisible();

  const events = await verifiedEvents(page, "live-shift");
  const delivery = events.find(event => event.kind === "execution.completed");
  const attempt = events.filter(event => event.correlationId === delivery.correlationId);
  expect(attempt.map(event => event.kind)).toEqual(["attempt.observed", "attempt.admitted", "execution.completed"]);
  expect(new Set(attempt.map(event => event.subjectDigest)).size).toBe(1);
});

test("shows a recording gap while Factory completes an admitted pickup", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "locks", { value: undefined });
    Object.defineProperty(crypto, "randomUUID", { value: undefined });
  });
  await page.goto("/?view=run");
  await page.getByRole("slider", { name: /Robot speed/ }).press("End");
  await page.getByRole("button", { name: "Run", exact: true }).click();

  const panel = await openJournal(page);
  await expect(panel.getByRole("status")).toContainText("Web Locks are required");
  const heading = page.getByRole("heading", { name: "Current Record", exact: true });
  const record = page.locator(".right-panel details").filter({ has: heading });
  await heading.click();
  await expect(record.getByText("truck", { exact: true })).toBeVisible();
});
