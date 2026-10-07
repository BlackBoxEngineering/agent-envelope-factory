import { Bot, CheckCircle2, ClipboardList, Cloud, Globe2, KeyRound, Link2, ShieldCheck } from "lucide-react";
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
          <h1>Factory setup: Bedrock and hosted records</h1>
          <p>
            Bedrock powers the optional AI operator. The AgentEnvelope portal separately powers the
            optional hosted authority trail. The manual factory works without either service.
          </p>
        </div>
        <button type="button" onClick={onBack}>
          Back to factory
        </button>
      </div>

      <div className="setup-grid">
        <SetupCard icon={Cloud} title="1. Configure Bedrock for the AI run">
          <ol className="setup-steps">
            <li>Use your own AWS account and an IAM identity with <code>bedrock:InvokeModel</code>.</li>
            <li>Confirm the configured Claude model is available in <code>us-east-1</code>.</li>
            <li>Configure AWS SSO or a local AWS profile, then run <code>aws sts get-caller-identity</code>.</li>
            <li>Run <code>npm run dev</code>. The Node bridge resolves your local AWS identity; no AWS credential belongs in this repository.</li>
          </ol>
          <p>
            Bedrock is required only for AI Factory Run. It is independent of hosted AgentEnvelope
            records and never receives the factory's private authority material.
          </p>
        </SetupCard>

        <SetupCard icon={Globe2} title="2. Open the AgentEnvelope portal">
          <ol className="setup-steps">
            <li>Open <a href="https://agentenvelope.io" target="_blank" rel="noreferrer">agentenvelope.io</a> and sign in.</li>
            <li>Create or unlock the vault you want this factory authority to derive from.</li>
            <li>Use the same account for the API key, domain, legitimacy states, and delegates.</li>
            <li>From Account, copy the User ID and create or rotate an API key.</li>
          </ol>
        </SetupCard>

        <SetupCard icon={ShieldCheck} title="3. Create the domain">
          <dl className="setup-facts">
            <Fact label="Namespace">{DOMAIN.namespace}</Fact>
            <Fact label="Domain">{DOMAIN.domainId}</Fact>
            <Fact label="Kind">{DOMAIN.kind}</Fact>
            <Fact label="Fingerprint">{domainSummary.domainFingerprint ?? "created in portal"}</Fact>
            <Fact label="Public address">{domainSummary.domainAddress ?? "derived by portal"}</Fact>
          </dl>
        </SetupCard>

        <SetupCard icon={ClipboardList} title="4. Issue these delegates">
          <p>
            Create each delegate under this domain with attached legitimacy, a future expiry,
            <code> maxUsesPerAction: 1</code>, and only the operations and resources shown below.
          </p>
          <div className="delegate-table">
            {DELEGATES.map((item) => (
              <DelegateRow key={item.delegate.delegateId} item={item} />
            ))}
          </div>
        </SetupCard>

        <SetupCard icon={Bot} title="5. Collect each worker handoff">
          <ol className="setup-steps">
            <li>Copy each delegate's handoff JSON into the matching filename shown above.</li>
            <li>Copy the one-time mint material before leaving the portal; it is not recoverable without unlocking the vault again.</li>
            <li>Generate a separate 32-byte bot key for every role. The portal does not provide worker private keys.</li>
          </ol>
          <pre><code>{`node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"`}</code></pre>
          <p>Run the command four times and keep every result private.</p>
        </SetupCard>

        <SetupCard icon={KeyRound} title="6. Configure the local session">
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
            Prefer entering these values in the Hosted Records panel for the current browser
            session. Alternatively, copy `.env.example` to `.env.local` for repeatable local
            development and restart the dev server. Do not deploy a production build with private
            `VITE_AE_*` values baked in.
          </p>
        </SetupCard>

        <SetupCard icon={Link2} title="7. Run and check the hosted trail">
          <ol className="setup-steps">
            <li>Start the factory app and confirm Hosted Records says portal active.</li>
            <li>Press Run; each role auto-publishes through API-key hosted routes.</li>
            <li>Open Records to see delegated action records for the factory roles.</li>
            <li>Open Ledger Activity to see mint, register, verify, and legitimacy facts.</li>
          </ol>
          <p>
            Hosted Records are optional. Without this portal configuration, the local factory and
            Bedrock operator still run; only hosted publication is skipped.
          </p>
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
