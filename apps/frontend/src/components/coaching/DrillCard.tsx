"use client";

import type { Drill } from "@/lib/coaching/types";

interface DrillCardProps extends Drill {
  reason?: string;
  onApprove?: () => void;
  onSkip?: () => void;
  disabled?: boolean;
}

export default function DrillCard({
  name,
  reps,
  focus,
  reason,
  onApprove,
  onSkip,
  disabled,
}: DrillCardProps) {
  return (
    <div className="mb-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm">
      <h3 className="text-base font-semibold text-card-foreground">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{reps}</span> reps ·{" "}
        <span>{focus}</span>
      </p>
      {reason ? (
        <p className="mt-2 text-xs leading-snug text-muted-foreground">
          {reason}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onApprove}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onSkip}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
