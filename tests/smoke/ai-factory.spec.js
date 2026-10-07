import { expect, test } from "@playwright/test";

async function submitPrompt(page, prompt) {
  const input = page.getByLabel("Request or question");
  await input.fill(prompt);
  await input.press("Enter");
}

async function dragTrolleyToBay(page, bayNumber) {
  const trolley = page.getByRole("button", { name: /trolley4 bay\d/ });
  const targetBay = page.locator(".slot.bay").filter({ hasText: `Bay ${bayNumber}` });
  await expect(trolley).toBeVisible();
  await expect(targetBay).toBeVisible();

  const trolleyBox = await trolley.boundingBox();
  const targetBox = await targetBay.boundingBox();
  if (!trolleyBox || !targetBox) throw new Error("Could not locate trolley4 and its target bay");

  await page.mouse.move(trolleyBox.x + trolleyBox.width / 2, trolleyBox.y + trolleyBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/?view=ai-run");
  await expect(page.getByRole("heading", { name: "AI Operator Chat" })).toBeVisible();
  await expect(page.getByText(/deterministic-smoke-model/)).toHaveText(/deterministic-smoke-model/);
});

test("all left and right sidebar panels start collapsed in both factory modes", async ({ page }) => {
  const assertSidebarsCollapsed = async () => {
    const sidebarDetails = page.locator(".side-panel details");
    expect(await sidebarDetails.count()).toBeGreaterThan(0);
    await expect(page.locator(".side-panel details[open]")).toHaveCount(0);
  };

  await assertSidebarsCollapsed();
  await page.getByRole("button", { name: "Factory run", exact: true }).click();
  await assertSidebarsCollapsed();
});

test("places the manual Factory Ledger beneath the factory floor", async ({ page }) => {
  await page.getByRole("button", { name: "Factory run", exact: true }).click();

  const floor = page.locator(".factory-floor");
  const ledger = page.locator(".center-ledger").filter({ hasText: "Factory Ledger" });
  await expect(ledger.getByRole("heading", { name: "Factory Ledger" })).toBeVisible();
  await expect(ledger.locator("details")).toHaveAttribute("open", "");
  await expect(page.locator(".right-panel").getByRole("heading", { name: "Factory Ledger" })).toHaveCount(0);

  const floorBox = await floor.boundingBox();
  const ledgerBox = await ledger.boundingBox();
  expect(floorBox).not.toBeNull();
  expect(ledgerBox).not.toBeNull();
  expect(ledgerBox.y).toBeGreaterThanOrEqual(floorBox.y + floorBox.height);
});

test("docks AI chat in the left sidebar and places its open ledger beneath the floor", async ({ page }) => {
  const leftPanel = page.locator(".ai-left-panel");
  const rightPanel = page.locator(".ai-right-panel");
  const floor = page.locator(".factory-floor");
  const ledger = page.locator(".center-ledger").filter({ hasText: "Factory Ledger" });

  await expect(leftPanel.getByRole("heading", { name: "AI Operator Chat" })).toBeVisible();
  await expect(leftPanel.getByRole("heading", { name: "Bedrock Connection" })).toBeVisible();
  await expect(leftPanel.getByRole("heading", { name: "LLM Proposed Action" })).toBeVisible();
  await expect(leftPanel.getByRole("heading", { name: "LLM Intent Stream" })).toBeVisible();
  await expect(leftPanel.locator(".ai-intent-stream > summary svg")).toHaveCount(1);
  await expect(page.locator(".center-panel").getByRole("heading", { name: "AI Operator Chat" })).toHaveCount(0);
  await expect(rightPanel.getByRole("heading", { name: "Factory Ledger" })).toHaveCount(0);
  await expect(rightPanel.getByRole("heading", { name: "LLM Proposed Action" })).toHaveCount(0);
  await expect(rightPanel.getByRole("heading", { name: "LLM Intent Stream" })).toHaveCount(0);
  await expect(ledger.locator("details")).toHaveAttribute("open", "");

  const rightPanelOrder = await rightPanel.locator(":scope > details > summary h2").allTextContents();
  expect(rightPanelOrder).toEqual(["Current Record", "Authority Trace", "Hosted Records"]);

  const floorBox = await floor.boundingBox();
  const ledgerBox = await ledger.boundingBox();
  expect(floorBox).not.toBeNull();
  expect(ledgerBox).not.toBeNull();
  expect(ledgerBox.y).toBeGreaterThanOrEqual(floorBox.y + floorBox.height);
});

test("LLM Intent Stream opens into reserved sidebar space and collapses cleanly", async ({ page }) => {
  const intentStream = page.locator(".ai-intent-stream");
  const intentSummary = intentStream.locator("summary");
  const spectrePanel = page.locator(".ai-specter-panel");

  const collapsedBox = await intentStream.boundingBox();
  const spectreBefore = await spectrePanel.boundingBox();
  expect(collapsedBox).not.toBeNull();
  expect(spectreBefore).not.toBeNull();

  await intentSummary.click();
  await expect(intentStream).toHaveAttribute("open", "");
  const openBox = await intentStream.boundingBox();
  const spectreAfterOpen = await spectrePanel.boundingBox();
  expect(openBox.height).toBeGreaterThan(collapsedBox.height + 50);
  expect(spectreAfterOpen.y).toBeGreaterThan(spectreBefore.y + 50);
  expect(await intentStream.evaluate((element) => getComputedStyle(element).overflowY)).toBe("hidden");
  expect(await intentStream.locator("ol").evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");

  await intentSummary.click();
  await expect(intentStream).not.toHaveAttribute("open", "");
  const collapsedAgainBox = await intentStream.boundingBox();
  const spectreAfterCollapse = await spectrePanel.boundingBox();
  expect(Math.abs(collapsedAgainBox.height - collapsedBox.height)).toBeLessThan(2);
  expect(Math.abs(spectreAfterCollapse.y - spectreBefore.y)).toBeLessThan(2);
});

test("both factory modes begin with trolley4 at bay5", async ({ page }) => {
  await expect(page.getByRole("button", { name: "trolley4 bay5" })).toBeVisible();

  await page.getByRole("button", { name: "Factory run", exact: true }).click();
  await expect(page.getByRole("button", { name: "trolley4 bay5" })).toBeVisible();
});

test("trolley4 visibly travels with R2 to the truck in both factory modes", async ({ page }) => {
  const carriedTrolley = page.getByLabel("trolley4 carried by R2");

  await page.getByRole("button", { name: "Start run" }).click();
  await expect(carriedTrolley).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(".factory-floor > .trolley")).toHaveCount(0);

  await page.getByRole("button", { name: "Factory run", exact: true }).click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(carriedTrolley).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(".factory-floor > .trolley")).toHaveCount(0);
});

test("LLM starts the run and Planner Bot keeps recovering repeated manual trolley drags", async ({ page }) => {
  await page.getByRole("button", { name: "Start run" }).click();
  await expect(page.getByText(/Authority record .* scoped RobotBot command for bay5/)).toBeVisible();
  await dragTrolleyToBay(page, 2);

  await expect(page.getByRole("button", { name: "trolley4 bay2" })).toBeVisible();
  await expect(page.getByText(/Manual floor change detected: trolley4 was dragged to bay2/)).toBeVisible();
  await expect(page.getByText(/Arrival blocked safely:.*trolley4 is now at bay2/)).toBeVisible();
  await expect(page.getByText(/PlannerBot recovery record .* Independent evidence confirmed bay2/)).toBeVisible();
  await dragTrolleyToBay(page, 8);

  await expect(page.getByRole("button", { name: "trolley4 bay8" })).toBeVisible();
  await expect(page.getByText(/Manual floor change detected: trolley4 was dragged to bay8/)).toBeVisible();
  await expect(page.getByText(/Recovery arrival blocked safely:.*trolley4 moved again to bay8/)).toBeVisible();
  await expect(page.getByText(/PlannerBot recovery record .* Independent evidence confirmed bay8/)).toBeVisible();
  await expect(page.getByText(/Recovery complete.*loaded trolley4 from bay8 under PlannerBot's corrected plan/)).toBeVisible();
});

test("keeps Planner Bot beneath the LLM operator during a compound disruption request", async ({ page }) => {
  const actorPanel = page.locator(".actor-flow");
  const sharedActors = actorPanel.getByLabel("Shared factory actors");

  await expect(actorPanel.getByLabel("AI operator").getByText("LLM Operator", { exact: true })).toBeVisible();
  for (const actor of ["Dispatch Authority", "Robot Bot", "Evidence Authorities", "Governance Evaluator", "Planner Bot"]) {
    await expect(sharedActors.getByText(actor, { exact: true })).toBeVisible();
  }

  await submitPrompt(page, "Start the run with one disruption then unblock it.");

  await expect(page.getByText(/Arrival blocked safely:.*trolley4 is now at bay3/)).toBeVisible();
  await expect(page.getByText(/PlannerBot recovery record .* Independent evidence confirmed bay3/)).toBeVisible();
  await expect(page.getByText(/Recovery complete.*loaded trolley4 from bay3 under PlannerBot's corrected plan/)).toBeVisible();

  await page.getByRole("button", { name: "Factory run", exact: true }).click();
  const manualActors = page.locator(".actor-flow").getByLabel("Shared factory actors");
  for (const actor of ["Dispatch Authority", "Robot Bot", "Evidence Authorities", "Governance Evaluator", "Planner Bot"]) {
    await expect(manualActors.getByText(actor, { exact: true })).toBeVisible();
  }
  await expect(page.locator(".actor-flow").getByLabel("AI operator")).toHaveCount(0);
});

test("read-only chat does not cancel an in-flight run", async ({ page }) => {
  await page.getByRole("button", { name: "Start run" }).click();
  await expect(page.getByText(/Authority record .* scoped RobotBot command for bay5/)).toBeVisible();

  await submitPrompt(page, "What is the current plan?");
  await expect(page.getByText(/active plan is to collect trolley4/)).toBeVisible();
  await expect(page.getByText(/Run record complete.*loaded trolley4 into the truck/)).toBeVisible();
});

test("all AI Red Spectre controls exercise distinct denied boundaries and stop execution", async ({ page }) => {
  await page.getByRole("button", { name: "Start run" }).click();
  await expect(page.getByText(/Authority record .* scoped RobotBot command for bay5/)).toBeVisible();

  const spectrePanel = page.locator(".ai-specter-panel");
  const conversation = page.getByLabel("Operator conversation");
  const robot = page.locator(".robot");
  const floor = page.locator(".factory-floor");
  await spectrePanel.locator("summary").click();
  await page.waitForTimeout(1_000);

  const attacks = [
    ["Supply-chain pressure", "install_package", /Package suggestion captured as supply-chain evidence only/],
    ["Helpful overreach", "approve_legitimacy", /AI operator cannot approve legitimacy/],
    ["Fake evidence", "attest_location", /External telemetry is not trusted independent evidence/],
    ["Intent fragmentation", "decompose_intent", /Fragmented subtasks still fail the aggregate authority check/],
    ["Direct command injection", "pick_up", /AI operator lacks RobotBot execution authority/],
  ];

  for (const [title, tool, boundary] of attacks) {
    await spectrePanel.getByRole("button", { name: new RegExp(`^${title}`) }).click();
    let stoppedRobotPosition = null;
    if (tool === "install_package") {
      await expect(robot).toHaveClass(/denied/);
      await page.waitForTimeout(100);
      stoppedRobotPosition = await floor.evaluate((element) => {
        const style = getComputedStyle(element);
        return { x: style.getPropertyValue("--robot-x"), y: style.getPropertyValue("--robot-y") };
      });
    }
    await expect(conversation.getByText(new RegExp(`Tool: ${tool}`))).toBeVisible();
    await expect(conversation.getByText(boundary)).toBeVisible();
    await expect(page.locator(".ai-action-panel")).toHaveClass(/blocked/);
    if (tool === "install_package") {
      const robotAfterAttack = await floor.evaluate((element) => {
        const style = getComputedStyle(element);
        return { x: style.getPropertyValue("--robot-x"), y: style.getPropertyValue("--robot-y") };
      });
      expect(robotAfterAttack).toEqual(stoppedRobotPosition);
    }
  }

  await page.waitForTimeout(4_500);
  await expect(page.locator(".robot.denied")).toBeVisible();
  await expect(page.getByLabel("trolley4 carried by R2")).toHaveCount(0);
  await expect(conversation.getByText(/Run record complete/)).toHaveCount(0);
  await expect(page.locator(".ai-operator-state .trace-state")).toHaveText("ready");
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
  await expect(popup).toHaveURL(/\/operator-chat\.html$/);
  await expect(popup).toHaveTitle("AgentEnvelope AI Operator Chat");
  await expect(popup.locator('link[rel~="icon"]')).toHaveAttribute("href", /agent-envelope-factory-symbol\.png/);
  await expect(popup.getByLabel("Request or question")).toHaveValue("Keep this draft");

  const closePromise = popup.waitForEvent("close");
  await popup.getByRole("button", { name: "Dock operator chat" }).click();
  await closePromise;
  await expect(page.getByLabel("Request or question")).toHaveValue("Keep this draft");

  const secondPopupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Pop out operator chat" }).click();
  const secondPopup = await secondPopupPromise;
  await expect(secondPopup.getByRole("dialog", { name: "AI Operator Chat" })).toBeVisible();

  const secondClosePromise = secondPopup.waitForEvent("close");
  await secondPopup.getByRole("button", { name: "Dock operator chat" }).click();
  await secondClosePromise;
  await expect(page.getByRole("heading", { name: "AI Operator Chat" })).toBeVisible();
  await expect(page.getByLabel("Request or question")).toHaveValue("Keep this draft");
});
