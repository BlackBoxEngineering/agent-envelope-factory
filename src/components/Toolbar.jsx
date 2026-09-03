import { AlertTriangle, Factory, Play, RotateCcw } from "lucide-react";

function Toolbar({ canRun, canDisrupt, onRun, onDisrupt, onReset }) {
  return (
    <section className="toolbar" aria-label="Simulator controls">
      <div className="brand">
        <Factory size={24} aria-hidden="true" />
        <div>
          <h1>AgentEnvelope Factory</h1>
          <p>Manufacturing legitimacy simulator</p>
        </div>
      </div>
      <div className="actions">
        <button type="button" onClick={onRun} disabled={!canRun} title="Run signed factory operation">
          <Play size={18} aria-hidden="true" />
          Run
        </button>
        <button type="button" onClick={onDisrupt} disabled={!canDisrupt} title="Toggle trolley4 between allowed bays">
          <AlertTriangle size={18} aria-hidden="true" />
          Disrupt
        </button>
        <button type="button" onClick={onReset} title="Reset simulator">
          <RotateCcw size={18} aria-hidden="true" />
          Reset
        </button>
      </div>
    </section>
  );
}

export default Toolbar;
