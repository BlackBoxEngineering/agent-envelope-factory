import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { verifyAction } from "agent-envelope-sdk";

test("Factory signs and registers the same ordered resources under its case-sensitive delegates", async ({ page }) => {
  const registrations = [];
  const delegates = ["mint-delegate.json", "mint-delegate.planner.json", "mint-delegate.evidence.json", "mint-delegate.governance.json"]
    .map(file => JSON.parse(readFileSync(new URL("../../" + file, import.meta.url), "utf8")));
  const activeAt = Math.max(...delegates.map(delegate => delegate.timeWindow.notBefore ?? Date.parse(delegate.issuedAt)));
  for (const delegate of delegates) {
    expect(activeAt).toBeLessThan(delegate.timeWindow.notAfter ?? Infinity);
  }
  await page.clock.setFixedTime(new Date(activeAt));
  await page.route("**/sovereign/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    if (path.endsWith("/mint")) {
      return route.fulfill({ json: { valid: true, requestId: body.request.requestId, delegateId: body.delegate.delegateId } });
    }
    if (path.endsWith("/register-delegated")) {
      registrations.push(body);
      return route.fulfill({ json: { accepted: true, recordId: body.record.recordId } });
    }
    if (path.endsWith("/verify")) {
      const record = registrations.find(entry => entry.record.recordId === body.recordId)?.record;
      const valid = Boolean(record && record.actionEnvelopeHash === body.expectedActionEnvelopeHash &&
        verifyAction({ message: body.payload, signature: body.signature, expectedAddress: record.agentAddress }).valid);
      return route.fulfill({ json: { valid, recordId: record?.recordId, actionEnvelopeHash: record?.actionEnvelopeHash } });
    }
    return route.fulfill({ status: 404 });
  });
  await page.goto("/");
  const verified = await page.evaluate(async () => {
    const { publishHostedFactoryCommand } = await import("/src/factoryHosted.js");
    const config = { apiKey: "test", ownerUserId: "test-owner" };
    for (const role of ["robot", "evidence", "governance", "planner"]) {
      config[role + "BotKey"] = "11".repeat(32);
      config[role + "MintMaterial"] = "22".repeat(32);
    }
    const result = await publishHostedFactoryCommand(config, {
      operation: "pickUp", commandId: "Case-42", args: { bayId: "bay7", trolleyId: "trolley4" },
    });
    return result.records.map(entry => entry.report.valid);
  });
  expect(verified).toEqual([true, true, true, true]);
  expect(registrations).toHaveLength(4);
  for (const { record, request } of registrations) {
    expect(record.actionEnvelope.resources).toEqual([...new Set(request.resources)].sort());
    expect(request.resources).toEqual(record.actionEnvelope.resources);
  }
  const requests = registrations.map(({ request }) => request);
  expect(requests.some(({ operation }) => operation === "pickUp")).toBe(true);
  expect(requests.find(({ operation }) => operation === "repair-state").resources[0]).toBe("command:Case-42");
});
