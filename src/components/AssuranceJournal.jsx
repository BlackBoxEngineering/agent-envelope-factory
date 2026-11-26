import { FileCheck2 } from "lucide-react";

export default function AssuranceJournal({ assurance }) {
  const { records, checkpoint, error } = assurance;
  return (
    <details className="event-log collapsible-panel assurance-journal">
      <summary className="panel-heading">
        <h2>Assurance journal</h2>
        <span className="trace-state">{error ? "Evidence gap" : `${records.length} verified`}</span>
        <FileCheck2 size={17} aria-hidden="true" />
      </summary>
      {error && <p role="status">Assurance evidence gap. {error}</p>}
      {checkpoint && <p>Checkpoint <code title={checkpoint.tip}>{checkpoint.tip.slice(0, 14)}…</code></p>}
      {!records.length && !error && <p>Recorded attempts and outcomes appear here.</p>}
      {!!records.length && (
        <ol aria-label="Assurance events">
          {records.slice(-12).reverse().map(({ event }) => {
            const correlation = event.correlationId;
            const reference = correlation?.includes(":") ? correlation.split(":").at(-1) : correlation?.slice(0, 8);
            return (
              <li key={event.eventId}>
                <strong>{event.kind}</strong>
                {event.reasonCode && <span> · {event.reasonCode}</span>}
                {reference && <small title={correlation}> · {reference}</small>}
              </li>
            );
          })}
        </ol>
      )}
    </details>
  );
}
