import { serve } from "@hono/node-server";
import {
  CopilotRuntime,
  CopilotKitIntelligence,
  createCopilotEndpoint,
} from "@copilotkit/runtime/v2";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

/** LangGraph + in-memory runner — no Docker Intelligence / Postgres threads. */
const sseOnlyRuntime =
  process.env.COPILOT_RUNTIME_SSE_ONLY === "1" ||
  process.env.COPILOT_RUNTIME_SSE_ONLY === "true";

const intelligence = new CopilotKitIntelligence({
  apiKey:
    process.env.INTELLIGENCE_API_KEY ?? "cpk_sPRVSEED_seed0privat0longtoken00",
  apiUrl: process.env.INTELLIGENCE_API_URL ?? "http://localhost:4203",
  wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL ?? "ws://localhost:4403",
});

const agent = new LangGraphAgent({
  deploymentUrl:
    process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:8133",
  graphId: "default",
  langsmithApiKey: process.env.LANGSMITH_API_KEY ?? "",
  // 60 (vs LangGraph default 25) leaves headroom for the deepagents planner
  // loop on multi-step turns like "draft email + queue".
  assistantConfig: {
    recursion_limit: Number(process.env.LANGGRAPH_RECURSION_LIMIT ?? 60),
  },
});

const disableHttpMcp =
  process.env.BFF_DISABLE_HTTP_MCP === "1" ||
  process.env.BFF_DISABLE_HTTP_MCP === "true";

const sharedRuntimeFields = {
  licenseToken: process.env.COPILOTKIT_LICENSE_TOKEN,
  agents: { default: agent },
  openGenerativeUI: true as const,
  a2ui: { injectA2UITool: true },
  // Optional HTTP MCP (mcp-use Manufact). Boxing-coach MCP is stdio-side in the LangGraph agent.
  ...(disableHttpMcp
    ? {}
    : {
        mcpApps: {
          servers: [
            {
              type: "http" as const,
              url: process.env.MCP_SERVER_URL || "http://localhost:3001/mcp",
              serverId: "manufact_local",
            },
          ],
        },
      }),
};

const app = createCopilotEndpoint({
  basePath: "/api/copilotkit",
  runtime: new CopilotRuntime(
    sseOnlyRuntime
      ? sharedRuntimeFields
      : {
          ...sharedRuntimeFields,
          intelligence,
          identifyUser: () => ({ id: "default", name: "Hackathon User" }),
        },
  ),
});

// Rewrite known 5xx error bodies into structured `{ error, hint, command }`
// payloads the UI can render as actionable toasts. Conservative matching —
// we only remap when we can identify the failure from the body, so unknown
// 5xx errors fall through unchanged.
app.use("*", async (c, next) => {
  await next();
  const status = c.res.status;
  if (status < 500 || status > 599) return;
  const cloned = c.res.clone();
  const ctype = cloned.headers.get("content-type") || "";
  if (!ctype.includes("json") && !ctype.includes("text")) return;
  let body: string;
  try {
    body = await cloned.text();
  } catch {
    return;
  }
  const isThreadInitGeneric =
    body.includes("Failed to initialize thread") &&
    !body.includes("threads_user_id_fkey") &&
    !body.includes("user_id");
  if (isThreadInitGeneric) {
    const remapped = {
      error: "CopilotKit Intelligence unavailable",
      hint:
        "Docker Intelligence is not running. Either run `npm run dev` from the repo root, or set COPILOT_RUNTIME_SSE_ONLY=1 in `.env` and restart this BFF (LangGraph chat works; durable threads & thread drawer stay offline until Intelligence is up).",
      command: "sse-only-or-docker",
    };
    c.res = new Response(JSON.stringify(remapped), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    return;
  }

  const isThreadFkey =
    body.includes("threads_user_id_fkey") ||
    (body.includes("Failed to initialize thread") &&
      body.includes("user_id"));
  if (isThreadFkey) {
    const remapped = {
      error: "Postgres user seed missing",
      hint: "Run `npm run seed` to seed the default user, then retry.",
      command: "npm run seed",
    };
    c.res = new Response(JSON.stringify(remapped), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    return;
  }

  // AgentThreadLockedError: a prior run errored mid-stream and the LangGraph
  // SDK's per-thread lock didn't release. The thread is unrecoverable; the
  // hint tells the user to start a new conversation.
  const isThreadLocked =
    body.includes("AgentThreadLockedError") ||
    /Thread\s+[0-9a-f-]{36}\s+is locked/i.test(body);
  if (isThreadLocked) {
    const remapped = {
      error: "Thread is locked",
      hint:
        "A previous turn errored mid-stream and didn't release the run " +
        "lock. Start a new conversation (sidebar → +) to continue.",
      command: "new-thread",
    };
    c.res = new Response(JSON.stringify(remapped), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    return;
  }
});

// Align with apps/frontend/next.config.ts default `BFF_URL` (http://localhost:4010).
const port = Number(process.env.PORT) || 4010;

serve({ fetch: app.fetch, port }, () => {
  console.log(`BFF ready at http://localhost:${port}`);
  if (sseOnlyRuntime) {
    console.log(
      "[bff] COPILOT_RUNTIME_SSE_ONLY — Intelligence threads disabled; using in-memory SSE runner.",
    );
  }
});
