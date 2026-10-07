import { spawn } from "node:child_process";
import { expect, test } from "@playwright/test";
import { AI_OPERATOR_CONTRACT_VERSION, authorityPolicy, factoryPlan, slots } from "../../src/factoryConfig.js";

const PORT = 8797;
let bridge;
let bridgeOutput = "";

test.beforeAll(async () => {
  bridge = spawn(process.execPath, ["scripts/ai-operator-bridge.js"], {
    cwd: process.cwd(),
    env: { ...process.env, AI_OPERATOR_BRIDGE_PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  bridge.stdout.on("data", (chunk) => {
    bridgeOutput += chunk.toString();
  });
  bridge.stderr.on("data", (chunk) => {
    bridgeOutput += chunk.toString();
  });

  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (response.ok) return;
    } catch {
      // The bridge has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Production bridge did not become healthy.\n${bridgeOutput}`);
});

test.afterAll(() => {
  bridge?.kill();
});

test("production bridge and factory plan expose the same contract", async () => {
  const response = await fetch(`http://127.0.0.1:${PORT}/health`);
  const health = await response.json();

  expect(health).toMatchObject({
    ok: true,
    contractVersion: AI_OPERATOR_CONTRACT_VERSION,
    factoryBays: authorityPolicy.bays,
  });
  expect(factoryPlan.command.initialTarget).toBe("bay5");
  expect(factoryPlan.command.destination).toBe("truck");
  expect(authorityPolicy.bays).toEqual(["bay1", "bay2", "bay3", "bay4", "bay5", "bay6", "bay7", "bay8"]);
  expect(authorityPolicy.bays.map((bayId) => slots[bayId].label)).toEqual([
    "Bay 1",
    "Bay 2",
    "Bay 3",
    "Bay 4",
    "Bay 5",
    "Bay 6",
    "Bay 7",
    "Bay 8",
  ]);
});
