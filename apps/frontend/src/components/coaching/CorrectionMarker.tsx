"use client";

import type { TimestampMarker } from "@/lib/coaching/types";

interface CorrectionMarkerProps {
  timestamps: TimestampMarker[];
  onMarkerClick: (ts: TimestampMarker) => void;
  /** Seconds; placeholder until video metadata is wired */
  durationSeconds?: number;
}

const colors = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
} as const;

export default function CorrectionMarker({
  timestamps,
  onMarkerClick,
  durationSeconds = 30,
}: CorrectionMarkerProps) {
  const duration = Math.max(durationSeconds, 1);

  return (
    <div className="mt-4">
      <h3 className="mb-2 font-semibold text-foreground">
        Correction timeline
      </h3>
      <div className="mb-3 flex h-48 w-full items-center justify-center rounded-xl bg-zinc-900">
        <span className="text-sm text-zinc-400">🎬 Boxing clip</span>
      </div>
      <div className="relative mb-3 h-5 w-full rounded-full bg-muted">
        {timestamps.map((ts, i) => (
          <button
            key={`${ts.time}-${i}`}
            type="button"
            onClick={() => onMarkerClick(ts)}
            title={ts.label}
            className="absolute top-0 w-3 cursor-pointer rounded-full transition-transform hover:scale-125"
            style={{
              left: `${Math.min(100, Math.max(0, (ts.time / duration) * 100))}%`,
              backgroundColor: colors[ts.severity],
              height: "1.25rem",
              transform: "translateX(-50%)",
            }}
          />
        ))}
      </div>
      <div className="space-y-1">
        {timestamps.map((ts, i) => (
          <button
            key={`${ts.time}-row-${i}`}
            type="button"
            onClick={() => onMarkerClick(ts)}
            className="flex w-full items-center gap-2 rounded p-1 text-left text-sm hover:bg-muted"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: colors[ts.severity] }}
            />
            <span className="w-10 tabular-nums text-muted-foreground">
              {ts.time}s
            </span>
            <span className="text-foreground">{ts.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
