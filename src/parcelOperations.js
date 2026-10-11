import { hexToBytes, signAction } from "agent-envelope-sdk";
import {
  buildActionEnvelope,
  createPublicActionRecord,
  deriveAgentActionCapability,
} from "agent-envelope-sdk/avatar";
import {
  assessEvidenceIndependence,
  createEvidenceStatement,
  createGovernanceReport,
  verifySignedCommand,
} from "./factoryAuthority.js";
import {
  actors,
  domainSummary,
  factoryIdentityRoot,
} from "./factoryConfig.js";

const SHIFT_EPOCH = Date.parse("2026-08-26T19:00:00.000Z");

const parcelTypes = Object.freeze({
  standard: Object.freeze({
    id: "standard",
    label: "Standard",
    shortLabel: "STD",
    destination: "standard-sort",
    destinationLabel: "Main sort",
    deadlineSeconds: 150,
    priorityWeight: 1,
    colour: "cyan",
  }),
  express: Object.freeze({
    id: "express",
    label: "Express",
    shortLabel: "EXP",
    destination: "express-dispatch",
    destinationLabel: "Priority dispatch",
    deadlineSeconds: 60,
    priorityWeight: 3,
    colour: "gold",
  }),
  special: Object.freeze({
    id: "special",
    label: "Special handling",
    shortLabel: "SPC",
    destination: "manual-inspection",
    destinationLabel: "Manual inspection",
    deadlineSeconds: 110,
    priorityWeight: 2,
    colour: "violet",
  }),
});

const parcelPoints = Object.freeze({
  "inbound-a": Object.freeze({ id: "inbound-a", label: "Inbound A", x: 10, y: 28, kind: "inbound" }),
  "inbound-b": Object.freeze({ id: "inbound-b", label: "Inbound B", x: 10, y: 72, kind: "inbound" }),
  "standard-sort": Object.freeze({ id: "standard-sort", label: "Main sort", x: 88, y: 20, kind: "destination" }),
  "express-dispatch": Object.freeze({ id: "express-dispatch", label: "Priority dispatch", x: 88, y: 50, kind: "destination" }),
  "manual-inspection": Object.freeze({ id: "manual-inspection", label: "Manual inspection", x: 88, y: 80, kind: "destination" }),
  standby: Object.freeze({ id: "standby", label: "Robot standby", x: 48, y: 50, kind: "standby" }),
});

const parcelAuthorityPolicy = Object.freeze({
  policyId: "parcel-routing-v1",
  operations: Object.freeze(["routeTrolley"]),
  destinations: Object.freeze(Object.values(parcelTypes).map((type) => type.destination)),
  renewal: Object.freeze({
    executingActorId: actors.RobotBot.actorId,
    minIndependentSources: 2,
    trustedEvidenceSources: Object.freeze([
      actors.WarehouseFeed.actorId,
      actors.DockSafetyController.actorId,
    ]),
  }),
});

function nextRandom(seed) {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 4294967296 };
}

function pointDistance(from, to) {
  return Math.round((Math.abs(from.x - to.x) + Math.abs(from.y - to.y)) / 5);
}

function routeDistance(robotPoint, trolley) {
  const source = parcelPoints[trolley.source];
  const destination = parcelPoints[parcelTypes[trolley.type].destination];
  return pointDistance(robotPoint, source) + pointDistance(source, destination);
}

function evaluateCandidate(trolley, robotPoint, simSeconds) {
  const type = parcelTypes[trolley.type];
  const waitedSeconds = Math.max(0, simSeconds - trolley.arrivedAt);
  const remainingSeconds = type.deadlineSeconds - waitedSeconds;
  const distance = routeDistance(robotPoint, trolley);
  const deadlinePressure = Math.max(0, 1 - remainingSeconds / type.deadlineSeconds);
  const overdueBoost = remainingSeconds <= 0 ? 180 : 0;
  const score = Math.round(
    type.priorityWeight * 45 +
      deadlinePressure * 130 +
      waitedSeconds * 0.8 +
      overdueBoost -
      distance * 2.2,
  );
  return { trolley, type, waitedSeconds, remainingSeconds, distance, score };
}

function rankCandidates(queue, robotPoint, simSeconds) {
  return queue
    .map((trolley) => evaluateCandidate(trolley, robotPoint, simSeconds))
    .sort((left, right) => right.score - left.score || left.trolley.arrivedAt - right.trolley.arrivedAt);
}

function isoAt(simSeconds) {
  return new Date(SHIFT_EPOCH + simSeconds * 1000).toISOString();
}

function actionSeedPreview(actionSeedHex) {
  return `${actionSeedHex.slice(0, 14)}...${actionSeedHex.slice(-10)}`;
}

function createRoutingEvidence(trolley, simSeconds) {
  const observedAt = isoAt(simSeconds);
  return [actors.WarehouseFeed, actors.DockSafetyController].map((producer) =>
    createEvidenceStatement({
      producer,
      subject: trolley.id,
      claims: [
        { name: "location", value: trolley.source },
        { name: "parcelType", value: trolley.type },
        { name: "available", value: true },
      ],
      observedAt,
      evidenceKind: "factory-state",
    }),
  );
}

function issueParcelMove({ trolley, sequence, simSeconds, ranking }) {
  const type = parcelTypes[trolley.type];
  const source = parcelPoints[trolley.source];
  const destination = parcelPoints[type.destination];
  const issuedAt = isoAt(simSeconds);
  const actionEnvelope = buildActionEnvelope(domainSummary, {
    agentId: "robot2",
    actionIndex: sequence,
    operation: "routeTrolley",
    resources: [
      `trolley:${trolley.id}`,
      `source:${source.id}`,
      `destination:${destination.id}`,
      `parcel-type:${type.id}`,
    ],
    notBefore: SHIFT_EPOCH + simSeconds * 1000,
    notAfter: SHIFT_EPOCH + (simSeconds + 90) * 1000,
    decayMode: "BOTH",
    maxUses: 1,
  });
  const capability = deriveAgentActionCapability(
    factoryIdentityRoot,
    domainSummary,
    actionEnvelope,
    new Date(issuedAt),
  );
  const publicRecord = createPublicActionRecord(capability, {
    ownerUserId: "demo-parcel-operator",
    createdAt: new Date(issuedAt),
  });
  const command = {
    type: "agentenvelope.parcelRoutingCommand",
    version: 1,
    commandId: `parcel-command-${String(sequence).padStart(4, "0")}`,
    correlationId: `parcel-attempt-${String(sequence).padStart(4, "0")}`,
    robotId: "robot2",
    operation: "routeTrolley",
    args: {
      trolleyId: trolley.id,
      bayId: source.id,
      destinationId: destination.id,
      parcelType: type.id,
    },
    issuedBy: actors.DispatchAuthority.actorId,
    publicActionRecordId: publicRecord.recordId,
    actionEnvelopeHash: capability.actionEnvelopeHash,
    issuedAt,
  };
  const actionSeed = hexToBytes(`0x${capability.actionSeedHex}`);
  let signature;
  try {
    signature = signAction(actionSeed, command);
  } finally {
    actionSeed.fill(0);
  }
  const signatureCheck = verifySignedCommand(command, signature, capability.agentAddress);
  const evidence = createRoutingEvidence(trolley, simSeconds);
  const independence = assessEvidenceIndependence(evidence, parcelAuthorityPolicy);
  const destinationAllowed = type.destination === destination.id && parcelAuthorityPolicy.destinations.includes(destination.id);
  const decision = {
    decision: signatureCheck.valid && independence.ok && destinationAllowed ? "allowed" : "denied",
    reasonCode: signatureCheck.valid && independence.ok && destinationAllowed
      ? "route.current"
      : !signatureCheck.valid
        ? "signature.invalid"
        : !independence.ok
          ? independence.reasonCode
          : "destination.invalid",
    reason: signatureCheck.valid && independence.ok && destinationAllowed
      ? "signed route matches the independently observed trolley class and required destination"
      : "the proposed route did not satisfy the parcel-routing boundary",
    checkedAt: issuedAt,
    evidenceIds: evidence.map((statement) => statement.evidenceId),
  };
  const governanceReport = createGovernanceReport({
    command,
    recordId: publicRecord.recordId,
    signatureCheck,
    legitimacyDecision: decision,
  });
  const trace = {
    path: "identityRoot -> domainSeed -> actionEnvelope -> actionSeed -> agentAddress",
    custody: "derived for this route and zeroed after signing; hosted governance never receives actionSeedHex",
    actionIndex: sequence,
    agentAddress: capability.agentAddress,
    actionSeedPreview: actionSeedPreview(capability.actionSeedHex),
    actionEnvelopeHash: capability.actionEnvelopeHash,
    canonicalActionEnvelope: capability.canonicalActionEnvelope,
  };

  return {
    command,
    signature,
    signatureValid: signatureCheck.valid,
    evidence,
    independentSources: independence.independentSources,
    decision,
    governanceReport,
    publicRecord,
    trace,
    capability: {
      agentAddress: capability.agentAddress,
      actionEnvelopeHash: capability.actionEnvelopeHash,
    },
    planner: {
      selectedScore: ranking.score,
      distance: ranking.distance,
      waitedSeconds: ranking.waitedSeconds,
      remainingSeconds: ranking.remainingSeconds,
    },
  };
}

function arrivalFromState(state, forcedType) {
  const first = nextRandom(state.randomSeed);
  const second = nextRandom(first.seed);
  const third = nextRandom(second.seed);
  const type = forcedType ?? (first.value < 0.5 ? "standard" : first.value < 0.76 ? "special" : "express");
  const source = second.value < 0.5 ? "inbound-a" : "inbound-b";
  const trolley = {
    id: `trolley-${String(state.nextTrolleyId).padStart(3, "0")}`,
    type,
    source,
    arrivedAt: state.simSeconds,
  };
  return {
    trolley,
    randomSeed: third.seed,
    nextArrivalAt: state.simSeconds + 10 + Math.floor(third.value * 13),
  };
}

function initialParcelOperationsState(seed = 260826) {
  return {
    seed,
    randomSeed: seed,
    running: false,
    speed: 2,
    simSeconds: 0,
    nextArrivalAt: 12,
    nextTrolleyId: 4,
    nextSequence: 1,
    robotPoint: parcelPoints.standby,
    queue: [
      { id: "trolley-001", type: "standard", source: "inbound-a", arrivedAt: 0 },
      { id: "trolley-002", type: "special", source: "inbound-b", arrivedAt: 0 },
      { id: "trolley-003", type: "express", source: "inbound-a", arrivedAt: 0 },
    ],
    active: null,
    completed: [],
    decisions: [],
    arrivals: 3,
    admitted: 0,
    totalDistance: 0,
    onTime: 0,
    rejected: 0,
  };
}

function scheduleNext(state) {
  if (state.active || state.queue.length === 0) return state;
  const ranking = rankCandidates(state.queue, state.robotPoint, state.simSeconds)[0];
  const authority = issueParcelMove({
    trolley: ranking.trolley,
    sequence: state.nextSequence,
    simSeconds: state.simSeconds,
    ranking,
  });
  const duration = Math.max(16, ranking.distance * 1.35);
  const active = {
    trolley: ranking.trolley,
    authority,
    source: parcelPoints[ranking.trolley.source],
    destination: parcelPoints[ranking.type.destination],
    startedAt: state.simSeconds,
    duration,
    progress: 0,
  };
  const decision = {
    sequence: state.nextSequence,
    trolley: ranking.trolley,
    type: ranking.type,
    selectedAt: state.simSeconds,
    status: authority.decision.decision === "allowed" ? "admitted" : "rejected",
    recordId: authority.publicRecord.recordId,
    reason: authority.decision.reason,
    score: ranking.score,
    distance: ranking.distance,
    proof: {
      commandId: authority.command.commandId,
      correlationId: authority.command.correlationId,
      recordId: authority.publicRecord.recordId,
      actionEnvelopeHash: authority.capability.actionEnvelopeHash,
      policyId: parcelAuthorityPolicy.policyId,
      evidenceIds: authority.evidence.map((statement) => statement.evidenceId),
      independentSources: authority.independentSources,
      governanceReportId: authority.governanceReport.reportId,
    },
  };
  return {
    ...state,
    active: authority.decision.decision === "allowed" ? active : null,
    queue: state.queue.filter((trolley) => trolley.id !== ranking.trolley.id),
    decisions: [decision, ...state.decisions].slice(0, 24),
    nextSequence: state.nextSequence + 1,
    admitted: state.admitted + (authority.decision.decision === "allowed" ? 1 : 0),
    rejected: state.rejected + (authority.decision.decision === "allowed" ? 0 : 1),
  };
}

function tickParcelOperations(state) {
  if (!state.running) return state;
  let next = { ...state, simSeconds: state.simSeconds + state.speed };

  if (next.simSeconds >= next.nextArrivalAt) {
    const arrival = arrivalFromState(next);
    next = {
      ...next,
      randomSeed: arrival.randomSeed,
      nextArrivalAt: arrival.nextArrivalAt,
      nextTrolleyId: next.nextTrolleyId + 1,
      arrivals: next.arrivals + 1,
      queue: [...next.queue, arrival.trolley],
    };
  }

  if (next.active) {
    const elapsed = next.simSeconds - next.active.startedAt;
    const progress = Math.min(1, elapsed / next.active.duration);
    if (progress >= 1) {
      const finished = {
        ...next.active,
        progress: 1,
        completedAt: next.simSeconds,
        onTime: next.simSeconds - next.active.trolley.arrivedAt <= parcelTypes[next.active.trolley.type].deadlineSeconds,
      };
      next = {
        ...next,
        active: null,
        completed: [finished, ...next.completed].slice(0, 40),
        robotPoint: next.active.destination,
        totalDistance: next.totalDistance + next.active.authority.planner.distance,
        onTime: next.onTime + (finished.onTime ? 1 : 0),
      };
    } else {
      next = { ...next, active: { ...next.active, progress } };
    }
  }

  return scheduleNext(next);
}

function parcelOperationsReducer(state, action) {
  if (action.type === "START") return scheduleNext({ ...state, running: true });
  if (action.type === "PAUSE") return { ...state, running: false };
  if (action.type === "SET_SPEED") return { ...state, speed: action.speed };
  if (action.type === "RESET") return initialParcelOperationsState(state.seed);
  if (action.type === "INJECT_EXPRESS") {
    const arrival = arrivalFromState(state, "express");
    const injected = {
      ...state,
      randomSeed: arrival.randomSeed,
      nextTrolleyId: state.nextTrolleyId + 1,
      arrivals: state.arrivals + 1,
      queue: [...state.queue, { ...arrival.trolley, source: action.source ?? arrival.trolley.source }],
    };
    return state.running ? scheduleNext(injected) : injected;
  }
  if (action.type === "TICK") return tickParcelOperations(state);
  return state;
}

function interpolateRoute(active, fallback) {
  if (!active) return fallback;
  const pickupShare = 0.42;
  if (active.progress <= pickupShare) {
    const amount = active.progress / pickupShare;
    return {
      x: fallback.x + (active.source.x - fallback.x) * amount,
      y: fallback.y + (active.source.y - fallback.y) * amount,
      carrying: false,
    };
  }
  const amount = (active.progress - pickupShare) / (1 - pickupShare);
  return {
    x: active.source.x + (active.destination.x - active.source.x) * amount,
    y: active.source.y + (active.destination.y - active.source.y) * amount,
    carrying: true,
  };
}

export {
  initialParcelOperationsState,
  interpolateRoute,
  parcelAuthorityPolicy,
  parcelOperationsReducer,
  parcelPoints,
  parcelTypes,
  rankCandidates,
};
