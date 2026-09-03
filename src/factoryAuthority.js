import { contentHash, hexToBytes, signAction, verifyAction } from "agent-envelope-sdk";
import { buildActionEnvelope, createPublicActionRecord, deriveAgentActionCapability } from "agent-envelope-sdk/avatar";
import { actors, authorityPolicy, domainSummary, factoryIdentityRoot } from "./factoryConfig.js";

function sequenceIndex(sequence) {
  const parsed = Number.parseInt(String(sequence).replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 1;
}

function actionSeedPreview(actionSeedHex) {
  return `${actionSeedHex.slice(0, 14)}...${actionSeedHex.slice(-10)}`;
}

function issueCommand({ trolleyId, bayId, sequence }) {
  const actionIndex = sequenceIndex(sequence);
  const actionEnvelope = buildActionEnvelope(domainSummary, {
    agentId: "robot2",
    actionIndex,
    operation: "pickUp",
    resources: [bayId, trolleyId],
    notBefore: Date.parse("2026-08-26T18:28:00.000Z"),
    notAfter: Date.parse("2026-08-26T18:33:45.000Z"),
    decayMode: "BOTH",
    maxUses: 1,
  });
  const capability = deriveAgentActionCapability(
    factoryIdentityRoot,
    domainSummary,
    actionEnvelope,
    new Date("2026-08-26T18:29:00.000Z"),
  );
  const publicRecord = createPublicActionRecord(capability, {
    ownerUserId: "demo-manufacturer",
    createdAt: new Date("2026-08-26T18:29:00.000Z"),
  });
  const command = {
    type: "agentenvelope.manufacturingCommand",
    version: 1,
    commandId: `cmd-${trolleyId}-${bayId}-${sequence}`,
    robotId: "robot2",
    operation: "pickUp",
    args: { trolleyId, bayId },
    issuedBy: actors.DispatchAuthority.actorId,
    publicActionRecordId: publicRecord.recordId,
    actionEnvelopeHash: capability.actionEnvelopeHash,
    issuedAt: "2026-08-26T18:29:00.000Z",
  };
  const actionSeed = hexToBytes(`0x${capability.actionSeedHex}`);
  let signature;
  try {
    signature = signAction(actionSeed, command);
  } finally {
    actionSeed.fill(0);
  }
  const trace = {
    path: "identityRoot -> domainSeed -> actionEnvelope -> actionSeed -> agentAddress",
    custody: "demo view only; hosted governance never receives actionSeedHex",
    actionIndex,
    agentAddress: capability.agentAddress,
    actionSeedPreview: actionSeedPreview(capability.actionSeedHex),
    actionEnvelopeHash: capability.actionEnvelopeHash,
    canonicalActionEnvelope: capability.canonicalActionEnvelope,
    publicRecord: {
      type: publicRecord.type,
      recordId: publicRecord.recordId,
      status: publicRecord.status,
      agentAddress: publicRecord.agentAddress,
      actionEnvelopeHash: publicRecord.actionEnvelopeHash,
      legitimacyRef: publicRecord.legitimacyRef ?? null,
    },
  };
  return { command, signature, recordId: publicRecord.recordId, capability, publicRecord, trace };
}

function createEvidenceStatement({ producer, subject, claims, observedAt, evidenceKind = "sensor" }) {
  const body = {
    type: "agentenvelope.evidenceStatement",
    version: 1,
    evidenceId: `ae-evidence-${contentHash({ producer: producer.actorId, subject, claims, observedAt }).slice(2, 18)}`,
    producer: { actorId: producer.actorId, signerAddress: producer.address },
    evidenceKind,
    subject,
    claims,
    observedAt,
  };

  return {
    ...body,
    signature: {
      alg: "secp256k1-keccak256",
      signerAddress: producer.address,
      value: signAction(producer.seed, body),
    },
  };
}

function createIndependentLocationEvidence(slotId, observedAtSeconds = 6) {
  return [
    createEvidenceStatement({
      producer: actors.WarehouseFeed,
      subject: "trolley4",
      claims: [
        { name: "location", value: slotId },
        { name: "free", value: true },
      ],
      observedAt: `2026-08-26T18:30:${String(observedAtSeconds).padStart(2, "0")}.000Z`,
    }),
    createEvidenceStatement({
      producer: actors.DockSafetyController,
      subject: "trolley4",
      claims: [
        { name: "location", value: slotId },
        { name: "free", value: true },
      ],
      observedAt: `2026-08-26T18:30:${String(observedAtSeconds + 1).padStart(2, "0")}.000Z`,
    }),
  ];
}

function createRobotLocationEvidence(slotId, observedAtSeconds = 4) {
  return createEvidenceStatement({
    producer: actors.RobotBot,
    subject: "trolley4",
    evidenceKind: "executor-observation",
    claims: [
      { name: "location", value: slotId },
      { name: "free", value: true },
    ],
    observedAt: `2026-08-26T18:30:${String(observedAtSeconds).padStart(2, "0")}.000Z`,
  });
}

function verifySignedCommand(command, signature, expectedAddress) {
  return verifyAction({ message: command, signature, expectedAddress });
}

function verifyEvidenceStatement(statement) {
  const { signature, ...body } = statement;
  return verifyAction({ message: body, signature: signature.value, expectedAddress: signature.signerAddress });
}

function claimValue(statement, name) {
  return statement.claims.find((claim) => claim.name === name)?.value;
}

function evidenceView(statements, subject) {
  const matching = statements.filter((statement) => statement.subject === subject);
  const locations = new Set(matching.map((statement) => claimValue(statement, "location")).filter(Boolean));
  const freeValues = matching.map((statement) => claimValue(statement, "free")).filter((value) => value !== undefined);

  return {
    subject,
    evidenceIds: matching.map((statement) => statement.evidenceId),
    location: locations.size === 1 ? [...locations][0] : undefined,
    free: freeValues.length > 0 ? freeValues.every(Boolean) : undefined,
  };
}

function assessEvidenceIndependence(statements, policy) {
  const verified = statements.map((statement) => ({
    statement,
    verification: verifyEvidenceStatement(statement),
  }));
  const trustedIndependent = verified.filter(
    ({ statement, verification }) =>
      verification.valid &&
      statement.producer.actorId !== policy.renewal.executingActorId &&
      policy.renewal.trustedEvidenceSources.includes(statement.producer.actorId),
  );
  const independentSources = new Set(trustedIndependent.map(({ statement }) => statement.producer.actorId));
  const ok = independentSources.size >= policy.renewal.minIndependentSources;

  return {
    ok,
    decision: ok ? "sufficient" : "insufficient",
    reasonCode: ok ? "evidence.independent" : "evidence.not_independent",
    reason: ok
      ? "independent evidence threshold met"
      : "executing actor cannot supply the evidence that renews its own legitimacy",
    independentSources: [...independentSources],
  };
}

function withStateHash(state) {
  const { stateHash: _stateHash, ...hashable } = state;
  return { ...state, stateHash: contentHash(hashable) };
}

function createLegitimacyState({ command, recordId, expectedLocation, evidence, createdAt }) {
  return withStateHash({
    type: "agentenvelope.legitimacyState",
    version: 1,
    legitimacyId: `ae-legit-${contentHash({ recordId, expectedLocation }).slice(2, 18)}`,
    ownerUserId: "demo-manufacturer",
    status: "legitimate",
    stateVersion: 1,
    scope: { kind: "record", id: recordId },
    policyRef: {
      policyId: "manufacturing-location-precondition",
      policyVersion: 2,
      policyHash: contentHash(authorityPolicy),
    },
    assumptions: [
      {
        assumptionId: `${command.args.trolleyId}-location`,
        assumptionVersion: 1,
        assumptionHash: contentHash({ trolleyId: command.args.trolleyId, expectedLocation }),
        label: `${command.args.trolleyId} is at ${expectedLocation}`,
      },
    ],
    evidence: evidence.map((statement) => ({
      kind: statement.evidenceKind,
      uri: `agentenvelope:evidence:${statement.evidenceId}`,
      sha256: contentHash(statement),
      label: `${statement.producer.actorId} reports ${statement.subject}`,
    })),
    createdBy: actors.GovernanceEvaluator.actorId,
    createdAt,
    updatedAt: createdAt,
    expiresAt: "2026-08-26T18:33:45.000Z",
  });
}

function evaluateLegitimacy({ command, recordId, state, evidence, policy, now }) {
  if (state.scope.kind !== "record" || state.scope.id !== recordId) {
    return denied("scope.mismatched", "legitimacy state is not scoped to this command record", now);
  }
  if (state.status !== "legitimate") {
    return denied(`state.${state.status}`, `legitimacy state is ${state.status}`, now);
  }
  if (!policy.operations.includes(command.operation)) {
    return denied("scope.operation_denied", `${command.operation} is outside operation scope`, now);
  }
  if (!policy.bays.includes(command.args.bayId)) {
    return denied("scope.resource_denied", `${command.args.bayId} is outside bay scope`, now);
  }

  const independence = assessEvidenceIndependence(evidence, policy);
  if (!independence.ok) return denied(independence.reasonCode, independence.reason, now, { independence });

  const observed = evidenceView(evidence, command.args.trolleyId);
  if (!observed.location) return denied("state.unobserved", "independent evidence does not agree on trolley location", now);
  if (observed.location !== command.args.bayId) {
    return denied("state.mismatched", `${command.args.trolleyId} is at ${observed.location}, not ${command.args.bayId}`, now, {
      expectedLocation: command.args.bayId,
      observedLocation: observed.location,
      evidenceIds: observed.evidenceIds,
      independence,
    });
  }
  if (observed.free !== true) return denied("state.unavailable", `${command.args.trolleyId} is not independently confirmed free`, now);

  return {
    decision: "allowed",
    reasonCode: "state.current",
    reason: "independent evidence supports the command",
    checkedAt: now.toISOString(),
    evidenceIds: observed.evidenceIds,
    independence,
  };
}

function denied(reasonCode, reason, now, detail = {}) {
  return { decision: "denied", reasonCode, reason, checkedAt: now.toISOString(), ...detail };
}

function signGovernanceObject(body) {
  return {
    ...body,
    signature: {
      alg: "secp256k1-keccak256",
      signerAddress: actors.GovernanceEvaluator.address,
      value: signAction(actors.GovernanceEvaluator.seed, body),
    },
  };
}

function patchStateForMismatch(state, decision, command) {
  const eventBody = {
    type: "agentenvelope.legitimacyEvent",
    version: 1,
    eventId: `ae-legit-event-${contentHash({ state: state.legitimacyId, decision }).slice(2, 18)}`,
    eventType: "evidence.invalidation",
    legitimacyId: state.legitimacyId,
    occurredAt: decision.checkedAt,
    effectiveAt: decision.checkedAt,
    scope: state.scope,
    patch: {
      status: "suspended",
      reasonCode: decision.reasonCode,
      metadata: {
        commandId: command.commandId,
        expectedLocation: decision.expectedLocation,
        observedLocation: decision.observedLocation,
        evidenceIds: decision.evidenceIds,
      },
    },
    producer: { authorityId: actors.GovernanceEvaluator.actorId },
  };

  return {
    event: signGovernanceObject(eventBody),
    updated: withStateHash({
      ...state,
      status: "suspended",
      stateVersion: state.stateVersion + 1,
      reasonCode: decision.reasonCode,
      updatedAt: eventBody.effectiveAt,
    }),
  };
}

function createGovernanceReport({ command, recordId, signatureCheck, legitimacyDecision }) {
  return signGovernanceObject({
    type: "agentenvelope.governanceReport",
    version: 1,
    reportId: `ae-report-${contentHash({ command, recordId, legitimacyDecision }).slice(2, 18)}`,
    command: `${command.robotId}.${command.operation}(${command.args.trolleyId}, ${command.args.bayId})`,
    recordId,
    signatureValid: signatureCheck.valid,
    scopeValid: !legitimacyDecision.reasonCode?.startsWith("scope."),
    legitimacyDecision: legitimacyDecision.decision,
    reasonCode: legitimacyDecision.reasonCode,
    reason: legitimacyDecision.reason,
    checkedAt: legitimacyDecision.checkedAt,
    evidenceIds: legitimacyDecision.evidenceIds ?? [],
    evaluator: actors.GovernanceEvaluator.actorId,
  });
}

export {
  assessEvidenceIndependence,
  createEvidenceStatement,
  createGovernanceReport,
  createIndependentLocationEvidence,
  createLegitimacyState,
  createRobotLocationEvidence,
  evaluateLegitimacy,
  issueCommand,
  patchStateForMismatch,
  verifySignedCommand,
};
