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
import {
  clearHostedConfig,
  hostedConfigStatus,
  hostedRoleSummaries,
  initialHostedConfig,
  publishHostedFactoryCommand,
  saveHostedConfig,
} from "../factoryHosted.js";

function useFactorySimulation() {
  const floorRef = useRef(null);
  const timersRef = useRef([]);
  const latestTrolleysRef = useRef(initialTrolleys);
  const hostedInFlightRef = useRef(new Set());
  const hostedResultsRef = useRef(new Map());
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
  const [consoleState, setConsoleState] = useState({
    hack: "$ hack-robot --target command\nwaiting for a signed command",
    portal: "AuthorityHead portal online\nno hosted action selected",
  });
  const [hostedConfig, setHostedConfig] = useState(() => initialHostedConfig());
  const [hostedStatus, setHostedStatus] = useState(() => ({
    ...hostedConfigStatus(initialHostedConfig()),
    recordUrl: "",
    ledgerUrl: "",
  }));
  const [hostedPublishing, setHostedPublishing] = useState(false);
  const hostedRoles = useMemo(() => hostedRoleSummaries(hostedConfig), [hostedConfig]);

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

  const currentTrolleySlot = useCallback(
    () => latestTrolleysRef.current.find((trolley) => trolley.id === "trolley4")?.slot ?? "unknown",
    [],
  );

  const reset = useCallback(() => {
    clearTimers();
    setTrolleys(initialTrolleys);
    setRobot(initialRobot);
    setPhase("ready");
    setDrag(null);
    setActiveRun(null);
    hostedInFlightRef.current.clear();
    hostedResultsRef.current.clear();
    setHostedPublishing(false);
    setHostedStatus({ ...hostedConfigStatus(hostedConfig), recordUrl: "", ledgerUrl: "" });
    setStatus({
      signature: "waiting",
      legitimacy: "waiting",
      evidence: "waiting",
      reasonCode: "ready",
      message: initialStatusMessage,
    });
    setEvents([{ kind: "info", text: "Factory reset. Press Run, then disrupt trolley4 before RobotBot reaches bay7." }]);
    setConsoleState({
      hack: "$ hack-robot --target command\nwaiting for a signed command",
      portal: "AuthorityHead portal online\nno hosted action selected",
    });
  }, [clearTimers, hostedConfig, setTrolleys]);

  const updateHostedConfig = useCallback((patch) => {
    setHostedConfig((current) => {
      const next = { ...current, ...patch };
      setHostedStatus({ ...hostedConfigStatus(next), recordUrl: "", ledgerUrl: "" });
      return next;
    });
  }, []);

  const saveHostedSession = useCallback(() => {
    saveHostedConfig(hostedConfig);
    setHostedStatus({ ...hostedConfigStatus(hostedConfig), recordUrl: "", ledgerUrl: "" });
    addEvent("info", "Hosted factory settings saved for this browser session.");
  }, [addEvent, hostedConfig]);

  const clearHostedSession = useCallback(() => {
    clearHostedConfig();
    const next = initialHostedConfig();
    setHostedConfig(next);
    setHostedStatus({ ...hostedConfigStatus(next), recordUrl: "", ledgerUrl: "" });
    addEvent("info", "Hosted factory session settings cleared.");
  }, [addEvent]);

  const publishHostedCommand = useCallback(async (command, { manual = false } = {}) => {
    const readiness = hostedConfigStatus(hostedConfig);
    if (!readiness.ready) {
      if (manual) {
        setHostedStatus({ ...readiness, recordUrl: "", ledgerUrl: "" });
        addEvent("warn", readiness.message);
      }
      return;
    }
    if (!command) {
      if (manual) {
        setHostedStatus({
          ready: false,
          label: "waiting",
          message: "Run or reroute a signed factory command before publishing hosted evidence.",
          recordUrl: "",
          ledgerUrl: "",
        });
        addEvent("warn", "Hosted publish requested before a factory command existed.");
      }
      return;
    }

    const commandKey = command.commandId;
    const existingRecords = hostedResultsRef.current.get(commandKey) ?? [];
    if (!manual && (existingRecords.length >= hostedRoles.length || hostedInFlightRef.current.has(commandKey))) {
      return;
    }

    hostedInFlightRef.current.add(commandKey);
    setHostedPublishing(true);
    setHostedStatus({
      ready: true,
      label: "publishing",
      message: manual
        ? "Minting, registering, and verifying the current factory command..."
        : "Auto-publishing the hosted authority trail for this command...",
      recordUrl: "",
      ledgerUrl: "",
    });

    try {
      const result = await publishHostedFactoryCommand(hostedConfig, command, { existingRecords });
      const primary = result.records.find((item) => item.roleId === "robot") ?? result.records[0];
      const allValid = result.records.every((item) => item.report.valid);
      hostedResultsRef.current.set(commandKey, result.records);
      setActiveRun((current) => current?.command?.commandId === commandKey
        ? {
          ...current,
          hostedRecordId: primary?.record.recordId,
          hostedReportValid: allValid,
          hostedRecords: result.records.map((item) => ({
            role: item.roleLabel,
            recordId: item.record.recordId,
            valid: item.report.valid,
          })),
        }
        : current);
      setHostedStatus({
        ready: true,
        label: allValid ? "published" : "registered",
        message: allValid
          ? `Hosted authority trail published: ${result.records.length} role records registered and verified.`
          : `Hosted authority trail registered; at least one role verify returned invalid.`,
        recordUrl: result.links.record,
        ledgerUrl: result.links.ledger,
      });
      setConsoleState((current) => ({
        ...current,
        portal: [
          "AuthorityHead hosted publish",
          ...result.records.map((item) => `${item.roleLabel}: ${item.record.recordId} / ${item.report.valid ? "valid" : "invalid"}`),
        ].join("\n"),
      }));
      result.records.forEach((item) => {
        addEvent("ok", `${item.roleLabel} hosted record registered: ${item.record.recordId}.`);
        addEvent(item.report.valid ? "ok" : "warn", `${item.roleLabel} hosted verification ${item.report.valid ? "accepted" : "returned invalid"}.`);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hosted publish failed.";
      const partialRecords = Array.isArray(err?.records) ? err.records : [];
      if (partialRecords.length > 0) {
        hostedResultsRef.current.set(commandKey, partialRecords);
        const primary = partialRecords.find((item) => item.roleId === "robot") ?? partialRecords[0];
        setActiveRun((current) => current?.command?.commandId === commandKey
          ? {
            ...current,
            hostedRecordId: primary?.record.recordId,
            hostedReportValid: false,
            hostedRecords: partialRecords.map((item) => ({
              role: item.roleLabel,
              recordId: item.record.recordId,
              valid: item.report.valid,
            })),
          }
          : current);
      }
      setHostedStatus({ ready: false, label: "failed", message, recordUrl: "", ledgerUrl: "" });
      setConsoleState((current) => ({
        ...current,
        portal: [
          "AuthorityHead hosted publish",
          partialRecords.length > 0 ? `partial: ${partialRecords.length} role records registered` : "",
          `failed: ${message}`,
        ].filter(Boolean).join("\n"),
      }));
      addEvent("bad", `Hosted publish failed: ${message}`);
    } finally {
      hostedInFlightRef.current.delete(commandKey);
      setHostedPublishing(hostedInFlightRef.current.size > 0);
    }
  }, [addEvent, hostedConfig, hostedRoles.length]);

  const publishHostedCurrent = useCallback(async () => {
    await publishHostedCommand(activeRun?.command, { manual: true });
  }, [activeRun?.command, publishHostedCommand]);

  const recoverWithFreshCommand = useCallback(
    (source) => {
      const confirmedSlot = currentTrolleySlot();
      if (!activeRun || !authorityPolicy.bays.includes(confirmedSlot)) {
        setStatus((current) => ({
          ...current,
          reasonCode: "repair.no_admissible_target",
          message: "No active bay target can be repaired. Start or reset the signed run first.",
        }));
        addEvent("warn", "State repair was requested, but no active admissible bay target was available.");
        return;
      }

      clearTimers();
      const corrected = issueCommand({ trolleyId: "trolley4", bayId: confirmedSlot, sequence: "v9" });
      const evidence = createIndependentLocationEvidence(confirmedSlot, 20);
      const correctedState = createLegitimacyState({
        command: corrected.command,
        recordId: corrected.recordId,
        expectedLocation: confirmedSlot,
        evidence,
        createdAt: "2026-08-26T18:30:20.000Z",
      });
      const correctedSignature = verifySignedCommand(corrected.command, corrected.signature, corrected.trace.agentAddress);
      const correctedDecision = evaluateLegitimacy({
        command: corrected.command,
        recordId: corrected.recordId,
        state: correctedState,
        evidence,
        policy: authorityPolicy,
        now: new Date("2026-08-26T18:30:21.000Z"),
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
        previousStatus: status.reasonCode,
        trace: corrected.trace,
      });
      void publishHostedCommand(corrected.command);
      setConsoleState((current) => ({
        ...current,
        hack: `${current.hack}\n\n$ authority repair --reissue-clean\nold command discarded\nfresh signed command: ${confirmedSlot}`,
        portal: "AuthorityHead /repair-state\nfresh legitimacy state created\nexecution may continue",
      }));
      setStatus({
        signature: correctedSignature.valid ? "valid" : "failed",
        legitimacy: correctedDecision.decision,
        evidence: "sufficient",
        reasonCode: correctedDecision.reasonCode,
        message:
          correctedDecision.decision === "allowed"
            ? `${source} discarded the bad state and issued a fresh signed command for ${confirmedSlot}. RobotBot continues under new authority.`
            : correctedDecision.reason,
      });
      addEvent("ok", `${source} fixed the state by discarding the bad command and issuing fresh authority for ${confirmedSlot}.`);
      addEvent("ok", `Governance report ${correctedReport.reportId}: ${correctedDecision.reasonCode}.`);

      if (correctedDecision.decision !== "allowed") {
        setPhase("denied");
        addEvent("bad", `State repair denied: ${correctedDecision.reasonCode}.`);
        return;
      }

      setPhase("replanning");
      moveRobotTo(confirmedSlot);
      wait(REROUTE_MS, () => {
        moveRobotTo("truck", "trolley4");
        setPhase("complete");
        setStatus({
          signature: "valid",
          legitimacy: "allowed",
          evidence: "sufficient",
          reasonCode: "state.current",
          message: `Fresh command completed at ${confirmedSlot}; trolley4 loaded into the truck.`,
        });
        addEvent("ok", `RobotBot continued under the repaired state and loaded trolley4 from ${confirmedSlot}.`);
        wait(LOAD_MS, () => moveTrolley("trolley4", "truck"));
      });
    },
    [activeRun, addEvent, clearTimers, currentTrolleySlot, moveRobotTo, moveTrolley, publishHostedCommand, status.reasonCode, wait],
  );

  const runHackAttempt = useCallback(
    (kind) => {
      if (kind === "recover") {
        recoverWithFreshCommand("PlannerBot");
        return;
      }

      clearTimers();
      if (!activeRun) {
        setPhase("denied");
        setStatus({
          signature: "waiting",
          legitimacy: "denied",
          evidence: "waiting",
          reasonCode: "crypto.no_command",
          message: "Hack console tried to alter a robot command before any signed command existed.",
        });
        setConsoleState((current) => ({
          ...current,
          hack: "$ hack-robot --tamper-command\nblocked: no signed command exists yet",
        }));
        addEvent("warn", "Hack console tried to alter a command before DispatchAuthority issued one.");
        return;
      }

      if (kind === "tamper-target") {
        setPhase("denied");
        setStatus({
          signature: "failed",
          legitimacy: "denied",
          evidence: "waiting",
          reasonCode: "crypto.signature_mismatch",
          message: "Hack console changed the target bay after signing. The recovered signer no longer matches the signed command.",
        });
        setConsoleState((current) => ({
          ...current,
          hack: `$ hack-robot --set bay=bay1\nverifyAction: failed\nreason: command bytes changed after signature`,
        }));
        addEvent("bad", "Hack console changed bayId after signing; cryptographic verification rejected the command.");
        return;
      }

      if (kind === "scope-escalation") {
        setPhase("denied");
        setStatus({
          signature: "failed",
          legitimacy: "denied",
          evidence: "waiting",
          reasonCode: "envelope.operation_mismatch",
          message: "Hack console changed pickUp into an out-of-envelope operation. The action envelope does not authorize that command.",
        });
        setConsoleState((current) => ({
          ...current,
          hack: "$ hack-robot --operation unlock-door\nverifyRecord: failed\nreason: operation outside canonical envelope",
        }));
        addEvent("bad", "Scope escalation attempt rejected: the signed action envelope only authorizes pickUp.");
        return;
      }

      setPhase("denied");
      setStatus({
        signature: "valid",
        legitimacy: "denied",
        evidence: "sufficient",
        reasonCode: "replay.max_uses_exhausted",
        message: "Replay used an old valid signature, but governed state says the one-use command was already consumed.",
      });
      setConsoleState((current) => ({
        ...current,
        hack: "$ hack-robot --replay old-command\nsignature: valid\nexecution: denied by maxUses and ledger state",
      }));
      addEvent("bad", "Replay attempt kept a valid signature but was denied by maxUses and governed ledger state.");
    },
    [activeRun, addEvent, clearTimers, recoverWithFreshCommand],
  );

  const runPortalAction = useCallback(
    (kind) => {
      if (kind === "repair") {
        recoverWithFreshCommand("AuthorityHead");
        return;
      }

      if (kind === "verify") {
        setStatus({
          signature: activeRun ? "valid" : "waiting",
          legitimacy: activeRun ? "pending" : "waiting",
          evidence: activeRun ? "sufficient" : "waiting",
          reasonCode: activeRun ? "portal.verify_report" : "portal.no_command",
          message: activeRun
            ? "AuthorityHead verified the signed command and envelope while RobotBot continues the current run."
            : "AuthorityHead is online, but no signed command is available to verify yet.",
        });
        setConsoleState((current) => ({
          ...current,
          portal: "AuthorityHead /verify\nsignature + envelope + legitimacy checked",
        }));
        addEvent("ok", "AuthorityHead web portal ran a hosted verify report for the current command.");
        return;
      }

      if (kind === "suspend") {
        clearTimers();
        setPhase("denied");
        setStatus((current) => ({
          ...current,
          legitimacy: "denied",
          reasonCode: "portal.legitimacy_suspended",
          message: "AuthorityHead suspended legitimacy from the web portal. The signature may verify, but execution is no longer admissible.",
        }));
        setConsoleState((current) => ({
          ...current,
          portal: "AuthorityHead /legitimacy\nstatus: suspended\nexecution: denied until restored",
        }));
        addEvent("bad", "AuthorityHead web portal suspended the command legitimacy state.");
        return;
      }

      setStatus((current) => ({
        ...current,
        evidence: "checking",
        reasonCode: "portal.evidence_refresh",
        message: "AuthorityHead requested fresh independent evidence without stopping RobotBot; only a failed authority check blocks execution.",
      }));
      setConsoleState((current) => ({
        ...current,
        portal: "AuthorityHead /evidence\nrequest: WarehouseFeed + DockSafetyController refresh",
      }));
      addEvent("warn", "AuthorityHead requested fresh independent evidence from trusted sources.");
    },
    [activeRun, addEvent, clearTimers, recoverWithFreshCommand],
  );

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

  const rerouteKnownDisruption = useCallback(() => {
    moveTrolley("trolley4", disruptionSlot);

    if (!activeRun || !["moving", "reviewing", "replanning"].includes(phase) || robot.carrying) {
      setStatus((current) => ({
        ...current,
        reasonCode: "disruption.logged",
        message: `trolley4 staged at ${slots[disruptionSlot].label}. The disruption is logged, but no active run needs rerouting.`,
      }));
      addEvent("info", `Known disruption logged: trolley4 moved to ${slots[disruptionSlot].label}.`);
      return;
    }

    clearTimers();
    const corrected = issueCommand({ trolleyId: "trolley4", bayId: disruptionSlot, sequence: "v3" });
    const evidence = createIndependentLocationEvidence(disruptionSlot, 12);
    const correctedState = createLegitimacyState({
      command: corrected.command,
      recordId: corrected.recordId,
      expectedLocation: disruptionSlot,
      evidence,
      createdAt: "2026-08-26T18:30:12.000Z",
    });
    const correctedSignature = verifySignedCommand(corrected.command, corrected.signature, corrected.trace.agentAddress);
    const correctedDecision = evaluateLegitimacy({
      command: corrected.command,
      recordId: corrected.recordId,
      state: correctedState,
      evidence,
      policy: authorityPolicy,
      now: new Date("2026-08-26T18:30:13.000Z"),
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
      trace: corrected.trace,
    });
    void publishHostedCommand(corrected.command);
    setStatus({
      signature: correctedSignature.valid ? "valid" : "failed",
      legitimacy: correctedDecision.decision,
      evidence: "sufficient",
      reasonCode: correctedDecision.reasonCode,
      message:
        correctedDecision.decision === "allowed"
          ? `Known disruption rerouted trolley4 to ${disruptionSlot}; RobotBot keeps moving under a fresh scoped command.`
          : correctedDecision.reason,
    });
    addEvent("warn", `Known disruption: trolley4 moved to ${slots[disruptionSlot].label}; authority issued a fresh scoped command.`);
    addEvent("ok", `DispatchAuthority signed the reroute command for ${disruptionSlot}.`);

    if (correctedDecision.decision !== "allowed") {
      setPhase("denied");
      addEvent("bad", `Reroute denied: ${correctedDecision.reasonCode}.`);
      return;
    }

    setPhase("replanning");
    moveRobotTo(disruptionSlot);
    wait(REROUTE_MS, () => {
      moveRobotTo("truck", "trolley4");
      setPhase("complete");
      setStatus({
        signature: "valid",
        legitimacy: "allowed",
        evidence: "sufficient",
        reasonCode: "state.current",
        message: `Reroute completed at ${disruptionSlot}; trolley4 loaded into the truck.`,
      });
      addEvent("ok", `RobotBot rerouted to ${disruptionSlot} and loaded trolley4 without a stop-the-line fault.`);
      wait(LOAD_MS, () => moveTrolley("trolley4", "truck"));
    });
  }, [activeRun, addEvent, clearTimers, disruptionSlot, moveRobotTo, moveTrolley, phase, publishHostedCommand, robot.carrying, wait]);

  const runScenarioBug = useCallback(
    (kind) => {
      const runInMotion = Boolean(activeRun && ["moving", "reviewing", "replanning"].includes(phase) && !robot.carrying);

      if (kind === "stale-evidence") {
        setStatus((current) => ({
          ...current,
          signature: runInMotion ? current.signature : "waiting",
          legitimacy: runInMotion ? "pending" : current.legitimacy,
          evidence: runInMotion ? "checking" : "waiting",
          reasonCode: runInMotion ? "disruption.stale_evidence" : "disruption.logged",
          message: runInMotion
            ? "A stale sensor packet was quarantined and fresh evidence was requested. RobotBot keeps moving under the signed command."
            : "A stale sensor packet was logged. No active signed command is affected.",
        }));
        addEvent("warn", "Known disruption: stale sensor evidence was quarantined; the current run continues while fresh evidence is requested.");
        return;
      }

      if (kind === "sensor-conflict") {
        setStatus((current) => ({
          ...current,
          signature: runInMotion ? current.signature : "waiting",
          legitimacy: runInMotion ? "pending" : current.legitimacy,
          evidence: runInMotion ? "checking" : "waiting",
          reasonCode: runInMotion ? "disruption.sensor_conflict" : "disruption.logged",
          message: runInMotion
            ? "Conflicting sensor reports were isolated for review. RobotBot is not stopped by noisy evidence alone."
            : "Conflicting sensor reports were logged. No active signed command is affected.",
        }));
        addEvent("warn", "Known disruption: conflicting sensor reports were isolated for review; execution is not blocked by noise alone.");
        return;
      }

      rerouteKnownDisruption();
    },
    [activeRun, addEvent, phase, rerouteKnownDisruption, robot.carrying],
  );

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
    void publishHostedCommand(original.command);
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
          void publishHostedCommand(corrected.command);
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
          addEvent("ok", `PlannerBot selected ${confirmedSlot}; DispatchAuthority signed the corrected command.`);
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
  }, [addEvent, canRun, clearTimers, currentTrolleySlot, moveRobotTo, moveTrolley, publishHostedCommand, wait]);

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
      consoleState,
      events,
      hosted: {
        config: hostedConfig,
        onChange: updateHostedConfig,
        onClear: clearHostedSession,
        onPublish: publishHostedCurrent,
        onSave: saveHostedSession,
        publishing: hostedPublishing,
        roles: hostedRoles,
        status: hostedStatus,
      },
      onHackAttempt: runHackAttempt,
      onPortalAction: runPortalAction,
      onScenarioBug: runScenarioBug,
      phase,
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
