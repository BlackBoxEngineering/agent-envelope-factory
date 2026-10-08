import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { factoryPlan } from "../factoryConfig.js";
import { ChatMarkdown } from "./ChatMarkdown.jsx";
import {
  Activity,
  Bot,
  BrainCircuit,
  Bug,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  FlaskConical,
  Globe2,
  KeyRound,
  Link2,
  ListTree,
  Minimize2,
  RadioTower,
  Route,
  Send,
  ShieldCheck,
  Terminal,
} from "lucide-react";

function SidePanel({
  activeRun,
  ai,
  consoleState,
  events,
  hosted,
  isAiControlled,
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

  if (side === "ai-left") {
    return (
      <aside className="side-panel left-panel ai-left-panel">
        <OperationStatePanel status={status} />
        <AiOperatorStatePanel provider={ai?.provider} />
        <AiPromptPanel ai={ai} placement="sidebar" />
        <AiProposedActionPanel action={ai?.proposedAction} />
        <AiIntentStream attempts={ai?.attempts ?? []} />
        <AiSpecterTestsPanel ai={ai} />
      </aside>
    );
  }

  if (side === "actors") {
    return (
      <div className="center-actors">
        <ActorFlowPanel activeRun={activeRun} ai={ai} isAiControlled={isAiControlled} phase={phase} status={status} />
      </div>
    );
  }

  if (side === "ledger") {
    return (
      <div className="center-ledger manual-under-floor">
        <FactoryLedger events={events} initiallyOpen />
      </div>
    );
  }

  if (side === "ai-ledger") {
    return (
      <div className="ai-under-floor center-ledger">
        <FactoryLedger events={events} initiallyOpen />
      </div>
    );
  }

  if (side === "ai-right") {
    return (
      <aside className="side-panel right-panel ai-right-panel">
        <CurrentRecordPanel activeRun={activeRun} trolley4Slot={trolley4Slot} />
        <AuthorityTracePanel activeRun={activeRun} />
        <HostedRecordsPanel activeRun={activeRun} hosted={hosted} />
      </aside>
    );
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
    <details className="status-panel collapsible-panel">
      <summary className="panel-heading">
        <Activity size={18} aria-hidden="true" />
        <h2>Operation State</h2>
        <span className={`trace-state ${status.legitimacy}`}>{status.reasonCode}</span>
      </summary>
      <div className="checks">
        <Check label="Signature" value={status.signature} />
        <Check label="Legitimacy" value={status.legitimacy} />
        <Check label="Evidence" value={status.evidence} />
      </div>
      <div className="decision">
        <span>{status.reasonCode}</span>
        <p>{status.message}</p>
      </div>
    </details>
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
    <details className="status-panel action-panel disruption-panel">
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
    <details className="status-panel terminal-panel attack-panel">
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

function AiOperatorStatePanel({ provider }) {
  const operatorState = provider?.status ?? "waiting";
  return (
    <details className="status-panel ai-operator-state">
      <summary className="panel-heading ai-summary">
        <BrainCircuit size={18} aria-hidden="true" />
        <h2>Bedrock Connection</h2>
        <span className={`trace-state ${operatorState}`}>{operatorState}</span>
      </summary>
      <div className="ai-model-state">
        <strong>{provider?.label ?? "Amazon Bedrock"}</strong>
        <span>{provider?.message ?? "Simulator hands only. AgentEnvelope keeps authority."}</span>
      </div>
    </details>
  );
}

function AiPromptPanel({ ai, placement = "rail" }) {
  const messages = ai?.messages ?? [];
  const [isUndocked, setIsUndocked] = useState(false);
  const [popupTarget, setPopupTarget] = useState(null);
  const popupRef = useRef(null);
  const threadRef = useRef(null);
  const promptRef = useRef(null);
  const quickActions = (ai?.presets ?? [])
    .filter((preset) => preset.group === "Factory control prompts")
    .filter((preset) => ["start-run", "move-trolley", "fix-blocker", "stop-line"].includes(preset.id));
  const pressureActions = (ai?.presets ?? []).filter((preset) => preset.group === "Red Spectre pressure tests");

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages, ai?.thinking]);

  const dockChat = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const eventWindow = event?.currentTarget?.ownerDocument?.defaultView;
    const popup = eventWindow && eventWindow !== window ? eventWindow : popupRef.current;

    if (popup && !popup.closed) popup.close();
    popupRef.current = null;
    setPopupTarget(null);
    setIsUndocked(false);
    window.requestAnimationFrame(() => window.focus());
  }, []);

  const undockChat = useCallback(() => {
    const width = Math.min(1100, Math.max(720, window.screen.availWidth - 120));
    const height = Math.min(860, Math.max(620, window.screen.availHeight - 120));
    const left = window.screenX + window.outerWidth + 16;
    const top = window.screenY + 40;
    const popupUrl = new URL("operator-chat.html", document.baseURI).href;
    const popup = window.open(
      popupUrl,
      "agent-envelope-ai-operator-chat",
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`,
    );

    if (!popup) {
      setPopupTarget(null);
      setIsUndocked(true);
      return;
    }

    popupRef.current = popup;
    const expectedUrl = new URL(popupUrl);
    let mounted = false;
    let retryTimer = null;
    let mountAttempts = 0;

    const mountChat = () => {
      if (mounted || popup.closed || popupRef.current !== popup) return false;

      let currentUrl;
      try {
        currentUrl = new URL(popup.location.href);
      } catch {
        return false;
      }
      if (
        currentUrl.origin !== expectedUrl.origin ||
        currentUrl.pathname !== expectedUrl.pathname ||
        popup.document.readyState === "loading"
      ) {
        return false;
      }

      mounted = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      popup.removeEventListener("load", mountWhenReady);

      popup.document.title = "AgentEnvelope AI Operator Chat";
      const base = popup.document.createElement("base");
      base.href = document.baseURI;
      const title = popup.document.createElement("title");
      title.textContent = "AgentEnvelope AI Operator Chat";
      popup.document.head.replaceChildren(base, title);
      document.querySelectorAll('link[rel="stylesheet"], link[rel~="icon"], style').forEach((node) => {
        popup.document.head.appendChild(node.cloneNode(true));
      });

      const root = popup.document.createElement("div");
      root.className = "ai-chat-popout-root";
      popup.document.body.className = "ai-chat-popout-body";
      popup.document.body.replaceChildren(root);

      setPopupTarget(root);
      setIsUndocked(true);
      popup.focus();

      popup.addEventListener(
        "beforeunload",
        () => {
          if (popupRef.current !== popup) return;
          popupRef.current = null;
          setPopupTarget(null);
          setIsUndocked(false);
        },
        { once: true },
      );
      return true;
    };

    const mountWhenReady = () => {
      if (mountChat()) return;
      if (popup.closed || popupRef.current !== popup) return;

      mountAttempts += 1;
      if (mountAttempts >= 100) {
        popup.close();
        popupRef.current = null;
        setPopupTarget(null);
        setIsUndocked(true);
        return;
      }
      retryTimer = window.setTimeout(mountWhenReady, 50);
    };

    popup.addEventListener("load", mountWhenReady);
    mountWhenReady();
  }, []);

  useEffect(() => {
    if (!isUndocked) return undefined;

    const popup = popupRef.current;
    const ownerWindow = popup && !popup.closed ? popup : window;
    const isPopup = ownerWindow !== window;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") dockChat();
    };

    if (!isPopup) document.body.style.overflow = "hidden";
    ownerWindow.addEventListener("keydown", handleKeyDown);
    ownerWindow.requestAnimationFrame(() => promptRef.current?.focus());

    return () => {
      if (!isPopup) document.body.style.overflow = previousOverflow;
      ownerWindow.removeEventListener("keydown", handleKeyDown);
    };
  }, [dockChat, isUndocked, popupTarget]);

  useEffect(
    () => () => {
      const popup = popupRef.current;
      popupRef.current = null;
      if (popup && !popup.closed) popup.close();
    },
    [],
  );

  const submitPrompt = () => {
    if (ai?.thinking || !ai?.livePrompt?.trim()) return;
    ai?.onPromptSubmit();
  };

  const chatPanel = (
    <div
      className={`status-panel ai-prompt-panel ${placement} ${isUndocked ? "undocked" : ""}`}
      role={isUndocked ? "dialog" : undefined}
      aria-modal={isUndocked && !popupTarget ? "true" : undefined}
      aria-labelledby="ai-operator-chat-title"
    >
      <div className="ai-chat-header">
        <div className="ai-chat-title-row">
          <div className="panel-heading">
            <BrainCircuit size={18} aria-hidden="true" />
            <h2 id="ai-operator-chat-title">AI Operator Chat</h2>
          </div>
          <button
            className="ai-chat-window-control"
            type="button"
            onClick={isUndocked ? dockChat : undockChat}
            aria-label={isUndocked ? "Dock operator chat" : "Pop out operator chat"}
            title={isUndocked ? "Dock operator chat (Esc)" : "Open chat in a movable window"}
          >
            {isUndocked ? <Minimize2 size={15} aria-hidden="true" /> : <ExternalLink size={15} aria-hidden="true" />}
            <span>{isUndocked ? "Dock chat" : "Pop out"}</span>
          </button>
        </div>
        <p>Ask about the live factory or request an action. AgentEnvelope still gates every tool call.</p>
        <div className="ai-chat-quick-actions" aria-label="Suggested factory actions">
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => ai?.onPreset(action.id)}
              disabled={ai?.thinking}
              title={action.prompt}
            >
              {action.title}
            </button>
          ))}
          <details className={`ai-pressure-menu ${ai?.thinking ? "disabled" : ""}`}>
            <summary
              aria-disabled={ai?.thinking ? "true" : undefined}
              onClick={(event) => {
                if (ai?.thinking) event.preventDefault();
              }}
              title="Run a Red Spectre pressure test"
            >
              <Terminal size={13} aria-hidden="true" />
              <span>Pressure test</span>
              <ChevronDown size={12} aria-hidden="true" />
            </summary>
            <div className="ai-pressure-menu-popover" role="menu" aria-label="Red Spectre pressure tests">
              {pressureActions.map((attack) => (
                <button
                  key={attack.id}
                  type="button"
                  role="menuitem"
                  disabled={ai?.thinking}
                  title={attack.prompt}
                  onClick={(event) => {
                    event.currentTarget.closest("details")?.removeAttribute("open");
                    ai?.onPreset(attack.id);
                  }}
                >
                  {attack.title}
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>
      <div ref={threadRef} className="ai-chat-thread" aria-live="polite" aria-label="Operator conversation">
        {messages.map((message) => (
          <div key={message.id} className={`ai-chat-message ${message.role}`}>
            <span>{chatMessageLabel(message.role)}</span>
            {message.role === "assistant" ? <ChatMarkdown text={message.text} /> : <p>{message.text}</p>}
          </div>
        ))}
        {ai?.thinking ? (
          <div className="ai-chat-message assistant thinking">
            <span>Bedrock</span>
            <p>Thinking...</p>
          </div>
        ) : null}
      </div>
      <form
        className="ai-live-prompt"
        onSubmit={(event) => {
          event.preventDefault();
          submitPrompt();
        }}
      >
        <label>
          <span>Request or question</span>
          <textarea
            ref={promptRef}
            value={ai?.livePrompt ?? ""}
            onChange={(event) => ai?.onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              submitPrompt();
            }}
            placeholder="For example: Why is RobotBot waiting?"
            rows={2}
          />
          <small>Enter to send · Shift+Enter for a new line</small>
        </label>
        <div className="ai-form-actions">
          <button type="submit" disabled={ai?.thinking || !ai?.livePrompt?.trim()}>
            <Send size={15} aria-hidden="true" />
            <span>{ai?.thinking ? "Thinking" : "Send"}</span>
          </button>
          <button type="button" onClick={ai?.onReset}>
            Reset demo
          </button>
        </div>
      </form>
    </div>
  );

  if (isUndocked && popupTarget) {
    return createPortal(chatPanel, popupTarget);
  }

  if (isUndocked && typeof document !== "undefined") {
    return createPortal(
      <div
        className="ai-chat-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) dockChat();
        }}
      >
        {chatPanel}
      </div>,
      document.body,
    );
  }

  return chatPanel;
}

function chatMessageLabel(role) {
  if (role === "assistant") return "Bedrock";
  if (role === "tool") return "Operator record";
  if (role === "warning") return "Warning";
  if (role === "error") return "Bridge";
  return "Prompt";
}

function AiSpecterTestsPanel({ ai }) {
  const attacks = (ai?.presets ?? []).filter((preset) => preset.group === "Red Spectre pressure tests");

  return (
    <details className="status-panel terminal-panel attack-panel ai-specter-panel">
      <summary className="panel-heading attack-summary">
        <Terminal size={18} aria-hidden="true" />
        <h2>Red Spectre Tests</h2>
      </summary>
      <div className="attack-console-body">
        <pre>$ red-spectre --pressure llm-operator</pre>
        <p>These prompts try to corrupt the LLM into acting outside its envelope. AgentEnvelope gates the resulting tool call.</p>
        <div className="attack-list">
          <section className="attack-group">
            <h3>LLM pressure</h3>
            {attacks.map((attack) => (
              <button
                key={attack.id}
                type="button"
                onClick={() => ai?.onPreset(attack.id)}
                disabled={ai?.thinking}
                title={attack.prompt}
              >
                <strong>{attack.title}</strong>
                <span>{attack.prompt}</span>
                <small>Routes through Bedrock, then AgentEnvelope policy decides.</small>
              </button>
            ))}
          </section>
        </div>
      </div>
    </details>
  );
}

function AiProposedActionPanel({ action }) {
  return (
    <details className={`status-panel ai-action-panel collapsible-panel ${action?.status ?? "waiting"}`}>
      <summary className="panel-heading">
        <FlaskConical size={18} aria-hidden="true" />
        <h2>LLM Proposed Action</h2>
        <span className={`trace-state ${action?.status ?? "waiting"}`}>{action?.status ?? "waiting"}</span>
      </summary>
      {action ? (
        <dl>
          <RecordRow label="Attempt">{action.id}</RecordRow>
          <RecordRow label="Prompt">{action.prompt}</RecordRow>
          <RecordRow label="Tool">{action.proposedTool}</RecordRow>
          <RecordRow label="Routed">{action.routedActor}</RecordRow>
          <RecordRow label="Operation">{action.operation}</RecordRow>
          <RecordRow label="Resources">{action.resources.join(", ")}</RecordRow>
          <RecordRow label="Boundary">{action.boundaryResult}</RecordRow>
          <RecordRow label="Hosted">{action.hostedReceipt}</RecordRow>
        </dl>
      ) : (
        <div className="ai-empty-state">
          <strong>waiting</strong>
          <span>The AI operator has not proposed an action yet.</span>
        </div>
      )}
    </details>
  );
}

function AiIntentStream({ attempts }) {
  return (
    <details className="event-log ai-intent-stream collapsible-panel">
      <summary className="panel-heading ai-summary">
        <ListTree size={18} aria-hidden="true" />
        <h2>LLM Intent Stream</h2>
        <span className="trace-state">{attempts.length}</span>
      </summary>
      <ol>
        {attempts.length > 0 ? (
          attempts.map((attempt) => (
            <li key={attempt.id} className={attempt.status === "allowed" ? "ok" : "bad"}>
              <strong>{attempt.proposedTool}</strong>
              <span>{attempt.boundaryResult}</span>
              <small>{attempt.resources.join(", ")}</small>
            </li>
          ))
        ) : (
          <li className="info">
            <strong>waiting</strong>
            <span>No LLM output yet.</span>
            <small>Factory changes require tool calls; questions can be answered read-only.</small>
          </li>
        )}
      </ol>
    </details>
  );
}

function AuthorityHeadPanel({ consoleState, onPortalAction }) {
  return (
    <details className="status-panel action-panel authority-head collapsible-panel">
      <summary className="panel-heading">
        <Globe2 size={18} aria-hidden="true" />
        <h2>Web Portal Authority Head</h2>
        <span className="trace-state active">active</span>
      </summary>
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
    </details>
  );
}

function HostedRecordsPanel({ activeRun, hosted }) {
  const status = hosted?.status ?? { label: "missing", message: "Hosted factory publishing is not configured." };
  const config = hosted?.config ?? {};
  const roles = hosted?.roles ?? [];
  const portalLabel = hosted?.publishing
    ? "Portal publishing"
    : status.ready
      ? "Portal active"
      : "Portal not ready";

  return (
    <details className={`status-panel hosted-panel collapsible-panel ${status.label}`}>
      <summary className="panel-heading hosted-summary">
        <Link2 size={18} aria-hidden="true" />
        <h2>Hosted Records</h2>
        <span className="hosted-summary-state">{portalLabel}</span>
        <span className={`hosted-pill ${status.label}`}>{status.label}</span>
      </summary>
      <div className="hosted-panel-body">
        <div className="hosted-portal-state">
          <strong>{portalLabel}</strong>
          <span>{activeRun ? "Signed commands publish as they are issued." : "Issue a signed command to publish the next authority trail."}</span>
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
            <details key={role.id} className="hosted-role">
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

function ActorFlowPanel({ activeRun, ai, isAiControlled, phase, status }) {
  const commandTarget = activeRun?.command?.args?.bayId ?? factoryPlan.command.initialTarget;
  const reasonCode = status.reasonCode ?? "";
  const cryptoBlocked =
    reasonCode.startsWith("crypto.") ||
    reasonCode.startsWith("envelope.") ||
    reasonCode.startsWith("ai.") ||
    reasonCode.startsWith("supply_chain.") ||
    reasonCode.startsWith("orchestrator.") ||
    reasonCode.startsWith("intent.");
  const replayBlocked = reasonCode.startsWith("replay.");
  const evidenceBlocked = reasonCode.startsWith("evidence.") || reasonCode.startsWith("telemetry.");
  const disruptionReview = reasonCode.startsWith("disruption.") || reasonCode === "portal.evidence_refresh";
  const portalBlocked = reasonCode.startsWith("portal.legitimacy") || reasonCode.startsWith("governance.");
  const observedTarget = status.reasonCode === "state.mismatched" ? "new bay" : commandTarget;
  const operatorActor = isAiControlled
    ? {
        name: "LLM Operator",
        role: "Occupies the human operator seat",
        icon: BrainCircuit,
        state: ai?.thinking
          ? "working"
          : ai?.proposedAction?.status === "blocked"
            ? "blocked"
            : ai?.proposedAction
              ? "working"
              : "standby",
        active: Boolean(ai?.thinking || ai?.proposedAction),
        operation: ai?.thinking
          ? "reading prompt and visible state"
          : ai?.proposedAction?.status === "blocked"
            ? `tool gated: ${ai.proposedAction.reasonCode}`
            : ai?.proposedAction
              ? `submitted ${ai.proposedAction.proposedTool} intent to the factory plan`
              : "waiting for query, command, or corruption prompt",
      }
    : null;
  const plannerNeedsRecovery =
    phase === "replanning" ||
    status.reasonCode === "state.mismatched" ||
    (phase === "reviewing" && status.evidence === "insufficient");
  const plannerActor = {
    name: "Planner Bot",
    role: "Maintains and repairs the plan",
    icon: Route,
    state:
      phase === "stopped"
        ? "paused"
        : phase === "replanning"
        ? "reissued"
        : reasonCode.startsWith("ai.") || reasonCode.startsWith("intent.") || reasonCode.startsWith("supply_chain.")
          ? "blocked"
          : plannerNeedsRecovery
            ? "planning"
            : "idle",
    active:
      phase === "stopped" ||
      plannerNeedsRecovery ||
      reasonCode.startsWith("ai.") ||
      reasonCode.startsWith("intent.") ||
      reasonCode.startsWith("supply_chain."),
    operation:
      phase === "stopped"
        ? "plan held by the local safety interlock"
        : phase === "replanning"
        ? `fresh command targets ${commandTarget}`
        : reasonCode.startsWith("ai.") || reasonCode.startsWith("intent.") || reasonCode.startsWith("supply_chain.")
          ? `operator proposal gated: ${reasonCode}`
          : plannerNeedsRecovery
            ? "selecting an admissible replacement from fresh evidence"
            : "idle until the plan or reality changes",
  };
  const actors = [
    {
      name: "Dispatch Authority",
      role: "Signs command",
      icon: ShieldCheck,
      state: activeRun ? "signed" : "ready",
      active: status.reasonCode === "command.issued" || (!activeRun && phase === "ready"),
      operation: activeRun ? `issued ${activeRun.command.commandId}` : `waiting to issue ${factoryPlan.command.initialTarget} command`,
    },
    {
      name: "Robot Bot",
      role: "Executes scoped action",
      icon: Bot,
      state: phase === "denied" ? "blocked" : phase === "stopped" ? "stopped" : phase === "moving" || phase === "replanning" ? "working" : phase === "complete" ? "done" : "standby",
      active: ["moving", "reviewing", "replanning", "complete", "denied", "stopped"].includes(phase),
      operation:
        phase === "denied"
          ? `blocked by ${reasonCode}`
          : phase === "stopped"
            ? "paused by the local safety interlock"
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
        phase === "stopped"
          ? "evidence state retained when execution stopped"
          : cryptoBlocked
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
      name: "Governance Evaluator",
      role: "Checks legitimacy",
      icon: ClipboardCheck,
      state: status.legitimacy,
      active: phase === "reviewing" || ["pending", "allowed", "denied"].includes(status.legitimacy),
      operation:
        phase === "stopped"
          ? "last legitimacy state unchanged; execution stopped locally"
          : cryptoBlocked
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
    plannerActor,
  ];

  return (
    <div className="status-panel actor-flow">
      <div className="panel-heading">
        <Activity size={18} aria-hidden="true" />
        <h2>Actors & Operations</h2>
      </div>
      {operatorActor && (
        <div className="actor-controller" aria-label="AI operator">
          <ActorBox actor={operatorActor} />
        </div>
      )}
      <div className="actor-grid" aria-label="Shared factory actors">
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
        <span className={actor.state}>{actor.state}</span>
      </div>
      <p>{actor.role}</p>
      <small>{actor.operation}</small>
    </div>
  );
}

function CurrentRecordPanel({ activeRun, trolley4Slot }) {
  return (
    <details className="status-panel compact collapsible-panel">
      <summary className="panel-heading">
        <CheckCircle2 size={18} aria-hidden="true" />
        <h2>Current Record</h2>
        <span className={`trace-state ${activeRun ? "ready" : "waiting"}`}>{activeRun ? "ready" : "waiting"}</span>
      </summary>
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
    </details>
  );
}

function AuthorityTracePanel({ activeRun }) {
  const traceReady = Boolean(activeRun?.trace?.actionEnvelopeHash);

  return (
    <details className="status-panel trace-panel collapsible-panel">
      <summary className="panel-heading trace-summary">
        <KeyRound size={18} aria-hidden="true" />
        <h2>Authority Trace</h2>
        <span className={`trace-state ${traceReady ? "derived" : "waiting"}`}>{traceReady ? "derived" : "waiting"}</span>
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

function FactoryLedger({ className = "", events, initiallyOpen = false }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <details
      className={`event-log collapsible-panel ${className}`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="panel-heading">
        <h2>Factory Ledger</h2>
        <span className="trace-state active">{events.length}</span>
      </summary>
      <ol>
        {events.map((event, index) => (
          <li key={`${event.text}-${index}`} className={event.kind}>
            {event.text}
          </li>
        ))}
      </ol>
    </details>
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
