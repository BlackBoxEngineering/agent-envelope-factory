import { CheckCircle2, ClipboardList, Globe2, KeyRound, Link2, ShieldCheck } from "lucide-react";
import robotDelegate from "../../mint-delegate.json";
import plannerDelegate from "../../mint-delegate.planner.json";
import evidenceDelegate from "../../mint-delegate.evidence.json";
import governanceDelegate from "../../mint-delegate.governance.json";

const DELEGATES = [
  {
    title: "RobotBot execution",
    file: "mint-delegate.json",
    envPrefix: "ROBOT",
    delegate: robotDelegate,
  },
  {
    title: "Evidence attestation authority",
    file: "mint-delegate.evidence.json",
    envPrefix: "EVIDENCE",
    delegate: evidenceDelegate,
  },
  {
    title: "Governance repair authority",
    file: "mint-delegate.governance.json",
    envPrefix: "GOVERNANCE",
    delegate: governanceDelegate,
  },
  {
    title: "PlannerBot reroute authority",
    file: "mint-delegate.planner.json",
    envPrefix: "PLANNER",
    delegate: plannerDelegate,
  },
];

const DOMAIN = robotDelegate.domainSummary?.domainInfo ?? {
  namespace: "factory-automation",
  domainId: "logistic-control",
  kind: "robotics",
};

function SetupGuide({ onBack }) {
  const domainSummary = robotDelegate.domainSummary ?? {};

  return (
    <section className="setup-page">
      <div className="setup-hero">
        <div>
          <h1>Authority branches for the factory demo</h1>
          <p>
            Log into agentenvelope.io, create one robotics domain, issue four legitimacy-bound
            delegates, store their handoff JSON in this app, then add the API key and role secrets locally.
          </p>
        </div>
        <button type="button" onClick={onBack}>
          Back to factory
        </button>
      </div>

      <div className="setup-grid">
        <SetupCard icon={Globe2} title="1. Log into the portal">
          <ol className="setup-steps">
            <li>Open agentenvelope.io and sign in to the hosted governance portal.</li>
            <li>Create or unlock the vault you want this factory authority to derive from.</li>
            <li>Use the same account when creating the API key, domain, legitimacy state, and delegates.</li>
          </ol>
        </SetupCard>

        <SetupCard icon={ShieldCheck} title="2. Create the domain">
          <dl className="setup-facts">
            <Fact label="Namespace">{DOMAIN.namespace}</Fact>
            <Fact label="Domain">{DOMAIN.domainId}</Fact>
            <Fact label="Kind">{DOMAIN.kind}</Fact>
            <Fact label="Fingerprint">{domainSummary.domainFingerprint ?? "created in portal"}</Fact>
            <Fact label="Public address">{domainSummary.domainAddress ?? "derived by portal"}</Fact>
          </dl>
        </SetupCard>

        <SetupCard icon={ClipboardList} title="3. Issue these delegates">
          <div className="delegate-table">
            {DELEGATES.map((item) => (
              <DelegateRow key={item.delegate.delegateId} item={item} />
            ))}
          </div>
        </SetupCard>

        <SetupCard icon={KeyRound} title="4. Fill local env">
          <div className="env-list">
            <code>VITE_AE_API_KEY</code>
            <code>VITE_AE_OWNER_USER_ID</code>
            {DELEGATES.map((item) => (
              <code key={`${item.envPrefix}-key`}>VITE_AE_{item.envPrefix}_BOT_KEY</code>
            ))}
            {DELEGATES.map((item) => (
              <code key={`${item.envPrefix}-mint`}>VITE_AE_{item.envPrefix}_MINT_MATERIAL</code>
            ))}
          </div>
          <p>
            The browser app reads these from `.env.local` for local smoke tests. Do not deploy a
            production build with private `VITE_AE_*` values baked in.
          </p>
        </SetupCard>

        <SetupCard icon={Link2} title="5. Run and check the hosted trail">
          <ol className="setup-steps">
            <li>Start the factory app and confirm Hosted Records says portal active.</li>
            <li>Press Run; each role auto-publishes through API-key hosted routes.</li>
            <li>Open Records to see delegated action records for the factory roles.</li>
            <li>Open Ledger Activity to see mint, register, verify, and legitimacy facts.</li>
          </ol>
        </SetupCard>
      </div>
    </section>
  );
}

function SetupCard({ children, icon: Icon, title }) {
  return (
    <article className="setup-card">
      <div className="setup-card-title">
        <Icon size={18} aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  );
}

function DelegateRow({ item }) {
  const { delegate } = item;

  return (
    <article className="delegate-row">
      <div>
        <strong>{item.title}</strong>
        <span>{delegate.delegateId}</span>
        <small>{item.file}</small>
      </div>
      <div>
        <small>Operations</small>
        <p>{delegate.allowedOperations.join(", ")}</p>
      </div>
      <div>
        <small>Resources</small>
        <p>{delegate.allowedResources.join(", ")}</p>
      </div>
      <div>
        <small>Legitimacy</small>
        <p>{delegate.legitimacyRef?.legitimacyId ?? "not attached"}</p>
      </div>
      <CheckCircle2 size={18} aria-label="Configured" />
    </article>
  );
}

function Fact({ children, label }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default SetupGuide;
