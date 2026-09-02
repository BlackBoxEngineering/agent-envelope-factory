# AgentEnvelope Factory

Visual manufacturing legitimacy simulator for AgentEnvelope.

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

## Build

```bash
npm run build
```

## Concept

The working concept lives in [digest/factorySetup.md](digest/factorySetup.md).
