"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import type {
  CoachingAgentStatus,
  CoachingData,
  CoachingSessionStatus,
  TimestampMarker,
} from "@/lib/coaching/types";
import CorrectionMarker from "./CorrectionMarker";
import DrillCard from "./DrillCard";
import FormScoreCard from "./FormScoreCard";
import SessionSummary from "./SessionSummary";

interface CoachingCanvasProps {
  coachingData: CoachingData | null;
  status: CoachingSessionStatus;
  approvedDrills: string[];
  skippedDrills: string[];
  clipsAnalyzed: number;
  agentCoachingStatus: CoachingAgentStatus;
  onApproveDrill: (name: string) => void;
  onSkipDrill: (name: string) => void;
  onResetDrillChoices: () => void;
  onAnalyzeAnother: () => void;
  onMarkerAction: (ts: TimestampMarker) => void;
}

export default function CoachingCanvas({
  coachingData,
  status,
  approvedDrills,
  skippedDrills,
  clipsAnalyzed,
  agentCoachingStatus,
  onApproveDrill,
  onSkipDrill,
  onResetDrillChoices,
  onAnalyzeAnother,
  onMarkerAction,
}: CoachingCanvasProps) {
  const visibleDrills = useMemo(() => {
    if (!coachingData?.drills) return [];
    return coachingData.drills.filter((d) => !skippedDrills.includes(d.name));
  }, [coachingData, skippedDrills]);

  if (status === "analyzing") {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-[#3D92E8] border-t-transparent"
          aria-hidden
        />
        Analyzing your footage…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-16 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-6 text-center">
        <p className="text-base font-medium text-foreground">
          Analysis failed
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Check the chat for the tool error (TwelveLabs key, index, or
          video_id). Fix and try again, or load the offline mock to preview
          the UI.
        </p>
      </div>
    );
  }

  if (!coachingData) {
    return (
      <div className="mt-20 text-center text-muted-foreground">
        <p className="mb-4 text-5xl" aria-hidden>
          🥊
        </p>
        <p className="text-base">
          Use{" "}
          <span className="font-medium text-foreground">Load mock JSON</span>{" "}
          for an offline preview, or ask the coach in the sidebar to run{" "}
          <span className="font-mono text-foreground">analyze_boxing_clip</span>{" "}
          with your TwelveLabs{" "}
          <span className="font-mono text-foreground">video_id</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Session
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {coachingData.clip_name.replace(/_/g, " ")}
          </h2>
        </div>
        <button
          type="button"
          onClick={onResetDrillChoices}
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Reset drill choices
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Form analysis
          </h2>
          <div className="mb-4 rounded-xl border border-border bg-muted/50 p-4 text-center">
            <span className="text-4xl font-bold tabular-nums text-[#3D92E8]">
              {coachingData.overall_score}
            </span>
            <p className="text-sm text-muted-foreground">Overall score</p>
          </div>
          {coachingData.techniques?.map((t) => (
            <FormScoreCard key={t.name} {...t} />
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Today&apos;s drills
          </h2>
          {visibleDrills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All suggested drills were skipped for this session, or none
              remain. Re-analyze after skipping, or reset drill choices.
            </p>
          ) : (
            visibleDrills.map((d) => {
              const done = approvedDrills.includes(d.name);
              return (
                <DrillCard
                  key={d.name}
                  {...d}
                  disabled={done}
                  onApprove={() => {
                    onApproveDrill(d.name);
                    toast.success(`Logged: ${d.name}`);
                  }}
                  onSkip={() => {
                    onSkipDrill(d.name);
                    toast.message(`Skipped: ${d.name}`);
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {coachingData.timestamps?.length ? (
        <CorrectionMarker
          timestamps={coachingData.timestamps}
          onMarkerClick={onMarkerAction}
        />
      ) : null}

      {agentCoachingStatus === "complete" && coachingData ? (
        <SessionSummary
          overallScore={coachingData.overall_score}
          clipsAnalyzed={clipsAnalyzed}
          drillsApproved={approvedDrills.length}
          onAnalyzeAnother={onAnalyzeAnother}
        />
      ) : null}
    </div>
  );
}
