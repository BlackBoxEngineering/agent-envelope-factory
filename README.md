# AgentEnvelope Factory

Visual manufacturing legitimacy simulator for AgentEnvelope.

AgentEnvelope Factory is powered by the AgentEnvelope SDK for cryptographically derived authority.

The simulator shows the manufacturing test as an interactive factory floor:

- DispatchAuthority issues a signed command.
- RobotBot tries to execute it.
- The user can move a trolley to confuse the plan.
- Signature verification can remain valid while legitimacy fails.
- Independent evidence authorities are required before a corrected command is allowed.

## Run

```bash
npm install
npm run dev
```

## Hosted Records Option

The simulator runs fully local by default. To also publish the current factory command into
AgentEnvelope Records and Ledger Activity, create factory delegates in the portal and use the
Hosted Records panel. One click publishes the RobotBot, Evidence, Governance, and Planner records
through their own delegates.

Use a delegate with:

```yaml
Domain:
factory-automation / logistic-control / robotics

Allowed operations:
pickUp

Allowed resources:
bay:*
trolley:*

Max uses per action:
1
```

For local development, copy `.env.example` to `.env.local` and fill the `VITE_AE_*` values. These
mirror the example repo credentials/material, but Vite requires the `VITE_` prefix before browser
code can read them. Put the factory delegate handoff itself in `mint-delegate.json`; the app loads
the delegate id, scope, policy, and delegate legitimacy from that JSON file instead of duplicating
it in env. The factory runtime uses API-key hosted routes only: mint, delegated record registration,
hosted verification, and ledger activity. It does not use Cognito owner auth outside the portal.

For a richer factory trail, keep the same domain and issue separate delegates per role:

```yaml
RobotBot:
  delegate: mint-delegate.json
  operations: pickUp
  resources: bay:*, trolley:*

PlannerBot:
  delegate: mint-delegate.planner.json
  operations: propose-reroute, request-correction
  resources: bay:*, trolley:*, command:*

Evidence authorities:
  delegate: mint-delegate.evidence.json
  operations: attest-location, attest-safety
  resources: bay:*, trolley:*, dock:*

Governance evaluator:
  delegate: mint-delegate.governance.json
  operations: approve-legitimacy, suspend-legitimacy, repair-state
  resources: delegate:*, record:*, command:*
```

Use live hosted credentials here only for local smoke tests. `VITE_AE_*` values are browser-visible
in a static build; production workers should keep API keys, bot keys, and mint material in a server
or worker secret store.

## Build

```bash
npm run build
```
