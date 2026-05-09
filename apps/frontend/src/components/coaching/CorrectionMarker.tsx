"use client";

import type { TimestampMarker } from "@/lib/coaching/types";

interface Props {
  timestamps: TimestampMarker[];
  onMarkerClick: (ts: TimestampMarker) => void;
}

const colors = {
  high: "var(--accent-red)",
  medium: "var(--accent-amber)",
  low: "var(--accent-green)",
} as const;

export default function CorrectionMarker({
  timestamps,
  onMarkerClick,
}: Props) {
  const duration = Math.max(
    30,
    ...timestamps.map((t) => (typeof t.time === "number" ? t.time : 0)),
  );

  return (
    <div className="coach-card-surface coach-card-interactive mt-4 p-4">
      <h3 className="font-coach-heading mb-2 text-[var(--text-primary)]">
        Moments on tape
      </h3>
      <div className="mb-3 flex h-48 w-full items-center justify-center rounded-2xl bg-[var(--bg-primary)]">
        <span className="font-coach-body text-sm text-[var(--text-secondary)]">
          🎬 Boxing clip
        </span>
      </div>
      <div className="relative mb-3 h-5 w-full rounded-full bg-[var(--bg-primary)]">
        {timestamps.map((ts, i) => (
          <button
            key={`${ts.time}-${ts.label}-${i}`}
            type="button"
            onClick={() => onMarkerClick(ts)}
            className="absolute top-0 h-5 w-3 rounded-full transition-transform hover:scale-125"
            style={{
              left: `${(ts.time / duration) * 100}%`,
              backgroundColor: colors[ts.severity],
              transform: "translateX(-50%)",
              boxShadow:
                ts.severity === "high"
                  ? "0 0 16px rgba(230, 57, 70, 0.2)"
                  : undefined,
            }}
            title={ts.label}
          />
        ))}
      </div>
      <div className="space-y-1">
        {timestamps.map((ts, i) => (
          <button
            key={`${ts.time}-${ts.label}-row-${i}`}
            type="button"
            onClick={() => onMarkerClick(ts)}
            className="coach-card-interactive flex w-full items-center gap-2 rounded-xl p-2 text-left text-sm"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: colors[ts.severity],
                boxShadow:
                  ts.severity === "high"
                    ? "0 0 12px rgba(230, 57, 70, 0.25)"
                    : undefined,
              }}
            />
            <span className="w-8 tabular-nums text-[var(--text-secondary)]">
              {ts.time}s
            </span>
            <span className="text-[var(--text-primary)]">{ts.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
