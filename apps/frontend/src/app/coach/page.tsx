"use client";

/**
 * CoachMe+ route — CopilotKit v2 + LangGraph shared state (same pattern as /leads).
 *
 * Data path: `analyze_boxing_clip` returns `Command(update={ coaching_data, coaching_status })`
 * on the Python agent. CopilotKit mirrors that into `useAgent().state` (STATE_SNAPSHOT).
 * We do **not** parse tool output in a frontend tool — that would duplicate work and miss
 * the snapshot the starter already uses for the CRM canvas.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import { z } from "zod";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useAgent,
  useConfigureSuggestions,
  useDefaultRenderTool,
  useFrontendTool,
} from "@copilotkit/react-core/v2";

import CoachingCanvas from "@/components/coaching/CoachingCanvas";
import CoachGenDrillCard from "@/components/coaching/CoachGenDrillCard";
import ScoreRing from "@/components/coaching/ScoreRing";
import { ToolFallbackCard } from "@/components/copilot/ToolFallbackCard";
import { ThreadsDrawer } from "@/components/threads-drawer";
import drawerStyles from "@/components/threads-drawer/threads-drawer.module.css";
import type { CoachingData } from "@/lib/coaching/types";
import type { AgentState } from "@/lib/leads/types";
import { mergeAgentState } from "@/lib/leads/state";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function CoachCanvasInner() {
  const { agent } = useAgent();
  const mockBootRef = useRef(false);
  const savedTabTitleRef = useRef<string | null>(null);
  const loadMockRef = useRef<(() => void) | null>(null);

  const coachState = useMemo(
    () => mergeAgentState(agent?.state),
    [agent?.state],
  );

  const pushAgentState = useCallback(
    (patch: Partial<AgentState>) => {
      if (!agent) return;
      const next = { ...mergeAgentState(agent.state), ...patch };
      agent.setState(next);
    },
    [agent],
  );

  useFrontendTool({
    name: "highlightTechnique",
    description:
      "Highlight a technique the agent wants the athlete to focus on after analysis.",
    parameters: z.object({
      technique: z.string(),
      insight: z.string(),
    }),
    render: ({ args }) => (
      <div className="coach-card-surface mb-3 border-l-4 border-l-[var(--accent-amber)] p-4">
        <p className="font-coach-heading text-[var(--accent-amber)]">
          🔍 Agent Focus
        </p>
        <p className="font-coach-heading mt-1 text-[var(--text-primary)]">
          {args.technique}
        </p>
        <p className="font-coach-body mt-2 text-sm text-[var(--text-secondary)]">
          {args.insight}
        </p>
      </div>
    ),
  });

  useFrontendTool({
    name: "generateDrill",
    description:
      "Render a targeted drill card in chat. Call this instead of only describing a drill in text.",
    parameters: z.object({
      name: z.string(),
      reps: z.number(),
      focus: z.string(),
      reason: z.string().optional(),
    }),
    render: ({ args }) => (
      <div className="mb-3 border-l-4 border-l-[var(--accent-red)] pl-3">
        <CoachGenDrillCard
          name={args.name ?? "Drill"}
          reps={args.reps ?? 10}
          focus={args.focus ?? ""}
          reason={args.reason}
        />
      </div>
    ),
  });

  useFrontendTool({
    name: "showComparison",
    description:
      "Show a before/after score comparison when the user asks about improvement between clips or sessions.",
    parameters: z.object({
      before_score: z.number(),
      after_score: z.number(),
      technique: z.string(),
      summary: z.string(),
    }),
    render: ({ args }) => {
      const delta = Math.round(
        (args.after_score ?? 0) - (args.before_score ?? 0),
      );
      const improved = delta >= 0;
      return (
        <div
          className="mb-3 rounded-2xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p
            className="font-coach-body mb-3 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            📊 Technique Comparison: {args.technique}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="text-center">
              <ScoreRing
                score={args.before_score ?? 0}
                size={72}
                strokeWidth={5}
                label="Before"
              />
            </div>
            <div
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                improved
                  ? "bg-[rgba(42,157,143,0.2)] text-[var(--accent-green)]"
                  : "bg-[rgba(230,57,70,0.2)] text-[var(--accent-red)]"
              }`}
            >
              {improved ? "+" : ""}
              {delta}
            </div>
            <div className="text-center">
              <ScoreRing
                score={args.after_score ?? 0}
                size={72}
                strokeWidth={5}
                label="After"
              />
            </div>
          </div>
          {args.summary ? (
            <p
              className="font-coach-body mt-3 text-center text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {args.summary}
            </p>
          ) : null}
        </div>
      );
    },
  });

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
        clips_analyzed: 1,
      });
      toast.success("Loaded mock coaching JSON into agent state");
    } catch {
      toast.error("Failed to fetch mock JSON");
    }
  }, [pushAgentState]);

  loadMockRef.current = loadMock;

  useEffect(() => {
    if (savedTabTitleRef.current === null) {
      savedTabTitleRef.current = document.title;
    }
    return () => {
      document.title = savedTabTitleRef.current ?? "CoachMe+ 🥊";
    };
  }, []);

  useEffect(() => {
    if (coachState.coaching_status === "analyzing") {
      document.title = "⏳ Analyzing... — CoachMe+";
    } else if (coachState.coaching_data?.overall_score != null) {
      document.title = `🥊 Score: ${coachState.coaching_data.overall_score} — CoachMe+`;
    } else {
      document.title = "CoachMe+ 🥊";
    }
  }, [
    coachState.coaching_status,
    coachState.coaching_data?.overall_score,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.querySelector(
          '[data-copilotkit] input, [data-copilotkit] textarea, textarea[class*="copilot"], input[class*="copilot"]',
        ) as HTMLElement | null;
        input?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        loadMockRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_COACHING_MOCK !== "1" ||
      !agent ||
      mockBootRef.current
    ) {
      return;
    }
    mockBootRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/mock-coaching-data");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as CoachingData;
        if (cancelled) return;
        pushAgentState({
          coaching_data: data,
          coaching_status: "complete",
        });
      } catch {
        /* optional mock */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent, pushAgentState]);

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

  return (
    <>
      {coachState.coaching_status === "analyzing" ? (
        <div
          className="font-coach-body fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg md:right-[calc(420px+1rem)]"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
            color: "var(--accent-red)",
          }}
          role="status"
          aria-live="polite"
        >
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-[var(--accent-red)]" />
          Coach is watching your clip…
        </div>
      ) : null}

      <div className="coach-app font-coach-body min-h-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="font-coach-body text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-amber)]"
            >
              ← Home
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadMock}
                className="font-coach-body rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)]"
              >
                Load mock JSON
              </button>
              <span className="font-coach-body text-xs text-[var(--text-secondary)]">
                Live: shared LangGraph state via{" "}
                <code className="rounded bg-[var(--bg-primary)] px-1">
                  useAgent
                </code>
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-6">
          <h1 className="font-coach-heading mb-6 text-2xl tracking-tight text-[var(--text-primary)]">
            CoachMe+ 🥊
          </h1>
          <CoachingCanvas />
        </main>
      </div>

      <CopilotSidebar
        defaultOpen
        width={420}
        className="coach-copilot-sidebar"
        input={{ disclaimer: () => null, className: "pb-6" }}
      />

      <Toaster richColors position="top-center" />
    </>
  );
}

function CoachHomePage() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.documentElement.classList.add("coach-copilot-route");
    return () => {
      document.documentElement.classList.remove("coach-copilot-route");
    };
  }, []);

  return (
    <div
      className={drawerStyles.layout}
      style={
        {
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          "--sidebar": "#1a1a24",
          "--sidebar-foreground": "#f0ece4",
          "--sidebar-border": "rgba(255, 255, 255, 0.06)",
          "--sidebar-accent": "rgba(230, 57, 70, 0.15)",
          "--sidebar-accent-foreground": "#f0ece4",
        } as CSSProperties
      }
    >
      <ThreadsDrawer
        agentId="default"
        threadId={threadId}
        onThreadChange={setThreadId}
      />
      <div
        className={`${drawerStyles.mainPanel} flex min-h-0 flex-col`}
        style={{ background: "var(--bg-primary)" }}
      >
        <CopilotChatConfigurationProvider
          agentId="default"
          threadId={threadId}
          labels={{
            modalHeaderTitle: "CoachMe+ 🥊",
            welcomeMessageText:
              "Describe your clip or ask to analyze your drill…",
            chatInputPlaceholder: "Ask your coach…",
          }}
        >
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
