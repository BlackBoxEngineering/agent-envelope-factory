import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileWarning,
  KeyRound,
  Package,
  ShieldCheck,
  Terminal,
} from "lucide-react";

const SOURCES = {
  redSpecter: "https://red-specter.co.uk/",
  richardGithub: "https://github.com/RichardBarron27",
  slopsquat: "https://github.com/RichardBarron27/specter-slopsquat",
  packageHallucinationPaper: "https://doi.org/10.5281/zenodo.22276701",
  codingAssistantPaper: "https://doi.org/10.5281/zenodo.22227843",
};

const CITED_SOURCES = [
  {
    label: "Red Specter Security",
    href: SOURCES.redSpecter,
    note: "Official research site covering offensive, defensive, forensic, and evaluation platforms.",
  },
  {
    label: "RichardBarron27 GitHub",
    href: SOURCES.richardGithub,
    note: "Tool catalogue and platform map for Red Specter AI security research.",
  },
  {
    label: "SPECTER SLOPSQUAT",
    href: SOURCES.slopsquat,
    note: "Hallucinated dependency injection, registry-gap squatting, scoring, and signed evidence reports.",
  },
  {
    label: "Package hallucination paper",
    href: SOURCES.packageHallucinationPaper,
    note: "Published Red Specter research on LLM package hallucinations.",
  },
  {
    label: "AI coding assistant paper",
    href: SOURCES.codingAssistantPaper,
    note: "Red Specter research on coding assistant attack surfaces.",
  },
];

const ATTACKS = [
  {
    title: "Hallucinated dependency",
    source: "S1 elicitation",
    sourceHref: SOURCES.slopsquat,
    artifact: "npm install factory-route-optimizer",
    attack: "An assistant invents a plausible factory package while generating robot orchestration code.",
    boundary: "No package name can mint factory authority. RobotBot still needs a scoped delegate, mint material, bot key, and hosted legitimacy check.",
    outcome: "Blocked as missing authority",
  },
  {
    title: "Registry gap squat",
    source: "S2-S5 scoring",
    sourceHref: SOURCES.slopsquat,
    artifact: "express_core -> express",
    attack: "A non-existent or near-name package is identified as squattable, then offered back to the build chain.",
    boundary: "The build-chain risk is real, but it is outside the action envelope. The package cannot sign pickUp, attest-safety, or repair-state.",
    outcome: "Contained at command scope",
  },
  {
    title: "Install-time payload",
    source: "ARMORY templates",
    sourceHref: SOURCES.richardGithub,
    artifact: "postinstall.js / setup.py",
    attack: "A malicious install hook tries to execute during dependency installation or CI setup.",
    boundary: "Hosted governance never receives root seeds, action seeds, or bot private keys. A compromised dependency can be evidence, not authority.",
    outcome: "Escalate to environment review",
  },
  {
    title: "Scope jump command",
    source: "Factory attack surface",
    sourceHref: SOURCES.codingAssistantPaper,
    artifact: "pickUp -> export-customer-data",
    attack: "A tool tries to swap the signed factory operation for an action outside the delegate boundary.",
    boundary: "Canonical JSON and signature recovery bind operation, resources, index, time window, and delegate legitimacy together.",
    outcome: "Denied by envelope mismatch",
  },
  {
    title: "Evidence-chain injection",
    source: "S6-S8 reports",
    sourceHref: SOURCES.slopsquat,
    artifact: "Ed25519 signed evidence report",
    attack: "A valid Red SPECTER report is submitted as proof of a risky dependency or workflow.",
    boundary: "Signed evidence can inform legitimacy, but it does not become robot authority. The portal records the decision trail separately.",
    outcome: "Accepted only as evidence",
  },
  {
    title: "CI/CD secret compromise",
    source: "PRION vector",
    sourceHref: SOURCES.richardGithub,
    artifact: "requirements.txt -> install hook -> build secret",
    attack: "A hallucinated package lands in automation, executes during install, and attempts to steal build secrets.",
    boundary: "Secrets are environment risk, not sovereign authority. A stolen API key still cannot derive root authority or invent an admissible delegate.",
    outcome: "Stop and rotate environment",
  },
  {
    title: "Autonomous attack orchestration",
    source: "S7 WARLORD",
    sourceHref: SOURCES.slopsquat,
    artifact: "tool_id: T282 / mode: full",
    attack: "An external orchestrator tries to turn a discovered package vector into a factory command path.",
    boundary: "Factory operations must pass role delegate scope. Orchestrator intent is not authority, and broad tool output cannot bypass canonical envelopes.",
    outcome: "Denied by role boundary",
  },
];

const PIPELINE = [
  "Elicit hallucinated package names from assistants.",
  "Check package names against real registries.",
  "Score squattability by proximity, relevance, homoglyphs, and registry gap.",
  "Build a five-step evidence chain for the candidate.",
  "Sign the resulting report with Ed25519 evidence keys.",
];

const TOOL_MAPPINGS = [
  {
    tool: "GOLEM / SPECTER TITAN",
    surface: "Physical robotics and embodied AI",
    factory: "Robot commands must still be scoped to pickUp, bay, trolley, index, and legitimacy.",
    href: SOURCES.richardGithub,
  },
  {
    tool: "VANTAGE / PHANTOM-PROOF",
    surface: "Telemetry, logs, and provenance integrity",
    factory: "Evidence is checked separately from command authority and then recorded in the hosted trail.",
    href: SOURCES.richardGithub,
  },
  {
    tool: "SPECTER MANDATE",
    surface: "Governance integrity and approval forgery",
    factory: "Approval only counts when it comes from the legitimacy-bound governance branch.",
    href: SOURCES.richardGithub,
  },
  {
    tool: "SPECTER ORCHESTRATOR / SIF",
    surface: "Workflow manipulation and semantic intent fragmentation",
    factory: "Small permitted steps cannot smuggle an unapproved aggregate action through the portal.",
    href: SOURCES.slopsquat,
  },
  {
    tool: "HYDRA / SPECTER BAZAAR / TOXSKILL",
    surface: "Supply chain, marketplace, and skill poisoning",
    factory: "Untrusted code can be evidence of compromise, but never root authority.",
    href: SOURCES.slopsquat,
  },
  {
    tool: "SPECTER FORGERY / DELEGATE",
    surface: "Agent identity forgery and delegated identity abuse",
    factory: "Bot identity is not enough; the delegate, signature, resources, and hosted policy must line up.",
    href: SOURCES.richardGithub,
  },
];

function RedSpecterAttacks({ onBack }) {
  return (
    <section className="setup-page specter-page">
      <div className="setup-hero">
        <div>
          <div className="specter-title-lockup">
            <img className="specter-logo" src="/red-spectre-security.png" alt="Red Spectre Security" />
            <h1>Red Spectre attack surface</h1>
          </div>
          <p>
            A safe factory-facing map of{" "}
            <a href={SOURCES.redSpecter} target="_blank" rel="noreferrer">
              Red Specter Security
            </a>
            's{" "}
            <a href={SOURCES.slopsquat} target="_blank" rel="noreferrer">
              SPECTER SLOPSQUAT
            </a>{" "}
            work: hallucinated dependency injection, registry-gap squatting, install hooks, and
            signed evidence reports.
          </p>
        </div>
        <button type="button" onClick={onBack}>
          Back to factory
        </button>
      </div>

      <div className="setup-grid">
        <section className="setup-card specter-intro">
          <div className="setup-card-title">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2>What this tab does</h2>
          </div>
          <p>
            This page does not run Red SPECTER tooling, call LLMs, check registries, install packages,
            or execute payload templates. It turns the repo's attack concepts into factory-demo
            scenarios so the authority boundary is visible.
          </p>
          <div className="specter-source-strip" aria-label="Cited Red Specter sources">
            {CITED_SOURCES.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
                <strong>
                  {source.label}
                  <ExternalLink size={13} aria-hidden="true" />
                </strong>
                <span>{source.note}</span>
              </a>
            ))}
          </div>
          <div className="specter-pipeline" aria-label="Red SPECTER pipeline">
            {PIPELINE.map((step, index) => (
              <article key={step}>
                <span>S{index + 1}</span>
                <p>{step}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="setup-card">
          <div className="setup-card-title">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2>Attack cards for the factory</h2>
          </div>
          <div className="specter-attacks">
            {ATTACKS.map((attack) => (
              <AttackCard key={attack.title} attack={attack} />
            ))}
          </div>
        </section>

        <section className="setup-card specter-boundary">
          <div className="setup-card-title">
            <KeyRound size={18} aria-hidden="true" />
            <h2>Boundary statement</h2>
          </div>
          <div className="specter-boundary-grid">
            <article>
              <h3>Supply-chain risk</h3>
              <p>
                Red SPECTER can expose a real development or CI compromise route through hallucinated
                packages, registry gaps, and install-time execution.
              </p>
            </article>
            <article>
              <h3>AgentEnvelope control</h3>
              <p>
                The factory accepts work only when authority is derived, scoped, signed, legitimacy-bound,
                and verified through the hosted record trail.
              </p>
            </article>
          </div>
        </section>

        <section className="setup-card">
          <div className="setup-card-title">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2>Broader Red Spectre mappings</h2>
          </div>
          <div className="specter-mappings">
            {TOOL_MAPPINGS.map((mapping) => (
              <article key={mapping.tool}>
                <a className="specter-mapping-link" href={mapping.href} target="_blank" rel="noreferrer">
                  {mapping.tool}
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
                <span>{mapping.surface}</span>
                <p>{mapping.factory}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function AttackCard({ attack }) {
  return (
    <article className="specter-attack-card">
      <header>
        <div>
          <a className="specter-source-link" href={attack.sourceHref} target="_blank" rel="noreferrer">
            {attack.source}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          <h3>{attack.title}</h3>
        </div>
        <CheckCircle2 size={18} aria-label={attack.outcome} />
      </header>
      <pre>
        <code>{attack.artifact}</code>
      </pre>
      <dl>
        <div>
          <dt>
            <Package size={14} aria-hidden="true" />
            Attack
          </dt>
          <dd>{attack.attack}</dd>
        </div>
        <div>
          <dt>
            <Terminal size={14} aria-hidden="true" />
            Boundary
          </dt>
          <dd>{attack.boundary}</dd>
        </div>
        <div>
          <dt>
            <FileWarning size={14} aria-hidden="true" />
            Result
          </dt>
          <dd>{attack.outcome}</dd>
        </div>
      </dl>
    </article>
  );
}

export default RedSpecterAttacks;
