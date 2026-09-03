import { Activity, CheckCircle2, KeyRound } from "lucide-react";

function SidePanel({ activeRun, events, status, trolley4Slot }) {
  return (
    <aside className="side-panel">
      <OperationStatePanel status={status} />
      <CurrentRecordPanel activeRun={activeRun} trolley4Slot={trolley4Slot} />
      <AuthorityTracePanel activeRun={activeRun} />
      <FactoryLedger events={events} />
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

function FactoryLedger({ events }) {
  return (
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
