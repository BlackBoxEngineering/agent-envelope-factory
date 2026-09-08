import FactoryFloor from "./components/FactoryFloor.jsx";
import SidePanel from "./components/SidePanel.jsx";
import Toolbar from "./components/Toolbar.jsx";
import useFactorySimulation from "./hooks/useFactorySimulation.js";

function App() {
  const { floorProps, sidePanelProps, toolbarProps } = useFactorySimulation();

  return (
    <main className="app">
      <Toolbar {...toolbarProps} />

      <section className="workspace">
        <SidePanel side="left" {...sidePanelProps} />
        <div className="center-panel">
          <FactoryFloor {...floorProps} />
          <SidePanel side="ledger" {...sidePanelProps} />
        </div>
        <SidePanel side="right" {...sidePanelProps} />
      </section>

      <footer className="app-footer">
        Powered by{" "}
        <a href="https://agentenvelope.io/" target="_blank" rel="noreferrer">
          the AgentEnvelope SDK
        </a>{" "}
        for cryptographically derived authority.
      </footer>
    </main>
  );
}

export default App;
