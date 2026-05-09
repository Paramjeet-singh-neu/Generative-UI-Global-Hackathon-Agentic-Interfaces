"use client";

import type { TechniqueScore } from "@/lib/coaching/types";

export default function FormScoreCard({
  name,
  score,
  correction,
}: TechniqueScore) {
  const safe = Math.min(100, Math.max(0, score));
  return (
    <div className="mb-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="capitalize text-base font-semibold text-card-foreground">
          {name}
        </h3>
        <span className="text-lg font-bold tabular-nums text-[#3D92E8]">
          {safe}
        </span>
      </div>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-secondary transition-[width] duration-500"
          style={{ width: `${safe}%` }}
        />
      </div>
      <p className="text-sm leading-snug text-muted-foreground">{correction}</p>
    </div>
  );
}
