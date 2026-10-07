# AgentEnvelope Factory

Visual manufacturing legitimacy simulator for AgentEnvelope.

This app demonstrates how a factory command moves through scoped authority, signed command records,
independent evidence, hosted verification, and legitimacy checks before a robot action is allowed.
It now has two separate factory runs:

- `Factory Run`: the original no-AI simulator controlled by the user.
- `AI Factory Run`: a Bedrock-backed LLM operator replaces the human troubleshooter, while AgentEnvelope still gates every factory-changing tool call.

The repo is marked private in `package.json`. Treat it as a deployable demo repo, not a public sample
with baked credentials.

## What Is In The App

The toolbar exposes four views:

- `Factory Run`: manual simulation. The user starts, disrupts, resets, and changes robot speed.
- `AI Factory Run`: live prompt console backed by the local Bedrock bridge. The LLM can answer read-only questions in chat or request one gated factory tool.
- `Setup Guide`: hosted governance setup notes for the factory delegates and env values.
- `Red Spectre`: attack-surface mapping plus the AI Factory Run prompt-pressure tests.

The selected view persists in `localStorage` under `agent-envelope-factory:view` and can also be set
with `?view=run`, `?view=ai-run`, `?view=setup`, or `?view=specter`.

## Authority Flow

The factory actors are defined in `src/factoryConfig.js`:

- `DispatchAuthority`: issues the signed command.
- `RobotBot`: executes the scoped `pickUp` action.
- `WarehouseFeed` and `DockSafetyController`: provide independent location/safety evidence.
- `GovernanceEvaluator`: evaluates legitimacy.
- `LlmOperator`: AI run operator identity used for routed LLM proposals.

The basic command is `robot2.pickUp(trolley4, bay5)`. Bay 5 gives the operator a longer visible
travel window in which to move trolley4. If trolley4 moves while RobotBot is travelling,
the system requires fresh evidence and a corrected command before execution can continue.

## Manual Factory Run

The manual factory keeps the original no-AI behavior:

- The user presses `Run`.
- The user can move trolley4 to create a blocker.
- The left rail contains handled disruptions and hack command examples.
- The Factory Ledger starts open beneath the floor plan so the event trail follows the simulation visually.
- The right rail contains collapsible hosted records, authority head, current record, and authority
  trace panels.

This page should remain free of AI operator chat or Bedrock behavior.

## AI Factory Run

The AI factory uses the same simulation and planning chain as the manual Factory Run. The only
controller difference is who occupies the human operator seat:

```text
Factory Run:    human user  -> Planner Bot -> Dispatch -> Robot -> Evidence -> Governance
AI Factory Run: LLM operator -> Planner Bot -> Dispatch -> Robot -> Evidence -> Governance
```

The LLM submits operator intent; it does not replace Planner Bot or any authority, execution,
evidence, or governance actor.

The left rail is the operator plane: operation state, Bedrock connection, docked chat, proposed
action, intent history, and Red Spectre tests. The chat can still be popped out to another display.
The Factory Ledger starts open beneath the floor plan, matching the manual run. The right rail is the
authority and audit plane: current record, authority trace, then hosted records.

The LLM can:

- start or stop the line;
- slow down or speed up RobotBot;
- move trolley4 in visible simulator state;
- explain blockers in chat;
- propose bounded recovery commands;
- request a corrected scoped command;
- answer read-only questions about the visible app state.

The LLM cannot make authority true by saying so. Factory-changing requests become proposed tool calls
and are then handled by the AgentEnvelope gate in `src/hooks/useFactorySimulation.js`.

Every AI request includes a seedless `factoryPlan` snapshot derived from the same factory configuration
as the manual run. It identifies the objective, signed target, observed trolley location, evidence
requirements, whether recovery is actually required, and the next valid step. Recent factory events
and operator messages provide continuity; current simulator state remains authoritative. Read-only
chat does not pause or cancel an in-flight factory run.

After either operator starts a run, a location mismatch is handled by the shared factory plan rather
than requiring another operator instruction. RobotBot stops under the stale command, Planner Bot uses
fresh independent evidence, Dispatch Authority issues a new scoped command, Governance evaluates it,
and execution resumes. If trolley4 moves again, the same governed recovery loop repeats until RobotBot
reaches its current location. The LLM cannot mint or approve that recovery authority.

Use `Pop out` in the operator chat header to open the live conversation in a separate browser window
that can be moved to another display. The draft and conversation stay connected to the factory page;
use `Dock chat`, press Escape, or close the pop-out to return it to the page. If the browser blocks
the new window, the chat opens in the full-page overlay instead.

Red Spectre pressure prompts are shown in the AI left rail and documented on the Red Spectre page.
They try to induce overreach, supply-chain installation, fake evidence, intent fragmentation, and
direct command injection. Each preset requests its matching out-of-envelope Bedrock tool so the demo
shows AgentEnvelope recording the distinct policy denial. A denied attack stops any in-flight run.

## Bedrock Bridge

The browser does not call Bedrock directly. During local development, `npm run dev` starts the
Bedrock bridge and Vite app together. The bridge runs in Node watch mode so tool-schema and
factory-plan changes reload automatically. The browser checks the bridge contract version and
rejects stale responses instead of presenting answers generated from an outdated factory schema.
The bridge can also be run on its own for debugging:

```bash
npm run ai:bridge
```

Default bridge settings from `scripts/ai-operator-bridge.js`:

```text
AI_OPERATOR_BRIDGE_HOST=127.0.0.1
AI_OPERATOR_BRIDGE_PORT=8787
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
```

The browser posts prompts to:

```text
VITE_AI_OPERATOR_BRIDGE_URL=http://127.0.0.1:8787/ai/operator
```

Set `VITE_AI_OPERATOR_BRIDGE_URL` only if the bridge runs somewhere else.

The bridge exposes:

- `GET /health`
- `POST /ai/operator`

It sends Bedrock the external prompt, visible simulator state, and tool schemas. It does not receive
AgentEnvelope seeds, private keys, bot keys, mint material, AWS secrets, or hosted API secrets.

Use AWS credentials from your local environment, profile, or the same Bedrock setup pattern used by
`agent-envelope-example`.

## Run Locally

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

That starts both local processes:

- the Vite app on a local browser URL;
- the Bedrock bridge on `http://127.0.0.1:8787`.

Then open the Vite URL and select `AI Factory Run`.

For app-only debugging, use:

```bash
npm run dev:vite
```

## AI Factory Smoke Tests

The Playwright smoke suite uses a deterministic local operator bridge. It does not call Bedrock and
does not require AWS or AgentEnvelope hosted credentials.

```bash
npm run test:smoke
```

The suite verifies:

- the production bridge health contract and canonical Bays 1–8 configuration;
- the AI page and bridge-plan context;
- the signed Bay 5 start followed by a requested Bay 2 disruption;
- safe rejection of the stale command and recovery with a fresh Bay 2 command;
- the complete LLM Operator -> Planner Bot -> governed recovery chain for a compound request;
- that read-only chat does not cancel an in-flight run;
- that recovery is blocked when there is no location mismatch;
- moving chat into a separate pop-out window and docking it again without losing a draft prompt.

Windows runs use the installed Microsoft Edge channel by default. On other platforms, install the
Playwright Chromium binary once before running the suite:

```bash
npm run test:smoke:install
```

Use `npm run test:smoke:headed` to watch the browser. CI runs the same suite through
`.github/workflows/ai-factory-smoke.yml`.

## Hosted Records

The simulator runs fully local by default. If hosted credentials are configured, signed factory
commands auto-publish through AgentEnvelope hosted governance. There is no publish button in the
current UI.

The hosted path uses API-key routes for:

- mint;
- delegated record registration;
- hosted verification;
- ledger activity.

Copy `.env.example` to `.env.local` for local smoke tests:

```text
VITE_AE_API_KEY=
VITE_AE_OWNER_USER_ID=
VITE_AE_API_BASE=https://jemdjwteae.execute-api.us-east-1.amazonaws.com/v1

VITE_AE_ROBOT_BOT_KEY=
VITE_AE_ROBOT_MINT_MATERIAL=
VITE_AE_PLANNER_BOT_KEY=
VITE_AE_PLANNER_MINT_MATERIAL=
VITE_AE_EVIDENCE_BOT_KEY=
VITE_AE_EVIDENCE_MINT_MATERIAL=
VITE_AE_GOVERNANCE_BOT_KEY=
VITE_AE_GOVERNANCE_MINT_MATERIAL=
```

Delegate JSON files are loaded from:

- `mint-delegate.json`
- `mint-delegate.planner.json`
- `mint-delegate.evidence.json`
- `mint-delegate.governance.json`

The expected factory domain is:

```yaml
factory-automation / logistic-control / robotics
```

Role scopes:

```yaml
RobotBot:
  operations: pickUp
  resources: bay:*, trolley:*

PlannerBot:
  operations: propose-reroute, request-correction
  resources: bay:*, trolley:*, command:*

Evidence authorities:
  operations: attest-location, attest-safety
  resources: bay:*, trolley:*, dock:*

Governance evaluator:
  operations: approve-legitimacy, suspend-legitimacy, repair-state
  resources: delegate:*, record:*, command:*
```

`VITE_AE_*` values are browser-visible in a static build. For a real deployment, keep API keys, bot
keys, mint material, Bedrock credentials, and other secrets in a server or worker secret store.

## Red Spectre

The Red Spectre page maps Red Specter/SPECTER SLOPSQUAT style risks into the factory demo:

- hallucinated dependencies;
- registry-gap squats;
- install-time payloads;
- scope jump commands;
- evidence-chain injection;
- CI/CD secret compromise;
- autonomous attack orchestration.

It also documents the AI Factory Run pressure tests against the Bedrock LLM operator. The point is
to show that the LLM can be prompted or corrupted, but the resulting authority still has to pass
through AgentEnvelope's scoped records, evidence, legitimacy, and hosted trail.

## Build

```bash
npm run build
```

## Useful Files

- `src/App.jsx`: view selection and separate manual/AI simulation instances.
- `src/hooks/useFactorySimulation.js`: simulation workflow, AI tool gating, hosted auto-publish.
- `src/components/SidePanel.jsx`: left/right rails, AI chat, Red Spectre tests, collapsible records.
- `src/components/RedSpecterAttacks.jsx`: Red Spectre page content.
- `src/components/Toolbar.jsx`: top-level controls and tabs.
- `src/factoryHosted.js`: hosted governance API integration.
- `scripts/ai-operator-bridge.js`: local Bedrock bridge.
