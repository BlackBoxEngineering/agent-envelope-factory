import { hexToBytes, seedAddress } from "agent-envelope-sdk";
import { createDomainInfo, projectDomainKey } from "agent-envelope-sdk/avatar";

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

export {
  actors,
  authorityPolicy,
  domainSummary,
  factoryIdentityRoot,
  initialRobot,
  initialStatusMessage,
  initialTrolleys,
  LOAD_MS,
  movableBayCycle,
  REROUTE_MS,
  REVIEW_MS,
  ROBOT_TRAVEL_MS,
  slots,
};
