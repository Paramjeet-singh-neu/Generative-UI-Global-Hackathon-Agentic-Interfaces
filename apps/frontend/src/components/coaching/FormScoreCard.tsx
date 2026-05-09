"use client";

import type { TechniqueScore } from "@/lib/coaching/types";

import ScoreRing from "./ScoreRing";

interface FormScoreCardProps extends TechniqueScore {
  highlighted?: boolean;
}

export default function FormScoreCard({
  name,
  score,
  correction,
  highlighted,
}: FormScoreCardProps) {
  const safe = Math.min(100, Math.max(0, score));
  const fillColor =
    safe > 70
      ? "var(--accent-green)"
      : safe > 40
        ? "var(--accent-amber)"
        : "var(--accent-red)";

  return (
    <div
      className={`coach-card-surface coach-card-interactive relative mb-3 overflow-hidden rounded-2xl p-4 text-left transition-[box-shadow,border-color] duration-300 ${
        highlighted
          ? "coach-worst-technique-pulse border-2 border-[var(--accent-red)]"
          : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1rem]">
        <div
          className="absolute bottom-0 left-0 h-full opacity-[0.06] transition-[width] duration-1000 ease-out"
          style={{
            width: `${safe}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
      <div className="relative mb-2 flex items-start gap-3">
        <ScoreRing score={safe} size={56} strokeWidth={4} />
        <div className="min-w-0 flex-1">
          <h3 className="font-coach-heading capitalize text-base text-[var(--text-primary)]">
            {name}
          </h3>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${safe}%`,
                background: fillColor,
              }}
            />
          </div>
        </div>
      </div>
      <div className="relative mt-2 flex items-start gap-2">
        <span className="mt-0.5 text-xs" style={{ color: "var(--accent-amber)" }}>
          ↳
        </span>
        <p className="font-coach-body text-xs leading-relaxed text-[var(--text-secondary)]">
          {correction}
        </p>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-1000"
        style={{
          width: `${safe}%`,
          background:
            safe > 70
              ? "linear-gradient(90deg, var(--accent-green), transparent)"
              : safe > 40
                ? "linear-gradient(90deg, var(--accent-amber), transparent)"
                : "linear-gradient(90deg, var(--accent-red), transparent)",
        }}
      />
    </div>
  );
}
