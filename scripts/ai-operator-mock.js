import { createServer } from "node:http";
import { AI_OPERATOR_CONTRACT_VERSION, authorityPolicy, factoryPlan, redSpectreToolCalls } from "../src/factoryConfig.js";

const HOST = "127.0.0.1";
const PORT = 8798;
const INITIAL_TARGET = factoryPlan.command.initialTarget;

function send(res, status, body) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function responseFor(body) {
  const prompt = String(body.prompt ?? "").toLowerCase();
  const observedBay = body.state?.factoryPlan?.current?.observedTrolleyLocation;
  const requestedBay = prompt.match(/bay\s*([1-8])/)?.[1];
  const redSpectreToolCall = redSpectreToolCalls[body.presetId];

  if (redSpectreToolCall) {
    return {
      text: `Mock Bedrock accepted the ${body.presetId} pressure prompt and proposed ${redSpectreToolCall.name}; AgentEnvelope must decide whether it is authorized.`,
      toolCall: redSpectreToolCall,
    };
  }

  if (/start|begin/.test(prompt)) {
    const disruptionBayId = requestedBay ? `bay${requestedBay}` : /disrupt/.test(prompt) ? "bay3" : undefined;
    return {
      text: disruptionBayId
        ? `Mock operator will start the signed run and move trolley4 to ${disruptionBayId}; PlannerBot will handle any resulting mismatch.`
        : `Mock operator will start the signed ${INITIAL_TARGET} run.`,
      toolCall: {
        name: "start_run",
        input: {
          ...(disruptionBayId ? { disruptionBayId } : {}),
          reason: "Deterministic AI Factory smoke test.",
        },
      },
    };
  }

  if (/\bmove\b.*trolley|trolley.*\bmove\b/.test(prompt)) {
    const bayId = requestedBay ? `bay${requestedBay}` : "bay7";
    return {
      text: `Mock operator will move trolley4 to ${bayId} as visible simulator state.`,
      toolCall: {
        name: "move_trolley",
        input: {
          bayId,
          reason: "Deterministic operator disruption smoke test.",
        },
      },
    };
  }

  if (/fix|recover|correct|reroute/.test(prompt)) {
    return {
      text: `Mock operator will request a corrected command for ${observedBay ?? "the observed bay"}.`,
      toolCall: {
        name: "request_correction",
        input: {
          bayId: observedBay ?? INITIAL_TARGET,
          reason: "Deterministic recovery smoke test.",
        },
      },
    };
  }

  return {
    text: `The active plan is to collect trolley4 from the signed target, verify reality independently, and load it into the truck. Current phase: ${body.state?.phase ?? "unknown"}.`,
    toolCall: null,
  };
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    send(res, 200, {
      ok: true,
      provider: "smoke-test",
      contractVersion: AI_OPERATOR_CONTRACT_VERSION,
      factoryBays: authorityPolicy.bays,
      modelId: "deterministic-smoke-model",
      region: "local",
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/ai/operator") {
    send(res, 404, { error: "Not found" });
    return;
  }

  try {
    const body = await readJson(req);
    const visibleBays = body.state?.visibleFactoryBays?.map((bay) => bay.bayId);
    const hasPlanContext = body.state?.factoryPlan?.planId === "collect-trolley4";
    if (!hasPlanContext || JSON.stringify(visibleBays) !== JSON.stringify(authorityPolicy.bays)) {
      send(res, 422, { error: "AI Factory request is missing the canonical plan or visible bay context" });
      return;
    }
    send(res, 200, {
      provider: "smoke-test",
      contractVersion: AI_OPERATOR_CONTRACT_VERSION,
      factoryBays: authorityPolicy.bays,
      modelId: "deterministic-smoke-model",
      region: "local",
      ...responseFor(body),
    });
  } catch (error) {
    send(res, 400, { error: error instanceof Error ? error.message : "Invalid request" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AI operator smoke mock listening at http://${HOST}:${PORT}`);
});
