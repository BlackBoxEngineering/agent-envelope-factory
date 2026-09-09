import { useEffect, useState } from "react";
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
        <OperationStatePanel status={status} />
        <DisruptionPanel onScenarioBug={onScenarioBug} />
        <HackConsole consoleState={consoleState} onHackAttempt={onHackAttempt} />
      </aside>
    );
  }

  if (side === "actors") {
    return (
      <div className="center-actors">
        <ActorFlowPanel activeRun={activeRun} phase={phase} status={status} />
      </div>
    );
  }

  if (side === "ledger") {
    return <FactoryLedger events={events} className="center-ledger" />;
  }

  return (
    <aside className="side-panel right-panel">
      <HostedRecordsPanel activeRun={activeRun} hosted={hosted} />
      <AuthorityHeadPanel consoleState={consoleState} onPortalAction={onPortalAction} />
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
  const disruptions = [
    {
      id: "move-trolley",
      title: "Move trolley",
      summary: "Operator changes physical reality while R2 is en route.",
      effect: "Repairs state and reroutes with a fresh signed command.",
    },
    {
      id: "stale-evidence",
      title: "Stale evidence",
      summary: "Old sensor facts arrive after the current command is active.",
      effect: "Quarantines the stale fact; execution continues.",
    },
    {
      id: "sensor-conflict",
      title: "Sensor conflict",
      summary: "Two evidence sources disagree about trolley4 location.",
      effect: "Marks evidence noisy; serious crypto authority still holds.",
    },
  ];

  return (
    <details className="status-panel action-panel disruption-panel" open>
      <summary className="panel-heading disruption-summary">
        <Bug size={18} aria-hidden="true" />
        <h2>Handled Disruptions</h2>
      </summary>
      <div className="disruption-list">
        <p>These disruptions are expected noise; they are repaired or quarantined without stopping the flow.</p>
        {disruptions.map((disruption) => (
          <button key={disruption.id} type="button" onClick={() => onScenarioBug(disruption.id)}>
            <strong>{disruption.title}</strong>
            <span>{disruption.summary}</span>
            <small>{disruption.effect}</small>
          </button>
        ))}
      </div>
    </details>
  );
}

function HackConsole({ consoleState, onHackAttempt }) {
  const attackGroups = [
    [
      "Recoverable",
      [
        {
          id: "tamper-target",
          title: "Tamper bay",
          summary: "Change the target bay after the command was signed.",
          effect: "Bad command is discarded; fresh scoped authority can be issued from known state.",
        },
      ],
    ],
    [
      "Stop and review",
      [
        {
          id: "scope-escalation",
          title: "Scope jump",
          summary: "Change pickUp into an operation outside the signed envelope.",
          effect: "Privilege escalation fails closed and should not auto-recover.",
        },
        {
          id: "replay",
          title: "Replay command",
          summary: "Try to reuse an old one-use command.",
          effect: "Spent authority is denied by ledger state and should be investigated.",
        },
      ],
    ],
    [
      "Red SPECTER supply chain",
      [
        {
          id: "package-injection",
          title: "Fake package command",
          summary: "A hallucinated dependency tries to emit a robot command.",
          effect: "Package code has no delegate scope; execution stops at signature provenance.",
        },
        {
          id: "ci-secret-compromise",
          title: "CI secret theft",
          summary: "An install hook claims it can use build secrets as robot authority.",
          effect: "Environment is treated as compromised; rotate secrets before continuing.",
        },
        {
          id: "orchestrator-jump",
          title: "Orchestrator jump",
          summary: "An external attack runner tries to turn findings into a factory action.",
          effect: "Tool output is evidence only; it cannot become derived command authority.",
        },
        {
          id: "telemetry-forgery",
          title: "Forge telemetry",
          summary: "A fake log or sensor event tries to patch the hosted trail.",
          effect: "Unsigned telemetry is rejected; evidence must be linked to a governed record.",
        },
        {
          id: "approval-forgery",
          title: "Fake approval",
          summary: "A forged governance message claims legitimacy was allowed.",
          effect: "Approval fails without the legitimacy-bound governance authority.",
        },
        {
          id: "intent-fragmentation",
          title: "Fragment intent",
          summary: "Small permitted-looking steps hide a broader unauthorized goal.",
          effect: "Aggregate intent must still fit the scoped delegate and hosted policy.",
        },
      ],
    ],
    [
      "Recovery action",
      [
        {
          id: "recover",
          title: "Fix state",
          summary: "Discard bad command state and issue fresh authority.",
          effect: "A new scoped signature repairs the flow after a recoverable mismatch.",
        },
      ],
    ],
  ];

  return (
    <details className="status-panel terminal-panel attack-panel" open>
      <summary className="panel-heading attack-summary">
        <Terminal size={18} aria-hidden="true" />
        <h2>Hack Robot Commands</h2>
      </summary>
      <div className="attack-console-body">
        <pre>{consoleState?.hack ?? "$ hack-robot\nwaiting"}</pre>
        <p>Recoverable corruption can be repaired with fresh scoped authority. Scope escalation and replay stop the command and require review.</p>
        <div className="attack-list">
          {attackGroups.map(([group, attacks]) => (
            <section key={group} className="attack-group">
              <h3>{group}</h3>
              {attacks.map((attack) => (
                <button key={attack.id} type="button" onClick={() => onHackAttempt(attack.id)}>
                  <strong>{attack.title}</strong>
                  <span>{attack.summary}</span>
                  <small>{attack.effect}</small>
                </button>
              ))}
            </section>
          ))}
        </div>
      </div>
    </details>
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
  const [isOpen, setIsOpen] = useState(() => !status.ready);
  const portalLabel = hosted?.publishing
    ? "Portal publishing"
    : status.ready
      ? "Portal active"
      : "Portal not ready";

  useEffect(() => {
    if (!status.ready) {
      setIsOpen(true);
    }
  }, [status.ready]);

  return (
    <details
      className={`status-panel hosted-panel ${status.label}`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="panel-heading hosted-summary">
        <Link2 size={18} aria-hidden="true" />
        <h2>Hosted Records</h2>
        <span className="hosted-summary-state">{portalLabel}</span>
        <span className="hosted-pill">{status.label}</span>
      </summary>
      <div className="hosted-panel-body">
        <div className="hosted-portal-state">
          <strong>{portalLabel}</strong>
          <span>{activeRun ? "Signed commands publish as they are issued." : "Press Run to issue the next signed command."}</span>
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
    </details>
  );
}

function ActorFlowPanel({ activeRun, phase, status }) {
  const commandTarget = activeRun?.command?.args?.bayId ?? "bay7";
  const reasonCode = status.reasonCode ?? "";
  const cryptoBlocked =
    reasonCode.startsWith("crypto.") ||
    reasonCode.startsWith("envelope.") ||
    reasonCode.startsWith("supply_chain.") ||
    reasonCode.startsWith("orchestrator.") ||
    reasonCode.startsWith("intent.");
  const replayBlocked = reasonCode.startsWith("replay.");
  const evidenceBlocked = reasonCode.startsWith("evidence.") || reasonCode.startsWith("telemetry.");
  const disruptionReview = reasonCode.startsWith("disruption.") || reasonCode === "portal.evidence_refresh";
  const portalBlocked = reasonCode.startsWith("portal.legitimacy") || reasonCode.startsWith("governance.");
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
  const [isOpen, setIsOpen] = useState(() => !activeRun);
  const traceReady = Boolean(activeRun?.trace?.actionEnvelopeHash);

  useEffect(() => {
    setIsOpen(!traceReady);
  }, [traceReady]);

  return (
    <details
      className="status-panel trace-panel"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="panel-heading trace-summary">
        <KeyRound size={18} aria-hidden="true" />
        <h2>Authority Trace</h2>
        <span className="trace-state">{traceReady ? "derived" : "waiting"}</span>
      </summary>
      <div className="trace-body">
        <dl>
          <RecordRow label="Path">{activeRun?.trace?.path ?? "waiting"}</RecordRow>
          <RecordRow label="Action Seed">{activeRun?.trace?.actionSeedPreview ?? "not derived"}</RecordRow>
          <RecordRow label="Custody">{activeRun?.trace?.custody ?? "sovereign boundary"}</RecordRow>
        </dl>
        <pre>{activeRun?.trace?.canonicalActionEnvelope ?? "{ }"}</pre>
      </div>
    </details>
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
