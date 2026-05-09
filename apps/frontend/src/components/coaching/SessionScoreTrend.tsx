"use client";

import ScoreRing from "./ScoreRing";

interface SessionScoreTrendProps {
  before: number;
  after: number;
}

/** Deterministic progress strip from agent state (`coaching_score_history`); no model tool call required. */
export default function SessionScoreTrend({
  before,
  after,
}: SessionScoreTrendProps) {
  const delta = Math.round(after - before);
  const improved = delta >= 0;

  return (
    <div
      className="coach-card-surface mb-6 border border-[var(--border-subtle)] p-4"
      role="region"
      aria-label="Session score trend"
    >
      <p className="font-coach-body mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        Your progress (last two analyses)
      </p>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="text-center">
          <ScoreRing
            score={before}
            size={72}
            strokeWidth={5}
            label="Earlier"
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
            score={after}
            size={72}
            strokeWidth={5}
            label="Latest"
          />
        </div>
      </div>
      <p className="font-coach-body mt-3 text-center text-xs text-[var(--text-secondary)]">
        Shown automatically from your last two clips — use{" "}
        <span className="text-[var(--text-primary)]">showComparison</span> in
        chat for technique-level comparisons.
      </p>
    </div>
  );
}
