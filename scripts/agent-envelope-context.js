import { readFileSync } from "node:fs";

const AGENT_ENVELOPE_DRAFT_01_ID = "draft-mcphillips-agentenvelope-derived-authority-01";
const AGENT_ENVELOPE_DRAFT_01_XML = readFileSync(
  new URL(`./${AGENT_ENVELOPE_DRAFT_01_ID}.xml`, import.meta.url),
  "utf8",
);

const AGENT_ENVELOPE_SYSTEM_CONTEXT = [
  "AgentEnvelope is a domain-neutral IAM and derived-authority substrate for autonomous systems.",
  "It is not limited to AI agents: a bounded actor may be a bot, service, workflow step, device command, access grant, order, instruction, or another system trusted to act.",
  "Its authority spine derives scoped, verifiable action authority from a sovereign root through domains and bounded action identities. Authority is derived rather than represented by a global bearer claim.",
  "The standalone AgentEnvelope SDK is a stateless cryptographic toolkit for deterministic derivation, signing, and offline verification. It requires no account, network, hosted service, human approval, or portal.",
  "The hosted AgentEnvelope portal and governance APIs are optional. They add browser vault and domain management, delegate issuance, legitimacy state, revocation, public records, mint receipts, usage ledgers, and audit trails.",
  "Authority and legitimacy are distinct. A capability can remain cryptographically valid while present-tense legitimacy is denied by client policy, state, evidence, time, revocation, replay, or usage constraints.",
  "Offline SDK verification establishes cryptographic provenance, integrity, and scope. Optional hosted governance can additionally evaluate live legitimacy, delegate revocation, nonce replay, and usage limits. The consuming runtime applies those results and retains the final execution boundary.",
  "AgentEnvelope is runtime-agnostic: it permits an action when the required authority and legitimacy checks pass, but it never compels execution. The consuming system defines its domain policy, evidence model, workers, planning rules, safety rules, and any stricter execution requirements.",
  "This factory simulator is one client implementation of AgentEnvelope. PlannerBot, DispatchAuthority, RobotBot, the evidence authorities, and GovernanceEvaluator are factory-specific roles, not mandatory AgentEnvelope components.",
  "The factory web interface is a demonstration client, not the AgentEnvelope hosted portal. Manual Factory Run needs neither Bedrock nor hosted AgentEnvelope. AI Factory Run adds Bedrock but still does not require the hosted portal. Hosted Records are an optional third setup level.",
  "When asked what AgentEnvelope or the AgentEnvelope SDK is, begin by stating that AgentEnvelope is a domain-neutral IAM and derived-authority spine for autonomous systems, and that the SDK is its standalone offline cryptographic substrate. Then map those general facts to the factory example if useful.",
  "Do not claim that the SDK needs the portal, that AgentEnvelope inherently requires a human in the loop, or that all legitimacy checks happen only in the client. Do not describe the hosted portal as centralized action authority; call it an optional hosted authority head and managed governance service.",
  "Describe derivation, identities, envelopes, and capabilities as deterministic. Say that the SDK supports signing and verification; do not summarize the model as merely producing deterministic signatures. Hosted API keys authorize service access and are not agent action authority.",
].join("\n");

const AGENT_ENVELOPE_DRAFT_01_CONTEXT = [
  `The following reference is the informational AgentEnvelope Internet-Draft ${AGENT_ENVELOPE_DRAFT_01_ID}.`,
  "Use it for AgentEnvelope terminology, architecture, legitimacy, delegation, verification, and the manufacturing example.",
  "For claims about this live factory run, the current visible factory state and recent operator conversation take precedence over the draft.",
  "Do not claim that an optional or illustrative draft feature occurred in the simulator unless the visible state reports it.",
  "Do not infer the cause of an invalid verification result when the supplied state does not include its reason.",
  `<agentenvelope-internet-draft id="${AGENT_ENVELOPE_DRAFT_01_ID}">`,
  AGENT_ENVELOPE_DRAFT_01_XML,
  "</agentenvelope-internet-draft>",
].join("\n");

const DIRECT_FACTORY_ACTION = /^\s*(?:please\s+)?(?:start|begin|stop|move|reset|set|slow|speed|fix|recover|reroute|install|approve|attest|pick\s*up)\b/i;
const EXPLANATORY_REQUEST = /(?:^|[.!?]\s*)(?:please\s+)?(?:what|why|how|explain|describe|summarize|define|tell\s+me\s+about)\b/i;
const AGENT_ENVELOPE_TOPIC = /\b(?:agent\s*envelope|sdk|portal|vault|domain|delegate|legitimacy|authority|verification|warning|ledger|evidence|plannerbot|dispatchauthority)\b/i;

function shouldAttachAgentEnvelopeDraft({ prompt, presetId } = {}) {
  if (presetId) return false;
  const text = String(prompt ?? "").trim();
  if (!text || DIRECT_FACTORY_ACTION.test(text)) return false;
  return EXPLANATORY_REQUEST.test(text) || AGENT_ENVELOPE_TOPIC.test(text);
}

export {
  AGENT_ENVELOPE_DRAFT_01_CONTEXT,
  AGENT_ENVELOPE_DRAFT_01_ID,
  AGENT_ENVELOPE_SYSTEM_CONTEXT,
  shouldAttachAgentEnvelopeDraft,
};
