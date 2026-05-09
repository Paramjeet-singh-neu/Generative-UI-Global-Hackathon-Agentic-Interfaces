"use client";

/**
 * CoachMe+ — CopilotKit v2: LangGraph `Command` updates canvas state; generative UI
 * via `useFrontendTool` (highlightTechnique, generateDrill).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Toaster, toast } from "sonner";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useAgent,
  useConfigureSuggestions,
  useCopilotKit,
  useDefaultRenderTool,
  useFrontendTool,
} from "@copilotkit/react-core/v2";

import CoachingCanvas from "@/components/coaching/CoachingCanvas";
import CoachGenDrillCard from "@/components/coaching/CoachGenDrillCard";
import { ToolFallbackCard } from "@/components/copilot/ToolFallbackCard";
import { ThreadsDrawer } from "@/components/threads-drawer";
import drawerStyles from "@/components/threads-drawer/threads-drawer.module.css";
import type { CoachingData, CoachingSessionStatus } from "@/lib/coaching/types";
import type { AgentState } from "@/lib/leads/types";
import { mergeAgentState } from "@/lib/leads/state";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function canvasStatusFromAgent(state: AgentState): CoachingSessionStatus {
  if (state.coaching_status === "error") return "error";
  if (state.coaching_status === "analyzing") return "analyzing";
  if (state.coaching_data) return "complete";
  return "idle";
}

function CoachCanvasInner() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const state = useMemo(() => mergeAgentState(agent?.state), [agent?.state]);

  const pushAgentState = useCallback(
    (patch: Partial<AgentState>) => {
      if (!agent) return;
      agent.setState({ ...mergeAgentState(agent.state), ...patch });
    },
    [agent],
  );

  const injectPrompt = useCallback(
    (prompt: string) => {
      if (!agent) return;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `msg-${Date.now()}`;
      agent.addMessage({ id, role: "user", content: prompt });
      void copilotkit.runAgent({ agent }).catch((error: unknown) => {
        console.error("injectPrompt: runAgent failed", error);
        toast.error("Could not send message to the agent.");
      });
    },
    [agent, copilotkit],
  );

  const loadMock = useCallback(async () => {
    try {
      const res = await fetch("/api/mock-coaching-data");
      if (!res.ok) {
        toast.error("Could not load mock_coaching_data.json");
        return;
      }
      const data = (await res.json()) as CoachingData;
      pushAgentState({
        coaching_data: data,
        coaching_status: "complete",
        approved_drills: [],
        skipped_drills: [],
        // Offline preview: treat as one “virtual” clip so SessionSummary isn’t empty.
        clips_analyzed: 1,
      });
      toast.success("Loaded mock coaching JSON into agent state");
    } catch {
      toast.error("Failed to fetch mock JSON");
    }
  }, [pushAgentState]);

  useConfigureSuggestions({
    available: "before-first-message",
    suggestions: [
      {
        title: "Analyze a clip",
        message:
          "Analyze my boxing clip with analyze_boxing_clip. My TwelveLabs video_id is YOUR_VIDEO_ID.",
      },
      {
        title: "Fix my jab",
        message: "How do I fix my jab? Give me a drill with generateDrill.",
      },
    ],
  });

  useFrontendTool({
    name: "highlightTechnique",
    description:
      "Highlight a technique the agent wants the athlete to focus on. Call once after analysis for the weakest technique.",
    parameters: z.object({
      technique: z.string(),
      insight: z.string(),
    }),
    render: ({ args }) => (
      <div className="my-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-500/60 dark:bg-amber-950/30">
        <p className="font-semibold text-foreground">
          🔍 Agent focus: {args.technique}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{args.insight}</p>
      </div>
    ),
  });

  useFrontendTool({
    name: "generateDrill",
    description:
      "Render a targeted drill card in chat. Use when the user asks for a fix, drill, or correction work.",
    parameters: z.object({
      name: z.string(),
      reps: z.number(),
      focus: z.string(),
      reason: z.string(),
    }),
    render: ({ args }) => (
      <CoachGenDrillCard
        name={args.name ?? "Drill"}
        reps={args.reps ?? 10}
        focus={args.focus ?? ""}
        reason={args.reason ?? ""}
      />
    ),
  });

  useDefaultRenderTool({
    render: ({ name, status, result, parameters }) => (
      <ToolFallbackCard
        name={name}
        status={status}
        result={result}
        parameters={parameters}
      />
    ),
  });

  const canvasStatus = canvasStatusFromAgent(state);

  const handleMarkerAction = useCallback(
    (ts: { time: number; label: string }) => {
      injectPrompt(
        `I clicked the correction at ${ts.time}s: "${ts.label}". Call generateDrill with one targeted drill for this specific flaw.`,
      );
    },
    [injectPrompt],
  );

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Home
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadMock}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Load mock JSON
              </button>
              <span className="text-xs text-muted-foreground">
                Canvas: <code className="rounded bg-muted px-1">useAgent</code>{" "}
                · Chat:{" "}
                <code className="rounded bg-muted px-1">useFrontendTool</code>
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-6">
          <h1 className="mb-6 text-2xl font-bold text-foreground">
            CoachMe+ 🥊
          </h1>
          <CoachingCanvas
            coachingData={state.coaching_data}
            status={canvasStatus}
            approvedDrills={state.approved_drills}
            skippedDrills={state.skipped_drills}
            clipsAnalyzed={state.clips_analyzed}
            agentCoachingStatus={state.coaching_status}
            onApproveDrill={(name) => {
              if (state.approved_drills.includes(name)) return;
              pushAgentState({
                approved_drills: [...state.approved_drills, name],
              });
            }}
            onSkipDrill={(name) => {
              if (state.skipped_drills.includes(name)) return;
              pushAgentState({
                skipped_drills: [...state.skipped_drills, name],
              });
            }}
            onResetDrillChoices={() => {
              pushAgentState({
                approved_drills: [],
                skipped_drills: [],
              });
              toast.message("Cleared approve/skip lists for this thread.");
            }}
            onAnalyzeAnother={() => {
              pushAgentState({
                coaching_data: null,
                coaching_status: "idle",
              });
            }}
            onMarkerAction={handleMarkerAction}
          />
        </main>
      </div>

      <CopilotSidebar
        defaultOpen
        width={420}
        input={{ disclaimer: () => null, className: "pb-6" }}
      />

      <Toaster richColors position="top-center" />
    </>
  );
}

function CoachHomePage() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  return (
    <div className={drawerStyles.layout}>
      <ThreadsDrawer
        agentId="default"
        threadId={threadId}
        onThreadChange={setThreadId}
      />
      <div className={`${drawerStyles.mainPanel} flex min-h-0 flex-col`}>
        <CopilotChatConfigurationProvider agentId="default" threadId={threadId}>
          <CoachCanvasInner />
        </CopilotChatConfigurationProvider>
      </div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <ClientOnly>
      <CoachHomePage />
    </ClientOnly>
  );
}
