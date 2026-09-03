import { useCallback, useMemo, useRef, useState } from "react";
import {
  actors,
  authorityPolicy,
  initialRobot,
  initialStatusMessage,
  initialTrolleys,
  LOAD_MS,
  movableBayCycle,
  REROUTE_MS,
  REVIEW_MS,
  ROBOT_TRAVEL_MS,
  slots,
} from "../factoryConfig.js";
import {
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
} from "../factoryAuthority.js";

function useFactorySimulation() {
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

  const moveTrolley = useCallback(
    (id, slotId) => {
      setTrolleys((current) =>
        current.map((trolley) => (trolley.id === id ? { ...trolley, slot: slotId } : trolley)),
      );
    },
    [setTrolleys],
  );

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

  return {
    floorProps: {
      canDisrupt,
      drag,
      floorRef,
      floorStyle,
      onPointerCancel: endDrag,
      onPointerMove: updateDrag,
      onPointerUp: endDrag,
      onTrolleyPointerDown: beginDrag,
      phase,
      robot,
      slots,
      trolleys,
    },
    sidePanelProps: {
      activeRun,
      events,
      status,
      trolley4Slot: trolley4?.slot,
    },
    toolbarProps: {
      canDisrupt,
      canRun,
      onDisrupt: disruptFlow,
      onReset: reset,
      onRun: runSimulation,
    },
  };
}

export default useFactorySimulation;
