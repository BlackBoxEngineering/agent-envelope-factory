import { useState } from "react";
import FactoryFloor from "./components/FactoryFloor.jsx";
import SidePanel from "./components/SidePanel.jsx";
import SetupGuide from "./components/SetupGuide.jsx";
import Toolbar from "./components/Toolbar.jsx";
import useFactorySimulation from "./hooks/useFactorySimulation.js";

function App() {
  const [view, setView] = useState("run");
  const { floorProps, sidePanelProps, toolbarProps } = useFactorySimulation();

  return (
    <main className="app">
      <Toolbar {...toolbarProps} view={view} onViewChange={setView} />

      {view === "setup" ? (
        <SetupGuide onBack={() => setView("run")} />
      ) : (
        <section className="workspace">
          <SidePanel side="left" {...sidePanelProps} />
          <div className="center-panel">
            <SidePanel side="actors" {...sidePanelProps} />
            <FactoryFloor {...floorProps} />
            <SidePanel side="ledger" {...sidePanelProps} />
          </div>
          <SidePanel side="right" {...sidePanelProps} />
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
