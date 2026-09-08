import {
  Activity,
  Bot,
  Bug,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  KeyRound,
  Link2,
  RadioTower,
  Route,
  ShieldCheck,
  Terminal,
} from "lucide-react";

function SidePanel({
  activeRun,
  consoleState,
  events,
  hosted,
  onHackAttempt,
  onPortalAction,
  onScenarioBug,
  phase,
  side = "right",
  status,
  trolley4Slot,
}) {
  if (side === "left") {
    return (
      <aside className="side-panel left-panel">
        <ActorFlowPanel activeRun={activeRun} phase={phase} status={status} />
        <OperationStatePanel status={status} />
        <DisruptionPanel onScenarioBug={onScenarioBug} />
        <HackConsole consoleState={consoleState} onHackAttempt={onHackAttempt} />
        <AuthorityHeadPanel consoleState={consoleState} onPortalAction={onPortalAction} />
      </aside>
    );
  }

  if (side === "ledger") {
    return <FactoryLedger events={events} className="center-ledger" />;
  }

  return (
    <aside className="side-panel right-panel">
      <HostedRecordsPanel activeRun={activeRun} hosted={hosted} />
      <CurrentRecordPanel activeRun={activeRun} trolley4Slot={trolley4Slot} />
      <AuthorityTracePanel activeRun={activeRun} />
    </aside>
  );
}

function OperationStatePanel({ status }) {
  return (
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
  );
}

export default SidePanel;

function DisruptionPanel({ onScenarioBug }) {
  return (
    <div className="status-panel action-panel">
      <div className="panel-heading">
        <Bug size={18} aria-hidden="true" />
        <h2>Known Disruptions</h2>
      </div>
      <div className="button-grid">
        <button type="button" onClick={() => onScenarioBug("move-trolley")} title="Move trolley4 and force a reality mismatch">
          Move trolley
        </button>
        <button type="button" onClick={() => onScenarioBug("stale-evidence")} title="Simulate stale sensor evidence">
          Stale evidence
        </button>
        <button type="button" onClick={() => onScenarioBug("sensor-conflict")} title="Simulate conflicting independent evidence">
          Sensor conflict
        </button>
      </div>
    </div>
  );
}

function HackConsole({ consoleState, onHackAttempt }) {
  return (
    <div className="status-panel terminal-panel">
      <div className="panel-heading">
        <Terminal size={18} aria-hidden="true" />
        <h2>Hack Robot Commands</h2>
      </div>
      <pre>{consoleState?.hack ?? "$ hack-robot\nwaiting"}</pre>
      <div className="button-grid">
        <button type="button" onClick={() => onHackAttempt("tamper-target")} title="Change the target bay after the command was signed">
          Tamper bay
        </button>
        <button type="button" onClick={() => onHackAttempt("scope-escalation")} title="Change the operation outside the signed action envelope">
          Scope jump
        </button>
        <button type="button" onClick={() => onHackAttempt("replay")} title="Replay an old one-use command">
          Replay
        </button>
        <button type="button" onClick={() => onHackAttempt("recover")} title="Discard bad command state and reissue fresh authority">
          Fix state
        </button>
      </div>
      <p>Command hacks cannot mint new authority; bad commands are discarded and repaired with a fresh signature.</p>
    </div>
  );
}

function AuthorityHeadPanel({ consoleState, onPortalAction }) {
  return (
    <div className="status-panel action-panel authority-head">
      <div className="panel-heading">
        <Globe2 size={18} aria-hidden="true" />
        <h2>Web Portal Authority Head</h2>
      </div>
      <pre>{consoleState?.portal ?? "AuthorityHead portal online"}</pre>
      <div className="button-grid">
        <button type="button" onClick={() => onPortalAction("verify")} title="Run a hosted verification report">
          Verify report
        </button>
        <button type="button" onClick={() => onPortalAction("refresh")} title="Request fresh independent evidence">
          Refresh evidence
        </button>
        <button type="button" onClick={() => onPortalAction("suspend")} title="Suspend legitimacy from the authority head">
          Suspend
        </button>
        <button type="button" onClick={() => onPortalAction("repair")} title="Create fresh legitimacy state for the current trolley location">
          Fix state
        </button>
      </div>
      <p>
        The portal governs legitimacy and audit. It does not receive roots, seeds, or the robot action key.
      </p>
    </div>
  );
}

function HostedRecordsPanel({ activeRun, hosted }) {
  const status = hosted?.status ?? { label: "missing", message: "Hosted factory publishing is not configured." };
  const config = hosted?.config ?? {};
  const roles = hosted?.roles ?? [];
  const canPublish = Boolean(activeRun && !hosted?.publishing && status.label !== "published" && (status.ready || status.label === "failed"));
  const publishLabel = hosted?.publishing
    ? "Publishing"
    : status.label === "published"
      ? "Published"
      : status.label === "failed"
        ? "Retry trail"
        : "Auto publish";

  return (
    <div className={`status-panel hosted-panel ${status.label}`}>
      <div className="panel-heading">
        <Link2 size={18} aria-hidden="true" />
        <h2>Hosted Records</h2>
        <span className="hosted-pill">{status.label}</span>
      </div>
      <div className="hosted-form">
        <label>
          <span>API key</span>
          <input
            value={config.apiKey ?? ""}
            onChange={(event) => hosted?.onChange({ apiKey: event.target.value })}
            placeholder="VITE_AE_API_KEY"
            type="password"
          />
        </label>
        <label>
          <span>Owner user id</span>
          <input
            value={config.ownerUserId ?? ""}
            onChange={(event) => hosted?.onChange({ ownerUserId: event.target.value })}
            placeholder="AE_OWNER_USER_ID"
          />
        </label>
      </div>
      <div className="hosted-role-list">
        {roles.map((role) => (
          <details key={role.id} className="hosted-role" open={role.id === "robot"}>
            <summary>
              <span>
                <strong>{role.label}</strong>
                <small>{role.delegateId}</small>
              </span>
              <em>{role.botKeyReady && role.mintMaterialReady ? "ready" : "missing"}</em>
            </summary>
            <p>{role.scope}</p>
            <p>{role.legitimacy}</p>
            <div className="hosted-form">
              <label>
                <span>{role.label} bot key</span>
                <input
                  value={config[`${role.id}BotKey`] ?? ""}
                  onChange={(event) => hosted?.onChange({ [`${role.id}BotKey`]: event.target.value })}
                  placeholder={`VITE_AE_${role.id.toUpperCase()}_BOT_KEY`}
                  type="password"
                />
              </label>
              <label>
                <span>{role.label} mint material</span>
                <input
                  value={config[`${role.id}MintMaterial`] ?? ""}
                  onChange={(event) => hosted?.onChange({ [`${role.id}MintMaterial`]: event.target.value })}
                  placeholder={`VITE_AE_${role.id.toUpperCase()}_MINT_MATERIAL`}
                  type="password"
                />
              </label>
            </div>
          </details>
        ))}
      </div>
      <p className="hosted-message">{status.message}</p>
      <div className="button-grid hosted-actions">
        <button type="button" onClick={hosted?.onSave} title="Save hosted settings in this browser session">
          Save session
        </button>
        <button type="button" onClick={hosted?.onPublish} disabled={!canPublish} title="Mint, register, and verify the full factory authority trail">
          {publishLabel}
        </button>
        <button type="button" onClick={hosted?.onClear} title="Clear hosted settings from this browser session">
          Clear
        </button>
      </div>
      {(status.recordUrl || status.ledgerUrl) && (
        <div className="hosted-links">
          {status.recordUrl && <a href={status.recordUrl} target="_blank" rel="noreferrer">Open record</a>}
          {status.ledgerUrl && <a href={status.ledgerUrl} target="_blank" rel="noreferrer">Ledger activity</a>}
        </div>
      )}
      <p>
        Delegates are loaded from mint-delegate*.json. Ready hosted settings auto-publish each signed factory command through API-key routes only.
      </p>
    </div>
  );
}

function ActorFlowPanel({ activeRun, phase, status }) {
  const commandTarget = activeRun?.command?.args?.bayId ?? "bay7";
  const reasonCode = status.reasonCode ?? "";
  const cryptoBlocked = reasonCode.startsWith("crypto.") || reasonCode.startsWith("envelope.");
  const replayBlocked = reasonCode.startsWith("replay.");
  const evidenceBlocked = reasonCode.startsWith("evidence.");
  const disruptionReview = reasonCode.startsWith("disruption.") || reasonCode === "portal.evidence_refresh";
  const portalBlocked = reasonCode.startsWith("portal.legitimacy");
  const observedTarget = status.reasonCode === "state.mismatched" ? "new bay" : commandTarget;
  const actors = [
    {
      name: "DispatchAuthority",
      role: "Signs command",
      icon: ShieldCheck,
      state: activeRun ? "signed" : "ready",
      active: status.reasonCode === "command.issued" || (!activeRun && phase === "ready"),
      operation: activeRun ? `issued ${activeRun.command.commandId}` : "waiting to issue bay7 command",
    },
    {
      name: "RobotBot",
      role: "Executes scoped action",
      icon: Bot,
      state: phase === "denied" ? "blocked" : phase === "moving" || phase === "replanning" ? "working" : phase === "complete" ? "done" : "standby",
      active: ["moving", "reviewing", "replanning", "complete", "denied"].includes(phase),
      operation:
        phase === "denied"
          ? `blocked by ${reasonCode}`
          : phase === "replanning"
          ? `rerouting to ${commandTarget}`
          : phase === "reviewing"
            ? "stopped for legitimacy review"
            : phase === "complete"
              ? "loaded trolley4"
              : activeRun
                ? `travelling to ${commandTarget}`
                : "standing by",
    },
    {
      name: "Evidence Authorities",
      role: "Attest reality",
      icon: RadioTower,
      state: cryptoBlocked ? "bypassed" : status.evidence,
      active: cryptoBlocked || ["checking", "sufficient", "insufficient"].includes(status.evidence),
      operation:
        cryptoBlocked
          ? "not reached; signature/envelope failed first"
          : disruptionReview
            ? "refreshing evidence while the run continues"
          : status.evidence === "sufficient"
          ? `WarehouseFeed + DockSafetyController attest ${observedTarget}`
          : status.evidence === "insufficient"
            ? evidenceBlocked
              ? `blocked: ${reasonCode}`
              : "RobotBot-only evidence rejected"
            : "waiting for location evidence",
    },
    {
      name: "GovernanceEvaluator",
      role: "Checks legitimacy",
      icon: ClipboardCheck,
      state: status.legitimacy,
      active: phase === "reviewing" || ["pending", "allowed", "denied"].includes(status.legitimacy),
      operation:
        cryptoBlocked
          ? `failed before execution: ${reasonCode}`
          : replayBlocked
            ? "replay denied by governed ledger state"
            : portalBlocked
              ? "portal suspended current legitimacy"
              : disruptionReview
                ? "watching disruption; no stop signal"
              : status.legitimacy === "denied"
          ? `blocked: ${reasonCode}`
          : status.legitimacy === "allowed"
            ? "legitimacy allowed"
            : "evaluating policy and evidence",
    },
    {
      name: "PlannerBot",
      role: "Requests correction",
      icon: Route,
      state: phase === "replanning" ? "reissued" : status.reasonCode === "state.mismatched" ? "planning" : "idle",
      active: phase === "replanning" || status.reasonCode === "state.mismatched",
      operation:
        phase === "replanning"
          ? `fresh command targets ${commandTarget}`
          : status.reasonCode === "state.mismatched"
            ? "selecting admissible replacement"
            : "idle until reality changes",
    },
  ];

  return (
    <div className="status-panel actor-flow">
      <div className="panel-heading">
        <Activity size={18} aria-hidden="true" />
        <h2>Actors & Operations</h2>
      </div>
      <div className="actor-grid">
        {actors.map((actor) => (
          <ActorBox key={actor.name} actor={actor} />
        ))}
      </div>
    </div>
  );
}

function ActorBox({ actor }) {
  const Icon = actor.icon;
  return (
    <div className={`actor-box ${actor.active ? "active" : ""} ${actor.state}`}>
      <div className="actor-title">
        <Icon size={16} aria-hidden="true" />
        <strong>{actor.name}</strong>
        <span>{actor.state}</span>
      </div>
      <p>{actor.role}</p>
      <small>{actor.operation}</small>
    </div>
  );
}

function CurrentRecordPanel({ activeRun, trolley4Slot }) {
  return (
    <div className="status-panel compact">
      <div className="panel-heading">
        <CheckCircle2 size={18} aria-hidden="true" />
        <h2>Current Record</h2>
      </div>
      <dl>
        <RecordRow label="Command">
          {activeRun
            ? `${activeRun.command.robotId}.${activeRun.command.operation}(${activeRun.command.args.trolleyId}, ${activeRun.command.args.bayId})`
            : "waiting"}
        </RecordRow>
        <RecordRow label="Record">{activeRun?.recordId ?? "not issued"}</RecordRow>
        <RecordRow label="Index">{activeRun?.trace?.actionIndex ?? "not derived"}</RecordRow>
        <RecordRow label="Agent">{activeRun?.trace?.agentAddress ?? "not derived"}</RecordRow>
        <RecordRow label="Envelope">{activeRun?.trace?.actionEnvelopeHash ?? "not derived"}</RecordRow>
        <RecordRow label="Legitimacy">{activeRun?.legitimacyId ?? "not created"}</RecordRow>
        <RecordRow label="Report">{activeRun?.reportId ?? "not emitted"}</RecordRow>
        <RecordRow label="Event">{activeRun?.eventId ?? "not patched"}</RecordRow>
        <RecordRow label="Status">{activeRun?.updatedStatus ?? activeRun?.previousStatus ?? "active"}</RecordRow>
        <RecordRow label="Trolley4">{trolley4Slot ?? "unknown"}</RecordRow>
      </dl>
    </div>
  );
}

function AuthorityTracePanel({ activeRun }) {
  return (
    <div className="status-panel trace-panel">
      <div className="panel-heading">
        <KeyRound size={18} aria-hidden="true" />
        <h2>Authority Trace</h2>
      </div>
      <dl>
        <RecordRow label="Path">{activeRun?.trace?.path ?? "waiting"}</RecordRow>
        <RecordRow label="Action Seed">{activeRun?.trace?.actionSeedPreview ?? "not derived"}</RecordRow>
        <RecordRow label="Custody">{activeRun?.trace?.custody ?? "sovereign boundary"}</RecordRow>
      </dl>
      <pre>{activeRun?.trace?.canonicalActionEnvelope ?? "{ }"}</pre>
    </div>
  );
}

function FactoryLedger({ className = "", events }) {
  return (
    <div className={`event-log ${className}`}>
      <h2>Factory Ledger</h2>
      <ol>
        {events.map((event, index) => (
          <li key={`${event.text}-${index}`} className={event.kind}>
            {event.text}
          </li>
        ))}
      </ol>
    </div>
  );
}

function RecordRow({ children, label }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
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
