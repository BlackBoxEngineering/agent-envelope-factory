import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Bot,
  Boxes,
  Activity,
  ClipboardCheck,
  Clock3,
  Gauge,
  MapPin,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  Route as RouteIcon,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from "lucide-react";
import {
  initialParcelOperationsState,
  interpolateRoute,
  parcelOperationsReducer,
  parcelPoints,
  parcelTypes,
  rankCandidates,
} from "../parcelOperations.js";
import {
  clearHostedConfig,
  hostedCommandStatus,
  hostedRoleSummaries,
  initialHostedConfig,
  publishHostedFactoryCommand,
  saveHostedConfig,
} from "../factoryHosted.js";
import { AuthorityTracePanel, HostedRecordsPanel } from "./SidePanel.jsx";

const ROUTING_SCOPE_PROBE = Object.freeze({
  commandId: "parcel-routing-scope-probe",
  operation: "routeTrolley",
  args: Object.freeze({
    trolleyId: "scope-probe",
    bayId: "inbound-a",
    destinationId: "standard-sort",
  }),
});

function useParcelHostedPublishing() {
  const [config, setConfig] = useState(initialHostedConfig);
  const [status, setStatus] = useState(() => hostedCommandStatus(initialHostedConfig(), ROUTING_SCOPE_PROBE));
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState({});
  const inFlight = useRef(new Set());
  const completed = useRef(new Map());
  const roles = useMemo(() => hostedRoleSummaries(config), [config]);

  const refreshStatus = useCallback((nextConfig) => {
    setStatus({ ...hostedCommandStatus(nextConfig, ROUTING_SCOPE_PROBE), recordUrl: "", ledgerUrl: "" });
  }, []);

  const onChange = useCallback((patch) => {
    setConfig((current) => {
      const next = { ...current, ...patch };
      refreshStatus(next);
      return next;
    });
  }, [refreshStatus]);

  const onSave = useCallback(() => {
    saveHostedConfig(config);
    refreshStatus(config);
  }, [config, refreshStatus]);

  const onClear = useCallback(() => {
    clearHostedConfig();
    const next = initialHostedConfig();
    setConfig(next);
    refreshStatus(next);
  }, [refreshStatus]);

  const publish = useCallback(async (command) => {
    const readiness = hostedCommandStatus(config, command);
    if (!readiness.ready || !command || inFlight.current.has(command.commandId)) return null;
    const existingRecords = completed.current.get(command.commandId) ?? [];
    if (existingRecords.length >= roles.length) return existingRecords;

    inFlight.current.add(command.commandId);
    setPublishing(true);
    setStatus({
      ready: true,
      label: "publishing",
      message: "Portal active. Minting and publishing the hosted parcel authority trail...",
      recordUrl: "",
      ledgerUrl: "",
    });
    try {
      const result = await publishHostedFactoryCommand(config, command, { existingRecords });
      completed.current.set(command.commandId, result.records);
      setResults((current) => ({ ...current, [command.commandId]: result.records }));
      const allValid = result.records.every((item) => item.report.valid);
      setStatus({
        ready: true,
        label: allValid ? "published" : "registered",
        message: allValid
          ? `Hosted parcel authority trail published: ${result.records.length} role records registered and verified.`
          : "Hosted parcel authority trail registered; at least one hosted verification returned invalid.",
        recordUrl: result.links.record,
        ledgerUrl: result.links.ledger,
      });
      return result.records;
    } catch (error) {
      const partialRecords = Array.isArray(error?.records) ? error.records : [];
      if (partialRecords.length > 0) {
        completed.current.set(command.commandId, partialRecords);
        setResults((current) => ({ ...current, [command.commandId]: partialRecords }));
      }
      setStatus({
        ready: false,
        label: "failed",
        message: error instanceof Error ? error.message : "Hosted parcel publication failed.",
        recordUrl: "",
        ledgerUrl: "",
      });
      return partialRecords;
    } finally {
      inFlight.current.delete(command.commandId);
      setPublishing(inFlight.current.size > 0);
    }
  }, [config, roles.length]);

  return {
    publish,
    results,
    panelProps: { config, onChange, onClear, onSave, publishing, roles, status },
  };
}

function shiftTime(seconds) {
  const totalSeconds = 19 * 3600 + Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function duration(seconds) {
  if (seconds < 0) return `${Math.abs(Math.round(seconds))}s overdue`;
  return `${Math.round(seconds)}s`;
}

function TypeBadge({ typeId }) {
  const type = parcelTypes[typeId];
  return <span className={`parcel-type-badge ${type.colour}`}>{type.shortLabel}</span>;
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="parcel-metric">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ParcelOperationState({ state }) {
  const hasAuthority = Boolean(state.active);
  return (
    <details className="status-panel collapsible-panel" open>
      <summary className="panel-heading">
        <Activity size={18} aria-hidden="true" />
        <h2>Operation State</h2>
        <span className={`trace-state ${hasAuthority ? "active" : "waiting"}`}>{hasAuthority ? "admitted" : "waiting"}</span>
      </summary>
      <div className="checks">
        <div className={`check ${hasAuthority ? "valid" : "waiting"}`}><span>Signature</span><strong>{hasAuthority ? "valid" : "waiting"}</strong></div>
        <div className={`check ${hasAuthority ? "allowed" : "waiting"}`}><span>Legitimacy</span><strong>{hasAuthority ? "allowed" : "waiting"}</strong></div>
        <div className={`check ${hasAuthority ? "sufficient" : "waiting"}`}><span>Evidence</span><strong>{hasAuthority ? "sufficient" : "waiting"}</strong></div>
      </div>
      <div className="decision">
        <span>{hasAuthority ? "route.current" : "shift.ready"}</span>
        <p>{hasAuthority
          ? `${state.active.trolley.id} is moving under a signed, independently evidenced command.`
          : "Start the shift to rank the waiting work and derive the first bounded command."}</p>
      </div>
    </details>
  );
}

function ShiftControls({ state, dispatch }) {
  return (
    <details className="status-panel collapsible-panel parcel-shift-controls" open>
      <summary className="panel-heading">
        <Gauge size={18} aria-hidden="true" />
        <h2>Parcel Operations</h2>
        <span className={`trace-state ${state.running ? "active" : "waiting"}`}>{state.running ? "live" : "paused"}</span>
      </summary>
      <p>Random inbound trolleys are ranked by class SLA, wait time, priority and route length.</p>
      <div className="parcel-controls sidebar">
        <label>
          <span>Simulation speed</span>
          <select value={state.speed} onChange={(event) => dispatch({ type: "SET_SPEED", speed: Number(event.target.value) })}>
            <option value="1">1×</option>
            <option value="2">2×</option>
            <option value="4">4×</option>
            <option value="8">8×</option>
          </select>
        </label>
        <button className="parcel-secondary" type="button" onClick={() => dispatch({ type: "INJECT_EXPRESS" })}>
          <Sparkles size={16} aria-hidden="true" />Inject express
        </button>
        <button className="parcel-primary" type="button" onClick={() => dispatch({ type: state.running ? "PAUSE" : "START" })}>
          {state.running ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          {state.running ? "Pause shift" : "Start shift"}
        </button>
        <button className="parcel-icon-button" type="button" aria-label="Reset parcel shift" title="Reset parcel shift" onClick={() => dispatch({ type: "RESET" })}>
          <RotateCcw size={17} aria-hidden="true" />
        </button>
      </div>
    </details>
  );
}

function ParcelActorFlow({ state }) {
  const active = state.active;
  const actors = [
    {
      name: "Planner Bot",
      role: "Ranks waiting work",
      icon: RouteIcon,
      state: state.running ? "planning" : "idle",
      operation: active ? `selected ${active.trolley.id}; score ${active.authority.planner.selectedScore}` : "waiting for the shift to start",
    },
    {
      name: "Dispatch Authority",
      role: "Signs bounded route",
      icon: ShieldCheck,
      state: active ? "signed" : "ready",
      operation: active ? `issued ${active.authority.command.commandId}` : "ready to derive the next command",
    },
    {
      name: "Evidence Authorities",
      role: "Attest trolley state",
      icon: RadioTower,
      state: active ? "sufficient" : "waiting",
      operation: active ? "WarehouseFeed + DockSafetyController agree" : "waiting for a selected trolley",
    },
    {
      name: "Governance Evaluator",
      role: "Checks route rules",
      icon: ClipboardCheck,
      state: active ? "allowed" : "waiting",
      operation: active ? "parcel-routing-v1 admitted the command" : "waiting for signed authority and evidence",
    },
    {
      name: "Robot Bot",
      role: "Executes scoped move",
      icon: Bot,
      state: active ? "working" : "standby",
      operation: active ? `routing ${active.trolley.id} to ${parcelTypes[active.trolley.type].destinationLabel}` : "standing by",
    },
  ];
  return (
    <div className="status-panel actor-flow">
      <div className="panel-heading"><Activity size={18} aria-hidden="true" /><h2>Actors &amp; Operations</h2></div>
      <div className="actor-grid" aria-label="Shared parcel factory actors">
        {actors.map(({ icon: Icon, ...actor }) => (
          <div className={`actor-box ${active ? "active" : ""} ${actor.state}`} key={actor.name}>
            <div className="actor-title"><Icon size={16} aria-hidden="true" /><strong>{actor.name}</strong><span className={actor.state}>{actor.state}</span></div>
            <p>{actor.role}</p><small>{actor.operation}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParcelFloor({ active, queue, robotPoint }) {
  const visibleQueue = queue.slice(0, 10);
  const queuePositions = new Map();
  const positionFor = (trolley) => {
    const count = queuePositions.get(trolley.source) ?? 0;
    queuePositions.set(trolley.source, count + 1);
    const source = parcelPoints[trolley.source];
    return { x: source.x + (count % 2) * 7, y: source.y + Math.floor(count / 2) * 9 };
  };
  const robot = interpolateRoute(active, robotPoint);
  const waitingActive = active && !robot.carrying;
  const routePoints = active
    ? `${robotPoint.x},${robotPoint.y} ${active.source.x},${active.source.y} ${active.destination.x},${active.destination.y}`
    : "";

  return (
    <div className="parcel-floor" aria-label="Live parcel sorting floor">
      <div className="parcel-floor-grid" aria-hidden="true" />
      {active ? (
        <svg className="parcel-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={routePoints} />
        </svg>
      ) : null}

      {Object.values(parcelPoints).filter((point) => point.kind !== "standby").map((point) => (
        <div
          className={`parcel-point ${point.kind}`}
          key={point.id}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          {point.kind === "inbound" ? <Warehouse size={19} aria-hidden="true" /> : <MapPin size={19} aria-hidden="true" />}
          <strong>{point.label}</strong>
          <small>{point.kind === "inbound" ? "Random arrivals" : "Required destination"}</small>
        </div>
      ))}

      {visibleQueue.map((trolley) => {
        const position = positionFor(trolley);
        return (
          <div
            className={`parcel-trolley ${parcelTypes[trolley.type].colour}`}
            key={trolley.id}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            title={`${trolley.id}: ${parcelTypes[trolley.type].label}`}
          >
            <TypeBadge typeId={trolley.type} />
            <span>{trolley.id.replace("trolley-", "T")}</span>
          </div>
        );
      })}

      {waitingActive ? (
        <div
          className={`parcel-trolley active ${parcelTypes[active.trolley.type].colour}`}
          style={{ left: `${active.source.x}%`, top: `${active.source.y}%` }}
        >
          <TypeBadge typeId={active.trolley.type} />
          <span>{active.trolley.id.replace("trolley-", "T")}</span>
        </div>
      ) : null}

      <div
        className={`parcel-robot ${active ? "moving" : "idle"}`}
        style={{ left: `${robot.x}%`, top: `${robot.y}%` }}
        aria-label={active ? `Robot routing ${active.trolley.id}` : "Robot waiting for work"}
      >
        <Bot size={28} aria-hidden="true" />
        <span>R2</span>
        {robot.carrying && active ? <TypeBadge typeId={active.trolley.type} /> : null}
      </div>

      <div className="parcel-floor-legend">
        {Object.values(parcelTypes).map((type) => (
          <span key={type.id}><TypeBadge typeId={type.id} />{type.label}</span>
        ))}
      </div>
    </div>
  );
}

function CurrentDecision({ active, candidates, simSeconds }) {
  if (!active) {
    return (
      <details className="status-panel collapsible-panel current-decision empty" open>
        <summary className="panel-heading parcel-card-heading">
          <div><span>Current decision</span><h2>Waiting for work</h2></div>
          <Clock3 size={21} aria-hidden="true" />
        </summary>
        <p>Start the shift to let PlannerBot rank the waiting trolleys and request the first bounded command.</p>
      </details>
    );
  }
  const type = parcelTypes[active.trolley.type];
  const proof = active.authority;
  return (
    <details className="status-panel collapsible-panel current-decision" open>
      <summary className="panel-heading parcel-card-heading">
        <div>
          <span>Current decision</span>
          <h2>{active.trolley.id} → {type.destinationLabel}</h2>
        </div>
        <span className="admitted-pill"><ShieldCheck size={14} aria-hidden="true" />Admitted</span>
      </summary>
      <p className="decision-explanation">
        PlannerBot selected this {type.label.toLowerCase()} trolley with score <strong>{proof.planner.selectedScore}</strong>.
        It had waited {Math.round(proof.planner.waitedSeconds)}s and the admitted route is {proof.planner.distance} units.
      </p>
      <div className="decision-progress" aria-label={`${Math.round(active.progress * 100)} percent complete`}>
        <span style={{ width: `${Math.round(active.progress * 100)}%` }} />
      </div>
      <dl className="decision-facts">
        <div><dt>Command</dt><dd>{proof.command.commandId}</dd></div>
        <div><dt>Authority record</dt><dd>{proof.publicRecord.recordId}</dd></div>
        <div><dt>Independent evidence</dt><dd>{proof.independentSources.length}/2 sources</dd></div>
        <div><dt>Rule</dt><dd>parcel-routing-v1</dd></div>
        <div><dt>Admitted at</dt><dd>{shiftTime(active.startedAt)}</dd></div>
        <div><dt>Simulator outcome</dt><dd>{active.progress === 1 ? "Delivered" : "In progress"}</dd></div>
      </dl>
      <p className="proof-boundary">
        AgentEnvelope proves the command authority and admission. Delivery remains a simulator outcome.
      </p>
      {candidates.length > 0 ? (
        <p className="next-candidate">
          Next candidate now: <strong>{candidates[0].trolley.id}</strong> ({parcelTypes[candidates[0].trolley.type].label}),
          score {candidates[0].score} at {shiftTime(simSeconds)}.
        </p>
      ) : null}
    </details>
  );
}

function WorkQueue({ candidates }) {
  return (
    <details className="status-panel collapsible-panel parcel-queue" open>
      <summary className="panel-heading parcel-card-heading">
        <div><span>Dynamic work queue</span><h2>{candidates.length} waiting</h2></div>
        <Boxes size={21} aria-hidden="true" />
      </summary>
      {candidates.length === 0 ? <p className="queue-empty">No trolley is waiting at an inbound bay.</p> : (
        <ol>
          {candidates.slice(0, 7).map((candidate, index) => (
            <li key={candidate.trolley.id}>
              <span className="queue-rank">{index + 1}</span>
              <TypeBadge typeId={candidate.trolley.type} />
              <div>
                <strong>{candidate.trolley.id}</strong>
                <small>{parcelPoints[candidate.trolley.source].label} → {candidate.type.destinationLabel}</small>
              </div>
              <dl>
                <div><dt>Score</dt><dd>{candidate.score}</dd></div>
                <div><dt>SLA</dt><dd className={candidate.remainingSeconds < 15 ? "urgent" : ""}>{duration(candidate.remainingSeconds)}</dd></div>
                <div><dt>Route</dt><dd>{candidate.distance}</dd></div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

function DecisionTimeline({ decisions, completed }) {
  const [selectedSequence, setSelectedSequence] = useState(null);
  const completedIds = new Set(completed.map((item) => item.trolley.id));
  const selected = decisions.find((decision) => decision.sequence === selectedSequence) ?? decisions[0];
  return (
    <section className="event-log parcel-timeline">
      <div className="parcel-card-heading">
        <div><span>Retrospective evidence</span><h2>Decision timeline</h2></div>
        <RouteIcon size={21} aria-hidden="true" />
      </div>
      {decisions.length === 0 ? (
        <p className="queue-empty">Admitted commands will appear here with the rule, record and evidence used at that moment.</p>
      ) : (
        <div className="timeline-table" role="table" aria-label="Shift decision timeline">
          <div className="timeline-row timeline-header" role="row">
            <span>Time</span><span>Trolley</span><span>Decision</span><span>Why selected</span><span>Outcome</span><span>Proof</span>
          </div>
          {decisions.slice(0, 10).map((decision) => (
            <div className="timeline-row" role="row" key={decision.sequence}>
              <span>{shiftTime(decision.selectedAt)}</span>
              <span><TypeBadge typeId={decision.trolley.type} />{decision.trolley.id}</span>
              <span className={decision.status === "admitted" ? "timeline-good" : "timeline-bad"}>{decision.status}</span>
              <span>Score {decision.score}; route {decision.distance}</span>
              <span>{completedIds.has(decision.trolley.id) ? "Simulator delivered" : "Pending locally"}</span>
              <span><button type="button" onClick={() => setSelectedSequence(decision.sequence)}>Inspect</button></span>
            </div>
          ))}
        </div>
      )}
      {selected ? (
        <section className="timeline-inspector" aria-label={`Authority proof for ${selected.trolley.id}`}>
          <header>
            <div>
              <span>Selected historic decision</span>
              <h3>{selected.trolley.id} at {shiftTime(selected.selectedAt)}</h3>
            </div>
            <span className="admitted-pill"><ShieldCheck size={14} aria-hidden="true" />{selected.status}</span>
          </header>
          <dl>
            <div><dt>Command</dt><dd>{selected.proof.commandId}</dd></div>
            <div><dt>Correlation</dt><dd>{selected.proof.correlationId}</dd></div>
            <div><dt>Authority record</dt><dd>{selected.proof.recordId}</dd></div>
            <div><dt>Rule in force</dt><dd>{selected.proof.policyId}</dd></div>
            <div><dt>Independent sources</dt><dd>{selected.proof.independentSources.join(" + ")}</dd></div>
            <div><dt>Evidence</dt><dd>{selected.proof.evidenceIds.join(", ")}</dd></div>
            <div><dt>Action envelope</dt><dd>{selected.proof.actionEnvelopeHash}</dd></div>
            <div><dt>Governance report</dt><dd>{selected.proof.governanceReportId}</dd></div>
          </dl>
        </section>
      ) : null}
    </section>
  );
}

function ParcelOperations() {
  const [state, dispatch] = useReducer(parcelOperationsReducer, undefined, () => initialParcelOperationsState());
  const hosted = useParcelHostedPublishing();

  useEffect(() => {
    if (!state.running) return undefined;
    const timer = window.setInterval(() => dispatch({ type: "TICK" }), 500);
    return () => window.clearInterval(timer);
  }, [state.running]);

  const candidates = useMemo(
    () => rankCandidates(state.queue, state.active?.destination ?? state.robotPoint, state.simSeconds),
    [state.active?.destination, state.queue, state.robotPoint, state.simSeconds],
  );
  const onTimeRate = state.completed.length === 0
    ? "—"
    : `${Math.round((state.onTime / state.completed.length) * 100)}%`;
  const latestAuthority = state.active?.authority ?? state.completed[0]?.authority ?? null;
  const hostedRecords = latestAuthority
    ? hosted.results[latestAuthority.command.commandId] ?? []
    : [];
  const authorityRun = latestAuthority ? {
    command: latestAuthority.command,
    recordId: latestAuthority.publicRecord.recordId,
    legitimacyId: "parcel-routing-v1",
    reportId: latestAuthority.governanceReport.reportId,
    trace: latestAuthority.trace,
    hostedRecords: hostedRecords.map((item) => ({
      role: item.roleLabel,
      recordId: item.record.recordId,
      valid: item.report.valid,
    })),
  } : null;
  const ledgerEvents = [
    ...hostedRecords.map((item) => ({
      kind: item.report.valid ? "ok" : "warn",
      text: `${item.roleLabel} hosted record ${item.record.recordId}: ${item.report.valid ? "verified" : "verification returned invalid"}.`,
    })),
    ...state.completed.slice(0, 8).map((item) => ({
      kind: item.onTime ? "ok" : "warn",
      text: `Simulator outcome: ${item.trolley.id} reached ${parcelTypes[item.trolley.type].destinationLabel}${item.onTime ? " within" : " outside"} its class SLA.`,
    })),
    ...state.decisions.slice(0, 12).map((decision) => ({
      kind: decision.status === "admitted" ? "ok" : "bad",
      text: `${decision.proof.commandId} ${decision.status} under ${decision.proof.policyId}; record ${decision.proof.recordId}.`,
    })),
    ...(state.decisions.length === 0 ? [{ kind: "info", text: "Factory ready. Start the shift to derive the first parcel-routing command." }] : []),
  ];

  useEffect(() => {
    if (!state.active?.authority.command) return;
    void hosted.publish(state.active.authority.command);
  }, [hosted.publish, state.active?.authority.command]);

  return (
    <section className="workspace parcel-workspace">
      <aside className="side-panel left-panel parcel-left-panel">
        <ParcelOperationState state={state} />
        <ShiftControls state={state} dispatch={dispatch} />
        <WorkQueue candidates={candidates} />
      </aside>

      <div className="center-panel parcel-center-panel">
        <div className="center-actors">
          <ParcelActorFlow state={state} />
        </div>
        <div className="floor-wrap parcel-floor-wrap">
          <section className="parcel-floor-card">
          <div className="parcel-section-heading">
            <div><span>Sorting floor</span><h2>One robot, three destinations</h2></div>
            <span className={`shift-state ${state.running ? "running" : "paused"}`}>{state.running ? "Live" : "Paused"}</span>
          </div>
          <ParcelFloor active={state.active} queue={state.queue} robotPoint={state.robotPoint} />
          </section>
        </div>
        <div className="center-ledger manual-under-floor parcel-ledger">
          <DecisionTimeline decisions={state.decisions} completed={state.completed} />
        </div>
      </div>

      <aside className="side-panel right-panel parcel-right-panel">
        <CurrentDecision active={state.active} candidates={candidates} simSeconds={state.simSeconds} />
        <AuthorityTracePanel activeRun={authorityRun} />
        <HostedRecordsPanel activeRun={authorityRun} hosted={hosted.panelProps} />
        <details className="status-panel collapsible-panel parcel-statistics" open>
          <summary className="panel-heading">
            <Gauge size={18} aria-hidden="true" />
            <h2>Shift Statistics</h2>
            <span className="trace-state active">{shiftTime(state.simSeconds)}</span>
          </summary>
          <div className="parcel-metrics" aria-label="Shift statistics">
            <Metric icon={Clock3} label="Shift clock" value={shiftTime(state.simSeconds)} note={`Replay seed ${state.seed}`} />
            <Metric icon={Boxes} label="Arrivals" value={state.arrivals} note={`${state.queue.length} waiting`} />
            <Metric icon={PackageCheck} label="Delivered" value={state.completed.length} note={`${onTimeRate} within class SLA`} />
            <Metric icon={Gauge} label="Robot travel" value={state.totalDistance} note="route units completed" />
            <Metric icon={ShieldCheck} label="Authority" value={state.admitted} note={`${state.rejected} rejected`} />
          </div>
        </details>
        <details className="event-log collapsible-panel parcel-event-log" open>
          <summary className="panel-heading"><h2>Factory Ledger</h2><span className="trace-state active">{ledgerEvents.length}</span></summary>
          <ol>{ledgerEvents.map((event, index) => <li className={event.kind} key={`${event.text}-${index}`}>{event.text}</li>)}</ol>
        </details>
      </aside>
    </section>
  );
}

export default ParcelOperations;
