"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";

import type { CoachingSessionStatus, TimestampMarker } from "@/lib/coaching/types";
import type { AgentState } from "@/lib/leads/types";
import { mergeAgentState } from "@/lib/leads/state";

import Confetti from "./Confetti";
import CorrectionMarker from "./CorrectionMarker";
import DrillCard from "./DrillCard";
import FormScoreCard from "./FormScoreCard";
import ScoreRing from "./ScoreRing";
import SessionBar from "./SessionBar";
import SessionScoreTrend from "./SessionScoreTrend";
import SessionSummary from "./SessionSummary";

const LOADING_LINES = [
  "Studying your stance...",
  "Watching your hand speed...",
  "Checking your guard discipline...",
  "Building your game plan...",
] as const;

const SUGGESTION_CHIPS = [
  "Analyze my jab drill",
  "Check my guard",
  "Review my combo",
] as const;

function canvasStatusFromAgent(state: AgentState): CoachingSessionStatus {
  if (state.coaching_status === "error") return "error";
  if (state.coaching_status === "analyzing") return "analyzing";
  if (state.coaching_data) return "complete";
  return "idle";
}

function StaggerSection({
  index,
  visibleCount,
  children,
}: {
  index: number;
  visibleCount: number;
  children: ReactNode;
}) {
  const show = visibleCount > index;
  return (
    <div
      className="coach-stagger-item"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(16px)",
        pointerEvents: show ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

function AnalyzingView() {
  const [lineIndex, setLineIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFade(false);
      window.setTimeout(() => {
        setLineIndex((i) => (i + 1) % LOADING_LINES.length);
        setFade(true);
      }, 300);
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-4 py-12">
      <p
        className="font-coach-body max-w-md text-center text-lg text-[var(--text-primary)] transition-opacity duration-300"
        style={{ opacity: fade ? 1 : 0 }}
      >
        {LOADING_LINES[lineIndex]}
      </p>
      <div className="mt-8 flex gap-2">
        <span className="coach-dot-pulse coach-dot-pulse-1 h-2 w-2 rounded-full" />
        <span className="coach-dot-pulse coach-dot-pulse-2 h-2 w-2 rounded-full" />
        <span className="coach-dot-pulse coach-dot-pulse-3 h-2 w-2 rounded-full" />
      </div>
    </div>
  );
}

export default function CoachingCanvas() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();

  const state = useMemo(() => mergeAgentState(agent?.state), [agent?.state]);
  const coachingData = state.coaching_data;
  const status = canvasStatusFromAgent(state);

  const [visibleCount, setVisibleCount] = useState(0);

  const updateState = useCallback(
    (updater: (prev: AgentState) => AgentState) => {
      if (!agent) return;
      agent.setState(updater(mergeAgentState(agent.state)));
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
      });
    },
    [agent, copilotkit],
  );

  const handleMarkerClick = useCallback(
    (ts: TimestampMarker) => {
      injectPrompt(
        `I clicked the correction at ${ts.time}s: "${ts.label}". Call generateDrill with one targeted drill for this specific flaw.`,
      );
    },
    [injectPrompt],
  );

  const resetInteractions = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      approved_drills: [],
      skipped_drills: [],
    }));
  }, [updateState]);

  const visibleDrills = useMemo(() => {
    if (!coachingData?.drills) return [];
    const skipped = state.skipped_drills ?? [];
    return coachingData.drills.filter((d) => !skipped.includes(d.name));
  }, [coachingData, state.skipped_drills]);

  const approvedSet = state.approved_drills ?? [];

  const techCount = coachingData?.techniques?.length ?? 0;
  const drillCountVisible = visibleDrills.length;
  const hasTimestamps = (coachingData?.timestamps?.length ?? 0) > 0;

  const totalStaggerSteps = useMemo(() => {
    if (!coachingData || status !== "complete") return 0;
    let n = 1 + techCount + drillCountVisible;
    if (hasTimestamps) n += 1;
    n += 1;
    return n;
  }, [
    coachingData,
    status,
    techCount,
    drillCountVisible,
    hasTimestamps,
  ]);

  useEffect(() => {
    if (!coachingData || status !== "complete" || totalStaggerSteps === 0) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      setVisibleCount(step);
      if (step >= totalStaggerSteps) {
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [coachingData?.session_id, totalStaggerSteps, coachingData, status]);

  if (status === "analyzing") {
    return (
      <div className="space-y-0">
        <SessionBar
          status="analyzing"
          clipName="Breaking down your footage…"
          correctionsCount={0}
          drillsCount={0}
        />
        <AnalyzingView />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto mt-8 max-w-md text-center">
        <div className="coach-card-surface px-6 py-10">
          <div
            className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-2xl shadow-inner"
            aria-hidden
          >
            ⚠️
          </div>
          <p
            className="font-coach-heading text-lg font-semibold"
            style={{ color: "var(--accent-red)" }}
          >
            Couldn&apos;t read that footage
          </p>
          <p className="font-coach-body mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Try another clip, confirm TwelveLabs key / index /{" "}
            <span className="font-mono text-[var(--text-primary)]">video_id</span>{" "}
            in chat, or use{" "}
            <span className="text-[var(--text-primary)]">Load mock JSON</span>.
          </p>
          <button
            type="button"
            onClick={() =>
              updateState((prev) => ({
                ...prev,
                coaching_status: "idle",
                coaching_data: null,
              }))
            }
            className="font-coach-body mt-8 w-full rounded-xl bg-[var(--accent-red)] py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!coachingData) {
    return (
      <div className="mt-4 flex flex-col items-center px-4 text-center">
        <div className="coach-hero-spotlight mb-8">
          <p className="coach-float-emoji text-7xl drop-shadow-[0_8px_32px_rgba(230,57,70,0.25)]" aria-hidden>
            🥊
          </p>
        </div>
        <h2 className="font-coach-heading mb-2 text-3xl tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Step into the ring
        </h2>
        <p className="font-coach-body mb-10 max-w-md text-base text-[var(--text-secondary)]">
          Upload analysis from chat or tap a starter — your breakdown lands here in
          real time.
        </p>
        {/* Same path as CorrectionMarker: addMessage + runAgent via injectPrompt */}
        <div className="flex flex-wrap justify-center gap-3">
          {SUGGESTION_CHIPS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => injectPrompt(label)}
              className="coach-chip font-coach-body px-5 py-2.5 text-sm font-medium"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-12 max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/50 px-5 py-4 text-left shadow-lg backdrop-blur-sm">
          <p className="font-coach-body text-sm text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)]">Offline?</span> Use{" "}
            <span className="text-[var(--text-primary)]">Load mock JSON</span>{" "}
            in the header. <span className="text-[var(--text-primary)]">Live?</span>{" "}
            Ask the coach to run{" "}
            <span className="font-mono text-xs text-[var(--accent-amber)]">
              analyze_boxing_clip
            </span>{" "}
            with your TwelveLabs{" "}
            <span className="font-mono text-xs text-[var(--accent-amber)]">
              video_id
            </span>
            .
          </p>
        </div>
        <p className="font-coach-body mt-6 text-[10px] text-[var(--text-secondary)]/60">
          ⌘K / Ctrl+K — coach · ⌘M / Ctrl+M — mock JSON
        </p>
      </div>
    );
  }

  const idxOverall = 0;
  const idxTechStart = 1;
  const idxDrillStart = idxTechStart + techCount;
  const idxTimeline = hasTimestamps ? idxDrillStart + drillCountVisible : -1;
  const idxSummary =
    idxDrillStart + drillCountVisible + (hasTimestamps ? 1 : 0);

  const staggerComplete =
    totalStaggerSteps > 0 && visibleCount >= totalStaggerSteps;

  const techniquesList = coachingData.techniques ?? [];
  const worstTechnique =
    techniquesList.length > 0
      ? techniquesList.reduce((worst, t) =>
          t.score < worst.score ? t : worst,
        techniquesList[0]!)
      : undefined;

  const showOverallConfetti =
    coachingData.overall_score >= 75 && visibleCount > idxOverall;

  return (
    <div className="space-y-6">
      <SessionBar
        status={status}
        clipName={coachingData.clip_name}
        correctionsCount={coachingData.timestamps?.length ?? 0}
        drillsCount={coachingData.drills?.length ?? 0}
      />

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <p className="font-coach-body text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            Round time
          </p>
          <h2 className="font-coach-heading text-lg text-[var(--text-primary)]">
            {coachingData.clip_name.replace(/_/g, " ")}
          </h2>
        </div>
        <button
          type="button"
          onClick={resetInteractions}
          className="font-coach-body text-sm text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--accent-amber)] hover:underline"
        >
          Reset drill choices
        </button>
      </div>

      {state.coaching_score_history && state.coaching_score_history.length >= 2 ? (
        <SessionScoreTrend
          before={state.coaching_score_history[0]!}
          after={state.coaching_score_history[1]!}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-coach-heading mb-3 text-lg text-[var(--text-primary)]">
            Form analysis
          </h2>
          <StaggerSection index={idxOverall} visibleCount={visibleCount}>
            <div className="coach-card-surface relative mb-4 overflow-visible border-t-2 border-t-[var(--accent-red)] p-4">
              {showOverallConfetti ? <Confetti /> : null}
              <div className="relative flex justify-center">
                <div className="coach-overall-ring-wrap">
                  <div className="coach-overall-ring-glow" aria-hidden />
                  <div className="coach-overall-ring-inner">
                    <ScoreRing
                      score={coachingData.overall_score}
                      size={160}
                      strokeWidth={9}
                      label="Overall score"
                    />
                  </div>
                </div>
              </div>
            </div>
          </StaggerSection>
          {(coachingData.techniques ?? []).map((t, i) => (
            <StaggerSection
              key={t.name}
              index={idxTechStart + i}
              visibleCount={visibleCount}
            >
              <FormScoreCard
                {...t}
                highlighted={
                  !!staggerComplete && worstTechnique?.name === t.name
                }
              />
            </StaggerSection>
          ))}
        </div>

        <div>
          <h2 className="font-coach-heading mb-3 text-lg text-[var(--text-primary)]">
            Your assignments
          </h2>
          {visibleDrills.length === 0 ? (
            <p className="font-coach-body text-sm text-[var(--text-secondary)]">
              All suggested drills were skipped. Use &quot;Reset drill
              choices&quot; to see them again.
            </p>
          ) : (
            visibleDrills.map((d, i) => {
              const done = approvedSet.includes(d.name);
              return (
                <StaggerSection
                  key={d.name}
                  index={idxDrillStart + i}
                  visibleCount={visibleCount}
                >
                  <DrillCard
                    {...d}
                    disabled={done}
                    onApprove={() => {
                      updateState((prev) => ({
                        ...prev,
                        approved_drills: [
                          ...new Set([
                            ...(prev.approved_drills ?? []),
                            d.name,
                          ]),
                        ],
                      }));
                      toast.success(`Logged: ${d.name}`);
                    }}
                    onSkip={() => {
                      updateState((prev) => ({
                        ...prev,
                        skipped_drills: [
                          ...new Set([
                            ...(prev.skipped_drills ?? []),
                            d.name,
                          ]),
                        ],
                      }));
                      toast.message(`Skipped: ${d.name}`);
                    }}
                  />
                </StaggerSection>
              );
            })
          )}
        </div>
      </div>

      {hasTimestamps ? (
        <StaggerSection index={idxTimeline} visibleCount={visibleCount}>
          <CorrectionMarker
            timestamps={coachingData.timestamps!}
            onMarkerClick={handleMarkerClick}
            videoUrl={coachingData.video_url}
            durationSeconds={coachingData.video_duration}
          />
        </StaggerSection>
      ) : null}

      {state.coaching_status === "complete" && coachingData ? (
        <StaggerSection index={idxSummary} visibleCount={visibleCount}>
          <SessionSummary
            overallScore={coachingData.overall_score}
            clipsAnalyzed={state.clips_analyzed ?? 1}
            drillsApproved={state.approved_drills?.length ?? 0}
            onAnalyzeAnother={() =>
              updateState((prev) => ({
                ...prev,
                coaching_data: null,
                coaching_status: "idle",
                coaching_score_history: [],
              }))
            }
          />
        </StaggerSection>
      ) : null}
    </div>
  );
}
