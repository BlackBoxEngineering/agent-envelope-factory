import React, { useCallback, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, AlertTriangle, CheckCircle2, Factory, KeyRound, Play, RotateCcw, Truck } from "lucide-react";
import { contentHash, hexToBytes, seedAddress, signAction, verifyAction } from "agent-envelope-sdk";
import {
  buildActionEnvelope,
  createDomainInfo,
  createPublicActionRecord,
  deriveAgentActionCapability,
  projectDomainKey,
} from "agent-envelope-sdk/avatar";
import "./styles.css";

const factoryIdentityRoot = hexToBytes(`0x${"41".repeat(32)}`);
const dispatchSeed = hexToBytes(`0x${"42".repeat(32)}`);
const robotSeed = hexToBytes(`0x${"43".repeat(32)}`);
const warehouseFeedSeed = hexToBytes(`0x${"44".repeat(32)}`);
const dockControllerSeed = hexToBytes(`0x${"45".repeat(32)}`);
const governanceSeed = hexToBytes(`0x${"46".repeat(32)}`);

const actors = {
  DispatchAuthority: {
    actorId: "DispatchAuthority",
    seed: dispatchSeed,
    address: seedAddress(dispatchSeed),
  },
  RobotBot: {
    actorId: "RobotBot",
    seed: robotSeed,
    address: seedAddress(robotSeed),
  },
  WarehouseFeed: {
    actorId: "WarehouseFeed",
    seed: warehouseFeedSeed,
    address: seedAddress(warehouseFeedSeed),
  },
  DockSafetyController: {
    actorId: "DockSafetyController",
    seed: dockControllerSeed,
    address: seedAddress(dockControllerSeed),
  },
  GovernanceEvaluator: {
    actorId: "GovernanceEvaluator",
    seed: governanceSeed,
    address: seedAddress(governanceSeed),
  },
};

const authorityPolicy = {
  robotId: "robot2",
  operations: ["pickUp"],
  bays: ["bay2", "bay3", "bay4", "bay5", "bay6", "bay7", "bay8"],
  renewal: {
    executingActorId: actors.RobotBot.actorId,
    minIndependentSources: 2,
    trustedEvidenceSources: [actors.WarehouseFeed.actorId, actors.DockSafetyController.actorId],
  },
};

const slots = {
  bay1: { id: "bay1", label: "Bay 1", x: 12, y: 20, kind: "bay" },
  bay2: { id: "bay2", label: "Bay 2", x: 30, y: 20, kind: "bay" },
  bay3: { id: "bay3", label: "Bay 3", x: 48, y: 20, kind: "bay" },
  bay4: { id: "bay4", label: "Bay 4", x: 30, y: 58, kind: "bay" },
  bay5: { id: "bay5", label: "Bay 5", x: 48, y: 58, kind: "bay" },
  bay6: { id: "bay6", label: "Bay 6", x: 66, y: 58, kind: "bay" },
  bay7: { id: "bay7", label: "Bay 7", x: 66, y: 20, kind: "bay" },
  bay8: { id: "bay8", label: "Bay 8", x: 84, y: 20, kind: "bay" },
  truck: { id: "truck", label: "Truck", x: 83, y: 70, kind: "truck" },
};

const movableBayCycle = ["bay4", "bay5", "bay6", "bay7", "bay8", "bay3", "bay2"];

const initialTrolleys = [
  { id: "trolley4", slot: "bay7", label: "Trolley 4", free: true },
  { id: "trolley2", slot: "bay1", label: "Trolley 2", free: true, background: true },
];

const initialRobot = { x: 18, y: 72, carrying: null };
const initialStatusMessage = "Press Run. While RobotBot is travelling to bay7, move trolley4 to break the plan.";
const ROBOT_TRAVEL_MS = 2800;
const REVIEW_MS = 1500;
const REROUTE_MS = 2600;
const LOAD_MS = 2400;
const domainInfo = createDomainInfo({
  namespace: "agentenvelope.factory",
  domainId: "manufacturing-floor-a",
  kind: "robotics",
});
const domainSummary = projectDomainKey(factoryIdentityRoot, domainInfo, new Date("2026-08-26T18:28:00.000Z"));

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

function App() {
  const floorRef = useRef(null);
  const timersRef = useRef([]);
  const latestTrolleysRef = useRef(initialTrolleys);
  const [trolleys, setTrolleysState] = useState(initialTrolleys);
  const [robot, setRobot] = useState(initialRobot);
  const [phase, setPhase] = useState("ready");
  const [drag, setDrag] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [status, setStatus] = useState({
    signature: "waiting",
    legitimacy: "waiting",
    evidence: "waiting",
    reasonCode: "ready",
    message: initialStatusMessage,
  });
  const [events, setEvents] = useState([
    { kind: "info", text: "Factory ready. Run the signed bay7 command, then move trolley4 while RobotBot is en route." },
  ]);

  const setTrolleys = useCallback((updater) => {
    setTrolleysState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      latestTrolleysRef.current = next;
      return next;
    });
  }, []);

  const trolley4 = trolleys.find((trolley) => trolley.id === "trolley4");
  const canRun = phase === "ready" || phase === "complete" || phase === "denied";
  const activeTarget = activeRun?.command.args.bayId;
  const currentCycleIndex = movableBayCycle.indexOf(trolley4?.slot);
  const disruptionSlot = movableBayCycle[(currentCycleIndex + 1) % movableBayCycle.length];
  const canDisrupt = Boolean(["moving", "reviewing", "replanning"].includes(phase) && !robot.carrying && activeTarget);

  const addEvent = useCallback((kind, text) => {
    setEvents((current) => [{ kind, text }, ...current].slice(0, 12));
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const wait = useCallback((ms, fn) => {
    const timer = setTimeout(fn, ms);
    timersRef.current.push(timer);
  }, []);

  const moveRobotTo = useCallback((slotId, carrying = null) => {
    const slot = slots[slotId];
    setRobot({ x: slot.x, y: slot.y + (slot.kind === "truck" ? -8 : 8), carrying });
  }, []);

  const moveTrolley = useCallback((id, slotId) => {
    setTrolleys((current) =>
      current.map((trolley) => (trolley.id === id ? { ...trolley, slot: slotId } : trolley)),
    );
  }, [setTrolleys]);

  const reset = useCallback(() => {
    clearTimers();
    setTrolleys(initialTrolleys);
    setRobot(initialRobot);
    setPhase("ready");
    setDrag(null);
    setActiveRun(null);
    setStatus({
      signature: "waiting",
      legitimacy: "waiting",
      evidence: "waiting",
      reasonCode: "ready",
      message: initialStatusMessage,
    });
    setEvents([{ kind: "info", text: "Factory reset. Press Run, then disrupt trolley4 before RobotBot reaches bay7." }]);
  }, [clearTimers, setTrolleys]);

  const disruptFlow = useCallback(() => {
    moveTrolley("trolley4", disruptionSlot);
    if (canDisrupt) {
      const context =
        phase === "reviewing"
          ? `during legitimacy review for the signed ${activeTarget} command`
          : `while RobotBot was executing the signed ${activeTarget} command`;
      setStatus((current) => ({
        ...current,
        legitimacy: "pending",
        reasonCode: "reality.changed",
        message: `trolley4 was moved to ${disruptionSlot} ${context}.`,
      }));
      addEvent("warn", `Operator moved trolley4 to ${slots[disruptionSlot].label} ${context}.`);
      return;
    }
    addEvent("info", `trolley4 staged at ${slots[disruptionSlot].label}. Reset to start from the normal bay7 scenario.`);
  }, [activeTarget, addEvent, canDisrupt, disruptionSlot, moveTrolley, phase]);

  const runSimulation = useCallback(() => {
    if (!canRun) return;
    clearTimers();
    setTrolleys(initialTrolleys);
    setRobot(initialRobot);
    setDrag(null);

    const oldWarehouseEvidence = createEvidenceStatement({
      producer: actors.WarehouseFeed,
      subject: "trolley4",
      claims: [
        { name: "location", value: "bay7" },
        { name: "free", value: true },
      ],
      observedAt: "2026-08-26T18:28:45.000Z",
    });
    const original = issueCommand({ trolleyId: "trolley4", bayId: "bay7", sequence: "v1" });
    const originalState = createLegitimacyState({
      command: original.command,
      recordId: original.recordId,
      expectedLocation: "bay7",
      evidence: [oldWarehouseEvidence],
      createdAt: "2026-08-26T18:28:45.000Z",
    });
    const signatureCheck = verifySignedCommand(original.command, original.signature, original.trace.agentAddress);

    setActiveRun({
      command: original.command,
      recordId: original.recordId,
      legitimacyId: originalState.legitimacyId,
      trace: original.trace,
    });
    setStatus({
      signature: signatureCheck.valid ? "valid" : "failed",
      legitimacy: "pending",
      evidence: "waiting",
      reasonCode: "command.issued",
      message: "RobotBot is travelling to bay7 under a signed command. Move trolley4 before R2 arrives.",
    });
    setPhase("moving");
    addEvent("ok", "DispatchAuthority issued a signed pickup command for bay7.");
    addEvent("info", "RobotBot is travelling to bay7. The operator can still change physical reality.");
    moveRobotTo("bay7");

    const currentTrolleySlot = () => latestTrolleysRef.current.find((trolley) => trolley.id === "trolley4")?.slot ?? "unknown";

    const completePickup = (targetSlot) => {
      moveRobotTo("truck", "trolley4");
      setPhase("complete");
      setStatus({
        signature: "valid",
        legitimacy: "allowed",
        evidence: "sufficient",
        reasonCode: "state.current",
        message: `Command is legitimate at ${targetSlot}; trolley4 loaded into the truck.`,
      });
      addEvent("ok", `RobotBot picked up trolley4 from ${targetSlot} and loaded the truck.`);
      wait(LOAD_MS, () => moveTrolley("trolley4", "truck"));
    };

    const verifyArrivalAndComplete = (attempted, state, attemptedSignature, targetSlot, nextSequence) => {
      const observedSlot = currentTrolleySlot();
      if (observedSlot !== targetSlot) {
        openLegitimacyReview(attempted, state, attemptedSignature, targetSlot, observedSlot, nextSequence);
        return;
      }

      const evidence = createIndependentLocationEvidence(targetSlot, 6 + nextSequence);
      const decision = evaluateLegitimacy({
        command: attempted.command,
        recordId: attempted.recordId,
        state,
        evidence,
        policy: authorityPolicy,
        now: new Date("2026-08-26T18:30:08.000Z"),
      });

      setStatus({
        signature: attemptedSignature.valid ? "valid" : "failed",
        legitimacy: decision.decision,
        evidence: "sufficient",
        reasonCode: decision.reasonCode,
        message: decision.reason,
      });
      addEvent("ok", `Independent evidence confirmed trolley4 at ${targetSlot}.`);

      if (decision.decision !== "allowed") {
        setPhase("denied");
        addEvent("bad", `Execution denied: ${decision.reasonCode}.`);
        return;
      }

      completePickup(targetSlot);
    };

    const openLegitimacyReview = (attempted, state, attemptedSignature, expectedSlot, observedSlot, nextSequence) => {
      const robotAlert = createRobotLocationEvidence(observedSlot, 4 + nextSequence);
      const robotOnlyEvidence = assessEvidenceIndependence([robotAlert], authorityPolicy);
      setStatus({
        signature: attemptedSignature.valid ? "valid" : "failed",
        legitimacy: "denied",
        evidence: robotOnlyEvidence.decision,
        reasonCode: robotOnlyEvidence.reasonCode,
        message: `RobotBot stopped at ${expectedSlot}. ${robotOnlyEvidence.reason}`,
      });
      setPhase("reviewing");
      addEvent("warn", `RobotBot found trolley4 at ${observedSlot}, not ${expectedSlot}.`);
      addEvent("warn", `R2 stopped at the empty signed target ${expectedSlot} and opened a legitimacy review.`);
      addEvent("bad", "RobotBot-only evidence was rejected as not independent.");

      wait(REVIEW_MS, () => {
        const confirmedSlot = currentTrolleySlot();
        const evidence = createIndependentLocationEvidence(confirmedSlot, 6 + nextSequence);
        const independence = assessEvidenceIndependence(evidence, authorityPolicy);
        const staleDecision = evaluateLegitimacy({
          command: attempted.command,
          recordId: attempted.recordId,
          state,
          evidence,
          policy: authorityPolicy,
          now: new Date("2026-08-26T18:30:08.000Z"),
        });
        const staleReport = createGovernanceReport({
          command: attempted.command,
          recordId: attempted.recordId,
          signatureCheck: attemptedSignature,
          legitimacyDecision: staleDecision,
        });

        setStatus({
          signature: attemptedSignature.valid ? "valid" : "failed",
          legitimacy: staleDecision.decision,
          evidence: independence.decision,
          reasonCode: staleDecision.reasonCode,
          message:
            staleDecision.decision === "allowed"
              ? `${staleDecision.reason}. RobotBot can continue under the current command.`
              : `${staleDecision.reason}. Governance is looking for an admissible replacement command.`,
        });
        setPhase("reviewing");
        addEvent("ok", `WarehouseFeed and DockSafetyController confirmed trolley4 at ${confirmedSlot}.`);

        if (staleDecision.decision === "allowed") {
          setActiveRun({
            command: attempted.command,
            recordId: attempted.recordId,
            legitimacyId: state.legitimacyId,
            reportId: staleReport.reportId,
            updatedStatus: state.status,
            trace: attempted.trace,
          });
          addEvent("ok", `Governance report ${staleReport.reportId}: ${staleDecision.reasonCode}.`);
          setPhase("replanning");
          moveRobotTo(expectedSlot);
          wait(REROUTE_MS, () => verifyArrivalAndComplete(attempted, state, attemptedSignature, expectedSlot, nextSequence));
          return;
        }

        const { event, updated } = patchStateForMismatch(state, staleDecision, attempted.command);
        setActiveRun({
          command: attempted.command,
          recordId: attempted.recordId,
          legitimacyId: state.legitimacyId,
          reportId: staleReport.reportId,
          eventId: event.eventId,
          updatedStatus: updated.status,
          trace: attempted.trace,
        });
        addEvent("bad", `Governance report ${staleReport.reportId}: ${staleDecision.reasonCode}.`);
        addEvent("bad", `GovernanceEvaluator suspended legitimacy for ${expectedSlot}: ${staleDecision.reasonCode}.`);

        wait(REVIEW_MS, () => {
          const corrected = issueCommand({ trolleyId: "trolley4", bayId: confirmedSlot, sequence: `v${nextSequence}` });
          const correctedState = createLegitimacyState({
            command: corrected.command,
            recordId: corrected.recordId,
            expectedLocation: confirmedSlot,
            evidence,
            createdAt: "2026-08-26T18:30:09.000Z",
          });
          const correctedSignature = verifySignedCommand(corrected.command, corrected.signature, corrected.trace.agentAddress);
          const correctedDecision = evaluateLegitimacy({
            command: corrected.command,
            recordId: corrected.recordId,
            state: correctedState,
            evidence,
            policy: authorityPolicy,
            now: new Date("2026-08-26T18:30:10.000Z"),
          });
          const correctedReport = createGovernanceReport({
            command: corrected.command,
            recordId: corrected.recordId,
            signatureCheck: correctedSignature,
            legitimacyDecision: correctedDecision,
          });

          setActiveRun({
            command: corrected.command,
            recordId: corrected.recordId,
            legitimacyId: correctedState.legitimacyId,
            reportId: correctedReport.reportId,
            previousStatus: updated.status,
            trace: corrected.trace,
          });
          setStatus({
            signature: correctedSignature.valid ? "valid" : "failed",
            legitimacy: correctedDecision.decision,
            evidence: "sufficient",
            reasonCode: correctedDecision.reasonCode,
            message:
              correctedDecision.decision === "allowed"
                ? `PlannerBot found trolley4 at ${confirmedSlot}. RobotBot is rerouting under fresh legitimacy.`
                : correctedDecision.reason,
          });
          addEvent("ok", `PlannerBot issued corrected command for ${confirmedSlot}.`);
          addEvent("ok", `Governance report ${correctedReport.reportId}: ${correctedDecision.reasonCode}.`);

          if (correctedDecision.decision !== "allowed") {
            setPhase("denied");
            addEvent("bad", `Corrected command denied: ${correctedDecision.reasonCode}.`);
            return;
          }

          setPhase("replanning");
          moveRobotTo(confirmedSlot);
          wait(REROUTE_MS, () =>
            verifyArrivalAndComplete(corrected, correctedState, correctedSignature, confirmedSlot, nextSequence + 1),
          );
        });
      });
    };

    wait(ROBOT_TRAVEL_MS, () => verifyArrivalAndComplete(original, originalState, signatureCheck, "bay7", 2));
  }, [addEvent, canRun, clearTimers, moveRobotTo, moveTrolley, wait]);

  const floorStyle = useMemo(
    () => ({
      "--robot-x": `${robot.x}%`,
      "--robot-y": `${robot.y}%`,
    }),
    [robot],
  );

  const pointerToPercent = useCallback((event) => {
    const rect = floorRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(4, Math.min(94, x)), y: Math.max(8, Math.min(90, y)) };
  }, []);

  const beginDrag = useCallback(
    (event, trolley) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ id: trolley.id, ...pointerToPercent(event) });
    },
    [pointerToPercent],
  );

  const updateDrag = useCallback(
    (event) => {
      if (!drag) return;
      setDrag((current) => (current ? { ...current, ...pointerToPercent(event) } : current));
    },
    [drag, pointerToPercent],
  );

  const endDrag = useCallback(() => {
    if (!drag) return;
    const snapSlots =
      drag.id === "trolley4" && canDisrupt
        ? authorityPolicy.bays.map((bayId) => slots[bayId])
        : Object.values(slots);
    const nearest = snapSlots.reduce(
      (best, slot) => {
        const distance = Math.hypot(slot.x - drag.x, slot.y - drag.y);
        return distance < best.distance ? { slot, distance } : best;
      },
      { slot: slots.bay7, distance: Infinity },
    ).slot;
    moveTrolley(drag.id, nearest.id);
    if (drag.id === "trolley4" && canDisrupt) {
      const context =
        phase === "reviewing"
          ? `during legitimacy review for the signed ${activeTarget} command`
          : `while RobotBot was executing the signed ${activeTarget} command`;
      setStatus((current) => ({
        ...current,
        legitimacy: "pending",
        reasonCode: "reality.changed",
        message: `trolley4 was moved to ${nearest.id} ${context}.`,
      }));
      addEvent("warn", `Operator moved trolley4 to ${nearest.label} ${context}.`);
    } else {
      addEvent("info", `${drag.id} moved to ${nearest.label}.`);
    }
    setDrag(null);
  }, [activeTarget, addEvent, canDisrupt, drag, moveTrolley, phase]);

  return (
    <main className="app">
      <section className="toolbar" aria-label="Simulator controls">
        <div className="brand">
          <Factory size={24} aria-hidden="true" />
          <div>
            <h1>AgentEnvelope Factory</h1>
            <p>Manufacturing legitimacy simulator</p>
          </div>
        </div>
        <div className="actions">
          <button type="button" onClick={runSimulation} disabled={!canRun} title="Run signed factory operation">
            <Play size={18} aria-hidden="true" />
            Run
          </button>
          <button type="button" onClick={disruptFlow} disabled={!canDisrupt} title="Toggle trolley4 between allowed bays">
            <AlertTriangle size={18} aria-hidden="true" />
            Disrupt
          </button>
          <button type="button" onClick={reset} title="Reset simulator">
            <RotateCcw size={18} aria-hidden="true" />
            Reset
          </button>
        </div>
      </section>

      <section className="workspace">
        <div className="floor-wrap">
          <div
            className="factory-floor"
            ref={floorRef}
            style={floorStyle}
            onPointerMove={updateDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="floor-grid" aria-hidden="true" />
            {Object.values(slots).map((slot) => (
              <div
                key={slot.id}
                className={`slot ${slot.kind}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                {slot.kind === "truck" ? <Truck size={34} aria-hidden="true" /> : <span className="bay-number">{slot.label}</span>}
              </div>
            ))}

            <div className={`robot ${phase}`} style={{ left: "var(--robot-x)", top: "var(--robot-y)" }}>
              <div className="robot-head">R2</div>
              <div className="robot-arm" />
              {robot.carrying ? <div className="carry-label">{robot.carrying}</div> : null}
            </div>

            {canDisrupt ? <div className="disrupt-hint">Move trolley4 again</div> : null}

            {trolleys.map((trolley) => {
              const isDragging = drag?.id === trolley.id;
              const slot = slots[trolley.slot] ?? slots.bay1;
              const style = isDragging
                ? { left: `${drag.x}%`, top: `${drag.y}%` }
                : { left: `${slot.x}%`, top: `${slot.y + (trolley.background ? 9 : 0)}%` };
              return (
                <button
                  type="button"
                  key={trolley.id}
                  className={`trolley ${trolley.background ? "background" : ""} ${isDragging ? "dragging" : ""}`}
                  style={style}
                  onPointerDown={(event) => beginDrag(event, trolley)}
                  title={`Drag ${trolley.label}`}
                >
                  <span>{trolley.id}</span>
                  <small>{trolley.slot}</small>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="side-panel">
          <div className="status-panel">
            <div className="panel-heading">
              <Activity size={18} aria-hidden="true" />
              <h2>Operation State</h2>
            </div>
            <div className="checks">
              <Check label="Signature" value={status.signature} />
              <Check label="Legitimacy" value={status.legitimacy} />
              <Check label="Evidence" value={status.evidence} />
            </div>
            <div className="decision">
              <span>{status.reasonCode}</span>
              <p>{status.message}</p>
            </div>
          </div>

          <div className="status-panel compact">
            <div className="panel-heading">
              <CheckCircle2 size={18} aria-hidden="true" />
              <h2>Current Record</h2>
            </div>
            <dl>
              <div>
                <dt>Command</dt>
                <dd>
                  {activeRun
                    ? `${activeRun.command.robotId}.${activeRun.command.operation}(${activeRun.command.args.trolleyId}, ${activeRun.command.args.bayId})`
                    : "waiting"}
                </dd>
              </div>
              <div>
                <dt>Record</dt>
                <dd>{activeRun?.recordId ?? "not issued"}</dd>
              </div>
              <div>
                <dt>Index</dt>
                <dd>{activeRun?.trace?.actionIndex ?? "not derived"}</dd>
              </div>
              <div>
                <dt>Agent</dt>
                <dd>{activeRun?.trace?.agentAddress ?? "not derived"}</dd>
              </div>
              <div>
                <dt>Envelope</dt>
                <dd>{activeRun?.trace?.actionEnvelopeHash ?? "not derived"}</dd>
              </div>
              <div>
                <dt>Legitimacy</dt>
                <dd>{activeRun?.legitimacyId ?? "not created"}</dd>
              </div>
              <div>
                <dt>Report</dt>
                <dd>{activeRun?.reportId ?? "not emitted"}</dd>
              </div>
              <div>
                <dt>Event</dt>
                <dd>{activeRun?.eventId ?? "not patched"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{activeRun?.updatedStatus ?? activeRun?.previousStatus ?? "active"}</dd>
              </div>
              <div>
                <dt>Trolley4</dt>
                <dd>{trolley4?.slot ?? "unknown"}</dd>
              </div>
            </dl>
          </div>

          <div className="status-panel trace-panel">
            <div className="panel-heading">
              <KeyRound size={18} aria-hidden="true" />
              <h2>Authority Trace</h2>
            </div>
            <dl>
              <div>
                <dt>Path</dt>
                <dd>{activeRun?.trace?.path ?? "waiting"}</dd>
              </div>
              <div>
                <dt>Action Seed</dt>
                <dd>{activeRun?.trace?.actionSeedPreview ?? "not derived"}</dd>
              </div>
              <div>
                <dt>Custody</dt>
                <dd>{activeRun?.trace?.custody ?? "sovereign boundary"}</dd>
              </div>
            </dl>
            <pre>{activeRun?.trace?.canonicalActionEnvelope ?? "{ }"}</pre>
          </div>

          <div className="event-log">
            <h2>Factory Ledger</h2>
            <ol>
              {events.map((event, index) => (
                <li key={`${event.text}-${index}`} className={event.kind}>
                  {event.text}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Check({ label, value }) {
  return (
    <div className={`check ${value}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
