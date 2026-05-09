"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import type { CoachingData, CoachingSessionStatus } from "@/lib/coaching/types";
import DrillCard from "./DrillCard";
import FormScoreCard from "./FormScoreCard";

interface CoachingCanvasProps {
  coachingData: CoachingData | null;
  status: CoachingSessionStatus;
}

export default function CoachingCanvas({
  coachingData,
  status,
}: CoachingCanvasProps) {
  const [approved, setApproved] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);

  const resetInteractions = useCallback(() => {
    setApproved([]);
    setSkipped([]);
  }, []);

  const visibleDrills = useMemo(() => {
    if (!coachingData?.drills) return [];
    return coachingData.drills.filter((d) => !skipped.includes(d.name));
  }, [coachingData, skipped]);

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
          onClick={resetInteractions}
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
              All suggested drills were skipped. Use &quot;Reset drill
              choices&quot; to see them again.
            </p>
          ) : (
            visibleDrills.map((d) => {
              const done = approved.includes(d.name);
              return (
                <DrillCard
                  key={d.name}
                  {...d}
                  disabled={done}
                  onApprove={() => {
                    setApproved((prev) =>
                      prev.includes(d.name) ? prev : [...prev, d.name],
                    );
                    toast.success(`Logged: ${d.name}`);
                  }}
                  onSkip={() => {
                    setSkipped((prev) =>
                      prev.includes(d.name) ? prev : [...prev, d.name],
                    );
                    toast.message(`Skipped: ${d.name}`);
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {coachingData.timestamps?.length ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Timestamp cues
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Correction markers on a timeline will plug in here next; data is
            already in the mock contract.
          </p>
          <ul className="space-y-2 text-sm">
            {coachingData.timestamps.map((ts) => (
              <li
                key={`${ts.time}-${ts.label}`}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="tabular-nums text-muted-foreground">
                  {ts.time}s
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    ts.severity === "high"
                      ? "bg-red-100 text-red-800"
                      : ts.severity === "medium"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                  }`}
                >
                  {ts.severity}
                </span>
                <span className="text-foreground">{ts.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
