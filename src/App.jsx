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
        <FactoryFloor {...floorProps} />
        <SidePanel {...sidePanelProps} />
      </section>
    </main>
  );
}

export default App;
