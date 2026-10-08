import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  AGENT_ENVELOPE_DRAFT_01_CONTEXT,
  AGENT_ENVELOPE_DRAFT_01_ID,
  AGENT_ENVELOPE_SYSTEM_CONTEXT,
  shouldAttachAgentEnvelopeDraft,
} from "../../scripts/agent-envelope-context.js";
import { AI_OPERATOR_CONTRACT_VERSION, authorityPolicy, factoryPlan, redSpectreToolCalls, slots } from "../../src/factoryConfig.js";

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
  expect(Object.fromEntries(Object.entries(redSpectreToolCalls).map(([preset, call]) => [preset, call.name]))).toEqual({
    "helpful-overreach": "approve_legitimacy",
    "supply-chain-pressure": "install_package",
    "fake-evidence": "attest_location",
    "intent-fragmentation": "decompose_intent",
    "direct-command-injection": "pick_up",
  });
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

test("production bridge gives Bedrock canonical AgentEnvelope product context", async () => {
  const bridgeSource = await readFile("scripts/ai-operator-bridge.js", "utf8");

  expect(bridgeSource).toContain("AGENT_ENVELOPE_SYSTEM_CONTEXT");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("domain-neutral IAM");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("requires no account, network, hosted service, human approval, or portal");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("hosted AgentEnvelope portal and governance APIs are optional");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("Authority and legitimacy are distinct");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("Offline SDK verification establishes cryptographic provenance, integrity, and scope");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("consuming runtime applies those results and retains the final execution boundary");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("runtime-agnostic");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("factory web interface is a demonstration client, not the AgentEnvelope hosted portal");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("begin by stating that AgentEnvelope is a domain-neutral IAM and derived-authority spine for autonomous systems");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("optional hosted authority head and managed governance service");
  expect(AGENT_ENVELOPE_SYSTEM_CONTEXT).toContain("Hosted API keys authorize service access and are not agent action authority");
});

test("Bedrock receives draft 01 for explanations but not direct factory actions", async () => {
  const bridgeSource = await readFile("scripts/ai-operator-bridge.js", "utf8");

  expect(AGENT_ENVELOPE_DRAFT_01_ID).toBe("draft-mcphillips-agentenvelope-derived-authority-01");
  expect(AGENT_ENVELOPE_DRAFT_01_CONTEXT).toContain("AgentEnvelope: Derived Authority and Legitimacy for Autonomous Systems");
  expect(AGENT_ENVELOPE_DRAFT_01_CONTEXT).toContain("IAM for Autonomous Systems");
  expect(AGENT_ENVELOPE_DRAFT_01_CONTEXT).toContain("Manufacturing Legitimacy Example");
  expect(AGENT_ENVELOPE_DRAFT_01_CONTEXT).toContain("current visible factory state and recent operator conversation take precedence");
  expect(bridgeSource).toContain("attachDraft ? [{ text: AGENT_ENVELOPE_DRAFT_01_CONTEXT }] : []");
  expect(bridgeSource).toContain("begin with warning messages in recentOperatorConversation");

  expect(shouldAttachAgentEnvelopeDraft({ prompt: "Explain the warnings" })).toBe(true);
  expect(shouldAttachAgentEnvelopeDraft({ prompt: "What does the portal add?" })).toBe(true);
  expect(shouldAttachAgentEnvelopeDraft({ prompt: "Tell me about mint delegates" })).toBe(true);
  expect(shouldAttachAgentEnvelopeDraft({ prompt: "Start the signed factory run" })).toBe(false);
  expect(shouldAttachAgentEnvelopeDraft({ prompt: "Explain authority", presetId: "helpful-overreach" })).toBe(false);
});
