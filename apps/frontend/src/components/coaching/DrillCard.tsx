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
      className={`coach-card-surface coach-card-interactive mb-3 rounded-2xl p-4 text-left transition-all duration-300 ease-out ${
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
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          style={{
            backgroundColor: "rgba(230, 57, 70, 0.1)",
            color: "var(--accent-red)",
          }}
        >
          {reps}
        </span>
        <div className="min-w-0">
          <h3
            className={`font-coach-heading text-sm font-semibold text-[var(--text-primary)] ${
              actionState === "skipped" ? "line-through" : ""
            }`}
          >
            {name}
          </h3>
          <p className="font-coach-body text-xs text-[var(--text-secondary)]">{focus}</p>
        </div>
      </div>
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
            className="font-coach-body flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--accent-green)", color: "#fff" }}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSkip}
            className="font-coach-body flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
              backgroundColor: "transparent",
            }}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
