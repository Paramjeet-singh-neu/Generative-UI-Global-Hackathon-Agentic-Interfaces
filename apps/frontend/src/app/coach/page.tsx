"use client";

/**
 * CoachMe+ route — CopilotKit v2 + LangGraph shared state (same pattern as /leads).
 *
 * Data path: `analyze_boxing_clip` returns `Command(update={ coaching_data, coaching_status })`
 * on the Python agent. CopilotKit mirrors that into `useAgent().state` (STATE_SNAPSHOT).
 * We do **not** parse tool output in a frontend tool — that would duplicate work and miss
 * the snapshot the starter already uses for the CRM canvas.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useAgent,
  useConfigureSuggestions,
  useDefaultRenderTool,
} from "@copilotkit/react-core/v2";

import CoachingCanvas from "@/components/coaching/CoachingCanvas";
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
  const state = useMemo(() => mergeAgentState(agent?.state), [agent?.state]);

  const pushAgentState = useCallback(
    (patch: Partial<AgentState>) => {
      if (!agent) return;
      const next = { ...mergeAgentState(agent.state), ...patch };
      agent.setState(next);
    },
    [agent],
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
        title: "Similar technique search",
        message:
          'Search my index for footage similar to a crisp leading jab with search_similar_techniques.',
      },
    ],
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
                Live: shared LangGraph state via{" "}
                <code className="rounded bg-muted px-1">useAgent</code>
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
