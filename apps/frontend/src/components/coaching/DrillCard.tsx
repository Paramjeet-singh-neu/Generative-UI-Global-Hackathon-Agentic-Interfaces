"use client";

import { useEffect, useState } from "react";

import type { Drill } from "@/lib/coaching/types";

type ActionState = "idle" | "approving" | "approved" | "skipping" | "skipped";

interface DrillCardProps extends Drill {
  onApprove?: () => void;
  onSkip?: () => void;
  disabled?: boolean;
}

const ACTION_MS = 400;

export default function DrillCard({
  name,
  reps,
  focus,
  reason,
  onApprove,
  onSkip,
  disabled,
}: DrillCardProps) {
  const [actionState, setActionState] = useState<ActionState>(() =>
    disabled ? "approved" : "idle",
  );

  useEffect(() => {
    if (!disabled) return;
    setActionState((prev) => {
      if (prev === "skipping" || prev === "skipped") return prev;
      return "approved";
    });
  }, [disabled]);

  const handleApprove = () => {
    setActionState("approving");
    window.setTimeout(() => {
      setActionState("approved");
      onApprove?.();
    }, ACTION_MS);
  };

  const handleSkip = () => {
    setActionState("skipping");
    window.setTimeout(() => {
      setActionState("skipped");
      onSkip?.();
    }, ACTION_MS);
  };

  const flashGreen = actionState === "approving";
  const flashAmber = actionState === "skipping";

  const reasonText = reason?.trim();

  return (
    <div
      className={`coach-card-surface coach-card-interactive mb-3 p-4 text-left transition-all duration-300 ease-out ${
        actionState === "approved"
          ? "border-l-[3px] border-l-[var(--accent-green)] opacity-80"
          : ""
      } ${
        actionState === "skipped"
          ? "border-l-[3px] border-l-[var(--border-subtle)] opacity-40"
          : ""
      }`}
      style={{
        backgroundColor: flashGreen
          ? "rgba(42, 157, 143, 0.15)"
          : flashAmber
            ? "rgba(244, 162, 97, 0.1)"
            : undefined,
      }}
    >
      <h3
        className={`font-coach-heading text-base text-[var(--text-primary)] ${
          actionState === "skipped" ? "line-through" : ""
        }`}
      >
        {name}
      </h3>
      <p className="font-coach-body mt-1 text-sm text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text-primary)]">{reps}</span>{" "}
        reps · <span>{focus}</span>
      </p>
      {reasonText ? (
        <p className="font-coach-body mt-2 text-xs italic text-[var(--accent-amber)]">
          💡 {reasonText}
        </p>
      ) : null}
      {actionState === "approved" ? (
        <p className="font-coach-body mt-3 text-sm font-medium text-[var(--accent-green)]">
          ✓ Locked in
        </p>
      ) : actionState === "skipped" ? (
        <p className="font-coach-body mt-3 text-sm text-[var(--text-secondary)]">
          Passed
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={handleApprove}
            className="font-coach-body flex-1 rounded-lg bg-[var(--accent-red)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSkip}
            className="font-coach-body flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
