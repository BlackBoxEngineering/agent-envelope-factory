# AgentEnvelope Factory Simulator

## Product Idea

Build a visual simulator that makes AgentEnvelope legitimacy obvious.

The user sees a small factory floor where robots move trolleys between bays and a loading truck.
The simulator runs the same story as the manufacturing legitimacy test:

```text
robot2.pickUp(trolley4, bay7)
```

The command remains cryptographically valid, but the user can move `trolley4` to a different bay.
When current reality contradicts the signed command, RobotBot refuses to act. The system then
requires sufficiently independent evidence before suspending the old legitimacy state and issuing a
corrected command.

## Core Lesson

```text
Signature validity proves provenance and integrity.
Legitimacy decides whether the action remains admissible now.
```

The visual should make this distinction visible without requiring the user to understand the JSON.

## Actors

| Actor | Role |
| --- | --- |
| DispatchAuthority | Issues signed manufacturing commands. |
| RobotBot | Executes only after authority and legitimacy checks pass. |
| WarehouseFeed | Independent evidence source for trolley location. |
| DockSafetyController | Independent evidence source for trolley safety/free state. |
| GovernanceEvaluator | Suspends old legitimacy and creates a fresh basis for corrected commands. |
| PlannerBot | Proposes a corrected command after independent evidence confirms reality. |

## Simulator Loop

1. Initial state says `trolley4` is at `bay7`.
2. DispatchAuthority signs `robot2.pickUp(trolley4, bay7)`.
3. User can drag `trolley4` to another bay.
4. RobotBot moves toward the signed command target.
5. RobotBot checks current reality before pickup.
6. If the trolley is not there, signature remains valid but legitimacy is denied as
   `state.mismatched`.
7. RobotBot evidence alone is rejected as `evidence.not_independent`.
8. WarehouseFeed and DockSafetyController confirm current trolley location.
9. GovernanceEvaluator signs a legitimacy event and suspends the old state.
10. PlannerBot proposes a corrected command for the observed bay.
11. Governance creates fresh legitimacy and the robot loads the trolley into the truck.

## Rules

- A valid signature alone is not enough to execute.
- RobotBot cannot renew its own legitimacy.
- At least two trusted independent evidence sources are required for renewal.
- Operations must stay inside the policy: `pickUp`.
- Bay resources must stay inside the policy: `bay4`, `bay7`.
- Every major transition should leave a visible record in the event log.

## First Version Scope

The initial app should include:

- one robot;
- one critical trolley, plus optional background trolleys;
- bays `bay1`, `bay4`, `bay7`;
- a loading truck;
- drag/drop trolley movement;
- an automated run button;
- visible signature and legitimacy status;
- evidence independence status;
- a concise audit/event timeline.

## Later Versions

- Multiple robots and trolleys.
- Queue of signed commands.
- Fault injection controls for stale evidence, untrusted evidence, revoked delegates, and expired
  legitimacy.
- Hosted API mode using real `AE_API_KEY`, stored delegates, mint receipts, and hosted records.
- Public product demo mode for `agent-envelope-web`.
- Scenario presets: warehouse loading, manufacturing cells, support bots, workflow runners.
