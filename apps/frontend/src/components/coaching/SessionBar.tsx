"use client";

import { useEffect, useState } from "react";

import type { CoachingSessionStatus } from "@/lib/coaching/types";

interface SessionBarProps {
  status: CoachingSessionStatus;
  clipName: string | null;
  correctionsCount: number;
  drillsCount: number;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionBar({
  status,
  clipName,
  correctionsCount,
  drillsCount,
}: SessionBarProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [clipName, status]);

  const showProgress = status === "analyzing";
  const displayName = clipName?.replace(/_/g, " ") ?? "Round";

  return (
    <div className="relative w-full">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 px-4 py-2 font-coach-body">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-block max-w-full truncate rounded-full bg-[var(--bg-card)] px-3 py-1 text-xs text-[var(--text-primary)]">
              🥊 {displayName}
            </span>
          </div>
          <div className="shrink-0 tabular-nums text-xs text-[var(--text-secondary)]">
            {formatElapsed(elapsed)}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            {showProgress ? (
              <span className="sr-only">Coach is studying your tape</span>
            ) : (
              <>
                <span className="rounded-full bg-[rgba(230,57,70,0.18)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent-red)]">
                  {correctionsCount} corrections
                </span>
                <span className="rounded-full bg-[rgba(61,146,232,0.2)] px-2.5 py-0.5 text-[11px] font-medium text-[#7eb8ff]">
                  {drillsCount} drills
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {showProgress ? (
        <div className="h-0.5 w-full overflow-hidden bg-[var(--bg-card)]">
          <div className="coach-indeterminate-bar" />
        </div>
      ) : null}
    </div>
  );
}
