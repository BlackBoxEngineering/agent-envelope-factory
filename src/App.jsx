import { useCallback, useState } from "react";
import FactoryFloor from "./components/FactoryFloor.jsx";
import RedSpecterAttacks from "./components/RedSpecterAttacks.jsx";
import SidePanel from "./components/SidePanel.jsx";
import SetupGuide from "./components/SetupGuide.jsx";
import Toolbar from "./components/Toolbar.jsx";
import useFactorySimulation from "./hooks/useFactorySimulation.js";

const viewIds = new Set(["run", "ai-run", "setup", "specter"]);
const VIEW_STORAGE_KEY = "agent-envelope-factory:view";

function initialView() {
  if (typeof window === "undefined") return "run";
  const requested = new URLSearchParams(window.location.search).get("view");
  if (viewIds.has(requested)) return requested;
  const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return viewIds.has(saved) ? saved : "run";
}

function App() {
  const [view, setView] = useState(initialView);
  const standardSimulation = useFactorySimulation();
  const aiSimulation = useFactorySimulation({ controller: "ai" });
  const isAiRun = view === "ai-run";
  const simulation = isAiRun ? aiSimulation : standardSimulation;
  const changeView = useCallback((nextView) => {
    if (!viewIds.has(nextView)) return;
    setView(nextView);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, nextView);
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    window.history.replaceState({}, "", url);
  }, []);

  return (
    <main className="app">
      <Toolbar {...simulation.toolbarProps} view={view} onViewChange={changeView} />

      {view === "setup" ? (
        <SetupGuide onBack={() => changeView("run")} />
      ) : view === "specter" ? (
        <RedSpecterAttacks onBack={() => changeView("run")} />
      ) : (
        <section className={`workspace ${isAiRun ? "ai-workspace" : ""}`}>
          <SidePanel side={isAiRun ? "ai-left" : "left"} {...simulation.sidePanelProps} />
          <div className="center-panel">
            <SidePanel side="actors" {...simulation.sidePanelProps} />
            <FactoryFloor {...simulation.floorProps} />
            <SidePanel side={isAiRun ? "ai-ledger" : "ledger"} {...simulation.sidePanelProps} />
          </div>
          <SidePanel side={isAiRun ? "ai-right" : "right"} {...simulation.sidePanelProps} />
        </section>
      )}

      <footer className="app-footer">
        Powered by{" "}
        <a href="https://agentenvelope.io/" target="_blank" rel="noreferrer">
          the AgentEnvelope SDK
        </a>{" "}
        and{" "}
        <a href="https://agentenvelope.io/" target="_blank" rel="noreferrer">
          agentenvelope.io hosted governance
        </a>{" "}
        for cryptographically derived authority.
      </footer>
    </main>
  );
}

export default App;
