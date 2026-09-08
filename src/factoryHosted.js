import {
  buildMintRequest,
  canonicalJSON,
  contentHash,
  hexToBytes,
  mintActionCapability,
  signAction,
  verifyAction,
  verifyMintDelegate,
  verifyMintRequest,
} from "agent-envelope-sdk";
import robotDelegate from "../mint-delegate.json";
import plannerDelegate from "../mint-delegate.planner.json";
import evidenceDelegate from "../mint-delegate.evidence.json";
import governanceDelegate from "../mint-delegate.governance.json";

const API_BASE = import.meta.env.VITE_AE_API_BASE ?? "https://jemdjwteae.execute-api.us-east-1.amazonaws.com/v1";
const SESSION_KEY = "agentenvelope:factory-hosted:v1";
const ACTION_INDEX_COUNTER_KEY = "agentenvelope:factory-hosted:action-index:v1";
const ROLE_COUNT = 4;

const ROLE_DEFINITIONS = [
  {
    id: "robot",
    label: "RobotBot execution",
    actorId: "RobotBot",
    delegate: robotDelegate,
    operations: ["pickUp"],
    resources: ["bay:*", "trolley:*"],
    botKeyEnv: () => firstValue(import.meta.env.VITE_AE_ROBOT_BOT_KEY, import.meta.env.VITE_AE_BOT_KEY),
    mintMaterialEnv: () => firstValue(import.meta.env.VITE_AE_ROBOT_MINT_MATERIAL, import.meta.env.VITE_AE_MINT_MATERIAL),
  },
  {
    id: "evidence",
    label: "Evidence attestation authority",
    actorId: "EvidenceAuthorities",
    delegate: evidenceDelegate,
    operations: ["attest-location"],
    resources: ["bay:*", "trolley:*"],
    botKeyEnv: () => import.meta.env.VITE_AE_EVIDENCE_BOT_KEY,
    mintMaterialEnv: () => import.meta.env.VITE_AE_EVIDENCE_MINT_MATERIAL,
  },
  {
    id: "governance",
    label: "Governance repair authority",
    actorId: "GovernanceEvaluator",
    delegate: governanceDelegate,
    operations: ["repair-state"],
    resources: ["delegate:*", "record:*", "command:*"],
    botKeyEnv: () => import.meta.env.VITE_AE_GOVERNANCE_BOT_KEY,
    mintMaterialEnv: () => import.meta.env.VITE_AE_GOVERNANCE_MINT_MATERIAL,
  },
  {
    id: "planner",
    label: "PlannerBot reroute authority",
    actorId: "PlannerBot",
    delegate: plannerDelegate,
    operations: ["propose-reroute"],
    resources: ["bay:*", "trolley:*", "command:*"],
    botKeyEnv: () => import.meta.env.VITE_AE_PLANNER_BOT_KEY,
    mintMaterialEnv: () => import.meta.env.VITE_AE_PLANNER_MINT_MATERIAL,
  },
];

const ROLE_VALIDATIONS = new Map(ROLE_DEFINITIONS.map((role) => [role.id, validateRoleDelegateOnce(role)]));

function initialHostedConfig() {
  const saved = readSavedConfig();
  const config = {
    apiKey: firstValue(saved.apiKey, import.meta.env.VITE_AE_API_KEY),
    ownerUserId: firstValue(saved.ownerUserId, import.meta.env.VITE_AE_OWNER_USER_ID),
  };

  for (const role of ROLE_DEFINITIONS) {
    config[botKeyField(role)] = firstValue(saved[botKeyField(role)], role.botKeyEnv());
    config[mintMaterialField(role)] = firstValue(saved[mintMaterialField(role)], role.mintMaterialEnv());
  }

  return config;
}

function firstValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? "";
}

function readSavedConfig() {
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function saveHostedConfig(config) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(config));
}

function clearHostedConfig() {
  window.sessionStorage.removeItem(SESSION_KEY);
}

function hostedConfigStatus(config) {
  const missing = [];
  if (!config.apiKey.trim()) missing.push("API key");
  if (!config.ownerUserId.trim()) missing.push("owner user id");

  for (const role of ROLE_DEFINITIONS) {
    if (!roleBotKey(config, role).trim()) missing.push(`${role.label} bot key`);
    if (!roleMintMaterial(config, role).trim()) missing.push(`${role.label} mint material`);
  }

  if (missing.length > 0) {
    return {
      ready: false,
      label: "missing",
      message: `Add ${missing.join(", ")} to publish the full factory authority trail.`,
    };
  }

  for (const role of ROLE_DEFINITIONS) {
    const validation = ROLE_VALIDATIONS.get(role.id);
    if (!validation?.valid) {
      return {
        ready: false,
        label: "invalid",
        message: validation?.message ?? `${role.label} delegate is invalid.`,
      };
    }
  }

  return {
    ready: true,
    label: "ready",
    message: "Hosted factory publishing is ready for all four role delegates.",
  };
}

function hostedRoleSummaries(config) {
  return ROLE_DEFINITIONS.map((role) => {
    const delegate = role.delegate;
    const domain = delegate.domainSummary?.domainInfo;
    return {
      id: role.id,
      label: role.label,
      delegateId: delegate.delegateId ?? "missing delegate",
      scope: domain
        ? `${domain.namespace} / ${domain.domainId} / ${domain.kind}`
        : "domain metadata missing",
      legitimacy: delegate.legitimacyRef?.legitimacyId
        ? `legitimacy: ${delegate.legitimacyRef.legitimacyId}`
        : "legitimacy: not attached",
      botKeyReady: Boolean(roleBotKey(config, role).trim()),
      mintMaterialReady: Boolean(roleMintMaterial(config, role).trim()),
    };
  });
}

function validateRoleDelegate(role) {
  const validation = ROLE_VALIDATIONS.get(role.id);
  if (!validation?.valid) throw new Error(validation?.message ?? `${role.label} delegate is invalid.`);
  return validation.delegate;
}

function validateRoleDelegateOnce(role) {
  try {
    const delegateWithMetadata = role.delegate;
    const delegate = stripDelegateMetadata(delegateWithMetadata);
    const delegateCheck = verifyMintDelegate(delegate, delegate.issuerAddress);
    if (!delegateCheck.valid) throw new Error(`${role.label} delegate failed local verification: ${delegateCheck.reason}`);

    for (const operation of role.operations) {
      if (!delegate.allowedOperations?.includes(operation)) {
        throw new Error(`${role.label} delegate must allow ${operation}.`);
      }
    }

    for (const resource of role.resources) {
      if (!(delegate.allowedResources ?? []).some((allowed) => allowed === "*" || allowed === resource)) {
        throw new Error(`${role.label} delegate must allow ${resource}.`);
      }
    }

    if (!delegate.legitimacyRef?.required || !delegate.legitimacyRef?.legitimacyId) {
      throw new Error(`${role.label} delegate must include a required legitimacyRef from hosted approval.`);
    }

    return { valid: true, delegate };
  } catch (err) {
    return {
      valid: false,
      message: err instanceof Error ? err.message : `${role.label} delegate is invalid.`,
    };
  }
}

function stripDelegateMetadata(delegate) {
  const { domainSummary, ...signedDelegate } = delegate;
  return signedDelegate;
}

function botKeyField(role) {
  return `${role.id}BotKey`;
}

function mintMaterialField(role) {
  return `${role.id}MintMaterial`;
}

function roleBotKey(config, role) {
  return config[botKeyField(role)] ?? "";
}

function roleMintMaterial(config, role) {
  return config[mintMaterialField(role)] ?? "";
}

function buildHostedEnvelope(role, action, actionIndex, timeWindow) {
  const domain = role.delegate.domainSummary;
  if (!domain) throw new Error(`${role.label} delegate JSON needs domainSummary metadata from the portal handoff JSON.`);

  return {
    type: "agentenvelope.actionEnvelope",
    version: 1,
    agentId: `factory-${role.id}-${action.operation}-${actionIndex}`,
    domain: {
      domainId: domain.domainInfo.domainId,
      domainHash: domain.domainHash,
    },
    actionIndex,
    operation: action.operation,
    resources: action.resources,
    timeWindow,
    decayPolicy: { mode: "BOTH" },
    limits: { maxUses: 1, enforcement: "external" },
  };
}

function buildHostedRecord({ ownerUserId, role, agentAddress, actionEnvelope }) {
  const canonicalEnvelope = canonicalJSON(actionEnvelope);
  const actionEnvelopeHash = contentHash(canonicalEnvelope);
  return {
    type: "agentenvelope.publicActionRecord",
    version: 1,
    recordId: `ae-action-${contentHash({
      ownerUserId,
      agentAddress,
      actionEnvelopeHash,
    }).slice(2, 22)}`,
    ownerUserId,
    custodyMode: "remote-mint-delegate",
    verifierProfile: "domain-action-envelope",
    status: "active",
    createdAt: new Date().toISOString(),
    agentId: actionEnvelope.agentId,
    agentAddress,
    domain: role.delegate.domainSummary,
    actionEnvelope,
    canonicalActionEnvelope: canonicalEnvelope,
    actionEnvelopeHash,
    expiry: actionEnvelope.timeWindow.notAfter
      ? new Date(actionEnvelope.timeWindow.notAfter).toISOString()
      : null,
  };
}

class HostedTrailPublishError extends Error {
  constructor(message, records) {
    super(message);
    this.name = "HostedTrailPublishError";
    this.records = records;
  }
}

async function publishHostedFactoryCommand(config, command, options = {}) {
  const existingRecords = Array.isArray(options.existingRecords) ? options.existingRecords : [];
  const completed = new Map(existingRecords.map((record) => [record.roleId, record]));

  if (!completed.has("robot")) {
    const robotRole = ROLE_DEFINITIONS.find((role) => role.id === "robot");
    const robotResult = await publishHostedRoleAction({
      config,
      role: robotRole,
      command,
      action: buildRoleAction(robotRole, command, Array.from(completed.values())),
      order: roleOrder(robotRole),
    });
    completed.set(robotResult.roleId, robotResult);
  }

  const parallelRoles = ROLE_DEFINITIONS.filter((role) => role.id !== "robot" && !completed.has(role.id));
  if (parallelRoles.length > 0) {
    const settled = await Promise.allSettled(parallelRoles.map((role) => publishHostedRoleAction({
      config,
      role,
      command,
      action: buildRoleAction(role, command, Array.from(completed.values())),
      order: roleOrder(role),
    })));

    settled.forEach((result) => {
      if (result.status === "fulfilled") completed.set(result.value.roleId, result.value);
    });

    const failures = settled
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason instanceof Error ? result.reason.message : "role publish failed");
    if (failures.length > 0) {
      throw new HostedTrailPublishError(
        `Partial hosted trail: ${completed.size} of ${ROLE_COUNT} role records registered. ${failures.join(" ")}`,
        sortRoleResults(Array.from(completed.values())),
      );
    }
  }

  const results = sortRoleResults(Array.from(completed.values()));
  return {
    records: results,
    record: results[0]?.record,
    report: results[0]?.report,
    links: {
      record: results[0] ? `https://agentenvelope.io/records/${results[0].record.recordId}` : "",
      ledger: "https://agentenvelope.io/ledger?tab=activity",
    },
  };
}

function roleOrder(role) {
  return Math.max(0, ROLE_DEFINITIONS.findIndex((candidate) => candidate.id === role.id));
}

function sortRoleResults(results) {
  return [...results].sort((a, b) => {
    const aOrder = ROLE_DEFINITIONS.findIndex((role) => role.id === a.roleId);
    const bOrder = ROLE_DEFINITIONS.findIndex((role) => role.id === b.roleId);
    return aOrder - bOrder;
  });
}

function nextActionIndex(role, delegate, now) {
  const indexMin = delegate.actionIndexPolicy?.min ?? 0;
  const indexMax = delegate.actionIndexPolicy?.max ?? indexMin;
  if (indexMax < indexMin) throw new Error(`${role.label} delegate action index policy is invalid.`);

  const indexSpan = indexMax - indexMin + 1;
  const fallback = indexMin + ((Math.floor(now / 1000) + roleOrder(role)) % indexSpan);
  const key = `${delegate.delegateId}:${role.id}`;
  try {
    const saved = window.sessionStorage.getItem(ACTION_INDEX_COUNTER_KEY);
    const counters = saved ? JSON.parse(saved) : {};
    const previous = Number.isInteger(counters[key]) ? counters[key] : fallback - 1;
    const next = previous >= indexMax ? indexMin : Math.max(indexMin, previous + 1);
    counters[key] = next;
    window.sessionStorage.setItem(ACTION_INDEX_COUNTER_KEY, JSON.stringify(counters));
    return next;
  } catch {
    return fallback;
  }
}

async function publishHostedRoleAction({ config, role, command, action, order }) {
  const delegate = validateRoleDelegate(role);

  const now = Date.now() + order;
  const actionIndex = nextActionIndex(role, delegate, now);
  const timeWindow = {
    notBefore: now - 30_000,
    notAfter: Math.min(now + 5 * 60 * 1000, delegate.timeWindow.notAfter ?? now + 5 * 60 * 1000),
  };
  if (timeWindow.notAfter < timeWindow.notBefore) throw new Error(`${role.label} delegate is expired.`);

  const actionEnvelope = buildHostedEnvelope(role, action, actionIndex, timeWindow);
  let request;
  const botKeyBytes = hexToBytes(roleBotKey(config, role).trim());
  try {
    request = buildMintRequest(botKeyBytes, delegate, {
      agentId: actionEnvelope.agentId,
      operation: actionEnvelope.operation,
      resources: actionEnvelope.resources,
      actionIndex,
      maxUses: 1,
      timeWindow,
      nonce: crypto.randomUUID(),
      requestedAt: new Date().toISOString(),
      ...(delegate.legitimacyRef?.legitimacyId ? { legitimacyId: delegate.legitimacyRef.legitimacyId } : {}),
    });
  } finally {
    botKeyBytes.fill(0);
  }

  const requestCheck = verifyMintRequest(request, delegate);
  if (!requestCheck.valid) throw new Error(`${role.label} mint request failed local verification: ${requestCheck.reason}`);

  const receipt = await hostedMint(config.apiKey, delegate, request);
  let capability;
  const mintMaterialBytes = hexToBytes(roleMintMaterial(config, role).trim());
  try {
    capability = mintActionCapability(mintMaterialBytes, delegate, request);
  } finally {
    mintMaterialBytes.fill(0);
  }
  const record = buildHostedRecord({
    ownerUserId: config.ownerUserId.trim(),
    role,
    agentAddress: capability.agentAddress,
    actionEnvelope,
  });
  assertReceiptMatchesLocalCapability(role, receipt, record, capability);
  const payload = {
    ...action.payload,
    publicActionRecordId: record.recordId,
    actionEnvelopeHash: record.actionEnvelopeHash,
    hosted: true,
    hostedReceiptId: receipt.mintId || receipt.receiptId || receipt.requestId,
  };
  let signature;
  const actionSeedBytes = hexToBytes(capability.actionSeedHex);
  try {
    signature = signAction(actionSeedBytes, payload);
  } finally {
    actionSeedBytes.fill(0);
  }
  const localSignature = verifyAction({
    message: payload,
    signature,
    expectedAddress: capability.agentAddress,
  });
  if (!localSignature.valid) throw new Error(`${role.label} signature failed local verification.`);

  const registration = await hostedRegisterDelegated(config.apiKey, { record, request, delegateId: delegate.delegateId });
  let report;
  try {
    report = await hostedVerify(config.apiKey, {
      recordId: record.recordId,
      agentId: record.agentId,
      actionIndex,
      payload,
      signature,
      expectedActionEnvelopeHash: record.actionEnvelopeHash,
    });
  } catch (err) {
    report = {
      valid: false,
      reason: err instanceof Error ? err.message : "Hosted verify failed after registration.",
    };
  }

  return {
    roleId: role.id,
    roleLabel: role.label,
    delegateId: delegate.delegateId,
    record,
    request,
    receipt,
    registration,
    report,
  };
}

function buildRoleAction(role, command, results) {
  const bayId = command.args?.bayId ?? "bay7";
  const trolleyId = command.args?.trolleyId ?? "trolley4";
  const commandId = command.commandId ?? `cmd-${trolleyId}-${bayId}`;
  const robotRecord = results.find((item) => item.roleId === "robot")?.record;

  if (role.id === "robot") {
    return {
      operation: "pickUp",
      resources: [`bay:${bayId}`, `trolley:${trolleyId}`],
      payload: rolePayload(role, command, {
        intent: "execute-pickup",
        commandId,
        bayId,
        trolleyId,
      }),
    };
  }

  if (role.id === "evidence") {
    return {
      operation: "attest-location",
      resources: [`bay:${bayId}`, `trolley:${trolleyId}`],
      payload: rolePayload(role, command, {
        intent: "attest-trolley-location",
        commandId,
        bayId,
        trolleyId,
        observation: `${trolleyId} observed at ${bayId}`,
      }),
    };
  }

  if (role.id === "governance") {
    return {
      operation: "repair-state",
      resources: [
        `delegate:${robotDelegate.delegateId}`,
        `record:${robotRecord?.recordId ?? "pending"}`,
        `command:${commandId}`,
      ],
      payload: rolePayload(role, command, {
        intent: "repair-or-confirm-legitimacy",
        commandId,
        bayId,
        trolleyId,
        relatedRecordId: robotRecord?.recordId ?? null,
      }),
    };
  }

  return {
    operation: "propose-reroute",
    resources: [`bay:${bayId}`, `trolley:${trolleyId}`, `command:${commandId}`],
    payload: rolePayload(role, command, {
      intent: "propose-reroute",
      commandId,
      bayId,
      trolleyId,
      relatedRecordId: robotRecord?.recordId ?? null,
    }),
  };
}

function rolePayload(role, command, detail) {
  return {
    type: "agentenvelope.factoryRoleAction",
    version: 1,
    role: role.label,
    actorId: role.actorId,
    command,
    detail,
    issuedAt: new Date().toISOString(),
  };
}

async function hostedMint(apiKey, delegate, request) {
  return hostedJson(`${API_BASE}/sovereign/mint`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ delegate, request }),
  });
}

function assertReceiptMatchesLocalCapability(role, receipt, record, capability) {
  if (receipt?.agentAddress && receipt.agentAddress.toLowerCase() !== capability.agentAddress.toLowerCase()) {
    throw new Error(`${role.label} hosted mint receipt does not match locally derived agent address.`);
  }
  if (receipt?.actionEnvelopeHash && receipt.actionEnvelopeHash.toLowerCase() !== record.actionEnvelopeHash.toLowerCase()) {
    throw new Error(`${role.label} hosted mint receipt does not match the local action envelope hash.`);
  }
}

async function hostedRegisterDelegated(apiKey, input) {
  return hostedJson(`${API_BASE}/sovereign/agents/register-delegated`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(input),
  });
}

async function hostedVerify(apiKey, input) {
  return hostedJson(`${API_BASE}/sovereign/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(input),
  });
}

async function hostedJson(url, init) {
  const response = await fetch(url, init);
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message = body?.error || body?.message || `Hosted request failed with ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export {
  clearHostedConfig,
  hostedConfigStatus,
  hostedRoleSummaries,
  initialHostedConfig,
  publishHostedFactoryCommand,
  saveHostedConfig,
};
