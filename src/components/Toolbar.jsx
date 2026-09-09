import { AlertTriangle, BookOpen, Factory, Play, RotateCcw, ShieldAlert } from "lucide-react";

function speedLabel(speed) {
  if (speed === 1) return "normal";
  return speed < 1 ? `${1 / speed}x slower` : `${speed}x faster`;
}

function Toolbar({ canRun, canDisrupt, onRun, onDisrupt, onReset, onSpeedChange, onViewChange, speed, view }) {
  const isRun = view === "run";
  const isSetup = view === "setup";
  const isSpecter = view === "specter";

  return (
    <section className="toolbar" aria-label="Simulator controls">
      <div className="brand">
        <img className="brand-mark" src="/agent-envelope-factory-symbol.png" alt="" aria-hidden="true" />
        <div>
          <h1>AgentEnvelope Factory</h1>
          <p>Signed command and legitimacy flow</p>
        </div>
      </div>
      <div className="toolbar-controls">
        {isRun && (
          <>
            <label className="speed-control" title="Slow the robot down so you can trigger disruptions while it is in transit">
              <span>Robot speed</span>
              <input
                type="range"
                min="-3"
                max="2"
                step="1"
                value={Math.log2(speed)}
                onChange={(event) => onSpeedChange(2 ** Number(event.target.value))}
              />
              <strong>{speedLabel(speed)}</strong>
          </label>
          <div className="actions">
            <button className="primary-action" type="button" onClick={onRun} disabled={!canRun} title="Run signed factory operation">
              <Play size={18} aria-hidden="true" />
              Run
            </button>
            <button className="danger-action" type="button" onClick={onDisrupt} disabled={!canDisrupt} title="Toggle trolley4 between allowed bays">
              <AlertTriangle size={18} aria-hidden="true" />
              Disrupt
            </button>
            <button className="outline-action" type="button" onClick={onReset} title="Reset simulator">
              <RotateCcw size={18} aria-hidden="true" />
              Reset
              </button>
            </div>
          </>
        )}
        <div className="view-switch" aria-label="Factory views">
          <button type="button" className={isRun ? "selected" : ""} onClick={() => onViewChange("run")}>
            <Factory size={16} aria-hidden="true" />
            Factory run
          </button>
          <button type="button" className={isSetup ? "selected" : ""} onClick={() => onViewChange("setup")}>
            <BookOpen size={16} aria-hidden="true" />
            Setup guide
          </button>
          <button type="button" className={isSpecter ? "selected" : ""} onClick={() => onViewChange("specter")}>
            <ShieldAlert size={16} aria-hidden="true" />
            Red Spectre
          </button>
        </div>
      </div>
    </section>
  );
}

export default Toolbar;
